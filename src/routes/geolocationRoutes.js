const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const geolocationController = require('../controllers/geolocationController');

// Configuración de almacenamiento de Multer para audios
const audioStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const audioDir = path.join(__dirname, '..', '..', 'public', 'media', 'audios');
    if (!fs.existsSync(audioDir)) {
      fs.mkdirSync(audioDir, { recursive: true });
    }
    cb(null, audioDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const uploadAudio = multer({
  storage: audioStorage,
  fileFilter: function (req, file, cb) {
    const mimeTypes = ['audio/wav', 'audio/ogg', 'audio/opus'];
    if (mimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only WAV, OGG/OPUS audio is allowed.'));
    }
  }
});

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

  router.post('/update-status', geolocationController.updateStatus);
  router.get('/accepted-requests', geolocationController.getAcceptedRequests);
  router.get('/pending-reservations', geolocationController.getPendingReservations);
  router.get('/driver-info/:id_viaje', geolocationController.getDriverInfoByTripId);
  router.get('/history/:id_usuario', geolocationController.getHistoryTrips);
  router.get('/history-all', geolocationController.getHistoryAllTrips);
  router.get('/drivers', geolocationController.getDrivers);
  router.get('/driver-data/:id_usuario', geolocationController.getDriverInfo);
  router.get('/trip-info/:id_viaje', geolocationController.getTripInfo);

  router.post('/panic', (req, res) => geolocationController.panic(req, res, io));

  // Ruta para manejar la subida de audios
  router.post('/upload-audio', uploadAudio.single('audio'), (req, res) => {
    try {
      const audioUrl = '/media/audios/' + req.file.filename;
      
      io.emit('new-audio', { audioUrl });
      res.json({ audioUrl });
    } catch (error) {
      console.error('Error uploading audio:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
};
