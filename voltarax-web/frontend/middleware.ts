import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
export default createMiddleware(routing);
// API/hardware proxy and static files must never acquire a language prefix.
export const config = { matcher: ['/((?!api|health|_next|_vercel|.*\\..*).*)'] };
