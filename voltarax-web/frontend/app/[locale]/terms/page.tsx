import LegalDocument from '@/components/legal/LegalDocument';
import { pageMetadata } from '@/lib/seo';
export const generateMetadata = pageMetadata('/terms', 'Terms draft', 'DRAFT — legal review required', true);
export default function TermsPage() { return <LegalDocument kind="terms"/>; }
