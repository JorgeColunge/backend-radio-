const bcrypt = require('bcryptjs');
const pool = require('../config/dbConfig');

exports.register = async (req, res, io) => {
  const { id_usuario, nombre, password, foto, tipo } = req.body;

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

    const fotoURL = foto || 'url_de_imagen_por_defecto.jpg';

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
    io.emit('userUpdate');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al registrar al usuario: ' + err.message);
  }
};

// Función para iniciar sesión
exports.login = async (req, res, io) => {
  const { id_usuario, password } = req.body;

  try {
    const user = await pool.query(
      'SELECT * FROM usuarios WHERE id_usuario = $1;',
      [id_usuario]
    );

    if (user.rows.length > 0) {
      const validPassword = await bcrypt.compare(password, user.rows[0].password);
      if (validPassword) {
        res.status(200).json({
          message: "Inicio de sesión exitoso",
          nombre: user.rows[0].nombre,
          tipo: user.rows[0].tipo
        });
      } else {
        res.status(401).send('Contraseña incorrecta');
      }
    } else {
      res.status(404).send('Usuario no encontrado');
    }
  } catch (err) {
    console.error('Error al iniciar sesión:', err);
    res.status(500).send('Error al iniciar sesión');
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const allUsers = await pool.query('SELECT id_usuario, nombre, email, tipo, fot, navegacion, telefono, placa FROM usuarios');
    res.json(allUsers.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al obtener la lista de usuarios.');
  }
};

exports.editUser = async (req, res, io) => {
  const { id } = req.params;
  const { nombre, password, tipo, navegacion, telefono, placa } = req.body;

  try {
    const user = await pool.query('SELECT * FROM usuarios WHERE id_usuario = $1;', [id]);

    if (user.rows.length === 0) {
      return res.status(404).send('Usuario no encontrado');
    }

    let passwordHash = user.rows[0].password;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      passwordHash = await bcrypt.hash(password, salt);
    }

    const fotoURL = req.body.foto || user.rows[0].foto;

    const result = await pool.query(
      'UPDATE usuarios SET nombre = $1, password = $2, foto = $3, tipo = $4, navegacion = $6, telefono = $7, placa = $8 WHERE id_usuario = $5 RETURNING *',
      [nombre, passwordHash, fotoURL, tipo, id, navegacion, telefono, placa]
    );

    res.status(200).json(result.rows[0]);
    io.emit('userUpdate');
  } catch (err) {
    console.error('Error al actualizar al usuario:', err);
    res.status(500).send('Error al actualizar al usuario');
  }
};

exports.editUser = async (req, res, io) => {
  const { id } = req.params;
  const { nombre, password, tipo, navegacion, telefono, placa } = req.body;

  try {
    const user = await pool.query('SELECT * FROM usuarios WHERE id_usuario = $1;', [id]);

    if (user.rows.length === 0) {
      return res.status(404).send('Usuario no encontrado');
    }

    const updates = {
      nombre: nombre || user.rows[0].nombre,
      password: user.rows[0].password,
      tipo: tipo || user.rows[0].tipo,
      navegacion: navegacion || user.rows[0].navegacion,
      telefono: telefono || user.rows[0].telefono,
      placa: placa || user.rows[0].placa,
      foto: req.body.foto || user.rows[0].foto,
    };

    if (password) {
      const salt = await bcrypt.genSalt(10);
      updates.password = await bcrypt.hash(password, salt);
    }

    const result = await pool.query(
      'UPDATE usuarios SET nombre = $1, password = $2, foto = $3, tipo = $4, navegacion = $5, telefono = $6, placa = $7 WHERE id_usuario = $8 RETURNING *',
      [updates.nombre, updates.password, updates.foto, updates.tipo, updates.navegacion, updates.telefono, updates.placa, id]
    );

    res.status(200).json(result.rows[0]);
    io.emit('userUpdate');
  } catch (err) {
    console.error('Error al actualizar al usuario:', err);
    res.status(500).send('Error al actualizar al usuario');
  }
};



exports.deleteUser = async (req, res, io) => {
  const { id } = req.params;

  try {
    const user = await pool.query('SELECT * FROM usuarios WHERE id_usuario = $1;', [id]);

    if (user.rows.length === 0) {
      return res.status(404).send('Usuario no encontrado');
    }

    await pool.query('DELETE FROM usuarios WHERE id_usuario = $1;', [id]);

    res.status(200).json({ message: 'Usuario eliminado exitosamente' });
    io.emit('userUpdate');
  } catch (err) {
    console.error('Error al eliminar al usuario:', err);
    res.status(500).send('Error al eliminar al usuario');
  }
};
