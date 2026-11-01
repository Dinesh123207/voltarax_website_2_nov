import Navbar from '@/components/ui/Navbar';
import Footer from '@/components/ui/Footer';
import { Link } from '@/i18n/navigation';
import { useCopy } from '@/i18n/copy';

const documents = {
  privacy: { title: 'Privacy draft', sections: [
    ['Status and operator details', 'This development draft is not an operational privacy notice or compliance certification. The legal operator, address, privacy contact, grievance process, processor locations and production retention schedule are not yet confirmed. Public collection requires a reviewed notice and working request process.'],
    ['Accounts and security', 'Account features use names, email addresses, password hashes, verification challenges, roles, site assignments and session records for registration, authentication and access control. Never send passwords or device keys in an inquiry or inspection note.'],
    ['Inquiries and site records', 'Contact/demo forms record the details you submit for review. Contact records also include the request IP address. Authorized site functions store telemetry, device identifiers, manual observations, photos, maintenance actions and audit timestamps. Images or notes may identify people; submit only material you are authorized to provide.'],
    ['Browser storage and optional services', 'The application uses a session cookie, a language-preference cookie and session storage for test checkout request keys. Optional SMTP, camera, queue and test-payment services depend on operator configuration. Razorpay Checkout is external and loads only on an explicit test-checkout action; its provider terms and data handling require review.'],
    ['Retention, requests and children', 'Production retention, deletion and backup schedules have not been approved. No automatic erasure deadline is promised. Access, correction, erasure, consent withdrawal, nomination and grievance workflows need an operational contact and review. The platform is intended for authorized site operators; age verification and guardian-consent workflows are not implemented.'],
    ['India legal review', 'Review scope includes the DPDP Act, 2023, the 2025 Rules and their phased commencement. Applicable provisions and later amendments must be checked by counsel for the actual launch date. This draft does not assert that the deployment complies with them.'],
  ] },
  terms: { title: 'Terms draft', sections: [
    ['Development and access', 'This is a development platform for renewable equipment monitoring. Account verification and site permissions are required for protected functions. Keep credentials private and use only sites, devices, cameras and material you are authorized to access.'],
    ['Evidence and equipment limits', 'Measured, estimated, calculated and unavailable labels describe the stated basis of data. Sensor calibration, field reliability and model accuracy are not established by a software screen. A device acknowledgement does not confirm a physical relay contact. Qualified operators must verify equipment and switching conditions.'],
    ['Reports and future features', 'Reports require recorded coverage and reviewed factor evidence. They do not certify carbon credits or provide independent assurance. Manual coating observations do not establish material chemistry or lifetime. Weather-ahead forecasting, autonomous dispatch and other unfinished features remain coming soon.'],
    ['Orders and service terms', 'Commerce supports test transactions only. Prices are unset unless an administrator enters a reviewed value. No recurring billing, automatic site access, delivery, warranty, service-level promise or real-funds purchase is established. Seller identity, fulfilment, support, tax and commercial terms require approval before any sale.'],
    ['Review before use', 'Ownership, permitted use, liability, applicable law and dispute provisions need a lawyer and the confirmed operator. No jurisdiction, court venue or waiver of statutory rights is invented here. These draft pages are not final contractual terms.'],
  ] },
  refunds: { title: 'Refund and cancellation draft', sections: [
    ['Test mode only', 'No live payment or real refund is enabled. A test receipt is not a GST tax invoice, proof of real payment or proof of delivery. Review the stored order and amount before any test checkout.'],
    ['Closing or uncertain checkout', 'Closing Checkout does not establish payment or cancellation. Browser signature verification alone does not confirm capture. Refresh the existing order; if the gateway result is uncertain, retain its reference and ask an administrator to reconcile it instead of creating another purchase.'],
    ['Test refund records', 'An administrator can record a reviewed test refund request and an immutable submitted reference. This application does not call a refund API. Only a verified signed processed-refund event confirms the recorded refund amount. A manual request does not promise that money has moved.'],
    ['Real cancellation policy pending', 'Eligibility, cancellation windows, return conditions, fulfilment, refund timelines, seller contact and any lawful charges are unset. No seven-day, instant-refund or no-refund policy is promised. The confirmed operator and legal reviewer must approve the real policy before accepting real orders.'],
  ] },
};
export default function LegalDocument({ kind }: { kind: keyof typeof documents }) {
  const copyText = useCopy(), document = documents[kind];
  return <><Navbar/><main id="main-content" tabIndex={-1} className="mx-auto max-w-4xl px-4 pt-28 pb-20 space-y-8">
    <p className="rounded-lg border border-amber-400/50 p-4 text-amber-200">{copyText('DRAFT — legal review required')}</p>
    <h1 className="text-3xl font-bold text-white">{copyText(document.title)}</h1>
    <p className="text-sm text-slate-300">{copyText('Draft source review: 2 November 2026 (IST). Not approved for public launch.')}</p>
    {document.sections.map(([heading, text]) => <section className="space-y-3" key={heading}><h2 className="text-xl font-semibold text-white">{copyText(heading)}</h2><p className="leading-relaxed text-slate-300">{copyText(text)}</p></section>)}
    <section className="space-y-3"><h2 className="text-xl font-semibold text-white">{copyText('Official review sources')}</h2><ul className="space-y-2 text-green-300 underline">
      <li><a href="https://www.indiacode.nic.in/handle/123456789/22037">{copyText('DPDP Act, 2023 — India Code')}</a></li>
      <li><a href="https://www.meity.gov.in/static/uploads/2025/11/53450e6e5dc0bfa85ebd78686cadad39.pdf">{copyText('DPDP Rules, 2025 — official Gazette PDF')}</a></li>
      <li><a href="https://www.meity.gov.in/static/uploads/2025/11/c56ceae6c383460ca69577428d36828b.pdf">{copyText('Act commencement notification — official Gazette PDF')}</a></li>
    </ul></section>
    <nav aria-label={copyText('Legal drafts')} className="flex flex-wrap gap-4 text-green-300 underline"><Link href="/privacy">{copyText('Privacy draft')}</Link><Link href="/terms">{copyText('Terms draft')}</Link><Link href="/refunds">{copyText('Refund and cancellation draft')}</Link></nav>
  </main><Footer/></>;
}
