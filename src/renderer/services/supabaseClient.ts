import { createClient } from '@supabase/supabase-js';

// Read from preload-exposed config to avoid process.env in the renderer
const getSupabaseUrl = (): string => {
  try {
    const url = (window as any)?.config?.supabaseUrl;
    if (url && typeof url === 'string') return url;
  } catch {}
  return 'http://127.0.0.1:55431';
};

const getSupabaseAnonKey = (): string => {
  try {
    const key = (window as any)?.config?.supabaseAnonKey;
    if (key && typeof key === 'string') return key;
  } catch {}
  return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
};

const supabaseUrl = getSupabaseUrl();
const supabaseAnonKey = getSupabaseAnonKey();

if (!supabaseAnonKey) {
  // eslint-disable-next-line no-console
  console.error(
    '[Supabase] Missing anon key. Expose NEXT_PUBLIC_SUPABASE_ANON_KEY via preload or shell env.\n' +
      'Tip: run "supabase status -o env" and export ANON_KEY before npm start.'
  );
}

// Create Supabase client with auto-refresh disabled to prevent connection errors
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: true,
    detectSessionInUrl: false,
  },
  global: {
    fetch: (url, options = {}) => {
      // Wrap fetch to handle connection errors gracefully
      return fetch(url, options).catch((error) => {
        // Silently handle connection refused errors
        if (error.message?.includes('ERR_CONNECTION_REFUSED') ||
            error.message?.includes('Failed to fetch')) {
          // eslint-disable-next-line no-console
          console.warn('[Supabase] Connection refused - Supabase instance may not be running');
          // Return a mock response to prevent errors from propagating
          return new Response(JSON.stringify({ error: 'Connection refused' }), {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'application/json' },
          });
        }
        throw error;
      });
    },
  },
});

