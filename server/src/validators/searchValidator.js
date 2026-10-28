const { z } = require('zod');

const originDestSearchSchema = z.object({
  origin: z.string().trim().min(1, 'Origin stop name is required'),
  destination: z.string().trim().min(1, 'Destination stop name is required'),
  service_period: z.enum(['morning', 'evening', 'all']).default('all')
});

const nearbySearchSchema = z.object({
  lat: z.coerce.number().min(-90).max(90, 'Latitude must be between -90 and 90'),
  lon: z.coerce.number().min(-180).max(180, 'Longitude must be between -180 and 180'),
  radius: z.coerce.number().positive().max(50).default(10)
});

module.exports = {
  originDestSearchSchema,
  nearbySearchSchema
};

