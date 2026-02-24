const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const db = require('../db');

const router = express.Router();
const LICENCIAS_FILE = path.join(__dirname, '..', 'data', 'licencias.json');
const MATAFUEGOS_FILE = path.join(__dirname, '..', 'data', 'matafuegos.json');

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

function calcularDiasRestantes(fechaVencimiento) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const vencimiento = new Date(fechaVencimiento);
  vencimiento.setHours(0, 0, 0, 0);
  return Math.ceil((vencimiento - hoy) / (1000 * 60 * 60 * 24));
}

async function readLicencias() {
  if (db.useDatabase()) {
    const res = await db.query('SELECT legajo, nombre, apellido, dni, fecha_vencimiento FROM licencias ORDER BY legajo');
    if (!res || !res.rows) return [];
    return res.rows.map(r => ({
      legajo: r.legajo,
      nombre: r.nombre,
      apellido: r.apellido,
      dni: r.dni,
      fechaVencimiento: r.fecha_vencimiento && r.fecha_vencimiento.toISOString ? r.fecha_vencimiento.toISOString().split('T')[0] : r.fecha_vencimiento
    }));
  }
  try {
    const data = await fs.readFile(LICENCIAS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    if (e.code === 'ENOENT') return [];
    throw e;
  }
}

async function readMatafuegos() {
  if (db.useDatabase()) {
    const res = await db.query('SELECT id, numero_matafuego, numero_coche, fecha_vencimiento FROM matafuegos ORDER BY id');
    if (!res || !res.rows) return [];
    return res.rows.map(r => ({
      id: r.id,
      numeroMatafuego: r.numero_matafuego,
      numeroCoche: r.numero_coche,
      fechaVencimiento: r.fecha_vencimiento && r.fecha_vencimiento.toISOString ? r.fecha_vencimiento.toISOString().split('T')[0] : r.fecha_vencimiento
    }));
  }
  try {
    const data = await fs.readFile(MATAFUEGOS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    if (e.code === 'ENOENT') return [];
    throw e;
  }
}

router.get('/', async (req, res) => {
  try {
    const licencias = await readLicencias();
    const matafuegos = await readMatafuegos();

    const licenciasConEstado = licencias.map(l => ({ ...l, estado: calcularEstado(l.fechaVencimiento) }));
    const licenciasVencidas = licenciasConEstado.filter(l => l.estado === 'VENCIDO').length;
    const licenciasProximas = licenciasConEstado.filter(l => l.estado === 'URGENTE' || l.estado === 'PRÓXIMO').length;

    const licencias30Dias = licencias
      .filter(l => {
        const d = calcularDiasRestantes(l.fechaVencimiento);
        return d >= 0 && d <= 30;
      })
      .map(l => ({ legajo: l.legajo, fechaVencimiento: l.fechaVencimiento }))
      .sort((a, b) => new Date(a.fechaVencimiento) - new Date(b.fechaVencimiento));

    const matafuegosConEstado = matafuegos.map(m => ({ ...m, estado: calcularEstado(m.fechaVencimiento) }));
    const matafuegosVencidos = matafuegosConEstado.filter(m => m.estado === 'VENCIDO').length;
    const matafuegosProximos = matafuegosConEstado.filter(m => m.estado === 'URGENTE' || m.estado === 'PRÓXIMO').length;

    const matafuegos30Dias = matafuegos
      .filter(m => {
        const d = calcularDiasRestantes(m.fechaVencimiento);
        return d >= 0 && d <= 30;
      })
      .map(m => ({ numeroCoche: m.numeroCoche, fechaVencimiento: m.fechaVencimiento }))
      .sort((a, b) => new Date(a.fechaVencimiento) - new Date(b.fechaVencimiento));

    res.json({
      licencias: {
        total: licencias.length,
        vencidas: licenciasVencidas,
        proximas: licenciasProximas,
        proximas30Dias: licencias30Dias
      },
      matafuegos: {
        total: matafuegos.length,
        vencidos: matafuegosVencidos,
        proximos: matafuegosProximos,
        proximos30Dias: matafuegos30Dias
      }
    });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({ error: 'Error al obtener las estadísticas' });
  }
});

module.exports = router;
