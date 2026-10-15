/**
 * On-the-fly TypeScript & Path-Alias Transpiler/Loader
 * Transpiles application modules into test/security/.cache/src and resolves '@/...' aliases.
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import { PROJECT_ROOT } from './env.js';

const CACHE_DIR = path.resolve(PROJECT_ROOT, 'test/security/.cache');

/**
 * Ensures cache directory exists
 */
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Rewrites import specifiers in code:
 * - '@/' -> relative path to .cache/src/
 * - Relative imports without extension './foo' -> './foo.js'
 */
function rewriteImports(code, sourceFilePath, targetFilePath) {
  const targetDir = path.dirname(targetFilePath);
  const cacheSrcDir = path.join(CACHE_DIR, 'src');

  return code.replace(
    /(from\s+['"])([^'"]+)(['"])|(import\s*\(\s*['"])([^'"]+)(['"]\s*\))/g,
    (match, p1, p2, p3, p4, p5, p6) => {
      const isDynamic = Boolean(p4);
      const prefix = isDynamic ? p4 : p1;
      const specifier = isDynamic ? p5 : p2;
      const suffix = isDynamic ? p6 : p3;

      if (specifier === 'next/server') return `${prefix}next/server.js${suffix}`;
      if (specifier === 'next/headers' || specifier === 'next/headers.js') {
        const mockHeadersPath = path.resolve(PROJECT_ROOT, 'test/security/harness/mock-headers.js');
        let relMock = path.relative(targetDir, mockHeadersPath).replace(/\\/g, '/');
        if (!relMock.startsWith('.')) relMock = './' + relMock;
        return `${prefix}${relMock}${suffix}`;
      }
      if (specifier === 'next/navigation') return `${prefix}next/navigation.js${suffix}`;

      if (specifier.startsWith('@/')) {
        const subPath = specifier.slice(2);
        // Find source file for this import
        const candidates = [
          path.join('src', subPath + '.ts'),
          path.join('src', subPath + '.tsx'),
          path.join('src', subPath, 'index.ts'),
          path.join('src', subPath, 'route.ts'),
        ];
        for (const cand of candidates) {
          if (fs.existsSync(path.resolve(PROJECT_ROOT, cand))) {
            transpileFile(cand.replace(/\\/g, '/'));
            break;
          }
        }

        // Target in cache
        const resolvedTarget = path.join(cacheSrcDir, subPath);
        let rel = path.relative(targetDir, resolvedTarget).replace(/\\/g, '/');
        if (!rel.startsWith('.')) rel = './' + rel;
        if (!rel.endsWith('.js') && !rel.endsWith('.mjs')) rel += '.js';
        return `${prefix}${rel}${suffix}`;
      }

      if (specifier.startsWith('./') || specifier.startsWith('../')) {
        const sourceDir = path.dirname(sourceFilePath);
        const candidates = [
          path.resolve(sourceDir, specifier + '.ts'),
          path.resolve(sourceDir, specifier + '.tsx'),
          path.resolve(sourceDir, specifier, 'index.ts'),
        ];
        for (const cand of candidates) {
          if (fs.existsSync(cand)) {
            const relToRoot = path.relative(PROJECT_ROOT, cand).replace(/\\/g, '/');
            transpileFile(relToRoot);
            break;
          }
        }

        if (!specifier.endsWith('.js') && !specifier.endsWith('.mjs') && !specifier.endsWith('.json')) {
          return `${prefix}${specifier}.js${suffix}`;
        }
      }

      return match;
    }
  );
}

/**
 * Transpiles a TS/TSX file to JS in cache and returns the path to cached JS file
 */
export function transpileFile(relativeSourcePath) {
  const sourcePath = path.resolve(PROJECT_ROOT, relativeSourcePath);
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Source file does not exist: ${relativeSourcePath}`);
  }

  // Derive target path
  let relativeTarget = relativeSourcePath;
  if (relativeTarget.endsWith('.ts')) {
    relativeTarget = relativeTarget.slice(0, -3) + '.js';
  } else if (relativeTarget.endsWith('.tsx')) {
    relativeTarget = relativeTarget.slice(0, -4) + '.js';
  }
  const targetPath = path.resolve(CACHE_DIR, relativeTarget);
  ensureDir(path.dirname(targetPath));

  const sourceContent = fs.readFileSync(sourcePath, 'utf8');

  // Transpile TypeScript to ES2022 JavaScript
  const transpileResult = ts.transpileModule(sourceContent, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
      allowSyntheticDefaultImports: true,
    },
  });

  // Rewrite imports
  const transformed = rewriteImports(transpileResult.outputText, sourcePath, targetPath);
  fs.writeFileSync(targetPath, transformed, 'utf8');

  return targetPath;
}

/**
 * Recursively transpiles all TS/TSX files in a directory
 */
export function transpileDirectory(relativeDir) {
  const fullDir = path.resolve(PROJECT_ROOT, relativeDir);
  if (!fs.existsSync(fullDir)) return;

  const entries = fs.readdirSync(fullDir, { withFileTypes: true });
  for (const entry of entries) {
    const relPath = path.join(relativeDir, entry.name).replace(/\\/g, '/');
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.next') {
        transpileDirectory(relPath);
      }
    } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
      transpileFile(relPath);
    }
  }
}

/**
 * Dynamically imports a project source file by compiling it if needed.
 */
export async function loadSourceModule(relativeSourcePath) {
  const cachedPath = transpileFile(relativeSourcePath);
  const fileUrl = pathToFileURL(cachedPath).href + `?t=${Date.now()}`;
  return import(fileUrl);
}
