/**
 * RouteReady Campus - Client Configuration
 * Notice: Uses publishable/anon key only. NEVER expose SUPABASE_SERVICE_ROLE_KEY here.
 */

export const CONFIG = {
  API_BASE_URL: '/api/v1',
  DEFAULT_COLLEGE_ID: 'c0000000-0000-0000-0000-000000000001',
  COLLEGE_NAME: 'Apex Institute of Technology',
  SUPABASE_URL: window.ENV_SUPABASE_URL || 'https://qvrqrgyoyyijmswrarkj.supabase.co',
  SUPABASE_ANON_KEY: window.ENV_SUPABASE_ANON_KEY || 'sb_publishable_ZSGz1_k0giTElB5jFvdmiQ_ncZ4M1kF',
  IS_DEMO_MODE: false
};
