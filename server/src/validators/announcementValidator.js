const { z } = require('zod');

const createAnnouncementSchema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(200),
  message: z.string().trim().min(5, 'Message must be at least 5 characters'),
  category: z.enum(['general', 'delay', 'route_change', 'stop_closure', 'cancellation']).default('general'),
  route_id: z.string().uuid().optional().nullable(),
  bus_id: z.string().uuid().optional().nullable(),
  status: z.enum(['draft', 'published', 'archived']).default('published'),
  publish_at: z.string().datetime().optional().nullable(),
  expires_at: z.string().datetime().optional().nullable()
});

const updateAnnouncementSchema = createAnnouncementSchema.partial();

module.exports = {
  createAnnouncementSchema,
  updateAnnouncementSchema
};

