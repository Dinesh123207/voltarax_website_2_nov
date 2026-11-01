import LegalDocument from '@/components/legal/LegalDocument';
import { pageMetadata } from '@/lib/seo';
export const generateMetadata = pageMetadata('/refunds', 'Refund and cancellation draft', 'DRAFT — legal review required', true);
export default function RefundsPage() { return <LegalDocument kind="refunds"/>; }
