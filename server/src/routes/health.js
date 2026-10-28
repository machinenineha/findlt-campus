const express = require('express');
const router = express.Router();
const { isDemoMode, supabaseAdmin } = require('../utils/supabase');

router.get('/', async (req, res) => {
  let dbStatus = 'demo_mode_active';
  if (!isDemoMode && supabaseAdmin) {
    try {
      const { error } = await supabaseAdmin.from('colleges').select('id').limit(1);
      dbStatus = error ? `error: ${error.message}` : 'connected';
    } catch (e) {
      dbStatus = `exception: ${e.message}`;
    }
  }

  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'RouteReady Campus API',
    version: '1.0.0',
    mode: isDemoMode ? 'demonstration' : 'production',
    database: dbStatus
  });
});

module.exports = router;

