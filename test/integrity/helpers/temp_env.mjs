import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

/**
 * Creates an isolated temporary directory for testing.
 * Strictly avoids mutating production or working directory files.
 */
export function createTempDir(prefix = 'wise-integrity-') {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

/**
 * Safely and recursively removes a temporary directory.
 */
export function cleanupTempDir(dir) {
  if (dir && fs.existsSync(dir)) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch (err) {
      // On Windows/OneDrive, locked handles might delay immediate deletion; retry once
      try {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          fs.rmSync(path.join(dir, file), { recursive: true, force: true });
        }
        fs.rmdirSync(dir);
      } catch (retryErr) {
        // Suppress teardown warning in test output
      }
    }
  }
}

/**
 * Creates a mock database file with specified records and explicit modification time.
 */
export function createMockDatabase(filePath, data, mtime = null) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const serialized = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  fs.writeFileSync(filePath, serialized, 'utf8');

  if (mtime) {
    const targetDate = mtime instanceof Date ? mtime : new Date(mtime);
    fs.utimesSync(filePath, targetDate, targetDate);
  }
  return filePath;
}

/**
 * Reads and parses a mock database file.
 */
export function readMockDatabase(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, 'utf8');
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

/**
 * Calculates SHA-256 hash of a file or string.
 */
export function calculateHash(contentOrPath) {
  const hash = crypto.createHash('sha256');
  if (typeof contentOrPath === 'string' && fs.existsSync(contentOrPath)) {
    const buffer = fs.readFileSync(contentOrPath);
    return hash.update(buffer).digest('hex');
  }
  return hash.update(contentOrPath).digest('hex');
}
