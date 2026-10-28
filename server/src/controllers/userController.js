const { success, error } = require('../utils/response');
const { supabaseAdmin, demoStore } = require('../utils/supabase');
const { z } = require('zod');

async function getCurrentUser(req, res, next) {
  try {
    if (!req.user) {
      return error(res, 'Not authenticated', 401);
    }
    return success(res, req.user, 'Current user profile');
  } catch (err) {
    next(err);
  }
}

async function updateProfile(req, res, next) {
  try {
    const updateSchema = z.object({
      full_name: z.string().trim().min(1, 'Full name cannot be empty').max(100)
    });
    const { full_name } = updateSchema.parse(req.body);

    if (supabaseAdmin) {
      try {
        const { data, error: dbError } = await supabaseAdmin
          .from('profiles')
          .update({ full_name })
          .eq('id', req.user.id)
          .select()
          .single();

        if (dbError) {
          // PGRST205 = schema not found; 22P02 = invalid UUID (demo token id)
          // Both mean we're in demo/pre-migration mode — fall back to demo store.
          if (
            dbError.code === 'PGRST205' ||
            dbError.code === '22P02' ||
            dbError.message?.includes('schema cache') ||
            dbError.message?.includes('invalid input syntax for type uuid')
          ) {
            const profile = demoStore.profiles.find(p => p.id === req.user.id);
            if (profile) profile.full_name = full_name;
            return success(res, { ...req.user, full_name }, 'Profile updated successfully');
          }
          throw dbError;
        }
        return success(res, data, 'Profile updated successfully');
      } catch (err) {
        if (
          err.code === 'PGRST205' ||
          err.code === '22P02' ||
          err.message?.includes('schema cache') ||
          err.message?.includes('invalid input syntax for type uuid')
        ) {
          const profile = demoStore.profiles.find(p => p.id === req.user.id);
          if (profile) profile.full_name = full_name;
          return success(res, { ...req.user, full_name }, 'Profile updated successfully');
        }
        throw err;
      }
    }

    // Demo store
    const profile = demoStore.profiles.find(p => p.id === req.user.id);
    if (profile) {
      profile.full_name = full_name;
    }
    return success(res, { ...req.user, full_name }, 'Profile updated successfully');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getCurrentUser,
  updateProfile
};
