const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const db = require('../db');

const router = express.Router();
const DATA_FILE = path.join(__dirname, '..', 'data', 'licencias.json');

function calcularEstado(fechaVencimiento) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const vencimiento = new Date(fechaVencimiento);
  vencimiento.setHours(0, 0, 0, 0);
  const diasRestantes = Math.ceil((vencimiento - hoy) / (1000 * 60 * 60 * 24));
  if (diasRestantes < 0) return 'VENCIDO';
  if (diasRestantes <= 7) return 'URGENTE';
  if (diasRestantes <= 15) return 'PRÓXIMO';
  return 'OK';
}

// --- Almacenamiento en archivo (sin DATABASE_URL) ---
async function readLicenciasFile() {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    if (e.code === 'ENOENT') return [];
    throw e;
  }
}

async function writeLicenciasFile(licencias) {
  const dataDir = path.dirname(DATA_FILE);
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(licencias, null, 2), 'utf8');
}

// --- Almacenamiento en base de datos ---
function rowToLicencia(row) {
  return {
    legajo: row.legajo,
    nombre: row.nombre,
    apellido: row.apellido,
    dni: row.dni,
    fechaVencimiento: row.fecha_vencimiento && row.fecha_vencimiento.toISOString ? row.fecha_vencimiento.toISOString().split('T')[0] : row.fecha_vencimiento,
    historialRenovaciones: row.historial_renovaciones || []
  };
}

async function readLicenciasDb() {
  const res = await db.query('SELECT legajo, nombre, apellido, dni, fecha_vencimiento, historial_renovaciones FROM licencias ORDER BY legajo');
  if (!res) return readLicenciasFile();
  return (res.rows || []).map(rowToLicencia);
}

async function findLicenciaByLegajoDb(legajo) {
  const res = await db.query('SELECT legajo, nombre, apellido, dni, fecha_vencimiento, historial_renovaciones FROM licencias WHERE legajo = $1', [legajo]);
  if (!res || !res.rows || res.rows.length === 0) return null;
  return rowToLicencia(res.rows[0]);
}

async function createLicenciaDb(licencia) {
  await db.query(
    'INSERT INTO licencias (legajo, nombre, apellido, dni, fecha_vencimiento, historial_renovaciones) VALUES ($1, $2, $3, $4, $5, $6)',
    [licencia.legajo, licencia.nombre, licencia.apellido, licencia.dni, licencia.fechaVencimiento, JSON.stringify(licencia.historialRenovaciones || [])]
  );
}

async function updateLicenciaDb(legajo, licencia) {
  const res = await db.query(
    'UPDATE licencias SET legajo = $1, nombre = $2, apellido = $3, dni = $4, fecha_vencimiento = $5, historial_renovaciones = $6 WHERE legajo = $7',
    [licencia.legajo, licencia.nombre, licencia.apellido, licencia.dni, licencia.fechaVencimiento, JSON.stringify(licencia.historialRenovaciones || []), legajo]
  );
  return res && res.rowCount > 0;
}

async function deleteLicenciaDb(legajo) {
  const res = await db.query('DELETE FROM licencias WHERE legajo = $1', [legajo]);
  return res && res.rowCount > 0;
}

async function readLicencias() {
  if (db.useDatabase()) return readLicenciasDb();
  return readLicenciasFile();
}

async function findLicencia(legajo) {
  if (db.useDatabase()) return findLicenciaByLegajoDb(legajo);
  const list = await readLicenciasFile();
  return list.find(l => l.legajo === legajo) || null;
}

// GET - Todas las licencias
router.get('/', async (req, res) => {
  try {
    let licencias;
    if (db.useDatabase()) {
      licencias = await readLicenciasDb();
    } else {
      licencias = await readLicenciasFile();
    }
    const conEstado = licencias.map(l => ({ ...l, estado: calcularEstado(l.fechaVencimiento) }));
    res.json(conEstado);
  } catch (error) {
    console.error('Error al leer licencias:', error);
    res.status(500).json({ error: 'Error al obtener las licencias' });
  }
});

// POST - Crear licencia
router.post('/', async (req, res) => {
  try {
    const { legajo, nombre, apellido, dni, fechaVencimiento } = req.body;
    if (!legajo || !nombre || !apellido || !dni || !fechaVencimiento) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }

    if (db.useDatabase()) {
      const existe = await findLicenciaByLegajoDb(legajo);
      if (existe) return res.status(400).json({ error: 'Ya existe una licencia con ese legajo' });
      await createLicenciaDb({ legajo, nombre, apellido, dni, fechaVencimiento, historialRenovaciones: [] });
      const nueva = await findLicenciaByLegajoDb(legajo);
      nueva.estado = calcularEstado(nueva.fechaVencimiento);
      return res.status(201).json(nueva);
    }

    const licencias = await readLicenciasFile();
    if (licencias.find(l => l.legajo === legajo)) {
      return res.status(400).json({ error: 'Ya existe una licencia con ese legajo' });
    }
    const nuevaLicencia = { legajo, nombre, apellido, dni, fechaVencimiento, historialRenovaciones: [] };
    licencias.push(nuevaLicencia);
    await writeLicenciasFile(licencias);
    nuevaLicencia.estado = calcularEstado(nuevaLicencia.fechaVencimiento);
    res.status(201).json(nuevaLicencia);
  } catch (error) {
    console.error('Error al crear licencia:', error);
    res.status(500).json({ error: 'Error al crear la licencia' });
  }
});

