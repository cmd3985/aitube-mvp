import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { match } from '@formatjs/intl-localematcher'
import Negotiator from 'negotiator'

const locales = ['en', 'ko', 'ja', 'es', 'fr', 'pt', 'zh', 'hi']
const defaultLocale = 'en'

function getLocale(request: NextRequest) {
  // 1. Check for user preference cookie
  const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value
  if (cookieLocale && locales.includes(cookieLocale)) {
    return cookieLocale
  }
  
  // 2. Parse Accept-Language header
  const negotiatorHeaders: Record<string, string> = {}
  request.headers.forEach((value, key) => (negotiatorHeaders[key] = value))
  const languages = new Negotiator({ headers: negotiatorHeaders }).languages()
  
  // 3. Match user preference against supported locales
  try {
    return match(languages, locales, defaultLocale)
  } catch (e) {
    return defaultLocale
  }
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Exclude static files, API routes, and other Next.js internal paths
  if (
    pathname.startsWith('/_next') ||
    pathname.includes('/api/') ||
    pathname.match(/\\.(.*)$/)
  ) {
    return;
  }
  
  // Check if the pathname already has a supported locale
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  )
 
  if (pathnameHasLocale) {
    const response = NextResponse.next();
    const currentLocale = pathname.split('/')[1];
    response.cookies.set('NEXT_LOCALE', currentLocale, { maxAge: 60 * 60 * 24 * 365, path: '/' });
    return response;
  }
 
  // Redirect to the locale-prepended URL
  const locale = getLocale(request)
  request.nextUrl.pathname = `/${locale}${pathname === '/' ? '' : pathname}`
  
  const response = NextResponse.redirect(request.nextUrl)
  // Ensure the cookie is populated/refreshed
  response.cookies.set('NEXT_LOCALE', locale, { maxAge: 60 * 60 * 24 * 365, path: '/' })
  return response
}
 
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
}
