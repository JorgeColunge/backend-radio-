require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./config/dbConfig');
const http = require('http');  // Uso de HTTP en lugar de HTTPS
const socketIo = require('socket.io');

const app = express();

// Configuración de Socket.io utilizando HTTP
const httpServer = http.createServer(app);  // Asegúrate de que esta línea esté correctamente definida antes de usar httpServer
const io = require('socket.io')(httpServer, {
  cors: {
    origin: "https://frontened-s7n0.onrender.com",
    methods: ["GET", "POST"],
    credentials: true
  }
});

io.on('connection', (socket) => {
  console.log(`Usuario conectado: ${socket.id}`);

  socket.on('registerUser', async (id_usuario) => {
    try {
      await pool.query('UPDATE usuarios SET socket_id = $1 WHERE id_usuario = $2', [socket.id, id_usuario]);
      console.log(`Usuario ${id_usuario} registrado con socket ID ${socket.id}`);
    } catch (err) {
      console.error('Error al registrar socket ID:', err);
    }
  });

  socket.on('disconnect', async () => {
    try {
      await pool.query('UPDATE usuarios SET socket_id = NULL WHERE socket_id = $1', [socket.id]);
      console.log(`Socket ID ${socket.id} ha sido removido`);
    } catch (err) {
      console.error('Error al remover socket ID:', err);
    }
  });
});

app.use(express.json());
app.use(cors());

const geolocationRoutes = require('./routes/geolocationRoutes')(io);
const authRoutes = require('./routes/authRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/geolocation', geolocationRoutes);

app.get('/', (req, res) => {
  res.send('¡Hola Mundo!');
});

app.get('/db', async (req, res) => {
  try {
    const response = await pool.query('SELECT NOW()');
    res.json(response.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al conectar con la base de datos');
  }
});

// Escucha en el puerto asignado por Render o en un puerto predeterminado para desarrollo local
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto msbh ${PORT}`);
});

module.exports = { app, httpServer, io };
