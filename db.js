/**
 * Conexión a PostgreSQL.
 * Si DATABASE_URL no está definida, se usa almacenamiento en JSON (solo desarrollo local).
 */

const { Pool } = require('pg');

let pool = null;

function getPool() {
  if (!process.env.DATABASE_URL) return null;
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('render.com') ? { rejectUnauthorized: false } : false
    });
  }
  return pool;
}

async function query(text, params) {
  const p = getPool();
  if (!p) return null;
  return p.query(text, params);
}

const INIT_SQL = `
CREATE TABLE IF NOT EXISTS licencias (
  id SERIAL PRIMARY KEY,
  legajo VARCHAR(50) UNIQUE NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  apellido VARCHAR(100) NOT NULL,
  dni VARCHAR(20) NOT NULL,
  fecha_vencimiento DATE NOT NULL,
  historial_renovaciones JSONB DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS matafuegos (
  id SERIAL PRIMARY KEY,
  numero_matafuego VARCHAR(50) NOT NULL,
  numero_coche VARCHAR(50) NOT NULL,
  fecha_vencimiento DATE NOT NULL,
  historial_reemplazos JSONB DEFAULT '[]'
);
`;

async function initDb() {
  const p = getPool();
  if (!p) return;
  await p.query(INIT_SQL);
}

function useDatabase() {
  return !!process.env.DATABASE_URL;
}

module.exports = {
  getPool,
  query,
  initDb,
  useDatabase
};
