const { z } = require('zod');

const createRouteSchema = z.object({
  route_code: z.string().trim().min(1, 'Route code is required').max(30),
  name: z.string().trim().min(1, 'Route name is required').max(150),
  description: z.string().trim().max(500).optional().nullable(),
  status: z.enum(['active', 'inactive']).default('active')
});

const updateRouteSchema = createRouteSchema.partial();

const setRouteStopsSchema = z.object({
  stops: z.array(z.string().min(1, 'Stop ID cannot be empty')).min(2, 'A route must contain at least two stops')
});

module.exports = {
  createRouteSchema,
  updateRouteSchema,
  setRouteStopsSchema
};

