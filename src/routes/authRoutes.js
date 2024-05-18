const express = require('express');
const authController = require('../controllers/authController');
const { registerValidation, loginValidation } = require('../validations/userValidation');
const multer = require('multer');
const pool = require('../config/dbConfig');

module.exports = (io) => {
  const router = express.Router();

  // Configura Multer para guardar archivos en la carpeta 'uploads'
  const upload = multer({
    dest: 'uploads/', // Asegúrate de que esta carpeta existe en tu servidor o cámbiala según tus necesidades
    limits: {
      fileSize: 1000000 // Limita el tamaño del archivo a 1MB
    },
    fileFilter: (req, file, cb) => {
      // Acepta solo archivos de imagen
      if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
        return cb(new Error('Solo se admiten archivos de imagen.'), false);
      }
      cb(null, true);
    }
  });

  router.post('/register', upload.single('foto'), (req, res) => {
    if (req.file) {
      req.body.foto = req.file.path;
    }

    const { error } = registerValidation(req.body);
    if (error) {
      return res.status(400).send(error.details[0].message);
    }

    authController.register(req, res, io); // Pass `io` to controller
  });

  router.post('/login', (req, res) => {
    const { error } = loginValidation(req.body);
    if (error) {
      return res.status(400).send(error.details[0].message);
    }
    authController.login(req, res, io); // Pass `io` to controller
  });

  // Ruta para obtener datos de un usuario específico por ID
  router.get('/user/:id', async (req, res) => {
    const { id } = req.params;
    try {
      const result = await pool.query('SELECT id_usuario, nombre, foto, socket_id, navegacion, telefono, placa FROM usuarios WHERE id_usuario = $1', [id]);
      if (result.rows.length > 0) {
        const user = result.rows[0];
        user.foto = user.foto ? `https://backend-ocba.onrender.com/${user.foto}` : null;
        res.json(user);
      } else {
        res.status(404).send('Usuario no encontrado');
      }
    } catch (err) {
      console.error(err);
      res.status(500).send('Error del servidor');
    }
  });

  // Ruta para obtener la lista de todos los usuarios
  router.get('/users', async (req, res) => {
    try {
      const allUsers = await pool.query('SELECT id_usuario, nombre, tipo, foto, socket_id, navegacion, telefono, placa FROM usuarios');
      res.json(allUsers.rows);
    } catch (err) {
      console.error(err);
      res.status(500).send('Error al obtener la lista de usuarios.');
    }
  });

  // Ruta para editar un usuario
  router.put('/user/:id', upload.single('foto'), (req, res) => {
    if (req.file) {
      req.body.foto = req.file.path;
    }
    authController.editUser(req, res, io); // Pass `io` to controller
  });

  // Ruta para eliminar un usuario
  router.delete('/user/:id', (req, res) => {
    authController.deleteUser(req, res, io); // Pass `io` to controller
  });

  // Ruta para cerrar sesión
  router.post('/logout', async (req, res) => {
    const { id_usuario } = req.body;
    try {
      await pool.query('UPDATE usuarios SET socket_id = NULL WHERE id_usuario = $1', [id_usuario]);
      res.status(200).send('Sesión cerrada');
      io.emit('userUpdate');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      res.status(500).send('Error al cerrar sesión');
    }
  });

  return router;
};
