import LegalDocument from '@/components/legal/LegalDocument';
import { pageMetadata } from '@/lib/seo';
export const generateMetadata = pageMetadata('/privacy', 'Privacy draft', 'DRAFT — legal review required', true);
export default function PrivacyPage() { return <LegalDocument kind="privacy"/>; }
