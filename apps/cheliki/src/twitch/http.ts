/**
 * GET JSON; 404 считается «нет данных» (например, у канала нет аккаунта в сервисе)
 */
export async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T | null> {
  const res = await fetch(url, { signal });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`${url}: ${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

/**
 * Запоминает успешный результат; после ошибки следующий вызов повторит запрос
 */
export function cachedOnce<T>(load: () => Promise<T>): () => Promise<T> {
  let promise: Promise<T> | null = null;
  return () => {
    promise ??= load().catch(err => {
      promise = null;
      throw err;
    });
    return promise;
  };
}
