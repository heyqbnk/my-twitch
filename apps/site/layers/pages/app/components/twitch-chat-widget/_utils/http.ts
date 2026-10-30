/**
 * GET request returning JSON. 404 means "no data" (e.g. the channel has no account in the service).
 */
export async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T | null> {
  const res = await fetch(url, { signal });
  if (res.status === 404) {
    return null;
  }
  if (!res.ok) {
    throw new Error(`${url}: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

/**
 * Remembers a successful result. After a failure the next call repeats the request.
 */
export function cachedOnce<T>(load: () => Promise<T>): () => Promise<T> {
  let promise: Promise<T> | null = null;
  return () => {
    promise ??= load().catch((err: unknown) => {
      promise = null;
      throw err;
    });
    return promise;
  };
}
