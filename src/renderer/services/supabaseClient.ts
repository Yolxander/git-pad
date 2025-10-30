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

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
