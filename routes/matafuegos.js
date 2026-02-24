const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const db = require('../db');

const router = express.Router();
const DATA_FILE = path.join(__dirname, '..', 'data', 'matafuegos.json');

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

async function readMatafuegosFile() {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    if (e.code === 'ENOENT') return [];
    throw e;
  }
}

async function writeMatafuegosFile(matafuegos) {
  const dataDir = path.dirname(DATA_FILE);
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(matafuegos, null, 2), 'utf8');
}

function rowToMatafuego(row) {
  return {
    id: row.id,
    numeroMatafuego: row.numero_matafuego,
    numeroCoche: row.numero_coche,
    fechaVencimiento: row.fecha_vencimiento && row.fecha_vencimiento.toISOString ? row.fecha_vencimiento.toISOString().split('T')[0] : row.fecha_vencimiento,
    historialReemplazos: row.historial_reemplazos || []
  };
}

async function readMatafuegosDb() {
  const res = await db.query('SELECT id, numero_matafuego, numero_coche, fecha_vencimiento, historial_reemplazos FROM matafuegos ORDER BY id');
  if (!res) return readMatafuegosFile();
  return (res.rows || []).map(rowToMatafuego);
}

async function findMatafuegoByIdDb(id) {
  const res = await db.query('SELECT id, numero_matafuego, numero_coche, fecha_vencimiento, historial_reemplazos FROM matafuegos WHERE id = $1', [id]);
  if (!res || !res.rows || res.rows.length === 0) return null;
  return rowToMatafuego(res.rows[0]);
}

async function findMatafuegoByCocheDb(numeroCoche) {
  const res = await db.query('SELECT id, numero_matafuego, numero_coche, fecha_vencimiento, historial_reemplazos FROM matafuegos WHERE numero_coche = $1', [numeroCoche.toString()]);
  if (!res || !res.rows || res.rows.length === 0) return null;
  return rowToMatafuego(res.rows[0]);
}

async function createMatafuegoDb(m) {
  const res = await db.query(
    'INSERT INTO matafuegos (numero_matafuego, numero_coche, fecha_vencimiento, historial_reemplazos) VALUES ($1, $2, $3, $4) RETURNING id',
    [m.numeroMatafuego, m.numeroCoche, m.fechaVencimiento, JSON.stringify(m.historialReemplazos || [])]
  );
  return res && res.rows[0] ? res.rows[0].id : null;
}

async function updateMatafuegoDb(id, m) {
  const res = await db.query(
    'UPDATE matafuegos SET numero_matafuego = $1, numero_coche = $2, fecha_vencimiento = $3, historial_reemplazos = $4 WHERE id = $5',
    [m.numeroMatafuego, m.numeroCoche, m.fechaVencimiento, JSON.stringify(m.historialReemplazos || []), id]
  );
  return res && res.rowCount > 0;
}

async function deleteMatafuegoDb(id) {
  const res = await db.query('DELETE FROM matafuegos WHERE id = $1', [id]);
  return res && res.rowCount > 0;
}

