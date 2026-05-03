# Hilos Panel — Backend Integration Notes

The frontend talks to a REST API. Configure the base URLs in your env:

```
VITE_API_URL=https://your-api.example.com/api
VITE_WS_URL=wss://your-api.example.com/ws
```

If unset, defaults are `/api` and `wss://<host>/ws`.

## Auth

JWT-based. After login/register the API must return:

```json
{ "token": "<jwt>", "user": { "id": "...", "username": "...", "email": "...", "role": "admin" | "user", "firstName": "...", "lastName": "..." } }
```

The token is stored in `localStorage` and sent as `Authorization: Bearer <token>`.

## User / Admin storage files

Per your request, two flat-file user stores live at the project root:

- `admin.json` — admins created via your bash provisioning script.
- `users.json` — regular users created by signup or by admins.

Your backend should read/write these (or the database of your choice). The
frontend never touches them directly.

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

User signup endpoint (`POST /api/auth/register`) should append the new user
to `users.json` with `role: "user"`.

## Endpoints expected by the frontend

| Method | Path | Purpose |
| --- | --- | --- |
| POST | /api/auth/login | `{ email, password }` → `{ token, user }` |
| POST | /api/auth/register | `{ username, email, password, firstName, lastName }` → `{ token, user }` |
| GET | /api/auth/me | current user |
| GET | /api/servers | list user's servers |
| GET | /api/servers/:id | get one (used as ownership preflight by the console) |
| POST | /api/servers/:id/start \| stop \| restart \| kill | lifecycle |
| DELETE | /api/servers/:id | remove |
| POST | /api/servers/free | `{ name }` → create a free-tier server using admin defaults. Must be rejected when `freeServerEnabled` is false. |
| GET | /api/settings/public | `{ freeServerEnabled, defaultLimits }` — readable by any authenticated user (drives the Create Free Server button) |
| GET | /api/nodes | list nodes |
| POST | /api/nodes | create node → `{ id, token, installCmd }` (token shown once) |
| GET | /api/admin/users | (admin) list all users |
| POST | /api/admin/users/:id/suspend \| unsuspend | (admin) |
| DELETE | /api/admin/users/:id | (admin) |
| GET | /api/admin/eggs | list eggs |
| POST | /api/admin/eggs | upload egg JSON (validated client-side, re-validate server-side) |
| DELETE | /api/admin/eggs/:id | remove |
| GET | /api/admin/settings | `{ freeServerEnabled, defaultLimits: { ramMb, cpuPercent, diskMb, networkMbps } }` |
| PUT | /api/admin/settings | save |

## Egg JSON schema (validated by the panel)

```json
{
  "name": "string (required)",
  "description": "string (optional)",
  "dockerImage": "string (required, e.g. itzg/minecraft-server:latest)",
  "startup": "string (required, command run inside the container)",
  "env": { "UPPER_SNAKE_KEY": "string|number|boolean" },
  "ports": [25565]
}
```

## Console WebSocket

`wss://<VITE_WS_URL>/servers/:id/console?token=<jwt>`

- The frontend performs an HTTP GET `/api/servers/:id` first as an ownership/permission check before opening the socket.
- Server pushes plain-text log lines (one per message) OR `{ "type": "log", "data": "..." }`.
- Client sends `{ "type": "command", "data": "<cmd>" }` for input and `{ "type": "ping" }` every 25s; server should reply `{ "type": "pong" }`.
- Close codes `4401` (unauthenticated) and `4403` (forbidden) prevent the client from reconnecting.
- All other closes trigger exponential backoff with jitter (max 30s).


## Role gating

- `/login`, `/register` are public.
- Everything under `/_authenticated` requires a token.
- Everything under `/_authenticated/_admin` (i.e. `/admin/*`) requires `role: "admin"`.

The admin sidebar group only renders for users with `role === "admin"`.
