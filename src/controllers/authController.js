const bcrypt = require('bcryptjs');
const pool = require('../config/dbConfig');

exports.register = async (req, res) => {
  const { id_usuario, nombre, password, foto, tipo } = req.body;  // Incluye el campo 'tipo'

  try {
    const userExists = await pool.query(
      'SELECT * FROM usuarios WHERE id_usuario = $1;',
      [id_usuario]
    );

    if (userExists.rows.length > 0) {
      return res.status(409).send('El ID de usuario ya está registrado.');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Foto puede ser opcional, así que proporciona un valor por defecto si no se incluye
    const fotoURL = foto || 'url_de_imagen_por_defecto.jpg';

    // Añade el campo 'tipo' a la consulta de inserción
    await pool.query(
      'INSERT INTO usuarios (id_usuario, nombre, password, foto, tipo) VALUES ($1, $2, $3, $4, $5);',
      [id_usuario, nombre, passwordHash, fotoURL, tipo]
    );

    res.status(201).json({
      message: "Usuario creado exitosamente",
      nombre: nombre,
      foto: fotoURL,
      tipo: tipo
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al registrar al usuario: ' + err.message);
  }
};


// Función para iniciar sesión
exports.login = async (req, res) => {
  const { id_usuario, password } = req.body;
  try {
    const user = await pool.query(
      'SELECT * FROM usuarios WHERE id_usuario = $1;',
      [id_usuario]
    );

    if (user.rows.length > 0) {
      const validPassword = await bcrypt.compare(password, user.rows[0].password);
      if (validPassword) {
        // Inicio de sesión exitoso, establecer sesión o token aquí
        //res.status(200).json({ message: "Inicio de sesión exitoso" });
        res.status(200).json({ message: "Inicio de sesión exitoso", nombre: user.rows[0].nombre });

      } else {
        res.status(401).send('password incorrecta');
      }
    } else {
      res.status(404).send('Usuario no encontrado');
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al iniciar sesión');

  }
};
