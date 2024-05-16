const { app, httpsServer, io } = require('./server');

const port = process.env.PORT || 7000;

httpsServer.listen(port, '0.0.0.0', () => {
  console.log(`Servidor HTTPS ejecutándose en https://192.168.1.13:${port}`);
});