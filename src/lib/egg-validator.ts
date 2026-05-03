// Validates an Egg JSON definition. Returns a list of human-readable errors.
// An egg must define: name, dockerImage, startup command, env vars (object), ports (array of numbers).

export interface EggDefinition {
  name: string;
  description?: string;
  dockerImage: string;
  startup: string;
  env?: Record<string, string | number | boolean>;
  ports: number[];
}

export function validateEgg(input: unknown): { ok: true; egg: EggDefinition } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, errors: ["Egg JSON must be an object."] };
  }
  const o = input as Record<string, unknown>;

  if (typeof o.name !== "string" || !o.name.trim()) errors.push("`name` is required and must be a non-empty string.");
  if (o.description !== undefined && typeof o.description !== "string") errors.push("`description` must be a string if provided.");

  if (typeof o.dockerImage !== "string" || !o.dockerImage.trim()) {
    errors.push("`dockerImage` is required (e.g. \"itzg/minecraft-server:latest\").");
  } else if (!/^[\w./:-]+$/.test(o.dockerImage)) {
    errors.push("`dockerImage` contains invalid characters.");
  }

  if (typeof o.startup !== "string" || !o.startup.trim()) {
    errors.push("`startup` is required (the command run inside the container).");
  }

  if (o.env !== undefined) {
    if (!o.env || typeof o.env !== "object" || Array.isArray(o.env)) {
      errors.push("`env` must be an object of key/value pairs.");
    } else {
      for (const [k, v] of Object.entries(o.env)) {
        if (!/^[A-Z_][A-Z0-9_]*$/.test(k)) {
          errors.push(`env var \`${k}\` must be UPPER_SNAKE_CASE.`);
        }
        if (!["string", "number", "boolean"].includes(typeof v)) {
          errors.push(`env var \`${k}\` must be a string, number, or boolean.`);
        }
      }
    }
  }

  if (!Array.isArray(o.ports) || o.ports.length === 0) {
    errors.push("`ports` is required and must be a non-empty array of port numbers.");
  } else {
    o.ports.forEach((p, i) => {
      if (typeof p !== "number" || !Number.isInteger(p) || p < 1 || p > 65535) {
        errors.push(`ports[${i}] must be an integer between 1 and 65535 (got ${JSON.stringify(p)}).`);
      }
    });
  }

  if (errors.length) return { ok: false, errors };
  return { ok: true, egg: o as unknown as EggDefinition };
}
