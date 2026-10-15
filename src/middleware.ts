import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyAdminToken, ADMIN_COOKIE_NAME } from '@/lib/auth/jwt';

// Rotas estritamente protegidas que exigem sessão administrativa ativa
const STRICT_ADMIN_ROUTES = [
  '/api/auth/admin/security-logs',
  '/api/auth/admin/revoke-sessions',
  '/api/auth/admin/change-credentials',
  '/api/students',
  '/api/invoices',
  '/api/reports',
  '/api/settings/reset-test-data',
];

// Rotas de páginas administrativas que exigem login de gestor
const ADMIN_PROTECTED_PAGES = [
  '/alunos',
  '/agenda',
  '/financeiro',
  '/relatorios',
  '/mapa',
  '/mensagens',
  '/configuracoes',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Criar resposta base
  let response = NextResponse.next();

  // 2. Aplicar Cabeçalhos Globais de Segurança HTTP (Anti-Invasão & Proteção do Navegador)
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)');
  response.headers.set('X-XSS-Protection', '1; mode=block');

  // 3. Verificar se há Token de Administrador para enriquecer os headers
  let token = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (!token) {
    const cookieHeader = request.headers.get('cookie') || '';
    const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${ADMIN_COOKIE_NAME}=([^;]*)`));
    if (match) token = decodeURIComponent(match[1]);
  }

  let isAuthenticated = false;

  if (token) {
    const payload = await verifyAdminToken(token);
    if (payload) {
      isAuthenticated = true;
      response.headers.set('x-admin-id', payload.adminId);
      response.headers.set('x-admin-username', payload.username);
    }
  }

  // 4. Bloquear páginas administrativas se não autenticado (Redirecionar para /admin/login)
  const isProtectedAdminPage = ADMIN_PROTECTED_PAGES.some(
    (page) => pathname === page || pathname.startsWith(`${page}/`)
  );

  if (isProtectedAdminPage && !isAuthenticated) {
    const redirectUrl = new URL('/admin/login', request.url);
    redirectUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // 5. Bloquear rotas de API restritas de alta sensibilidade de segurança se não autenticado
  const requiresStrictAuth =
    STRICT_ADMIN_ROUTES.some((prefix) => pathname.startsWith(prefix)) ||
    (pathname.startsWith('/api/settings') && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method));
  if (requiresStrictAuth && !isAuthenticated) {
    return NextResponse.json(
      {
        error: 'Acesso não autorizado. Autentique-se como gestor administrativo.',
        code: 'UNAUTHORIZED',
      },
      { status: 401 }
    );
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
