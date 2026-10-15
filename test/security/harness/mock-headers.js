/**
 * Mock next/headers for In-Memory Next.js API Route Execution
 * Provides active cookie jar context so route handlers can read/write cookies without a live server.
 */
import { getActiveCookieJar } from './route-invoker.js';

export function cookies() {
  const jar = getActiveCookieJar();
  return {
    get(name) {
      return jar.get(name);
    },
    getAll() {
      return jar.getAll();
    },
    has(name) {
      return jar.has(name);
    },
    set(name, value, options = {}) {
      jar.set(name, value, options);
      return this;
    },
    delete(name) {
      jar.delete(name);
      return this;
    },
  };
}

export function headers() {
  return new Headers();
}

export default { cookies, headers };
