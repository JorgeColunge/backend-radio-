const pool = require('../config/dbConfig');
const h3 = require('h3-js');

exports.updateUserLocation = async (req, res, io) => {
  const { id_usuario, latitude, longitude } = req.body;
  console.log(`Actualizando ubicación del usuario ${id_usuario} a latitud: ${latitude}, longitud: ${longitude}`);
  try {
    await pool.query(
      'UPDATE usuarios SET latitud = $1, longitud = $2 WHERE id_usuario = $3;',
      [latitude, longitude, id_usuario]
    );
    io.emit('locationUpdated', { id_usuario, latitude, longitude });
    console.log('Evento locationUpdated emitido', { id_usuario, latitude, longitude });
    res.status(200).send('Ubicación actualizada con éxito.');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al actualizar la ubicación.');
  }
};

exports.getUserLocation = async (req, res) => {
  const { id_usuario } = req.params;

  try {
    const results = await pool.query(
      'SELECT latitud, longitud FROM usuarios WHERE id_usuario = $1;',
      [id_usuario]
    );
    res.status(200).json(results.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al obtener la ubicación.');
  }
};

exports.getAllUserLocations = async (req, res) => {
  try {
    const allUserLocations = await pool.query('SELECT id_usuario, nombre, latitud, longitud FROM usuarios;');
    res.json(allUserLocations.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al obtener las ubicaciones de los usuarios.');
  }
};

exports.requestTaxi = async (req, res, io) => {
  const { clientId, name, latitude, longitude, address, endLatitude, endLongitude, endAddress } = req.body;
  console.log(`Recibida solicitud de taxi de ${name} en ${address}`);

  // Asegúrate de que el contacto exista antes de crear el viaje
  const contactExists = await pool.query(
    'SELECT EXISTS(SELECT 1 FROM contactos WHERE telefono = $1)',
    [clientId]
  );

  if (!contactExists.rows[0].exists) {
    // Si no existe, inserta el contacto
    await pool.query(
      'INSERT INTO contactos (telefono, nombre) VALUES ($1, $2)',
      [clientId, name]
    );
  }

  // Inserta el viaje en la base de datos
  try {
    const insertQuery = `
      INSERT INTO viajes (telefono_cliente, estado, direccion, latitud, longitud, direccion_fin, latitud_fin, longitud_fin, fecha_hora_inicio)
      VALUES ($1, 'pendiente', $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP) RETURNING id_viaje;
    `;
    const values = [clientId, address, latitude, longitude, endAddress, endLatitude, endLongitude];
    const insertResult = await pool.query(insertQuery, values);
    const viajeId = insertResult.rows[0].id_viaje;
  
    // Encuentra los taxistas cercanos
    const nearbyTaxis = await findNearbyTaxis(latitude, longitude);

    // Envía la solicitud de taxi a cada taxista cercano
    nearbyTaxis.forEach(taxi => {
      console.log(`Enviando solicitud de taxi a ${taxi.id_usuario} con socket ID ${taxi.socketId}`);
      // Asegúrate de incluir el id_viaje para poder referenciarlo más tarde.
      io.to(taxi.socketId).emit('taxiRequest', { clientId, name, latitude, longitude, address, viajeId });
    });

    res.status(200).send('Solicitud de taxi enviada a los conductores cercanos.');
  } catch (error) {
    console.error('Error al insertar viaje en la base de datos:', error);
    res.status(500).send('Error al procesar la solicitud de taxi.');
  }
};

exports.acceptTaxiRequest = async (req, res, io) => {
  const { id_viaje, id_taxista } = req.body;
  console.log(`Recibida solicitud de aceptación del viaje con id_viaje: ${id_viaje} y id_taxista: ${id_taxista}`);

  try {
    const updateQuery = `
      UPDATE viajes
      SET id_taxista = $1, estado = 'aceptado', fecha_hora_inicio = CURRENT_TIMESTAMP
      WHERE id_viaje = $2 AND estado = 'pendiente' RETURNING *;`;

    const updateResult = await pool.query(updateQuery, [id_taxista, id_viaje]);

    if (updateResult.rowCount === 0) {
      console.log('El viaje ya ha sido asignado a otro taxista o no se encontró');
      res.status(409).send('El viaje ya ha sido asignado a otro taxista o no se encontró.');
    } else {
      console.log('Viaje actualizado con éxito:', updateResult.rows[0]);
      console.log('Emitiendo evento taxiRequestAccepted', { id_viaje: id_viaje });
      io.emit('taxiRequestAccepted', { id_viaje: id_viaje });
      // Obtén la información del cliente y la ubicación de recogida
      const viajeInfo = await pool.query(
        'SELECT v.direccion, v.latitud, v.longitud, v.direccion_fin, v.latitud_fin, v.longitud_fin, c.nombre, c.telefono FROM viajes v JOIN contactos c ON v.telefono_cliente = c.telefono WHERE v.id_viaje = $1',
        [id_viaje]
      );
      const { direccion, latitud, longitud, direccion_fin, latitud_fin, longitud_fin, nombre, telefono } = viajeInfo.rows[0];
      // Obtén el socket_id del taxista
      const taxistaInfo = await pool.query(
        'SELECT socket_id FROM usuarios WHERE id_usuario = $1',
        [id_taxista]
      );
      const { socket_id } = taxistaInfo.rows[0];
      // Emitir evento solo al taxista que aceptó el viaje
      io.to(socket_id).emit('assignedTaxi', { nombre, telefono, direccion, latitud, longitud, direccion_fin, latitud_fin, longitud_fin});
      res.status(200).json(updateResult.rows[0]);
    }
  } catch (error) {
    console.error('Error al aceptar el viaje en la base de datos:', error);
    if (!res.headersSent) {
      res.status(500).send('Error al procesar la aceptación del viaje.');
    }
  }
};



const findNearbyTaxis = async (latitude, longitude) => {
  const clientIndex = h3.latLngToCell(latitude, longitude, 9);
  const nearbyIndices = h3.gridDisk(clientIndex, 3);  // Cambiado de kRing a gridDisk

  const allTaxis = await pool.query('SELECT id_usuario, socket_id, latitud, longitud FROM usuarios WHERE tipo = $1', ['taxi']);

  const nearbyTaxis = allTaxis.rows.filter(taxi => {
    const taxiIndex = h3.latLngToCell(taxi.latitud, taxi.longitud, 9);
    return nearbyIndices.includes(taxiIndex);
  });
  console.log('Taxistas cercanos:', nearbyTaxis); // Muestra los taxistas cercanos
  return nearbyTaxis.map(taxi => ({ socketId: taxi.socket_id, ...taxi }));
};

