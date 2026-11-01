'use client';
import { FormEvent, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { useRouter } from '@/i18n/navigation';
import { useCopy } from '@/i18n/copy';


export default function LoginPage() {
  const copyText = useCopy();
  const router = useRouter();
  const [register, setRegister] = useState(false);
  const [verify, setVerify] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', code: '' });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const submit = async (e?: FormEvent, resend = false) => {
    e?.preventDefault(); setBusy(true); setMessage('');
    try {
      const path = resend ? 'otp/request' : verify ? 'otp/verify' : register ? 'register' : 'login';
      const body = { email: form.email, password: form.password, ...(path === 'register' ? { name: form.name } : {}), ...(path === 'otp/verify' ? { code: form.code } : {}) };
      const response = await fetch(`/api/auth/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-voltarax-request': '1' }, body: JSON.stringify(body) });
      const data = await response.json();
      if (!response.ok) { setMessage(data.message || 'Unable to continue. Check your details.'); return; }
      if (data.verificationRequired || resend) { setVerify(true); setMessage('Enter the six-digit code from your email. It expires in 10 minutes.'); return; }
      localStorage.removeItem('vv_token'); localStorage.removeItem('vv_user');
      router.replace('/dashboard');
    } catch { setMessage('Cannot reach the server. Please try again.'); }
    finally { setBusy(false); }
  };
  const field = (key: keyof typeof form, label: string, type = 'text') => <label className="block text-sm text-slate-300" htmlFor={key}>{copyText(label)}<input id={key} name={key} type={type} required value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} autoComplete={key === 'password' ? (register ? 'new-password' : 'current-password') : key === 'code' ? 'one-time-code' : key} minLength={key === 'password' && register ? 12 : undefined} maxLength={key === 'code' ? 6 : key === 'password' ? 72 : 254} inputMode={key === 'code' ? 'numeric' : undefined} pattern={key === 'code' ? '[0-9]{6}' : undefined} className="input-dark mt-2" /></label>;
  return <div className="min-h-screen flex items-center justify-center px-4 bg-[#0a0f0d]">
    <main className="glass rounded-2xl p-8 border border-green-500/20 w-full max-w-md space-y-5">
      <Link href="/" className="text-green-400 font-bold">{copyText("Voltarax")}</Link>
      <h1 className="text-2xl text-white font-bold">{copyText(verify ? 'Verify your email' : register ? 'Create an account' : 'Sign in')}</h1>
      <p className="text-sm text-slate-400">{copyText(register ? 'New accounts have viewer access. An administrator must assign your site.' : 'Use your verified email to access your account.')}</p>
      <form onSubmit={submit} className="space-y-4">
        {copyText(register && !verify && field('name', 'Name'))}
        {copyText(!verify && <>{copyText(field('email', 'Email address', 'email'))}{copyText(field('password', register ? 'Password (12–72 characters)' : 'Password', 'password'))}</>)}
        {copyText(verify && field('code', 'Six-digit verification code'))}
        <button className="btn-green w-full justify-center" disabled={busy} type="submit">{copyText(busy ? 'Please wait…' : verify ? 'Verify email' : register ? 'Create account' : 'Sign in')}</button>
      </form>
      <p role="status" className="text-sm text-slate-300">{copyText(message)}</p>
      {copyText(verify ? <><button type="button" disabled={busy} className="text-green-400 text-sm" onClick={() => submit(undefined, true)}>{copyText("Resend code")}</button><button type="button" className="text-slate-300 text-sm block" onClick={() => { setVerify(false); setForm({ ...form, code: '' }); }}>{copyText("Change sign-in details")}</button></> : <button type="button" className="text-green-400 text-sm" onClick={() => { setRegister(!register); setMessage(''); }}>{copyText(register ? 'Already have an account? Sign in' : 'Create a viewer account')}</button>)}
    </main>
  </div>;
}
