# Hilos Panel — Backend Integration Notes

The frontend talks to a REST API. Configure the base URLs in your env:

```
VITE_API_URL=https://your-api.example.com/api
VITE_WS_URL=wss://your-api.example.com/ws
```

If unset, defaults are `/api` and `wss://<host>/ws`.

## File & folder layout (backend host)

The panel is designed to run on a single host. All persistent files live
relative to the panel project root (the directory containing `package.json`):

```
<panel-root>/
├── admin.json                 # admins (created via the bash provisioning script)
├── users.json                 # regular users (created via signup or admin)
├── data/
│   ├── nodes.json             # registered nodes (id, name, fqdn, port, token hash, panelId)
│   ├── eggs.json              # uploaded egg templates
│   ├── settings.json          # { freeServerEnabled, defaultLimits }
│   └── servers.json           # server metadata (id, ownerId, nodeId, eggId, limits, status)
└── servers/
    └── <server-id>/           # one folder per server
        ├── start.bat          # Windows launcher (run when user clicks Start)
        ├── start.sh           # Linux/macOS launcher
        ├── server.json        # per-server config (name, eggId, env, ports, limits)
        ├── logs/              # rolling log files written by the daemon
        └── files/             # the actual game/app files
```

### Where things live (quick reference)

| Item | Location |
| --- | --- |
| Admin accounts | `<panel-root>/admin.json` |
| User accounts | `<panel-root>/users.json` |
| Node registry (token, fqdn, panel id) | `<panel-root>/data/nodes.json` |
| Eggs | `<panel-root>/data/eggs.json` |
| Panel settings | `<panel-root>/data/settings.json` |
| Per-server folders | `<panel-root>/servers/<server-id>/` |
| Per-server start script | `<panel-root>/servers/<server-id>/start.bat` (or `start.sh`) |
| Per-server logs | `<panel-root>/servers/<server-id>/logs/` |

### What happens when a user clicks "Start"

1. Frontend calls `POST /api/servers/:id/start`.
2. Backend resolves the server folder `<panel-root>/servers/<server-id>/`.
3. Backend spawns `start.bat` (Windows) or `bash start.sh` (Linux) inside that folder.
4. stdout/stderr is streamed to the WebSocket console and tee'd into `logs/`.

The `start.bat` / `start.sh` files are generated once at server creation time
from the egg's `startup` template, with env vars and ports substituted in.
You can regenerate them on demand with `POST /api/servers/:id/regenerate-script`
(optional helper).

## Renaming a node or panel

Nodes and the panel both have stable IDs that never change. The display name
can be edited freely:

- `PUT /api/nodes/:id` `{ name }` — rename a node.
- `PUT /api/admin/settings` `{ panelName }` — rename the panel.

The node's token, panel ID, and FQDN are unaffected by a rename.

## Auth

JWT-based. After login/register the API must return:

```json
{ "token": "<jwt>", "user": { "id": "...", "username": "...", "email": "...", "role": "admin" | "user", "firstName": "...", "lastName": "..." } }
```

The token is stored in `localStorage` and sent as `Authorization: Bearer <token>`.

### Bash admin creation script (sample)

Run on the panel host. It prompts for fields and appends to `admin.json`.

```bash
#!/usr/bin/env bash
set -e
read -p "Username: " username
read -p "Email: " email
read -p "First name: " first
read -p "Last name: " last
read -s -p "Password: " password; echo
hash=$(printf "%s" "$password" | openssl passwd -6 -stdin)
id=$(uuidgen)
node -e "
const fs=require('fs');
const f='admin.json';
const list=JSON.parse(fs.readFileSync(f,'utf8')||'[]');
list.push({id:'$id',username:'$username',email:'$email',firstName:'$first',lastName:'$last',passwordHash:'$hash',role:'admin',createdAt:new Date().toISOString()});
fs.writeFileSync(f,JSON.stringify(list,null,2));
"
echo "Admin created."
```

User signup endpoint (`POST /api/auth/register`) appends to `users.json` with `role: "user"`.

## Endpoints expected by the frontend

| Method | Path | Purpose |
| --- | --- | --- |
| POST | /api/auth/login | `{ email, password }` → `{ token, user }` |
| POST | /api/auth/register | `{ username, email, password, firstName, lastName }` → `{ token, user }` |
| GET | /api/auth/me | current user |
| GET | /api/servers | list user's servers |
| GET | /api/servers/:id | get one (used as ownership preflight by the console) |
| POST | /api/servers | `{ name, eggId, nodeId }` → create server, generate `start.bat`/`start.sh` |
| POST | /api/servers/:id/start \| stop \| restart \| kill | lifecycle (start runs the per-server script) |
| DELETE | /api/servers/:id | remove (and delete `<panel-root>/servers/<id>/`) |
| POST | /api/servers/free | `{ name }` → free-tier server using admin defaults; rejected when `freeServerEnabled` is false |
| GET | /api/settings/public | `{ freeServerEnabled, defaultLimits }` — readable by any authenticated user |
| GET | /api/eggs | list eggs (read-only, available to authenticated users for the create-server picker) |
| GET | /api/nodes | list nodes |
| POST | /api/nodes | create node → `{ id, token, installCmd }` (token shown once) |
| PUT | /api/nodes/:id | rename node |
| GET | /api/admin/users | (admin) list all users |
| POST | /api/admin/users/:id/suspend \| unsuspend | (admin) |
| DELETE | /api/admin/users/:id | (admin) |
| GET | /api/admin/eggs | list eggs |
| POST | /api/admin/eggs | upload egg JSON (validated client-side, re-validate server-side) |
| DELETE | /api/admin/eggs/:id | remove |
| GET | /api/admin/settings | `{ freeServerEnabled, defaultLimits: { ramMb, cpuPercent, diskMb, networkMbps }, panelName }` |
| PUT | /api/admin/settings | save |

## Egg JSON schema (validated by the panel)

```json
{
  "name": "string (required)",
  "description": "string (optional)",
  "dockerImage": "string (required)",
  "startup": "string (required, command run inside the container)",
  "env": { "UPPER_SNAKE_KEY": "string|number|boolean" },
  "ports": [25565]
}
```

## Console WebSocket

`wss://<VITE_WS_URL>/servers/:id/console?token=<jwt>`

- Frontend GETs `/api/servers/:id` first as ownership preflight before opening the socket.
- Server pushes plain-text log lines OR `{ "type": "log", "data": "..." }`.
- Client sends `{ "type": "command", "data": "<cmd>" }` and `{ "type": "ping" }` every 25s; server replies `{ "type": "pong" }`.
- Close codes `4401` / `4403` prevent client reconnect.
- All other closes trigger exponential backoff with jitter (max 30s).
- Frontend supports **Clear logs** (wipes display only) and **Autoscroll toggle** (pause to inspect).

## Role gating

- `/login`, `/register` are public.
- Everything under `/_authenticated` requires a token.
- Everything under `/_authenticated/_admin` (`/admin/*`) requires `role: "admin"` — enforced both in `beforeLoad` (route guard) and a defensive component-level check.
- The admin sidebar group only renders for users with `role === "admin"`.
