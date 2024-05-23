const express = require('express');
const router = express.Router();
const geolocationController = require('../controllers/geolocationController');

module.exports = (io) => {
  router.post('/update-location', (req, res) => geolocationController.updateUserLocation(req, res, io));
  router.get('/get-location/:id_usuario', geolocationController.getUserLocation);
  router.get('/users', geolocationController.getAllUserLocations);

  router.post('/taxi-request', (req, res) => geolocationController.requestTaxi(req, res, io));
  router.post('/accept-taxi-request', (req, res) => geolocationController.acceptTaxiRequest(req, res, io));
  router.post('/retry-taxi-request', (req, res) => geolocationController.retryTaxiRequest(req, res, io));
  router.post('/reject-taxi-request', (req, res) => geolocationController.rejectTaxiRequest(req, res, io));
  router.get('/check-status/:viajeId', geolocationController.checkTaxiRequestStatus);

  router.post('/delivery-request', (req, res) => geolocationController.requestDelivery(req, res, io));
  router.post('/reservation-request', (req, res) => geolocationController.requestReservation(req, res, io));

  return router;
};