// POST - Reemplazar por coche (debe ir antes de /:id)
router.post('/reemplazar-por-coche', async (req, res) => {
  try {
    const { numeroCoche, nuevaFechaVencimiento, observaciones } = req.body;
    if (!numeroCoche || !nuevaFechaVencimiento) {
      return res.status(400).json({ error: 'El número de coche y la nueva fecha de vencimiento son requeridos' });
    }

    if (db.useDatabase()) {
      const m = await findMatafuegoByCocheDb(numeroCoche);
      if (!m) return res.status(404).json({ error: 'No se encontró un matafuego para ese coche' });
      const hist = m.historialReemplazos || [];
      hist.push({
        fechaReemplazo: new Date().toISOString().split('T')[0],
        numeroMatafuegoAnterior: m.numeroMatafuego,
        numeroMatafuegoNuevo: m.numeroMatafuego,
        fechaVencimientoAnterior: m.fechaVencimiento,
        fechaVencimientoNueva: nuevaFechaVencimiento,
        observaciones: observaciones || ''
      });
      await db.query('UPDATE matafuegos SET fecha_vencimiento = $1, historial_reemplazos = $2 WHERE id = $3', [nuevaFechaVencimiento, JSON.stringify(hist), m.id]);
      const actualizado = await findMatafuegoByIdDb(m.id);
      actualizado.estado = calcularEstado(actualizado.fechaVencimiento);
      return res.json(actualizado);
    }

    const matafuegos = await readMatafuegosFile();
    const index = matafuegos.findIndex(m => m.numeroCoche === numeroCoche.toString());
    if (index === -1) return res.status(404).json({ error: 'No se encontró un matafuego para ese coche' });
    const hist = matafuegos[index].historialReemplazos || [];
    hist.push({
      fechaReemplazo: new Date().toISOString().split('T')[0],
      numeroMatafuegoAnterior: matafuegos[index].numeroMatafuego,
      numeroMatafuegoNuevo: matafuegos[index].numeroMatafuego,
      fechaVencimientoAnterior: matafuegos[index].fechaVencimiento,
      fechaVencimientoNueva: nuevaFechaVencimiento,
      observaciones: observaciones || ''
    });
    matafuegos[index].historialReemplazos = hist;
    matafuegos[index].fechaVencimiento = nuevaFechaVencimiento;
    await writeMatafuegosFile(matafuegos);
    matafuegos[index].estado = calcularEstado(matafuegos[index].fechaVencimiento);
    res.json(matafuegos[index]);
  } catch (error) {
    console.error('Error al reemplazar matafuego:', error);
    res.status(500).json({ error: 'Error al reemplazar el matafuego' });
  }
});

// POST - Reemplazar por ID
router.post('/:id/reemplazar', async (req, res) => {
  try {
    const { nuevoNumeroMatafuego, nuevaFechaVencimiento, observaciones } = req.body;
    const id = parseInt(req.params.id);
    if (!nuevoNumeroMatafuego || !nuevaFechaVencimiento) {
      return res.status(400).json({ error: 'El nuevo número de matafuego y la nueva fecha de vencimiento son requeridos' });
    }

    if (db.useDatabase()) {
      const m = await findMatafuegoByIdDb(id);
      if (!m) return res.status(404).json({ error: 'Matafuego no encontrado' });
      const hist = m.historialReemplazos || [];
      hist.push({
        fechaReemplazo: new Date().toISOString().split('T')[0],
        numeroMatafuegoAnterior: m.numeroMatafuego,
        numeroMatafuegoNuevo: nuevoNumeroMatafuego,
        fechaVencimientoAnterior: m.fechaVencimiento,
        fechaVencimientoNueva: nuevaFechaVencimiento,
        observaciones: observaciones || ''
      });
      await db.query('UPDATE matafuegos SET numero_matafuego = $1, fecha_vencimiento = $2, historial_reemplazos = $3 WHERE id = $4', [nuevoNumeroMatafuego, nuevaFechaVencimiento, JSON.stringify(hist), id]);
      const actualizado = await findMatafuegoByIdDb(id);
      actualizado.estado = calcularEstado(actualizado.fechaVencimiento);
      return res.json(actualizado);
    }

    const matafuegos = await readMatafuegosFile();
    const index = matafuegos.findIndex(m => m.id === id);
    if (index === -1) return res.status(404).json({ error: 'Matafuego no encontrado' });
    const hist = matafuegos[index].historialReemplazos || [];
    hist.push({
      fechaReemplazo: new Date().toISOString().split('T')[0],
      numeroMatafuegoAnterior: matafuegos[index].numeroMatafuego,
      numeroMatafuegoNuevo: nuevoNumeroMatafuego,
      fechaVencimientoAnterior: matafuegos[index].fechaVencimiento,
      fechaVencimientoNueva: nuevaFechaVencimiento,
      observaciones: observaciones || ''
    });
    matafuegos[index].numeroMatafuego = nuevoNumeroMatafuego;
    matafuegos[index].fechaVencimiento = nuevaFechaVencimiento;
    matafuegos[index].historialReemplazos = hist;
    await writeMatafuegosFile(matafuegos);
    matafuegos[index].estado = calcularEstado(matafuegos[index].fechaVencimiento);
    res.json(matafuegos[index]);
  } catch (error) {
    console.error('Error al reemplazar matafuego:', error);
    res.status(500).json({ error: 'Error al reemplazar el matafuego' });
  }
});

