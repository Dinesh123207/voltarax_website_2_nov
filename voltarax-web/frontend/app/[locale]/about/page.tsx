import { pageMetadata } from '@/lib/seo';
import Navbar from '@/components/ui/Navbar';
import Footer from '@/components/ui/Footer';
import { Link } from '@/i18n/navigation';
import { useCopy } from '@/i18n/copy';

export const generateMetadata = pageMetadata("/about", "About Voltarax", "Renewable equipment monitoring, dated inspections and maintenance records, with setup and evidence requirements.");
export default function AboutPage() {
  const copyText = useCopy();
  return <><Navbar/><main className="mx-auto max-w-5xl px-4 pt-28 pb-20 space-y-12">
    <section className="space-y-5"><h1 className="text-4xl font-bold text-white">{copyText("About Voltarax")}</h1>
      <p className="text-lg text-slate-300">{copyText("Voltarax is a renewable equipment monitoring project. Its software combines site readings, current-condition estimates, dated manual inspections and maintenance records.")}</p>
      <p className="text-slate-400">{copyText("Availability depends on authorized hardware and configured services. Calibration, installation reliability and field performance require separate verification.")}</p>
    </section>
    <section className="stat-card space-y-4"><h2 className="text-2xl text-white font-semibold">{copyText("Project goals")}</h2>
      <p>{copyText("Make equipment data easier to review, preserve the basis of estimates, and keep a record of operator actions.")}</p>
      <p className="text-slate-400">{copyText("Missing data remains unavailable. Unusual patterns are estimates, not confirmed physical faults. A software record does not establish equipment condition or delivery.")}</p>
    </section>
    <section id="team" className="stat-card space-y-4"><h2 className="text-2xl text-white font-semibold">{copyText("Team details")}</h2><p>{copyText("Coming soon: names, roles and biographies await publication review.")}</p></section>
    <section id="incubation" className="stat-card space-y-4"><h2 className="text-2xl text-white font-semibold">{copyText("Public affiliations")}</h2><p>{copyText("Institutional affiliations are unavailable pending verification and publication permission.")}</p></section>
    <section id="clients" className="stat-card space-y-4"><h2 className="text-2xl text-white font-semibold">{copyText("Clients and deployments")}</h2><p>{copyText("No verified customer, deployment count or endorsement is published here.")}</p></section>
    <section id="patents" className="stat-card space-y-4"><h2 className="text-2xl text-white font-semibold">{copyText("Intellectual property")}</h2><p>{copyText("Patent and research-performance statements are unavailable until supporting evidence is reviewed.")}</p></section>
    <section className="space-y-4"><h2 className="text-2xl text-white font-semibold">{copyText("Research and future features")}</h2><p className="text-slate-300">{copyText("Coating material performance, true weather-ahead forecasts, autonomous energy dispatch and digital twins remain unverified or coming soon. Manual coating observations do not establish material chemistry or optical conversion.")}</p>
      <Link href="/technology" className="text-green-300 underline">{copyText("Review capabilities and limitations")}</Link>
    </section>
    <section className="space-y-4"><h2 className="text-2xl text-white font-semibold">{copyText("Contact")}</h2><p>{copyText("Registered location and legal entity details await confirmation. Public contact details appear only when configured.")}</p><Link href="/contact" className="btn-green">{copyText("Contact the project")}</Link></section>
  </main><Footer/></>;
}
