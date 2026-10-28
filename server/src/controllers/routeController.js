const dbService = require('../services/dbService');
const routeSearchService = require('../services/routeSearchService');
const { success, error } = require('../utils/response');
const { createRouteSchema, updateRouteSchema, setRouteStopsSchema } = require('../validators/routeValidator');
const { originDestSearchSchema, nearbySearchSchema } = require('../validators/searchValidator');

async function getAllRoutes(req, res, next) {
  try {
    const activeOnly = req.query.active_only === 'true';
    const collegeId = req.user?.college_id || req.query.college_id;
    const routes = await dbService.getRoutes(collegeId, activeOnly);
    return success(res, routes, 'Routes retrieved successfully');
  } catch (err) {
    next(err);
  }
}

async function getRouteById(req, res, next) {
  try {
    const route = await dbService.getRouteById(req.params.id);
    if (!route) {
      return error(res, 'Route not found', 404);
    }
    return success(res, route, 'Route details retrieved');
  } catch (err) {
    next(err);
  }
}

async function searchOriginDestination(req, res, next) {
  try {
    const { origin, destination, service_period } = originDestSearchSchema.parse(req.query);
    const collegeId = req.user?.college_id || req.query.college_id;
    const matches = await routeSearchService.findRoutesOriginToDestination(origin, destination, service_period, collegeId);
    return success(res, matches, `Found ${matches.length} matching direct routes`);
  } catch (err) {
    next(err);
  }
}

async function searchNearby(req, res, next) {
  try {
    const { lat, lon, radius } = nearbySearchSchema.parse(req.query);
    const collegeId = req.user?.college_id || req.query.college_id;
    const stops = await routeSearchService.findNearbyStops(lat, lon, radius, collegeId);
    return success(res, stops, `Found ${stops.length} stops nearby`);
  } catch (err) {
    next(err);
  }
}

async function createRoute(req, res, next) {
  try {
    const validated = createRouteSchema.parse(req.body);
    validated.college_id = req.user?.college_id;
    const route = await dbService.createRoute(validated, req.user.id);
    return success(res, route, 'Route created successfully', 201);
  } catch (err) {
    next(err);
  }
}

async function updateRoute(req, res, next) {
  try {
    const validated = updateRouteSchema.parse(req.body);
    const updated = await dbService.updateRoute(req.params.id, validated, req.user.id);
    if (!updated) {
      return error(res, 'Route not found', 404);
    }
    return success(res, updated, 'Route updated successfully');
  } catch (err) {
    next(err);
  }
}

async function setRouteStops(req, res, next) {
  try {
    const { stops } = setRouteStopsSchema.parse(req.body);
    const updated = await dbService.setRouteStops(req.params.id, stops, req.user.id);
    return success(res, updated, 'Route stop sequence updated successfully');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAllRoutes,
  getRouteById,
  searchOriginDestination,
  searchNearby,
  createRoute,
  updateRoute,
  setRouteStops
};

