import type { CookieOptions } from "express";

// Frontend (Vercel) and backend (Render) live on different domains in
// production, which makes every API call a cross-site request. A cookie
// with no explicit SameSite is treated as SameSite=Lax by browsers, and
// Lax cookies are never attached to cross-site fetch()/XHR calls — only to
// top-level navigations. That's why login/activate/google-login could set
// the cookie just fine, but every subsequent request came back 401: the
// browser was silently dropping it. SameSite=None make it a real
// cross-site cookie, but browsers require Secure (HTTPS-only) alongside it
// — which breaks on local http://localhost, hence the NODE_ENV branch.
export function authCookieOptions(): CookieOptions {
    const isProd = process.env.NODE_ENV === 'production';
    return {
        signed: true,
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? 'none' : 'lax',
        // Explicit, so it doesn't end up scoped to "/auth" (the path of the
        // request that set it) and then silently missing on requests to
        // "/doctors", "/appointments", etc.
        path: '/',
    };
}
