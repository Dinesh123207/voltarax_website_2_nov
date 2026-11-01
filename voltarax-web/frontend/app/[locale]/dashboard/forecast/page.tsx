'use client';
import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import DataQualityBadge from '@/components/ui/DataQualityBadge';
import { useCopy } from '@/i18n/copy';


type Metrics = { mae_mw: number; rmse_mw: number; r2: number | null };
type Metadata = { trained_at: number; validation: { model?: Metrics; baseline?: Metrics; split?: { train_rows: number; test_rows: number } } };
type Estimate = { estimated_current_power_kw: number | null; dataQuality: 'Estimated' | 'Unavailable'; reason: string;
  source_as_of: number | null; generated_at: number | null; valid_until: number | null; model_version: string | null; data_origin: string | null; model_metadata: Metadata | null; horizon_note: string };
type Hour = { hour: string; date_ist: string; kw: number; samples: number; dataQuality: string };
type ModelInfo = { model_version: string | null; trained_at: number | null; load_state: string; validation_status: string | null };
type Pipeline = { valid_until: number; model_states: Record<string, string>; model_info: Record<string, ModelInfo> };
type Drift = { status: string; valid_until?: number; models?: Record<string, { status: string; recent_rows?: number | null; max_psi?: number | null }> };
const ist = (stamp?: number | null) => stamp ? new Date(stamp * 1000).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false }) + ' IST' : 'Unavailable';
const number = (value?: number | null, digits = 3) => typeof value === 'number' && Number.isFinite(value) ? value.toFixed(digits) : 'Unavailable';

