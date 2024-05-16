const express = require('express');
const router = express.Router();
const geolocationController = require('../controllers/geolocationController');

module.exports = (io) => {
  // Ruta para actualizar la ubicación de un usuario
  router.post('/update-location', (req, res) => geolocationController.updateUserLocation(req, res, io));

  // Ruta para obtener la ubicación de un usuario específico
  router.get('/get-location/:id_usuario', geolocationController.getUserLocation);

  // Ruta para obtener las ubicaciones de todos los usuarios
  router.get('/users', geolocationController.getAllUserLocations);

  // Ruta para crear una nueva solicitud de taxi
  router.post('/taxi-request', (req, res) => geolocationController.requestTaxi(req, res, io));

  // Ruta para aceptar una solicitud de taxi
  router.post('/accept-taxi-request', (req, res) => geolocationController.acceptTaxiRequest(req, res, io));

  return router;
};