// GET - Todos los matafuegos
router.get('/', async (req, res) => {
  try {
    const lista = db.useDatabase() ? await readMatafuegosDb() : await readMatafuegosFile();
    const conEstado = lista.map(m => ({ ...m, estado: calcularEstado(m.fechaVencimiento) }));
    res.json(conEstado);
  } catch (error) {
    console.error('Error al leer matafuegos:', error);
    res.status(500).json({ error: 'Error al obtener los matafuegos' });
  }
});

// POST - Crear matafuego
router.post('/', async (req, res) => {
  try {
    const { numeroMatafuego, numeroCoche, fechaVencimiento } = req.body;
    if (!numeroMatafuego || !numeroCoche || !fechaVencimiento) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }

    if (db.useDatabase()) {
      const nuevoId = await createMatafuegoDb({ numeroMatafuego, numeroCoche, fechaVencimiento, historialReemplazos: [] });
      const nuevo = await findMatafuegoByIdDb(nuevoId);
      nuevo.estado = calcularEstado(nuevo.fechaVencimiento);
      return res.status(201).json(nuevo);
    }

    const matafuegos = await readMatafuegosFile();
    const nuevoId = matafuegos.length > 0 ? Math.max(...matafuegos.map(m => m.id)) + 1 : 1;
    const nuevo = { id: nuevoId, numeroMatafuego, numeroCoche, fechaVencimiento, historialReemplazos: [] };
    matafuegos.push(nuevo);
    await writeMatafuegosFile(matafuegos);
    nuevo.estado = calcularEstado(nuevo.fechaVencimiento);
    res.status(201).json(nuevo);
  } catch (error) {
    console.error('Error al crear matafuego:', error);
    res.status(500).json({ error: 'Error al crear el matafuego' });
  }
});

// PUT - Actualizar matafuego
router.put('/:id', async (req, res) => {
  try {
    const { numeroMatafuego, numeroCoche, fechaVencimiento } = req.body;
    const id = parseInt(req.params.id);
    if (!numeroMatafuego || !numeroCoche || !fechaVencimiento) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }

    if (db.useDatabase()) {
      const actual = await findMatafuegoByIdDb(id);
      if (!actual) return res.status(404).json({ error: 'Matafuego no encontrado' });
      await updateMatafuegoDb(id, { numeroMatafuego, numeroCoche, fechaVencimiento, historialReemplazos: actual.historialReemplazos || [] });
      const actualizado = await findMatafuegoByIdDb(id);
      actualizado.estado = calcularEstado(actualizado.fechaVencimiento);
      return res.json(actualizado);
    }

    const matafuegos = await readMatafuegosFile();
    const index = matafuegos.findIndex(m => m.id === id);
    if (index === -1) return res.status(404).json({ error: 'Matafuego no encontrado' });
    const hist = matafuegos[index].historialReemplazos || [];
    matafuegos[index] = { id, numeroMatafuego, numeroCoche, fechaVencimiento, historialReemplazos: hist };
    await writeMatafuegosFile(matafuegos);
    matafuegos[index].estado = calcularEstado(matafuegos[index].fechaVencimiento);
    res.json(matafuegos[index]);
  } catch (error) {
    console.error('Error al actualizar matafuego:', error);
    res.status(500).json({ error: 'Error al actualizar el matafuego' });
  }
});

// GET - Un matafuego por ID
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const m = db.useDatabase() ? await findMatafuegoByIdDb(id) : (await readMatafuegosFile()).find(x => x.id === id);
    if (!m) return res.status(404).json({ error: 'Matafuego no encontrado' });
    m.estado = calcularEstado(m.fechaVencimiento);
    res.json(m);
  } catch (error) {
    console.error('Error al leer matafuego:', error);
    res.status(500).json({ error: 'Error al obtener el matafuego' });
  }
});

// DELETE - Eliminar matafuego
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    if (db.useDatabase()) {
      const ok = await deleteMatafuegoDb(id);
      if (!ok) return res.status(404).json({ error: 'Matafuego no encontrado' });
      return res.json({ message: 'Matafuego eliminado correctamente' });
    }

    const matafuegos = await readMatafuegosFile();
    const index = matafuegos.findIndex(m => m.id === id);
    if (index === -1) return res.status(404).json({ error: 'Matafuego no encontrado' });
    matafuegos.splice(index, 1);
    await writeMatafuegosFile(matafuegos);
    res.json({ message: 'Matafuego eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar matafuego:', error);
    res.status(500).json({ error: 'Error al eliminar el matafuego' });
  }
});

module.exports = router;
