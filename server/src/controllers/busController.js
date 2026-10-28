const dbService = require('../services/dbService');
const { success, error } = require('../utils/response');
const { createBusSchema, updateBusSchema } = require('../validators/busValidator');

async function getAllBuses(req, res, next) {
  try {
    const activeOnly = req.query.active_only === 'true';
    const collegeId = req.user?.college_id || req.query.college_id;
    const buses = await dbService.getBuses(collegeId, activeOnly);
    return success(res, buses, 'Buses retrieved successfully');
  } catch (err) {
    next(err);
  }
}

async function getBusById(req, res, next) {
  try {
    const bus = await dbService.getBusById(req.params.id);
    if (!bus) {
      return error(res, 'Bus not found', 404);
    }
    return success(res, bus, 'Bus details retrieved');
  } catch (err) {
    next(err);
  }
}

async function createBus(req, res, next) {
  try {
    const validated = createBusSchema.parse(req.body);
    validated.college_id = req.user?.college_id;
    const bus = await dbService.createBus(validated, req.user.id);
    return success(res, bus, 'Bus created successfully', 201);
  } catch (err) {
    next(err);
  }
}

async function updateBus(req, res, next) {
  try {
    const validated = updateBusSchema.parse(req.body);
    const updated = await dbService.updateBus(req.params.id, validated, req.user.id);
    if (!updated) {
      return error(res, 'Bus not found', 404);
    }
    return success(res, updated, 'Bus updated successfully');
  } catch (err) {
    next(err);
  }
}

async function deactivateBus(req, res, next) {
  try {
    // Graceful archival/deactivation rather than destructive purge
    const updated = await dbService.updateBus(req.params.id, { status: 'inactive' }, req.user.id);
    if (!updated) {
      return error(res, 'Bus not found', 404);
    }
    return success(res, updated, 'Bus deactivated successfully');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAllBuses,
  getBusById,
  createBus,
  updateBus,
  deactivateBus
};

