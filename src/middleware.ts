import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyAdminToken, ADMIN_COOKIE_NAME } from '@/lib/auth/jwt';

// Rotas estritamente protegidas que exigem sessão administrativa ativa
const STRICT_ADMIN_ROUTES = [
  '/api/auth/admin/security-logs',
  '/api/auth/admin/revoke-sessions',
  '/api/auth/admin/change-credentials',
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
  const token = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  let isAuthenticated = false;

  if (token) {
    const payload = await verifyAdminToken(token);
    if (payload) {
      isAuthenticated = true;
      response.headers.set('x-admin-id', payload.adminId);
      response.headers.set('x-admin-username', payload.username);
    }
  }

  // 4. Bloquear apenas rotas restritas de alta sensibilidade de segurança se não autenticado
  const requiresStrictAuth = STRICT_ADMIN_ROUTES.some((prefix) => pathname.startsWith(prefix));
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
