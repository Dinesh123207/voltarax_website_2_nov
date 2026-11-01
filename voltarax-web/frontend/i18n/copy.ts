import { useMessages } from 'next-intl';
import { useCallback } from 'react';
import { phraseId } from './phrase-id';
// Literal UI copy is separate from operator-entered records and API enum values.
// Raw strings avoid interpreting braces in technical copy as ICU placeholders.
export function useCopy() {
  const messages = useMessages() as { Phrases?: Record<string, string> };
  return useCallback((text: string) => messages.Phrases?.[phraseId(text)] ?? text, [messages]);
}
