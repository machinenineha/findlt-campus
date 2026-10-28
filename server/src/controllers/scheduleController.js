const dbService = require('../services/dbService');
const { success, error } = require('../utils/response');
const { scheduleStopTimesSchema } = require('../validators/scheduleValidator');

async function getTimetables(req, res, next) {
  try {
    const servicePeriod = req.query.period; // 'morning' | 'evening' | null
    const collegeId = req.user?.college_id || req.query.college_id;
    const timetables = await dbService.getSchedules(collegeId, servicePeriod);
    return success(res, timetables, 'Timetables retrieved successfully');
  } catch (err) {
    next(err);
  }
}

async function updateScheduleStopTimes(req, res, next) {
  try {
    const { stop_times } = scheduleStopTimesSchema.parse(req.body);
    const updated = await dbService.saveScheduleStopTimes(req.params.id, stop_times, req.user.id);
    return success(res, updated, 'Schedule stop times updated successfully');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getTimetables,
  updateScheduleStopTimes
};

