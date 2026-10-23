/** Dashboard settings from the environment (see .env.example). Server-only. */

function clean(value: string | undefined): string {
  return (value ?? "").trim();
}

export const config = {
  /** The SSS business this site belongs to (id or slug). */
  storeId: clean(process.env.SSS_STORE_ID),
  /** SSS API origin, without a trailing slash (SSS_API_URL may end with /api/v1). */
  apiUrl: (clean(process.env.SSS_API_URL) || "https://sss-api.fpswagg.site").replace(/\/+$/, "").replace(/\/api\/v1$/, ""),
  siteUrl: (clean(process.env.SITE_URL) || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "") || "http://localhost:3000").replace(/\/+$/, ""),
  /** "Sign in with SSS" (OAuth) for /dashboard. Empty client id = dashboard off. */
  oauthClientId: clean(process.env.SSS_OAUTH_CLIENT_ID),
  oauthClientSecret: clean(process.env.SSS_OAUTH_CLIENT_SECRET),
  oauthScope: clean(process.env.SSS_OAUTH_SCOPE) || "profile email business",
  /** Encrypts the sign-in cookie. At least 32 random characters in production. */
  sessionSecret: clean(process.env.SESSION_SECRET),
  /** The SSS web app, linked from the dashboard. */
  appUrl: (clean(process.env.SSS_APP_URL) || "https://sss.fpswagg.site").replace(/\/+$/, ""),
};
