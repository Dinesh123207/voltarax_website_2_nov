'use client';
import { useEffect } from 'react';
import { useCopy } from '@/i18n/copy';
export default function SkipToContent() {
  const copyText = useCopy();
  useEffect(() => {
    const update = () => { document.body.dataset.pageHidden = String(document.hidden); };
    update(); document.addEventListener('visibilitychange', update);
    return () => { document.removeEventListener('visibilitychange', update); delete document.body.dataset.pageHidden; };
  }, []);
  return <a href="#main-content" className="skip-link">{copyText('Skip to content')}</a>;
}
