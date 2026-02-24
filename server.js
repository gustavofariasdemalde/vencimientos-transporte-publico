const express = require('express');
const path = require('path');
const db = require('./db');
const licenciasRoutes = require('./routes/licencias');
const matafuegosRoutes = require('./routes/matafuegos');
const dashboardRoutes = require('./routes/dashboard');

const app = express();
const PORT = process.env.PORT || 3000;

// Asegurar que el directorio data existe (para modo sin base de datos)
const fs = require('fs');
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Middleware para parsear JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ruta principal - servir el login (debe ir ANTES de los archivos estáticos)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Rutas de la API
app.use('/api/licencias', licenciasRoutes);
app.use('/api/matafuegos', matafuegosRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Servir archivos estáticos desde la carpeta public (después de las rutas específicas)
app.use(express.static(path.join(__dirname, 'public')));

// Manejo de errores
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// Iniciar base de datos (si hay DATABASE_URL) y luego el servidor
async function start() {
  if (db.useDatabase()) {
    try {
      await db.initDb();
      console.log('Base de datos conectada. Los datos se guardarán de forma persistente.');
    } catch (err) {
      console.error('Error al conectar la base de datos:', err.message);
      console.log('La aplicación usará archivos locales (los datos pueden no persistir en el servidor).');
    }
  }
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
  });
}

start();

