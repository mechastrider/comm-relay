export type Json =
  | null
  | boolean
  | number
  | string
  | Json[]
  | { [key: string]: Json };
export type JsonObject = { [key: string]: Json };

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly fields: Record<string, string> = {},
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class NetworkError extends Error {
  constructor(cause: unknown) {
    super("Connection unavailable", { cause });
    this.name = "NetworkError";
  }
}

export async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData))
    headers.set("Content-Type", "application/json");
  let response: Response;
  try {
    response = await fetch(path, { ...init, headers });
  } catch (cause) {
    if (
      init.signal?.aborted ||
      (cause instanceof Error && cause.name === "AbortError")
    )
      throw cause;
    throw new NetworkError(cause);
  }
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const details =
      body && typeof body === "object" ? (body as Record<string, unknown>) : {};
    const fields: Record<string, string> = {};
    if (details.fields && typeof details.fields === "object") {
      for (const [key, value] of Object.entries(details.fields))
        if (typeof value === "string") fields[key] = value;
    }
    throw new ApiError(
      response.status,
      typeof details.error === "string"
        ? details.error
        : `HTTP ${response.status}`,
      fields,
    );
  }
  return body as T;
}

export function post<T>(
  path: string,
  body: unknown = {},
  signal?: AbortSignal,
): Promise<T> {
  return request<T>(path, {
    method: "POST",
    body: JSON.stringify(body),
    signal,
  });
}

export function upload<T>(
  path: string,
  body: FormData,
  signal?: AbortSignal,
): Promise<T> {
  return request<T>(path, { method: "POST", body, signal });
}
