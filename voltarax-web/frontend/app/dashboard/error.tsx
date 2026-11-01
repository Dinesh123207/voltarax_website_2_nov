'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, LogIn } from 'lucide-react';
import Link from 'next/link';

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Dashboard route error:', error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="stat-card max-w-lg w-full text-center py-12">
        <AlertTriangle size={40} className="mx-auto mb-4 text-amber-400" />
        <h1 className="text-xl font-bold text-white">Dashboard section could not load</h1>
        <p className="text-slate-500 text-sm mt-2">
          The navigation is still available. Try the section again or sign in again if your session expired.
        </p>
        <div className="flex justify-center gap-3 mt-6">
          <button onClick={() => reset()} className="btn-green px-4 py-2 text-sm">
            <RefreshCw size={14} /> Try again
          </button>
          <Link href="/login" className="btn-outline px-4 py-2 text-sm">
            <LogIn size={14} /> Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
