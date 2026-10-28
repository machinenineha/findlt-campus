const { z } = require('zod');

const createStopSchema = z.object({
  name: z.string().trim().min(1, 'Stop name is required').max(150),
  address: z.string().trim().max(255).optional().nullable(),
  locality: z.string().trim().max(100).optional().nullable(),
  latitude: z.number().min(-90.0).max(90.0, 'Latitude must be between -90 and 90').optional().nullable(),
  longitude: z.number().min(-180.0).max(180.0, 'Longitude must be between -180 and 180').optional().nullable(),
  status: z.enum(['active', 'inactive']).default('active')
});

const updateStopSchema = createStopSchema.partial();

module.exports = {
  createStopSchema,
  updateStopSchema
};
