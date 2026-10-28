const dbService = require('../services/dbService');
const routeSearchService = require('../services/routeSearchService');
const { success, error } = require('../utils/response');
const { createStopSchema, updateStopSchema } = require('../validators/stopValidator');

async function getAllStops(req, res, next) {
  try {
    const activeOnly = req.query.active_only === 'true';
    const collegeId = req.user?.college_id || req.query.college_id;
    const stops = await dbService.getStops(collegeId, activeOnly);
    return success(res, stops, 'Stops retrieved successfully');
  } catch (err) {
    next(err);
  }
}

async function searchStops(req, res, next) {
  try {
    const q = req.query.q || '';
    const collegeId = req.user?.college_id || req.query.college_id;
    const results = await routeSearchService.searchStops(q, collegeId);
    return success(res, results, 'Stops search results');
  } catch (err) {
    next(err);
  }
}

async function getStopById(req, res, next) {
  try {
    const stop = await dbService.getStopById(req.params.id);
    if (!stop) {
      return error(res, 'Stop not found', 404);
    }
    return success(res, stop, 'Stop details retrieved');
  } catch (err) {
    next(err);
  }
}

async function createStop(req, res, next) {
  try {
    const validated = createStopSchema.parse(req.body);
    validated.college_id = req.user?.college_id;
    const stop = await dbService.createStop(validated, req.user.id);
    return success(res, stop, 'Stop created successfully', 201);
  } catch (err) {
    next(err);
  }
}

async function updateStop(req, res, next) {
  try {
    const validated = updateStopSchema.parse(req.body);
    const updated = await dbService.updateStop(req.params.id, validated, req.user.id);
    if (!updated) {
      return error(res, 'Stop not found', 404);
    }
    return success(res, updated, 'Stop updated successfully');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAllStops,
  searchStops,
  getStopById,
  createStop,
  updateStop
};

