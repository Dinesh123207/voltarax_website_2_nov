export type DataQuality = 'Measured' | 'Estimated' | 'Calculated' | 'Unavailable';

export function qualityFor(value: unknown, available: Exclude<DataQuality, 'Unavailable'>): DataQuality {
  return value == null || (typeof value === 'number' && !Number.isFinite(value)) ? 'Unavailable' : available;
}

export default function DataQualityBadge({ quality }: { quality: DataQuality }) {
  const c = useCopy();
  return <span className="inline-flex rounded border border-slate-600 px-1.5 py-0.5 text-[10px] font-medium text-slate-300">{c(quality)}</span>;
}
import { useCopy } from '@/i18n/copy';
