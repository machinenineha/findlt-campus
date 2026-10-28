const { z } = require('zod');

const createBusSchema = z.object({
  bus_number: z.string().trim().min(1, 'Bus number is required').max(50),
  registration_number: z.string().trim().max(50).optional().nullable(),
  capacity: z.number().int().positive('Capacity must be a positive integer').optional().nullable(),
  status: z.enum(['active', 'inactive', 'maintenance']).default('active'),
  route_id: z.string().uuid('Invalid route UUID').optional().nullable()
});

const updateBusSchema = createBusSchema.partial();

module.exports = {
  createBusSchema,
  updateBusSchema
};
