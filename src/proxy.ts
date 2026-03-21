import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { match } from '@formatjs/intl-localematcher'
import Negotiator from 'negotiator'
import { updateSession } from '@/utils/supabase/middleware'

const locales = ['en', 'ko', 'ja', 'es', 'fr', 'pt', 'zh', 'hi', 'ar', 'id', 'ru', 'de']
const defaultLocale = 'en'

function getLocale(request: NextRequest) {
  const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value
  if (cookieLocale && locales.includes(cookieLocale)) {
    return cookieLocale
  }
  
  const negotiatorHeaders: Record<string, string> = {}
  request.headers.forEach((value, key) => (negotiatorHeaders[key] = value))
  const languages = new Negotiator({ headers: negotiatorHeaders }).languages()
  
  try {
    return match(languages, locales, defaultLocale)
  } catch (e) {
    return defaultLocale
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Exclude static files, API routes, and other Next.js internal paths
  if (
    pathname.startsWith('/_next') ||
    pathname.includes('/api/') ||
    pathname.startsWith('/auth/') ||
    pathname.match(/\.(.*)$/)
  ) {
    // We still need to run updateSession for API routes and everything except static assets
    // Wait, updating session requires parsing cookies, better to run it if it hits API routes too.
    // Actually, updateSession requires response to be passed. Let's create an empty next() response.
    if (!pathname.startsWith('/_next') && !pathname.match(/\.(.*)$/)) {
      let response = NextResponse.next();
      return await updateSession(request, response);
    }
    return;
  }
  
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  )
 
  let response: NextResponse;

  if (pathnameHasLocale) {
    response = NextResponse.next();
    const currentLocale = pathname.split('/')[1];
    response.cookies.set('NEXT_LOCALE', currentLocale, { maxAge: 60 * 60 * 24 * 365, path: '/' });
  } else {
    // Redirect to the locale-prepended URL
    const locale = getLocale(request)
    request.nextUrl.pathname = `/${locale}${pathname === '/' ? '' : pathname}`
    response = NextResponse.redirect(request.nextUrl)
    response.cookies.set('NEXT_LOCALE', locale, { maxAge: 60 * 60 * 24 * 365, path: '/' })
  }

  // Supabase Auth: Check logic and pass updated session
  return await updateSession(request, response);
}
 
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
}
