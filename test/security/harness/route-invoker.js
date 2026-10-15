/**
 * Route Invoker Harness for Next.js App Router API Routes and Middleware
 * Dispatches test requests in-memory with next/headers cookie context and Prisma mock.
 */
import { NextRequest, NextResponse } from 'next/server.js';
import { testDb } from './db-store.js';
import { loadSourceModule } from './loader.js';
import './env.js';

// Setup global.prisma fallback
if (!global.prisma) {
  global.prisma = testDb.createPrismaClient();
}

/**
 * Cookie Jar for mocking next/headers
 */
class CookieJar {
  constructor(initialCookies = {}) {
    this.jar = new Map();
    for (const [k, v] of Object.entries(initialCookies)) {
      this.jar.set(k, { name: k, value: v });
    }
    this.outboundCookies = [];
  }

  get(name) {
    return this.jar.get(name);
  }

  getAll() {
    return Array.from(this.jar.values());
  }

  has(name) {
    return this.jar.has(name);
  }

  set(name, value, options = {}) {
    this.jar.set(name, { name, value, ...options });
    this.outboundCookies.push({ name, value, ...options });
  }

  delete(name) {
    this.jar.delete(name);
    this.outboundCookies.push({ name, value: '', maxAge: 0 });
  }
}

let activeCookieJar = new CookieJar();

// Shim next/headers in Node
try {
  const nextHeaders = await import('next/headers');
  // If next/headers exports cookies as a function
  if (nextHeaders && typeof nextHeaders.cookies === 'function') {
    // Intercept if needed or keep activeCookieJar active
  }
} catch {
  // Not directly importable in all modes
}

export function getActiveCookieJar() {
  return activeCookieJar;
}

/**
 * Sets the active cookie jar for incoming requests
 */
export function setActiveCookies(cookieMap = {}) {
  activeCookieJar = new CookieJar(cookieMap);
  return activeCookieJar;
}

/**
 * Parse cookie header string into key-value map
 */
export function parseCookieHeader(headerStr) {
  const result = {};
  if (!headerStr) return result;
  for (const part of headerStr.split(';')) {
    const [rawKey, ...valParts] = part.trim().split('=');
    if (rawKey) {
      result[rawKey.trim()] = decodeURIComponent(valParts.join('=') || '');
    }
  }
  return result;
}

/**
 * Invokes an API route handler in-memory or against a running server
 * @param {string} routeFilePath - e.g. 'src/app/api/auth/login/route.ts'
 * @param {string} method - 'GET', 'POST', 'PUT', 'DELETE'
 * @param {object} options - { body, headers, cookies, params, url }
 */
export async function invokeApiRoute(routeFilePath, method = 'GET', options = {}) {
  // If APP_URL is configured, test against live server directly
  if (process.env.APP_URL && options.url) {
    const fullUrl = new URL(options.url, process.env.APP_URL).toString();
    const headers = { ...(options.headers || {}) };
    if (options.cookies) {
      const cookieStr = Object.entries(options.cookies)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join('; ');
      headers['Cookie'] = cookieStr;
    }
    if (options.body && typeof options.body === 'object') {
      headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(fullUrl, {
      method,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    let data = null;
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      data = await res.json().catch(() => null);
    } else {
      data = await res.text().catch(() => '');
    }

    return {
      status: res.status,
      headers: Object.fromEntries(res.headers.entries()),
      data,
      cookies: parseCookieHeader(res.headers.get('set-cookie') || ''),
    };
  }

  // In-memory route dispatch
  const routeModule = await loadSourceModule(routeFilePath);
  const handler = routeModule[method.toUpperCase()];
  if (!handler) {
    throw new Error(`Method ${method} not exported by ${routeFilePath}`);
  }

  // Cookie setup
  const cookiesIn = { ...(options.cookies || {}) };
  if (options.headers?.Cookie) {
    Object.assign(cookiesIn, parseCookieHeader(options.headers.Cookie));
  }
  const jar = setActiveCookies(cookiesIn);

  // Construct NextRequest
  const url = options.url || `http://localhost:3000/api/${routeFilePath.replace(/\\/g, '/').split('/api/')[1]?.replace(/\/route\.(ts|js)$/, '') || ''}`;
  const reqHeaders = new Headers(options.headers || {});
  if (options.body && !reqHeaders.has('Content-Type')) {
    reqHeaders.set('Content-Type', 'application/json');
  }
  if (Object.keys(cookiesIn).length > 0) {
    const cookieHeaderVal = Object.entries(cookiesIn)
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
    reqHeaders.set('Cookie', cookieHeaderVal);
  }

  const req = new NextRequest(url, {
    method,
    headers: reqHeaders,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const context = { params: options.params || {} };

  // Execute handler
  let response;
  try {
    response = await handler(req, context);
  } catch (err) {
    return {
      status: 500,
      headers: {},
      data: { error: err.message },
      error: err,
    };
  }

  // Extract status & body
  const status = response.status || 200;
  const headers = {};
  response.headers.forEach((val, key) => {
    headers[key.toLowerCase()] = val;
  });

  let data = null;
  try {
    const text = await response.text();
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  } catch {
    data = null;
  }

  return {
    status,
    headers,
    data,
    cookies: jar.outboundCookies,
    rawResponse: response,
  };
}

/**
 * Invokes the Next.js edge middleware for a given path
 */
export async function invokeMiddleware(targetPath, options = {}) {
  const middlewareModule = await loadSourceModule('src/middleware.ts');
  const middleware = middlewareModule.middleware;
  if (!middleware) {
    throw new Error('middleware function not found in src/middleware.ts');
  }

  const url = `http://localhost:3000${targetPath.startsWith('/') ? targetPath : '/' + targetPath}`;
  const reqHeaders = new Headers(options.headers || {});
  if (options.cookies) {
    const cookieStr = Object.entries(options.cookies)
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
    reqHeaders.set('Cookie', cookieStr);
  }

  const req = new NextRequest(url, {
    headers: reqHeaders,
  });

  const res = await middleware(req);
  const status = res.status || 200;
  const headers = {};
  res.headers.forEach((val, key) => {
    headers[key.toLowerCase()] = val;
  });

  const location = headers['location'] || null;

  return {
    status,
    headers,
    location,
    isRedirect: status >= 300 && status < 400,
  };
}
