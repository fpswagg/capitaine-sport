import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { config } from "./config";

/**
 * "Sign in with SSS" (OAuth 2.0, authorization code + PKCE). See docs/oauth.md.
 *
 * The site has no database: the visitor's tokens live in an encrypted, HttpOnly
 * cookie (AES-256-GCM, key from SESSION_SECRET). The browser never sees a token.
 */

export const CALLBACK_PATH = "/auth/sss/callback";
const SESSION_COOKIE = "sss_session";
const FLOW_COOKIE = "sss_oauth";
const FLOW_TTL_S = 10 * 60;
/** SSS refresh tokens live 60 days: the cookie does too. */
const SESSION_TTL_S = 60 * 24 * 60 * 60;
/** Refresh a little before the access token runs out. */
const EARLY_REFRESH_MS = 60_000;
const DEV_SECRET = "dev-only-session-secret-change-me-0000000000";

export type SssBusiness = { id: string; slug: string; name: string; logoUrl?: string | null; role?: string };

/** What GET /api/v1/oauth/userinfo returns (fields depend on the scopes granted). */
export type SssUser = {
  sub: string;
  name: string | null;
  picture: string | null;
  email?: string | null;
  email_verified?: boolean;
  businesses?: SssBusiness[];
  business?: SssBusiness | null;
};

export type SssSession = {
  user: SssUser;
  accessToken: string;
  refreshToken: string;
  /** ms since epoch */
  expiresAt: number;
  scope: string;
};

type Flow = { state: string; verifier: string; next: string };

type TokenAnswer = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
  business?: SssBusiness;
};

export class SssAuthError extends Error {
  constructor(
    readonly code: string,
    message: string
  ) {
    super(message);
  }
}

// ── Setup ────────────────────────────────────────────────────────────────────

const secure = config.siteUrl.startsWith("https://");

function secret(): string | null {
  if (config.sessionSecret.length >= 32) return config.sessionSecret;
  return process.env.NODE_ENV === "production" ? null : DEV_SECRET;
}

/** Why the feature cannot run, or null when it can. Empty client id = off on purpose. */
export function authProblem(): string | null {
  if (!config.oauthClientId) return "Set SSS_OAUTH_CLIENT_ID to turn on Sign in with SSS.";
  if (!secret()) return "Set SESSION_SECRET (at least 32 characters) to turn on Sign in with SSS.";
  return null;
}

export function authEnabled(): boolean {
  return Boolean(config.oauthClientId);
}

export function redirectUri(): string {
  return `${config.siteUrl}${CALLBACK_PATH}`;
}

/** Only a path on this site (never another site: no open redirect). */
export function safeNext(value: string | null | undefined): string {
  return typeof value === "string" && /^\/(?![/\\])/.test(value) && value.length <= 500 ? value : "/dashboard";
}

// ── Encrypted cookies ────────────────────────────────────────────────────────

function key(): Buffer {
  return createHash("sha256").update(secret() ?? "").digest();
}

function seal(value: unknown): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const body = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString("base64url");
}

function unseal<T>(raw: string | undefined): T | null {
  if (!raw || !secret()) return null;
  try {
    const buf = Buffer.from(raw, "base64url");
    const decipher = createDecipheriv("aes-256-gcm", key(), buf.subarray(0, 12));
    decipher.setAuthTag(buf.subarray(12, 28));
    return JSON.parse(Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()]).toString("utf8")) as T;
  } catch {
    return null; // tampered, or SESSION_SECRET changed
  }
}

