export async function api<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(`/api${path}`, { method, cache: 'no-store', headers: { 'Content-Type': 'application/json', 'X-Voltarax-Request': '1' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.message || 'This request is unavailable. Try refreshing.');
  return data as T;
}
export function ist(value: string | null) {
  if (!value || !Number.isFinite(new Date(value).getTime())) return 'Unavailable';
  return new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) + ' IST';
}
export type History = { id: string; action: string; actorId: string; note: string; at: string };
export type AlertRecord = { id: string; title: string; message: string; status: string; severity: string; createdAt: string; acknowledgedAt: string | null; resolvedAt: string | null; simulated: boolean; history?: History[] };
export type WorkOrder = { id: string; alertId: string; title: string; description: string; priority: string; status: string; assigneeId: string | null; dueAt: string | null; createdAt: string; updatedAt: string; version: number; history?: History[]; simulated: boolean };
