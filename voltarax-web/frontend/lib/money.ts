export function rupeesToPaise(value: string): number | null {
  const text = value.trim();
  if (!text) return null;
  if (!/^(0|[1-9]\d{0,7})(\.\d{1,2})?$/.test(text)) throw new Error('Enter INR with at most two decimal places.');
  const [whole, fraction = ''] = text.split('.');
  const paise = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(paise) || paise < 100 || paise > 1000000000) throw new Error('Price must be between INR 1 and INR 1,00,00,000, or left unset.');
  return paise;
}
export function inr(paise: number | null | undefined): string {
  return typeof paise === 'number' && Number.isSafeInteger(paise) && paise >= 0
    ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(paise / 100)
    : 'Price unset';
}
