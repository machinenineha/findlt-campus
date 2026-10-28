const express = require('express');
const router = express.Router();

const busController = require('../controllers/busController');
const stopController = require('../controllers/stopController');
const routeController = require('../controllers/routeController');
const scheduleController = require('../controllers/scheduleController');
const announcementController = require('../controllers/announcementController');

// Routes
router.get('/routes', routeController.getAllRoutes);
router.get('/routes/search/origin-destination', routeController.searchOriginDestination);
router.get('/routes/search/nearby', routeController.searchNearby);
router.get('/routes/:id', routeController.getRouteById);

// Stops
router.get('/stops', stopController.getAllStops);
router.get('/stops/search', stopController.searchStops);
router.get('/stops/:id', stopController.getStopById);

// Buses
router.get('/buses', busController.getAllBuses);
router.get('/buses/:id', busController.getBusById);

// Timetables
router.get('/timetables', scheduleController.getTimetables);

// Announcements
router.get('/announcements', announcementController.getActiveAnnouncements);

module.exports = router;

