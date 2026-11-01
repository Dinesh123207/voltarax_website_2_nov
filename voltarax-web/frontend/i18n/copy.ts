import { useMessages } from 'next-intl';
import { useCallback } from 'react';
import { formatCopy } from './phrase-id';
import english from '../messages/en.json';
// Literal UI copy is separate from operator-entered records and API enum values.
// Raw strings avoid interpreting braces in technical copy as ICU placeholders.
export function useCopy() {
  const messages = useMessages() as { Phrases?: Record<string, string> };
  return useCallback(function copyText<T>(text: T, values?: Record<string, string | number>): T {
    return formatCopy(text, english.Phrases, messages.Phrases, values);
  }, [messages]);
}
