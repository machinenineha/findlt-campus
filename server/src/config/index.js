const path = require('path');
const fs = require('fs');

const candidatePaths = [
  path.resolve(__dirname, '../../../.env'),
  path.resolve(__dirname, '../../.env'),
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'routeready-campus/.env')
];

for (const envPath of candidatePaths) {
  if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
    break;
  }
}

const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  defaultCollegeId: process.env.DEFAULT_COLLEGE_ID || 'c0000000-0000-0000-0000-000000000001',
  supabase: {
    url: process.env.SUPABASE_URL || 'https://qvrqrgyoyyijmswrarkj.supabase.co',
    anonKey: process.env.SUPABASE_ANON_KEY || 'sb_publishable_ZSGz1_k0giTElB5jFvdmiQ_ncZ4M1kF',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  },
  // Active when either service_role key or publishable key is present
  isDemoMode: !process.env.SUPABASE_URL || (!process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_ANON_KEY)
};

module.exports = config;
