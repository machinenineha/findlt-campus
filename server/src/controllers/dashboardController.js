const dbService = require('../services/dbService');
const { success } = require('../utils/response');

async function getDashboardStats(req, res, next) {
  try {
    const collegeId = req.user?.college_id;
    const stats = await dbService.getDashboardStats(collegeId);
    return success(res, stats, 'Dashboard statistics loaded successfully');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getDashboardStats
};

