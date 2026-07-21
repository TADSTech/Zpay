/**
 * API fetch wrapper — adds auth token automatically.
 */

let getTokenFn: (() => Promise<string>) | null = null;

export function setTokenProvider(fn: () => Promise<string>) {
  getTokenFn = fn;
}

async function getAuthHeader(): Promise<Record<string, string>> {
  if (!getTokenFn) return {};
  try {
    const token = await getTokenFn();
    return { Authorization: `Bearer ${token}` };
  } catch {
    return {};
  }
}

export async function apiGet<T = unknown>(path: string): Promise<T> {
  const headers = await getAuthHeader();
  const res = await fetch(path, { headers });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(errData.error || res.statusText);
  }
  return res.json();
}

export async function apiPost<T = unknown>(path: string, body: unknown): Promise<T> {
  const headers = await getAuthHeader();
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(errData.error || res.statusText);
  }
  return res.json();
}