export default function ForecastPage() {
  const copyText = useCopy();
  const [data, setData] = useState<Estimate | null>(null);
  const [hourly, setHourly] = useState<Hour[]>([]);
  const [pipeline, setPipeline] = useState<Pipeline | null>(null);
  const [drift, setDrift] = useState<Drift | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = async () => {
    setLoading(true); setError(''); setData(null); setPipeline(null); setDrift(null); setHourly([]);
    try {
      const responses = await Promise.all(['/api/forecast', '/api/forecast/hourly', '/api/ai/status'].map(path => fetch(path, { cache: 'no-store' })));
      if (responses.some(response => !response.ok)) throw Error('Current estimates could not be loaded. Check your connection and site access.');
      const [estimate, hours, status] = await Promise.all(responses.map(response => response.json()));
      setData(estimate); setHourly(Array.isArray(hours) ? hours : []); setPipeline(status.pipeline || null); setDrift(status.drift || null);
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Estimates unavailable.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);
  useEffect(() => {
    if (!data?.valid_until) return;
    const timer = setTimeout(() => setData(previous => previous ? { ...previous, estimated_current_power_kw: null, dataQuality: 'Unavailable', valid_until: null, reason: 'Input or model expired. Refresh to check for a new estimate.' } : null), Math.max(0, data.valid_until * 1000 - Date.now()));
    return () => clearTimeout(timer);
  }, [data?.valid_until]);
  useEffect(() => {
    if (!pipeline?.valid_until) return;
    const timer = setTimeout(() => setPipeline(null), Math.max(0, pipeline.valid_until * 1000 - Date.now()));
    return () => clearTimeout(timer);
  }, [pipeline?.valid_until]);
  useEffect(() => {
    if (!drift?.valid_until) return;
    const timer = setTimeout(() => setDrift(null), Math.max(0, drift.valid_until * 1000 - Date.now()));
    return () => clearTimeout(timer);
  }, [drift?.valid_until]);
  const validation = data?.model_metadata?.validation;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <h1 className="text-2xl font-bold text-white">{copyText("Power estimates")}</h1>
        <button onClick={() => void load()} disabled={loading} className="btn-green py-2 px-3 text-sm disabled:opacity-60">
          <RefreshCw size={14} aria-hidden="true" className={loading ? 'animate-spin' : ''}/> {copyText("Refresh")}</button>
      </div>
      <p className="text-sm text-amber-300">{copyText("Current conditions only. Future weather forecasts and validated confidence intervals are unavailable.")}</p>
      {copyText(error && <p role="alert" className="text-red-300">{copyText(error)}</p>)}
      {copyText(data?.data_origin === 'synthetic-test-inputs' && <p className="text-amber-300">{copyText("Synthetic test inputs · these results do not establish real-site accuracy.")}</p>)}
      <section className="stat-card space-y-3" aria-busy={loading}>
        <h2 className="text-lg font-semibold text-white">{copyText("Estimated current power")}</h2>
        <DataQualityBadge quality={data?.dataQuality || 'Unavailable'} />
        <p className="text-3xl text-green-400">{copyText(loading ? 'Loading…' : number(data?.estimated_current_power_kw, 6))}{copyText(data?.estimated_current_power_kw != null && ' kW')}</p>
        <p className="text-sm text-slate-300">{copyText(data?.reason || 'No current estimate loaded.')}</p>
        <dl className="text-sm text-slate-400 space-y-1">
          <div><dt className="inline">{copyText("Input as of: ")}</dt><dd className="inline">{copyText(ist(data?.source_as_of))}</dd></div>
          <div><dt className="inline">{copyText("Result published: ")}</dt><dd className="inline">{copyText(ist(data?.generated_at))}</dd></div>
          <div><dt className="inline">{copyText("Model: ")}</dt><dd className="inline break-all">{copyText(data?.model_version || 'Unavailable')}</dd></div>
          <div><dt className="inline">{copyText("Model trained: ")}</dt><dd className="inline">{copyText(ist(data?.model_metadata?.trained_at))}</dd></div>
        </dl>
      </section>
      <section className="stat-card space-y-3">
        <h2 className="text-lg text-white font-semibold">{copyText("Future energy · Unavailable")}</h2>
        <p className="text-sm text-slate-300">{copyText(data?.horizon_note || 'A verified site and suitable forecast weather are required.')}</p>
        <p className="text-sm text-slate-400">{copyText("No six-hour, daily or seven-day values are calculated from unchanged current conditions.")}</p>
      </section>
      {validation?.model && <section className="stat-card space-y-3">
        <h2 className="text-lg text-white font-semibold">{copyText("Chronological validation")}</h2>
        <p className="text-sm text-slate-300">{copyText("Oldest 80% training, newest 20% held out. Metrics describe recorded training inputs; device calibration and field accuracy remain unverified.")}</p>
        <div className="overflow-x-auto"><table className="w-full text-sm text-left">
          <caption className="sr-only">{copyText("Current-power errors compared with the training-only engineering baseline")}</caption>
          <thead><tr className="text-slate-300"><th scope="col">{copyText("Metric")}</th><th scope="col">{copyText("Model")}</th><th scope="col">{copyText("Engineering baseline")}</th></tr></thead>
          <tbody className="text-slate-400">{(['mae_mw', 'rmse_mw', 'r2'] as const).map(key => <tr key={key}>
            <th scope="row" className="py-2">{key === 'mae_mw' ? 'MAE (mW)' : key === 'rmse_mw' ? 'RMSE (mW)' : 'R²'}</th>
            <td>{number(validation.model?.[key])}</td><td>{number(validation.baseline?.[key])}</td>
          </tr>)}</tbody>
        </table></div>
        <p className="text-sm text-slate-400">{copyText("Training rows: ")}{copyText(validation.split?.train_rows ?? 'Unavailable')} {copyText(" · Held-out rows: ")}{copyText(validation.split?.test_rows ?? 'Unavailable')}</p>
      </section>}
      <section className="stat-card space-y-3">
        <h2 className="text-lg text-white font-semibold">{copyText("Model availability")}</h2>
        <p className="text-sm text-slate-400">{copyText("A recent publication cannot refresh an old input or expired model. Unusual patterns are estimates, not confirmed faults; physical health remains unavailable.")}</p>
        {pipeline ? <ul className="space-y-3 text-sm text-slate-300">{Object.entries(pipeline.model_states).map(([name, state]) => <li key={name}>
          <span className="font-semibold capitalize">{copyText(name)}: </span>{copyText(state.replaceAll('_', ' '))}
          <span className="block text-slate-400 break-all">{copyText(pipeline.model_info[name]?.model_version || 'No validated version')} {copyText(" · Trained ")}{copyText(ist(pipeline.model_info[name]?.trained_at))}</span>
        </li>)}</ul> : <p className="text-sm text-slate-400">{copyText("No fresh validated pipeline status available.")}</p>}
      </section>
      <section className="stat-card space-y-3">
        <h2 className="text-lg text-white font-semibold">{copyText("Today’s recorded hourly averages (IST)")}</h2>
        <p className="text-sm text-slate-400">{copyText("Calculated from up to the latest 2,000 readings within today. Missing intervals stay absent; sample averages are not time-weighted energy or a forecast.")}</p>
        {hourly.length ? <div className="overflow-x-auto"><table className="w-full text-left text-sm">
          <caption className="sr-only">{copyText("Available recorded samples by hour, in Indian Standard Time")}</caption>
          <thead className="text-slate-300"><tr><th scope="col">{copyText("Date / hour IST")}</th><th scope="col">{copyText("Average kW")}</th><th scope="col">{copyText("Samples")}</th><th scope="col">{copyText("Quality")}</th></tr></thead>
          <tbody className="text-slate-400">{hourly.map(row => <tr key={row.hour}><th scope="row" className="py-2">{copyText(row.date_ist)} {copyText(row.hour)}</th><td>{copyText(number(row.kw, 6))}</td><td>{copyText(row.samples)}</td><td>{copyText(row.dataQuality)}</td></tr>)}</tbody>
        </table></div> : <p className="text-sm text-slate-400">{copyText(loading ? 'Loading…' : 'No valid readings available for today.')}</p>}
      </section>
      <section className="stat-card space-y-3">
        <h2 className="text-lg text-white font-semibold">{copyText("Input distribution check")}</h2>
        <p className="text-sm text-slate-400">{copyText("Training-reference PSI compares light and temperature with up to 500 new daylight samples. At least 50 are required. The initial 0.2 review threshold is an assumption, not validated site accuracy or a fault diagnosis.")}</p>
        {drift?.status === 'ok' && drift.models ? <ul className="space-y-2 text-sm text-slate-300">{Object.entries(drift.models).map(([name, row]) => <li key={name}>
          <span className="capitalize">{copyText(name)}</span>: {copyText(row.status.replaceAll('_', ' '))} {copyText(" · New samples ")}{copyText(row.recent_rows ?? 'Unavailable')} {copyText(" · PSI ")}{copyText(number(row.max_psi))}
        </li>)}</ul> : <p className="text-sm text-slate-400">{copyText("No fresh validated distribution check available.")}</p>}
      </section>
    </div>
  );
}
