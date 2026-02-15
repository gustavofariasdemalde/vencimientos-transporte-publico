const express = require('express');
const fs = require('fs').promises;
const path = require('path');

const router = express.Router();
const LICENCIAS_FILE = path.join(__dirname, '..', 'data', 'licencias.json');
const MATAFUEGOS_FILE = path.join(__dirname, '..', 'data', 'matafuegos.json');

// Función para calcular el estado
function calcularEstado(fechaVencimiento) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const vencimiento = new Date(fechaVencimiento);
  vencimiento.setHours(0, 0, 0, 0);
  
  const diasRestantes = Math.ceil((vencimiento - hoy) / (1000 * 60 * 60 * 24));
  
  if (diasRestantes < 0) {
    return 'VENCIDO';
  } else if (diasRestantes <= 7) {
    return 'URGENTE';
  } else if (diasRestantes <= 15) {
    return 'PRÓXIMO';
  } else {
    return 'OK';
  }
}

// Función para calcular días restantes
function calcularDiasRestantes(fechaVencimiento) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const vencimiento = new Date(fechaVencimiento);
  vencimiento.setHours(0, 0, 0, 0);
  
  return Math.ceil((vencimiento - hoy) / (1000 * 60 * 60 * 24));
}

// Función auxiliar para leer licencias
async function readLicencias() {
  try {
    const data = await fs.readFile(LICENCIAS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

// Función auxiliar para leer matafuegos
async function readMatafuegos() {
  try {
    const data = await fs.readFile(MATAFUEGOS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

// GET - Obtener estadísticas del dashboard
router.get('/', async (req, res) => {
  try {
    const licencias = await readLicencias();
    const matafuegos = await readMatafuegos();
    
    // Calcular estadísticas de licencias
    const licenciasConEstado = licencias.map(l => ({
      ...l,
      estado: calcularEstado(l.fechaVencimiento)
    }));
    
    const licenciasVencidas = licenciasConEstado.filter(l => l.estado === 'VENCIDO').length;
    const licenciasProximas = licenciasConEstado.filter(l => 
      l.estado === 'URGENTE' || l.estado === 'PRÓXIMO'
    ).length;
    
    // Calcular licencias a vencer en menos de 30 días (con datos completos)
    const licencias30Dias = licencias.filter(l => {
      const diasRestantes = calcularDiasRestantes(l.fechaVencimiento);
      return diasRestantes >= 0 && diasRestantes <= 30;
    }).map(l => ({
      legajo: l.legajo,
      fechaVencimiento: l.fechaVencimiento
    })).sort((a, b) => new Date(a.fechaVencimiento) - new Date(b.fechaVencimiento));
    
    // Calcular estadísticas de matafuegos
    const matafuegosConEstado = matafuegos.map(m => ({
      ...m,
      estado: calcularEstado(m.fechaVencimiento)
    }));
    
    const matafuegosVencidos = matafuegosConEstado.filter(m => m.estado === 'VENCIDO').length;
    const matafuegosProximos = matafuegosConEstado.filter(m => 
      m.estado === 'URGENTE' || m.estado === 'PRÓXIMO'
    ).length;
    
    // Calcular matafuegos a vencer en menos de 30 días (con datos completos)
    const matafuegos30Dias = matafuegos.filter(m => {
      const diasRestantes = calcularDiasRestantes(m.fechaVencimiento);
      return diasRestantes >= 0 && diasRestantes <= 30;
    }).map(m => ({
      numeroCoche: m.numeroCoche,
      fechaVencimiento: m.fechaVencimiento
    })).sort((a, b) => new Date(a.fechaVencimiento) - new Date(b.fechaVencimiento));
    
    const estadisticas = {
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
    };
    
    res.json(estadisticas);
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({ error: 'Error al obtener las estadísticas' });
  }
});

module.exports = router;

