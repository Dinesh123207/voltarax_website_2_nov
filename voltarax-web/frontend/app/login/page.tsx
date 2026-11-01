'use client';
import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Zap, Mail, Lock, Eye, EyeOff, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';


export default function LoginPage() {
  const router = useRouter();
  const [form,      setForm]      = useState({ email: '', password: '' });
  const [showPass,  setShowPass]  = useState(false);
  const [loading,   setLoading]   = useState(false);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const r = await fetch('/api/auth/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(form),
      });
      const d = await r.json();
      if (d.success) {
        localStorage.setItem('vv_token', d.token);
        localStorage.setItem('vv_user',  JSON.stringify(d.user));
        toast.success(`Welcome back, ${d.user.name}!`);
        router.push('/dashboard');
      } else {
        toast.error(d.message || 'Login failed.');
      }
    } catch {
      toast.error('Cannot reach server. Check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[#0a0f0d] bg-grid">
      {/* Glow */}
      <div className="absolute inset-0 bg-gradient-radial from-green-950/30 via-transparent to-transparent pointer-events-none" />

      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="glass rounded-2xl p-8 border border-green-500/15">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-700 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/20">
              <Zap size={20} className="text-black" />
            </div>
            <div>
              <div className="font-bold text-white text-lg">Voltarax</div>
              <div className="text-xs text-green-600 font-mono">Secure Sign In</div>
            </div>
          </div>

          <h1 className="text-2xl font-black text-white mb-1">Welcome back</h1>
          <p className="text-slate-500 text-sm mb-8">
            Sign in to access the Voltarax Solar Intelligence dashboard.
          </p>

          <form onSubmit={onSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="text-xs text-slate-400 font-medium mb-1.5 block">
                Email address
              </label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  name="email" type="email" required
                  value={form.email} onChange={onChange}
                  placeholder="you@company.com"
                  className="input-dark pl-9"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="text-xs text-slate-400 font-medium mb-1.5 block">
                Password
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  name="password" type={showPass ? 'text' : 'password'} required
                  value={form.password} onChange={onChange}
                  placeholder="••••••••"
                  className="input-dark pl-9 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn-green w-full justify-center py-3.5 mt-2 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  Signing in...
                </>
              ) : (
                <>Sign In <ChevronRight size={16} /></>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-600">
            <Link href="/" className="hover:text-green-400 transition-colors">
              ← Back to Voltarax.in
            </Link>
          </div>
        </div>

        {/* Patent badge */}
        <div className="text-center mt-4">
          <span className="text-xs text-slate-700 font-mono">
            Authorised users only
          </span>
        </div>
      </div>
    </div>
  );
}
