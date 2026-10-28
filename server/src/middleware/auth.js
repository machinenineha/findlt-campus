const { supabaseAdmin, demoStore, isDemoMode } = require('../utils/supabase');
const { error } = require('../utils/response');
const logger = require('../utils/logger');

async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  const token = authHeader.split(' ')[1].trim();

  // Handle Demo Mode Tokens
  if (isDemoMode || token.startsWith('demo-token-')) {
    if (token === 'demo-token-admin' || token === 'admin-token') {
      req.user = { ...demoStore.profiles.find(p => p.role === 'admin') };
      return next();
    }
    if (token === 'demo-token-student' || token === 'student-token') {
      req.user = { ...demoStore.profiles.find(p => p.role === 'student') };
      return next();
    }
    // Also support any session stored in demoStore
    const matchedProfile = demoStore.profiles.find(p => p.id === token);
    if (matchedProfile) {
      req.user = { ...matchedProfile };
      return next();
    }
  }

  // Validate with Supabase Auth
  if (supabaseAdmin) {
    try {
      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
      if (authError || !user) {
        req.user = null;
        return next();
      }

      // Fetch verified profile from database (never trust client-supplied role)
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, role, college_id')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        // Fallback default role is student if profile row not yet created
        req.user = {
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || 'Student',
          role: 'student',
          college_id: user.user_metadata?.college_id || 'c0000000-0000-0000-0000-000000000001'
        };
      } else {
        req.user = {
          id: profile.id,
          email: user.email,
          full_name: profile.full_name,
          role: profile.role,
          college_id: profile.college_id
        };
      }
      return next();
    } catch (err) {
      logger.error('Error during Supabase token verification:', err);
      req.user = null;
      return next();
    }
  }

  req.user = null;
  return next();
}

function requireAuth(req, res, next) {
  if (!req.user) {
    return error(res, 'Authentication required. Please sign in to access this resource.', 401);
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user) {
    return error(res, 'Authentication required. Please sign in.', 401);
  }
  if (req.user.role !== 'admin') {
    return error(res, 'Forbidden. Administrator privileges required.', 403);
  }
  next();
}

module.exports = {
  authenticate,
  requireAuth,
  requireAdmin
};