function sameText(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

// ── Talking to SSS ───────────────────────────────────────────────────────────

/** Client authentication: Basic with the secret (server app), or client_id alone (public app). */
async function tokenRequest(path: "token" | "revoke", params: Record<string, string>): Promise<Response> {
  const headers: Record<string, string> = { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" };
  const body = new URLSearchParams(params);
  if (config.oauthClientSecret) {
    const basic = `${encodeURIComponent(config.oauthClientId)}:${encodeURIComponent(config.oauthClientSecret)}`;
    headers.Authorization = `Basic ${Buffer.from(basic).toString("base64")}`;
  } else {
    body.set("client_id", config.oauthClientId);
  }
  return fetch(`${config.apiUrl}/api/v1/oauth/${path}`, { method: "POST", headers, body, cache: "no-store" });
}

async function tokens(params: Record<string, string>): Promise<TokenAnswer> {
  const res = await tokenRequest("token", params);
  const data = (await res.json().catch(() => ({}))) as Partial<TokenAnswer> & { error?: string; error_description?: string };
  if (!res.ok || !data.access_token || !data.refresh_token) {
    throw new SssAuthError(data.error || "server_error", data.error_description || `SSS answered ${res.status}`);
  }
  return data as TokenAnswer;
}

async function userInfo(accessToken: string): Promise<SssUser> {
  const res = await fetch(`${config.apiUrl}/api/v1/oauth/userinfo`, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) throw new SssAuthError("userinfo_failed", `SSS answered ${res.status} to userinfo`);
  return (await res.json()) as SssUser;
}

function toSession(answer: TokenAnswer, user: SssUser): SssSession {
  return {
    user,
    accessToken: answer.access_token,
    refreshToken: answer.refresh_token,
    expiresAt: Date.now() + answer.expires_in * 1000,
    scope: answer.scope,
  };
}

// ── The flow (route handlers only: they set cookies) ─────────────────────────

/** Step 1: remember state + PKCE verifier in a short cookie, and return SSS's authorize URL. */
export async function startSignIn(next: string | null): Promise<string> {
  const flow: Flow = { state: randomBytes(16).toString("base64url"), verifier: randomBytes(32).toString("base64url"), next: safeNext(next) };
  (await cookies()).set(FLOW_COOKIE, seal(flow), { httpOnly: true, secure, sameSite: "lax", path: "/auth/sss", maxAge: FLOW_TTL_S });
  const url = new URL(`${config.apiUrl}/api/v1/oauth/authorize`);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", config.oauthClientId);
  url.searchParams.set("redirect_uri", redirectUri());
  url.searchParams.set("scope", config.oauthScope);
  url.searchParams.set("state", flow.state);
  url.searchParams.set("code_challenge", createHash("sha256").update(flow.verifier).digest("base64url"));
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
}

/** Step 2: SSS sent the visitor back. Check state, trade the code, read who it is. Returns `next`. */
export async function finishSignIn(params: URLSearchParams): Promise<string> {
  const jar = await cookies();
  const flow = unseal<Flow>(jar.get(FLOW_COOKIE)?.value);
  jar.delete({ name: FLOW_COOKIE, path: "/auth/sss" });
  if (!flow) throw new SssAuthError("expired", "The sign-in took too long or was started elsewhere. Try again.");
  const state = params.get("state") ?? "";
  if (!sameText(state, flow.state)) throw new SssAuthError("bad_state", "This sign-in link is not the one we started. Try again.");
  const error = params.get("error");
  if (error) throw new SssAuthError(error, params.get("error_description") || error);
  const code = params.get("code");
  if (!code) throw new SssAuthError("invalid_request", "SSS sent no code.");
  const answer = await tokens({ grant_type: "authorization_code", code, redirect_uri: redirectUri(), code_verifier: flow.verifier });
  const user = await userInfo(answer.access_token);
  await saveSession(toSession(answer, user));
  return flow.next;
}

async function saveSession(session: SssSession) {
  (await cookies()).set(SESSION_COOKIE, seal(session), { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: SESSION_TTL_S });
}

/** Sign out here and end the connection on SSS (revoking the refresh token ends the grant). */
export async function signOut() {
  const jar = await cookies();
  const session = unseal<SssSession>(jar.get(SESSION_COOKIE)?.value);
  jar.delete(SESSION_COOKIE);
  if (session) await tokenRequest("revoke", { token: session.refreshToken, token_type_hint: "refresh_token" }).catch(() => undefined);
}

// ── Reading the visitor ──────────────────────────────────────────────────────

/** The signed-in visitor, as saved at sign-in. Works in Server Components (read-only). */
export async function getSession(): Promise<SssSession | null> {
  return unseal<SssSession>((await cookies()).get(SESSION_COOKIE)?.value);
}

/**
 * A live access token, refreshed when it ran out (SSS rotates the refresh token, so
 * the new pair is saved). Route handlers and Server Functions only: it may set a cookie.
 * Null when nobody is signed in or SSS ended the connection.
 */
export async function getAccessToken(): Promise<string | null> {
  const session = await getSession();
  if (!session) return null;
  if (session.expiresAt - EARLY_REFRESH_MS > Date.now()) return session.accessToken;
  try {
    const answer = await tokens({ grant_type: "refresh_token", refresh_token: session.refreshToken });
    await saveSession(toSession(answer, session.user));
    return answer.access_token;
  } catch (err) {
    // invalid_grant: the person disconnected the site in SSS, or left the business.
    if (err instanceof SssAuthError && err.code === "invalid_grant") (await cookies()).delete(SESSION_COOKIE);
    return null;
  }
}

/**
 * Calls the SSS API as the signed-in visitor (`/api/v1/...`), refreshing the token when
 * needed. What it can reach depends on the scopes (docs/oauth.md). Route handlers only.
 */
export async function sssFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await getAccessToken();
  if (!token) throw new SssAuthError("signed_out", "Nobody is signed in with SSS.");
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  headers.set("Accept", "application/json");
  return fetch(`${config.apiUrl}${path}`, { ...init, headers, cache: "no-store" });
}

/** Fresh profile from SSS (also updates the copy kept in the cookie). Route handlers only. */
export async function refreshUser(): Promise<SssUser | null> {
  const res = await sssFetch("/api/v1/oauth/userinfo").catch(() => null);
  if (!res?.ok) return null;
  const user = (await res.json()) as SssUser;
  const session = await getSession();
  if (session) await saveSession({ ...session, user });
  return user;
}
