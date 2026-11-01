export function phraseId(text: string) {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index++) hash = Math.imul(hash ^ text.charCodeAt(index), 16777619);
  return 'p_' + (hash >>> 0).toString(16).padStart(8, '0');
}
export function lookupCopy<T>(text: T, source: Record<string, string>, translated: Record<string, string> = {}): T {
  if (typeof text !== 'string') return text;
  const trimmed = text.trim(), normalized = trimmed.replace(/\s+/g, ' '), id = phraseId(normalized);
  // A hash is an index, never evidence that an opaque record/key is UI copy.
  if (source[id] !== normalized || translated[id] == null) return text;
  return (text.slice(0, text.indexOf(trimmed)) + translated[id] + text.slice(text.indexOf(trimmed) + trimmed.length)) as T;
}
