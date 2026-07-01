import { timingSafeEqual } from "node:crypto";

export type AuthResult =
  | { ok: true }
  | { ok: false; status: 401 | 500; error: string };

export type SecretScope = "admin-or-cron" | "cron-only";

function nonEmpty(value: string | undefined): value is string {
  return Boolean(value?.trim());
}

export function getConfiguredSecrets(scope: SecretScope): string[] {
  const candidates = scope === "cron-only"
    ? [process.env.CRON_SECRET]
    : [process.env.ADMIN_SECRET, process.env.CRON_SECRET];
  return candidates.filter(nonEmpty).map((value) => value.trim());
}

export function getRequestToken(request: Request): string | null {
  const authorization = request.headers.get("authorization") ?? "";
  const prefix = "Bearer ";
  if (authorization.startsWith(prefix)) {
    const token = authorization.slice(prefix.length).trim();
    if (token) return token;
  }
  const queryToken = new URL(request.url).searchParams.get("token")?.trim();
  return queryToken || null;
}

function secretMatches(token: string, secret: string): boolean {
  const tokenBuffer = Buffer.from(token);
  const secretBuffer = Buffer.from(secret);
  return tokenBuffer.length === secretBuffer.length && timingSafeEqual(tokenBuffer, secretBuffer);
}

/** Authenticates refresh calls without logging or returning any configured secret. */
export function authorizeRefreshRequest(request: Request, scope: SecretScope = "admin-or-cron"): AuthResult {
  const secrets = getConfiguredSecrets(scope);
  if (secrets.length === 0) {
    return {
      ok: false,
      status: 500,
      error: scope === "cron-only"
        ? "CRON_SECRET is not configured"
        : "ADMIN_SECRET or CRON_SECRET is not configured"
    };
  }
  const token = getRequestToken(request);
  if (!token || !secrets.some((secret) => secretMatches(token, secret))) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }
  return { ok: true };
}
