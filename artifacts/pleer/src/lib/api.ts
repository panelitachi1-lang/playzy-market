/**
 * Generic fetch helper for direct API calls (endpoints not covered by generated hooks).
 * Uses the same base URL pattern as the workspace — relative paths work in web context.
 */
export async function apiFetch(path: string, init?: RequestInit): Promise<any> {
  const defaultHeaders: Record<string, string> = {};
  if (!(init?.body instanceof FormData)) {
    defaultHeaders["Content-Type"] = "application/json";
  }

  const res = await fetch(path, {
    credentials: "include",
    ...init,
    headers: {
      ...defaultHeaders,
      ...(init?.headers as Record<string, string> | undefined),
    },
  });

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const json = await res.json();
      message = json.error ?? message;
    } catch {}
    throw new Error(message);
  }

  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
