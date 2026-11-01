import { structuredProject } from '@/lib/public-site';
export default function PublicStructuredData() {
  const data = structuredProject();
  return data ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }} /> : null;
}
