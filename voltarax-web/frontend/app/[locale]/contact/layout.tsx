import { pageMetadata } from '@/lib/seo';
export const generateMetadata = pageMetadata('/contact', 'Contact', 'Submit an inquiry for the team to review.');
export default function ContactLayout({ children }: { children: React.ReactNode }) { return children; }
