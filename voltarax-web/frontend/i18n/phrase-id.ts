export function phraseId(text: string) {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index++) hash = Math.imul(hash ^ text.charCodeAt(index), 16777619);
  return 'p_' + (hash >>> 0).toString(16).padStart(8, '0');
}
