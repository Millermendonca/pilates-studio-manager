import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyAdminToken, ADMIN_COOKIE_NAME } from '@/lib/auth/jwt';

// ==============================================================================
// 1. ROTAS PÚBLICAS & ISENÇÕES DE AUTENTICAÇÃO
// ==============================================================================

const PUBLIC_PATH_PREFIXES = [
  '/_next',
  '/favicon.ico',
  '/manifest.webmanifest',
  '/icons',
  '/images',
  '/admin/login',
  '/login',
  '/aluno-app',
  '/matricula',
  '/api/auth/admin/login',
  '/api/auth/admin/logout',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/me',
  '/api/matricula',
  '/api/cep',
  '/api/inter/webhook',
];

/**
 * Verifica se a rota atual é pública
 */
function isPublicRoute(pathname: string): boolean {
  return PUBLIC_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

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

  // 3. Se for rota estática ou pública, libera acesso direto com headers
  if (isPublicRoute(pathname)) {
    // Se o gestor já estiver logado e tentar abrir /admin/login, redireciona para o dashboard
    if (pathname === '/admin/login') {
      const token = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
      if (token) {
        const payload = await verifyAdminToken(token);
        if (payload) {
          return NextResponse.redirect(new URL('/', request.url));
        }
      }
    }
    return response;
  }

  // 4. Verificar Token de Sessão do Administrador
  const token = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  let isAuthenticated = false;

  if (token) {
    const payload = await verifyAdminToken(token);
    if (payload) {
      isAuthenticated = true;
      // Adicionar headers de identificação para downstream
      response.headers.set('x-admin-id', payload.adminId);
      response.headers.set('x-admin-username', payload.username);
    }
  }

  // 5. Se NÃO estiver autenticado
  if (!isAuthenticated) {
    // A) Se for requisição de API protegida -> Retorna 401 JSON
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        {
          error: 'Acesso não autorizado. Faça login como administrador para continuar.',
          code: 'UNAUTHORIZED',
        },
        { status: 401 }
      );
    }

    // B) Se for página administrativa -> Redireciona para tela de login do gestor
    const returnUrl = encodeURIComponent(pathname + request.nextUrl.search);
    const loginUrl = new URL(`/admin/login?returnUrl=${returnUrl}`, request.url);
    return NextResponse.redirect(loginUrl);
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
