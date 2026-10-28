const { z } = require('zod');

const scheduleStopTimesSchema = z.object({
  stop_times: z.array(
    z.object({
      route_stop_id: z.string().min(1, 'Route stop ID is required'),
      scheduled_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/, 'Invalid time format. Use HH:MM or HH:MM:SS')
    })
  ).min(1, 'At least one stop time is required')
});

module.exports = {
  scheduleStopTimesSchema
};

