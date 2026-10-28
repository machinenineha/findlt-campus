const dbService = require('../services/dbService');
const { success, error } = require('../utils/response');
const { createAnnouncementSchema, updateAnnouncementSchema } = require('../validators/announcementValidator');

async function getActiveAnnouncements(req, res, next) {
  try {
    const collegeId = req.user?.college_id || req.query.college_id;
    const announcements = await dbService.getAnnouncements(collegeId, true);
    return success(res, announcements, 'Active announcements retrieved');
  } catch (err) {
    next(err);
  }
}

async function getAllAnnouncements(req, res, next) {
  try {
    const collegeId = req.user?.college_id || req.query.college_id;
    const announcements = await dbService.getAnnouncements(collegeId, false);
    return success(res, announcements, 'All announcements retrieved');
  } catch (err) {
    next(err);
  }
}

async function createAnnouncement(req, res, next) {
  try {
    const validated = createAnnouncementSchema.parse(req.body);
    validated.college_id = req.user?.college_id;
    const created = await dbService.createAnnouncement(validated, req.user.id);
    return success(res, created, 'Announcement published successfully', 201);
  } catch (err) {
    next(err);
  }
}

async function updateAnnouncement(req, res, next) {
  try {
    const validated = updateAnnouncementSchema.parse(req.body);
    const updated = await dbService.updateAnnouncement(req.params.id, validated, req.user.id);
    if (!updated) {
      return error(res, 'Announcement not found', 404);
    }
    return success(res, updated, 'Announcement updated successfully');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getActiveAnnouncements,
  getAllAnnouncements,
  createAnnouncement,
  updateAnnouncement
};

