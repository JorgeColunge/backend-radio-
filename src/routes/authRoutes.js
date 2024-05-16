const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { registerValidation, loginValidation } = require('../validations/userValidation');
const userController = require('../controllers/users-list/userController'); // Asegúrate de ajustar la ruta

//Servir esaicos
const multer = require('multer');
const pool = require('../config/dbConfig');

// Configura Multer para guardar archivos en la carpeta 'uploads'
const upload = multer({
  dest: 'uploads/', // Asegúrate de que esta carpeta existe en tu servidor o cámbialo según tus necesidades
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
  console.log(req.body);  // Esto mostrará qué datos están realmente llegando al servidor
  if (req.file) {
    req.body.foto = req.file.path;  // Asigna la ruta del archivo cargado a req.body.foto
  }

  const { error } = registerValidation(req.body);
  if (error) {
    console.error('Validation Error:', error.details[0].message);
    return res.status(400).send(error.details[0].message);
  }

  authController.register(req, res);
});

router.post('/login', (req, res) => {
  const { error } = loginValidation(req.body);
  if (error) return res.status(400).send(error.details[0].message);
  authController.login(req, res);
});

// Ruta para obtener datos de un usuario específico por ID
router.get('/user/:id', async (req, res) => {
  const { id } = req.params;
  try {
      const result = await pool.query('SELECT id_usuario, nombre, foto FROM usuarios WHERE id_usuario = $1', [id]);
      if (result.rows.length > 0) {
          const user = result.rows[0];
          // Construir la ruta completa de la imagen
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
router.get('/users', userController.getAllUsers);

module.exports = router;
