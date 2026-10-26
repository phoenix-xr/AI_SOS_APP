import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { safeStorage } from './safeStorage';

export const SUPABASE_URL = 'https://ntdjwxibywpyfsdoufcy.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_cIdE-Uhw87LSneTqBly2mA_kpHcVF50';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: safeStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
