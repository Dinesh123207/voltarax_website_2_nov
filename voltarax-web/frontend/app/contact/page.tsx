'use client';
import Navbar from '@/components/ui/Navbar';
import Footer from '@/components/ui/Footer';
import { Suspense, useState, FormEvent } from 'react';
import { Mail, MapPin, Phone, Send, Calendar, CheckCircle } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';

// Public contact details come from the environment so nothing is hard-coded in source.
const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || '';
const CONTACT_PHONE = process.env.NEXT_PUBLIC_CONTACT_PHONE || '';

function ContactForm() {
  const searchParams = useSearchParams();
  const isDemo       = searchParams.get('type') === 'demo';

  const [form, setForm]       = useState({
    name: '', email: '', company: '', phone: '',
    subject: isDemo ? 'Request a Live Demo' : '',
    message: '', type: isDemo ? 'demo' : 'general',
  });
  const [loading,  setLoading]  = useState(false);
  const [success,  setSuccess]  = useState(false);

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const endpoint = form.type === 'demo' ? '/api/demo' : '/api/contact';
      const r = await fetch(endpoint, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(form),
      });
      const data = await r.json();
      if (data.success) {
        setSuccess(true);
        toast.success(data.message);
      } else {
        toast.error(data.message || 'Something went wrong.');
      }
    } catch {
      toast.error(CONTACT_EMAIL ? `Server unreachable. Email us at ${CONTACT_EMAIL}` : 'Server unreachable. Please try again shortly.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="relative z-10 pt-24">

        <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <div className="section-tag mx-auto w-fit"><Mail size={12} /> Contact</div>
            <h1 className="text-4xl font-black text-white mt-3 mb-3">
              {isDemo ? 'Request a Live Demo' : 'Get in Touch'}
            </h1>
            <p className="text-slate-400 max-w-lg mx-auto">
              {isDemo
                ? 'Schedule a personalised demo of VoltVision AI for your solar installation.'
                : 'Submit an inquiry for the team to review.'}
            </p>
          </div>

          <div className="grid lg:grid-cols-5 gap-10 max-w-5xl mx-auto">

            {/* Contact info */}
            <div className="lg:col-span-2 space-y-6">
              {[
                { icon: MapPin, title: 'Location',  lines: ['Jaipur, Rajasthan', 'India'] },
                ...(CONTACT_EMAIL ? [{ icon: Mail,  title: 'Email', lines: [CONTACT_EMAIL] }] : []),
                ...(CONTACT_PHONE ? [{ icon: Phone, title: 'Phone', lines: [CONTACT_PHONE] }] : []),
                { icon: Calendar, title: 'Demo',    lines: ['Use the form to request a session'] },
              ].map(({ icon: Icon, title, lines }) => (
                <div key={title} className="flex gap-4">
                  <div className="w-10 h-10 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center flex-shrink-0">
                    <Icon size={16} className="text-green-400" />
                  </div>
                  <div>
                    <div className="text-white font-semibold text-sm mb-0.5">{title}</div>
                    {lines.map(l => <div key={l} className="text-slate-400 text-sm">{l}</div>)}
                  </div>
                </div>
              ))}

              {/* Quick links */}
              <div className="stat-card mt-4">
                <div className="text-green-500 text-xs font-bold font-mono mb-3">QUICK ACCESS</div>
                <div className="space-y-2">
                  {[
                    { label: 'Sign in to the dashboard', href: '/login' },
                  ].map(link => (
                    <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-slate-400 hover:text-green-400 transition-colors">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      {link.label} →
                    </a>
                  ))}
                </div>
              </div>
            </div>

            {/* Form */}
            <div className="lg:col-span-3">
              {success ? (
                <div className="stat-card text-center py-16">
                  <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
                  <h3 className="text-white font-bold text-xl mb-2">Message Sent!</h3>
                  <p className="text-slate-400">
                    {isDemo
                      ? "Your demo request has been recorded."
                      : "Your inquiry has been recorded."}
                  </p>
                  <button onClick={() => setSuccess(false)}
                    className="btn-outline mt-6 px-6 py-2.5 text-sm">
                    Send Another
                  </button>
                </div>
              ) : (
                <form onSubmit={onSubmit} className="stat-card space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-slate-400 font-medium mb-1.5 block">Name *</label>
                      <input name="name" value={form.name} onChange={onChange}
                        required placeholder="Your name"
                        className="input-dark" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 font-medium mb-1.5 block">Email *</label>
                      <input name="email" type="email" value={form.email} onChange={onChange}
                        required placeholder="your@email.com"
                        className="input-dark" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-slate-400 font-medium mb-1.5 block">Company</label>
                      <input name="company" value={form.company} onChange={onChange}
                        placeholder="Company name"
                        className="input-dark" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 font-medium mb-1.5 block">Phone</label>
                      <input name="phone" value={form.phone} onChange={onChange}
                        placeholder="+91 ..."
                        className="input-dark" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 font-medium mb-1.5 block">Type</label>
                    <select name="type" value={form.type} onChange={onChange}
                      className="input-dark">
                      <option value="general">General Inquiry</option>
                      <option value="demo">Live Demo Request</option>
                      <option value="partnership">Partnership</option>
                      <option value="press">Press / Media</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 font-medium mb-1.5 block">Subject *</label>
                    <input name="subject" value={form.subject} onChange={onChange}
                      required placeholder="How can we help?"
                      className="input-dark" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 font-medium mb-1.5 block">Message *</label>
                    <textarea name="message" value={form.message} onChange={onChange}
                      required rows={5}
                      placeholder={isDemo
                        ? 'Tell us about your solar installation, panel count, and what you\'d like to see in the demo...'
                        : 'Your message...'
                      }
                      className="input-dark resize-none" />
                  </div>
                  <button type="submit" disabled={loading}
                    className="btn-green w-full justify-center py-3.5 disabled:opacity-60 disabled:cursor-not-allowed">
                    {loading
                      ? <><span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> Sending...</>
                      : <><Send size={16} /> {isDemo ? 'Request Demo' : 'Send Message'}</>
                    }
                  </button>
                </form>
              )}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

export default function ContactPage() {
  return (
    <Suspense fallback={null}>
      <ContactForm />
    </Suspense>
  );
}
