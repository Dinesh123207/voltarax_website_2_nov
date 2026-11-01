
import { useCopy } from '@/i18n/copy';
export default function DashboardLoading() {
  const copyText = useCopy();
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-64 rounded bg-green-900/20" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="stat-card h-28" />
        ))}
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="stat-card h-48" />
        <div className="stat-card h-48" />
      </div>
    </div>
  );
}