// PUT - Actualizar licencia
router.put('/:legajo', async (req, res) => {
  try {
    const { legajo: nuevoLegajo, nombre, apellido, dni, fechaVencimiento } = req.body;
    const legajo = req.params.legajo;
    if (!nuevoLegajo || !nombre || !apellido || !dni || !fechaVencimiento) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }

    if (db.useDatabase()) {
      const actual = await findLicenciaByLegajoDb(legajo);
      if (!actual) return res.status(404).json({ error: 'Licencia no encontrada' });
      if (nuevoLegajo !== legajo) {
        const otro = await findLicenciaByLegajoDb(nuevoLegajo);
        if (otro) return res.status(400).json({ error: 'Ya existe una licencia con ese legajo' });
      }
      await updateLicenciaDb(legajo, { legajo: nuevoLegajo, nombre, apellido, dni, fechaVencimiento, historialRenovaciones: actual.historialRenovaciones || [] });
      const actualizada = await findLicenciaByLegajoDb(nuevoLegajo);
      actualizada.estado = calcularEstado(actualizada.fechaVencimiento);
      return res.json(actualizada);
    }

    const licencias = await readLicenciasFile();
    const index = licencias.findIndex(l => l.legajo === legajo);
    if (index === -1) return res.status(404).json({ error: 'Licencia no encontrada' });
    if (nuevoLegajo !== legajo && licencias.find(l => l.legajo === nuevoLegajo)) {
      return res.status(400).json({ error: 'Ya existe una licencia con ese legajo' });
    }
    const historial = licencias[index].historialRenovaciones || [];
    licencias[index] = { legajo: nuevoLegajo, nombre, apellido, dni, fechaVencimiento, historialRenovaciones: historial };
    await writeLicenciasFile(licencias);
    licencias[index].estado = calcularEstado(licencias[index].fechaVencimiento);
    res.json(licencias[index]);
  } catch (error) {
    console.error('Error al actualizar licencia:', error);
    res.status(500).json({ error: 'Error al actualizar la licencia' });
  }
});

// POST - Renovar licencia
router.post('/:legajo/renovar', async (req, res) => {
  try {
    const { nuevaFechaVencimiento, observaciones } = req.body;
    const legajo = req.params.legajo;
    if (!nuevaFechaVencimiento) return res.status(400).json({ error: 'La nueva fecha de vencimiento es requerida' });

    if (db.useDatabase()) {
      const actual = await findLicenciaByLegajoDb(legajo);
      if (!actual) return res.status(404).json({ error: 'Licencia no encontrada' });
      const historial = actual.historialRenovaciones || [];
      historial.push({
        fechaRenovacion: new Date().toISOString().split('T')[0],
        fechaVencimientoAnterior: actual.fechaVencimiento,
        fechaVencimientoNueva: nuevaFechaVencimiento,
        observaciones: observaciones || ''
      });
      await db.query(
        'UPDATE licencias SET fecha_vencimiento = $1, historial_renovaciones = $2 WHERE legajo = $3',
        [nuevaFechaVencimiento, JSON.stringify(historial), legajo]
      );
      const actualizada = await findLicenciaByLegajoDb(legajo);
      actualizada.estado = calcularEstado(actualizada.fechaVencimiento);
      return res.json(actualizada);
    }

    const licencias = await readLicenciasFile();
    const index = licencias.findIndex(l => l.legajo === legajo);
    if (index === -1) return res.status(404).json({ error: 'Licencia no encontrada' });
    const hist = licencias[index].historialRenovaciones || [];
    hist.push({
      fechaRenovacion: new Date().toISOString().split('T')[0],
      fechaVencimientoAnterior: licencias[index].fechaVencimiento,
      fechaVencimientoNueva: nuevaFechaVencimiento,
      observaciones: observaciones || ''
    });
    licencias[index].historialRenovaciones = hist;
    licencias[index].fechaVencimiento = nuevaFechaVencimiento;
    await writeLicenciasFile(licencias);
    licencias[index].estado = calcularEstado(licencias[index].fechaVencimiento);
    res.json(licencias[index]);
  } catch (error) {
    console.error('Error al renovar licencia:', error);
    res.status(500).json({ error: 'Error al renovar la licencia' });
  }
});

// GET - Una licencia por legajo
router.get('/:legajo', async (req, res) => {
  try {
    const licencia = await findLicencia(req.params.legajo);
    if (!licencia) return res.status(404).json({ error: 'Licencia no encontrada' });
    licencia.estado = calcularEstado(licencia.fechaVencimiento);
    res.json(licencia);
  } catch (error) {
    console.error('Error al leer licencia:', error);
    res.status(500).json({ error: 'Error al obtener la licencia' });
  }
});

// DELETE - Eliminar licencia
router.delete('/:legajo', async (req, res) => {
  try {
    const legajo = req.params.legajo;

    if (db.useDatabase()) {
      const ok = await deleteLicenciaDb(legajo);
      if (!ok) return res.status(404).json({ error: 'Licencia no encontrada' });
      return res.json({ message: 'Licencia eliminada correctamente' });
    }

    const licencias = await readLicenciasFile();
    const index = licencias.findIndex(l => l.legajo === legajo);
    if (index === -1) return res.status(404).json({ error: 'Licencia no encontrada' });
    licencias.splice(index, 1);
    await writeLicenciasFile(licencias);
    res.json({ message: 'Licencia eliminada correctamente' });
  } catch (error) {
    console.error('Error al eliminar licencia:', error);
    res.status(500).json({ error: 'Error al eliminar la licencia' });
  }
});

module.exports = router;
