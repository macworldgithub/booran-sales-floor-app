import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const source = readFileSync(new URL('../src/services/api.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});

function loadApi(platform, fetch, dev = false) {
  const values = new Map();
  const storage = {
    getItem: async key => values.get(key) ?? null,
    setItem: async (key, value) => { values.set(key, value); },
    removeItem: async key => { values.delete(key); },
  };
  const exports = {};
  const requireModule = name => {
    if (name === '@react-native-async-storage/async-storage') return { __esModule: true, default: storage };
    if (name === 'react-native') return { Platform: { OS: platform } };
    throw new Error(`Unexpected module ${name}`);
  };
  new Function('require', 'exports', 'fetch', '__DEV__', outputText)(requireModule, exports, fetch, dev);
  return exports;
}

test('Android and iOS reuse the mobile bearer session without relying on platform cookies', async () => {
  for (const platform of ['android', 'ios']) {
    const requests = [];
    const token = 'a'.repeat(64);
    const user = { id: 'test', name: 'Test User' };
    const api = loadApi(platform, async (url, options) => {
      requests.push(options);
      const data = url.endsWith('/auth/login') ? { token, user } : user;
      return Response.json({ success: true, data });
    });
    await api.authApi.login('test@example.test', 'password');
    await api.initApiService();
    await api.authApi.me();
    assert.equal(requests[1].credentials, 'omit');
    assert.equal(requests[1].headers.Authorization, `Bearer ${token}`);
    assert.equal(requests[1].headers.Cookie, undefined);
  }
});

test('mobile settings permit local HTTP only in development and reject malformed backends', () => {
  const release = loadApi('android');
  assert.equal(release.normalizeApiBaseUrl('https://example.test/api/'), 'https://example.test/api');
  assert.throws(() => release.normalizeApiBaseUrl('http://10.0.2.2:5001/api'), /HTTPS/);
  assert.throws(() => release.normalizeApiBaseUrl('https://user:secret@example.test/api'), /HTTPS/);
  assert.throws(() => release.normalizeApiBaseUrl('https://example.test/api?mode=test'), /HTTPS/);
  const dev = loadApi('android', undefined, true);
  assert.equal(dev.normalizeApiBaseUrl('http://10.0.2.2:5001/api'), 'http://10.0.2.2:5001/api');
});
