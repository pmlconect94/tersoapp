import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// ───────────────────────────────────────────────────────────────────
// Workaround para "String contains non ISO-8859-1 code point"
//
// Algún código dentro de @supabase/supabase-js (probablemente postgrest-js
// o auth-js) construye objetos Headers con valores que contienen caracteres
// no-ASCII (acentos en metadata del usuario, etc). El navegador rechaza
// con TypeError en Headers.set() / Headers.append() / new Headers(...).
//
// Patcheamos los prototypes para que, si reciben un valor con chars > 0xFF,
// los limpien y registren un warning con el nombre del header — así también
// podemos diagnosticar el origen real del problema.
// ───────────────────────────────────────────────────────────────────
const stripNonLatin1 = (value) => {
  if (value == null) return value;
  const s = String(value);
  let out = '';
  for (let i = 0; i < s.length; i++) {
    if (s.charCodeAt(i) <= 0xff) out += s[i];
  }
  return out;
};

if (typeof Headers !== 'undefined' && !Headers.prototype.__tersoPatched) {
  const origSet = Headers.prototype.set;
  const origAppend = Headers.prototype.append;

  Headers.prototype.set = function (name, value) {
    try {
      return origSet.call(this, name, value);
    } catch (e) {
      if (e && /ISO-8859-1/.test(e.message || '')) {
        const cleaned = stripNonLatin1(value);
        console.warn(`[terso] header "${name}" tenía chars no-ASCII, saneado:`, value, '→', cleaned);
        return origSet.call(this, name, cleaned);
      }
      throw e;
    }
  };

  Headers.prototype.append = function (name, value) {
    try {
      return origAppend.call(this, name, value);
    } catch (e) {
      if (e && /ISO-8859-1/.test(e.message || '')) {
        const cleaned = stripNonLatin1(value);
        console.warn(`[terso] header "${name}" tenía chars no-ASCII, saneado:`, value, '→', cleaned);
        return origAppend.call(this, name, cleaned);
      }
      throw e;
    }
  };

  Headers.prototype.__tersoPatched = true;
}

// Wrapper adicional defensivo a nivel de fetch (por si algún path usa
// Request/RequestInit en lugar de Headers).
const sanitizeHeaders = (headers) => {
  if (!headers) return headers;
  if (headers instanceof Headers) {
    const clean = new Headers();
    headers.forEach((v, k) => clean.set(k, stripNonLatin1(v)));
    return clean;
  }
  if (Array.isArray(headers)) {
    return headers.map(([k, v]) => [k, stripNonLatin1(v)]);
  }
  const clean = {};
  for (const k of Object.keys(headers)) clean[k] = stripNonLatin1(headers[k]);
  return clean;
};

const safeFetch = (input, init) => {
  if (init && init.headers) {
    return fetch(input, { ...init, headers: sanitizeHeaders(init.headers) });
  }
  return fetch(input, init);
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: { fetch: safeFetch },
});
