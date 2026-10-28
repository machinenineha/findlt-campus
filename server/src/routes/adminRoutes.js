const express = require('express');
const router = express.Router();

const { requireAdmin } = require('../middleware/auth');
const dashboardController = require('../controllers/dashboardController');
const busController = require('../controllers/busController');
const stopController = require('../controllers/stopController');
const routeController = require('../controllers/routeController');
const scheduleController = require('../controllers/scheduleController');
const announcementController = require('../controllers/announcementController');

// All endpoints in this router require valid administrator authorization
router.use(requireAdmin);

// Dashboard
router.get('/dashboard', dashboardController.getDashboardStats);

// Buses Management
router.post('/buses', busController.createBus);
router.patch('/buses/:id', busController.updateBus);
router.delete('/buses/:id', busController.deactivateBus);

// Stops Management
router.post('/stops', stopController.createStop);
router.patch('/stops/:id', stopController.updateStop);

// Routes Management
router.post('/routes', routeController.createRoute);
router.patch('/routes/:id', routeController.updateRoute);
router.put('/routes/:id/stops', routeController.setRouteStops);

// Schedules Management
router.put('/schedules/:id/stop-times', scheduleController.updateScheduleStopTimes);

// Announcements Management
router.get('/announcements', announcementController.getAllAnnouncements);
router.post('/announcements', announcementController.createAnnouncement);
router.patch('/announcements/:id', announcementController.updateAnnouncement);

module.exports = router;

