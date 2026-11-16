import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  // Skip api, _next, _vercel and any path with a dot (files).
  // The backslash must be doubled: in a JS string '\.' is just '.', which turns the lookahead
  // into ".*..*" and skips every path longer than one character (all VI routes then 404).
  matcher: '/((?!api|_next|_vercel|.*opengraph-image|.*\\..*).*)',
};
