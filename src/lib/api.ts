// REST API client for the Hilos Panel backend.
// In production this hits VITE_API_URL (your Node panel backend that owns
// admin.json / users.json / nodes-server.json / servers/<id>/ on disk).
// In the Lovable preview there's no Node backend reachable, so any 404 or
// network failure falls through to an in-browser mock that mirrors the EXACT
// JSON shapes the user specified, persisted to localStorage. Your real
// backend is a drop-in replacement — same paths, same payloads.

const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "/api";

const TOKEN_KEY = "hilos_token";
const USER_KEY = "hilos_user";

export interface User {
  id: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: "admin" | "user";
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}
export function getStoredUser(): User | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  return raw ? (JSON.parse(raw) as User) : null;
}
export function setStoredUser(user: User | null) {
  if (typeof window === "undefined") return;
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  else localStorage.removeItem(USER_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function api<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  // Try the real backend first.
  try {
    const res = await fetch(`${BASE}${path}`, { ...options, headers });
    // 404 = no real backend wired here → fall through to mock.
    if (res.status !== 404) {
      const text = await res.text();
      const data = text ? safeJson(text) : null;
      if (!res.ok) {
        const msg =
          (data && typeof data === "object" && "message" in data
            ? String((data as { message: unknown }).message)
            : null) ?? `Request failed (${res.status})`;
        throw new ApiError(msg, res.status);
      }
      return data as T;
    }
  } catch (e) {
    if (e instanceof ApiError) throw e;
    // network error → fall through to mock
  }

  // Mock backend
  return mockHandle<T>(path, options);
}

function safeJson(t: string) {
  try {
    return JSON.parse(t);
  } catch {
    return t;
  }
}

export const auth = {
  login: (email: string, password: string) =>
    api<{ token: string; user: User }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  register: (data: {
    username: string;
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
  }) =>
    api<{ token: string; user: User }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  me: () => api<User>("/auth/me"),
};

/* ---------------------------------------------------------------------- */
/*  In-browser mock backend (preview only). Mirrors the JSON the user     */
/*  specified for admin.json / users.json / nodes-server.json / servers.  */
/* ---------------------------------------------------------------------- */

interface AdminFile {
  username: string;
  password: string;
  email: string;
  first_name: string;
  last_name: string;
}
interface UserFile extends AdminFile {
  admin: "true" | "false";
}
interface NodeRecord {
  id: string;
  name: string;
  fqdn: string;
  ramMb: number;
  diskMb: number;
  cpuPercent: number;
  ramUsedMb: number;
  diskUsedMb: number;
  cpuUsedPercent: number;
  allocations: { ip: string; ports: number[] }[];
  token: string;
  token_id: string;
  panel_link: string;
  panel_id: string;
  status: "ONLINE" | "OFFLINE";
}
interface EggRecord {
  id: string;
  name: string;
  description?: string;
  dockerImage?: string;
  startup?: string;
  env?: Record<string, string>;
  ports?: number[];
  // raw uploaded JSON for backend startup-file detection
  raw?: unknown;
  startupFiles?: string[]; // e.g. ["server.jar", "app.py"]
}
interface ServerRecord {
  id: string; // 8-digit
  name: string;
  ownerId: string;
  eggId: string;
  nodeId: string;
  allocation?: { ip: string; port: number };
  startupFile?: string;
  status: "running" | "stopped";
  limits?: { ramMb: number; cpuPercent: number; diskMb: number; networkMbps: number };
  createdAt: number;
}

const LS = {
  admin: "hilos_admin_json",
  users: "hilos_users_json",
  nodes: "hilos_nodes_json",
  eggs: "hilos_eggs_json",
  servers: "hilos_servers_json",
  settings: "hilos_settings_json",
};

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write<T>(key: string, val: T) {
  localStorage.setItem(key, JSON.stringify(val));
}
function rid(len = 12) {
  return Array.from(crypto.getRandomValues(new Uint8Array(len)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
function rid8() {
  // 8-digit numeric server id
  let s = "";
  for (let i = 0; i < 8; i++) s += Math.floor(Math.random() * 10).toString();
  return s;
}

function getCurrentUser(): UserFile | AdminFile | null {
  const stored = getStoredUser();
  if (!stored) return null;
  const admin = read<AdminFile | null>(LS.admin, null);
  if (admin && admin.email === stored.email) return admin;
  const users = read<UserFile[]>(LS.users, []);
  return users.find((u) => u.email === stored.email) ?? null;
}

function isAdminEmail(email: string): boolean {
  const admin = read<AdminFile | null>(LS.admin, null);
  if (admin && admin.email === email) return true;
  const users = read<UserFile[]>(LS.users, []);
  const u = users.find((x) => x.email === email);
  return u?.admin === "true";
}

function toUser(rec: AdminFile | UserFile, role: "admin" | "user"): User {
  return {
    id: rec.email,
    username: rec.username,
    email: rec.email,
    firstName: rec.first_name,
    lastName: rec.last_name,
    role,
  };
}

async function mockHandle<T>(path: string, options: RequestInit): Promise<T> {
  const method = (options.method ?? "GET").toUpperCase();
  const body = options.body ? JSON.parse(String(options.body)) : null;

  // ---------- AUTH ----------
  if (path === "/auth/login" && method === "POST") {
    const { email, password } = body as { email: string; password: string };
    const admin = read<AdminFile | null>(LS.admin, null);
    if (admin && admin.email === email && admin.password === password) {
      const u = toUser(admin, "admin");
      return { token: "mock." + rid(), user: u } as T;
    }
    const users = read<UserFile[]>(LS.users, []);
    const found = users.find((u) => u.email === email && u.password === password);
    if (found) {
      const u = toUser(found, found.admin === "true" ? "admin" : "user");
      return { token: "mock." + rid(), user: u } as T;
    }
    throw new ApiError("Invalid email or password", 401);
  }

  if (path === "/auth/register" && method === "POST") {
    const b = body as {
      username: string;
      email: string;
      password: string;
      firstName?: string;
      lastName?: string;
    };
    const admin = read<AdminFile | null>(LS.admin, null);
    const users = read<UserFile[]>(LS.users, []);
    if (admin?.email === b.email || users.some((u) => u.email === b.email)) {
      throw new ApiError("Email already registered", 409);
    }
    // First account becomes the admin and writes admin.json shape.
    if (!admin) {
      const adminRec: AdminFile = {
        username: b.username,
        password: b.password,
        email: b.email,
        first_name: b.firstName ?? "",
        last_name: b.lastName ?? "",
      };
      write(LS.admin, adminRec);
      // Mirror into users.json with admin:"true" as the user requested.
      const userRec: UserFile = { ...adminRec, admin: "true" };
      write(LS.users, [...users, userRec]);
      return { token: "mock." + rid(), user: toUser(adminRec, "admin") } as T;
    }
    const userRec: UserFile = {
      username: b.username,
      password: b.password,
      email: b.email,
      first_name: b.firstName ?? "",
      last_name: b.lastName ?? "",
      admin: "false",
    };
    write(LS.users, [...users, userRec]);
    return { token: "mock." + rid(), user: toUser(userRec, "user") } as T;
  }

  if (path === "/auth/me" && method === "GET") {
    const stored = getStoredUser();
    if (!stored) throw new ApiError("Not authenticated", 401);
    const role = isAdminEmail(stored.email) ? "admin" : "user";
    return { ...stored, role } as T;
  }

  // ---------- SETTINGS ----------
  if (path === "/settings/public" && method === "GET") {
    const s = read(LS.settings, {
      freeServerEnabled: true,
      defaultLimits: { ramMb: 1024, cpuPercent: 100, diskMb: 5120, networkMbps: 100 },
    });
    return s as T;
  }

  // ---------- USERS (admin) ----------
  if (path === "/admin/users" && method === "GET") {
    const users = read<UserFile[]>(LS.users, []);
    return users.map((u) => ({
      id: u.email,
      username: u.username,
      email: u.email,
      firstName: u.first_name,
      lastName: u.last_name,
      role: u.admin === "true" ? "admin" : "user",
    })) as T;
  }
  {
    const m = path.match(/^\/admin\/users\/([^/]+)$/);
    if (m && method === "DELETE") {
      const users = read<UserFile[]>(LS.users, []).filter((u) => u.email !== m[1]);
      write(LS.users, users);
      return {} as T;
    }
  }

  // ---------- NODES ----------
  if (path === "/nodes" && method === "GET") {
    const nodes = read<NodeRecord[]>(LS.nodes, []);
    return nodes.map((n) => ({
      id: n.id,
      name: n.name,
      fqdn: n.fqdn,
      status: n.status === "ONLINE" ? "online" : "offline",
      cpu: n.cpuUsedPercent,
      memory: n.ramMb ? Math.round((n.ramUsedMb / n.ramMb) * 100) : 0,
      disk: n.diskMb ? Math.round((n.diskUsedMb / n.diskMb) * 100) : 0,
      servers: read<ServerRecord[]>(LS.servers, []).filter((s) => s.nodeId === n.id).length,
      ramMb: n.ramMb,
      ramUsedMb: n.ramUsedMb,
      diskMb: n.diskMb,
      diskUsedMb: n.diskUsedMb,
      cpuPercent: n.cpuPercent,
      cpuUsedPercent: n.cpuUsedPercent,
      allocations: n.allocations,
      defaultLimits: { ramMb: n.ramMb, cpuPercent: n.cpuPercent, diskMb: n.diskMb, networkMbps: 1000 },
      capacity: { ramMb: n.ramMb, cpuPercent: n.cpuPercent, diskMb: n.diskMb, networkMbps: 1000 },
    })) as T;
  }
  if (path === "/nodes" && method === "POST") {
    const b = body as {
      name: string;
      fqdn: string;
      port?: number;
      ramMb?: number;
      diskMb?: number;
      cpuPercent?: number;
      allocations?: { ip: string; ports: number[] }[];
    };
    const nodes = read<NodeRecord[]>(LS.nodes, []);
    const id = rid(6);
    const token = rid(20);
    const tokenId = rid(8);
    const panelId = rid(8);
    const node: NodeRecord = {
      id,
      name: b.name,
      fqdn: b.fqdn,
      ramMb: b.ramMb ?? 4096,
      diskMb: b.diskMb ?? 51200,
      cpuPercent: b.cpuPercent ?? 400,
      ramUsedMb: 0,
      diskUsedMb: 0,
      cpuUsedPercent: 0,
      allocations: b.allocations ?? [{ ip: b.fqdn, ports: [25565, 25566, 25567] }],
      token,
      token_id: tokenId,
      panel_link: window.location.origin,
      panel_id: panelId,
      status: "OFFLINE",
    };
    write(LS.nodes, [...nodes, node]);
    return {
      id,
      token,
      // The shape your wings reads from nodes-server.json:
      nodeServerJson: {
        token,
        token_id: tokenId,
        panel_link: node.panel_link,
        panel_id: panelId,
      },
      installCmd: `curl -fsSL ${node.panel_link}/install.sh | sudo bash -s -- --token ${token} --token-id ${tokenId} --panel ${node.panel_link} --panel-id ${panelId}`,
    } as T;
  }

  // ---------- EGGS ----------
  if ((path === "/eggs" || path === "/admin/eggs") && method === "GET") {
    return read<EggRecord[]>(LS.eggs, []) as T;
  }
  if (path === "/admin/eggs" && method === "POST") {
    const eggs = read<EggRecord[]>(LS.eggs, []);
    const startup = body.startup as string | undefined;
    // Detect startup files mentioned in the startup command, e.g. server.jar / app.py
    const startupFiles = startup
      ? Array.from(startup.matchAll(/[\w.-]+\.(jar|py|js|ts|sh|exe|phar)/g)).map((m) => m[0])
      : [];
    const egg: EggRecord = {
      id: rid(6),
      name: body.name,
      description: body.description,
      dockerImage: body.dockerImage,
      startup,
      env: body.env,
      ports: body.ports,
      raw: body,
      startupFiles: Array.from(new Set(startupFiles)),
    };
    write(LS.eggs, [...eggs, egg]);
    return egg as T;
  }
  {
    const m = path.match(/^\/admin\/eggs\/([^/]+)$/);
    if (m && method === "DELETE") {
      write(
        LS.eggs,
        read<EggRecord[]>(LS.eggs, []).filter((e) => e.id !== m[1]),
      );
      return {} as T;
    }
  }

  // ---------- SERVERS ----------
  if (path === "/servers" && method === "GET") {
    const stored = getStoredUser();
    const all = read<ServerRecord[]>(LS.servers, []);
    const role = stored ? (isAdminEmail(stored.email) ? "admin" : "user") : "user";
    const visible = role === "admin" ? all : all.filter((s) => s.ownerId === stored?.email);
    return visible.map((s) => ({
      id: s.id,
      name: s.name,
      status: s.status,
      cpu: 0,
      memory: s.limits?.ramMb ?? 0,
      uptime: "—",
    })) as T;
  }
  if ((path === "/servers" || path === "/servers/free") && method === "POST") {
    const stored = getStoredUser();
    if (!stored) throw new ApiError("Not authenticated", 401);
    const all = read<ServerRecord[]>(LS.servers, []);
    const id = rid8();
    const rec: ServerRecord = {
      id,
      name: body.name,
      ownerId: body.ownerId ?? stored.email,
      eggId: body.eggId ?? "",
      nodeId: body.nodeId ?? "",
      allocation: body.allocation,
      startupFile: body.startupFile,
      status: "stopped",
      limits: body.limits,
      createdAt: Date.now(),
    };
    write(LS.servers, [...all, rec]);
    return rec as T;
  }
  {
    const m = path.match(/^\/servers\/([^/]+)$/);
    if (m && method === "GET") {
      const s = read<ServerRecord[]>(LS.servers, []).find((x) => x.id === m[1]);
      if (!s) throw new ApiError("Not found", 404);
      return s as T;
    }
    if (m && method === "DELETE") {
      write(LS.servers, read<ServerRecord[]>(LS.servers, []).filter((x) => x.id !== m[1]));
      return {} as T;
    }
  }
  {
    const m = path.match(/^\/servers\/([^/]+)\/(start|stop|restart|kill)$/);
    if (m && method === "POST") {
      const all = read<ServerRecord[]>(LS.servers, []);
      const idx = all.findIndex((x) => x.id === m[1]);
      if (idx === -1) throw new ApiError("Not found", 404);
      all[idx] = {
        ...all[idx],
        status: m[2] === "start" || m[2] === "restart" ? "running" : "stopped",
      };
      write(LS.servers, all);
      return {} as T;
    }
  }

  throw new ApiError(`No mock handler for ${method} ${path}`, 404);
}
