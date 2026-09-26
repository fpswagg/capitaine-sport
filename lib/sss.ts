import "server-only";

// Server-side client for the SSS API. The business key (sss_…) acts as the
// store owner, so it must never reach the browser.

const API_URL = process.env.SSS_API_URL?.replace(/\/+$/, "");
const STORE_ID = process.env.SSS_STORE_ID;
const API_KEY = process.env.SSS_API_KEY;

export class SssError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message);
  }
}

export function isSssConfigured() {
  return Boolean(API_URL && STORE_ID && API_KEY);
}

type RequestOptions = {
  method?: "GET" | "POST";
  body?: unknown;
  revalidate?: number | false;
};

export async function sssStoreRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  if (!isSssConfigured()) {
    throw new SssError(503, "SSS_NOT_CONFIGURED", "SSS_API_URL, SSS_STORE_ID et SSS_API_KEY sont requis.");
  }

  const url = `${API_URL}/api/v1/stores/${encodeURIComponent(STORE_ID!)}${path}`;
  const response = await fetch(url, {
    method: options.method ?? "GET",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      Accept: "application/json",
      ...(options.body !== undefined ? { "Content-Type": "application/json" } : {})
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    ...(options.method === "POST"
      ? { cache: "no-store" as const }
      : { next: { revalidate: options.revalidate ?? 30, tags: ["sss"] } })
  });

  const payload = (await response.json().catch(() => null)) as
    | { data?: T; error?: { code?: string; message?: string } }
    | null;

  if (!response.ok || !payload || payload.error) {
    throw new SssError(
      response.status,
      payload?.error?.code ?? "SSS_REQUEST_FAILED",
      payload?.error?.message ?? `SSS a répondu ${response.status}`
    );
  }

  return payload.data as T;
}
