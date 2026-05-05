import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Sanea valores de header para que solo contengan caracteres ISO-8859-1.
// Workaround para un caso conocido en el callback OAuth donde algún header
// puede contener caracteres no-ASCII (acentos, ñ, emojis) que rompen fetch
// con: "String contains non ISO-8859-1 code point".
const stripNonLatin1 = (value) => {
  if (value == null) return value;
  const s = String(value);
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i);
    if (code <= 0xff) out += s[i];
  }
  return out;
};

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
