const express = require('express');
const fs = require('fs').promises;
const path = require('path');

const router = express.Router();
const DATA_FILE = path.join(__dirname, '..', 'data', 'licencias.json');

// Función auxiliar para leer el archivo JSON
async function readLicencias() {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    // Si el archivo no existe, retornar array vacío
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

// Función auxiliar para escribir en el archivo JSON
async function writeLicencias(licencias) {
  // Asegurar que el directorio existe
  const dataDir = path.dirname(DATA_FILE);
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(licencias, null, 2), 'utf8');
}

// Función para calcular el estado de una licencia
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

// GET - Obtener todas las licencias
router.get('/', async (req, res) => {
  try {
    const licencias = await readLicencias();
    // Agregar estado calculado a cada licencia
    const licenciasConEstado = licencias.map(licencia => ({
      ...licencia,
      estado: calcularEstado(licencia.fechaVencimiento)
    }));
    res.json(licenciasConEstado);
  } catch (error) {
    console.error('Error al leer licencias:', error);
    res.status(500).json({ error: 'Error al obtener las licencias' });
  }
});

// POST - Crear una nueva licencia
router.post('/', async (req, res) => {
  try {
    const { legajo, nombre, apellido, dni, fechaVencimiento } = req.body;
    
    // Validar campos requeridos
    if (!legajo || !nombre || !apellido || !dni || !fechaVencimiento) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }
    
    const licencias = await readLicencias();
    
    // Verificar que el legajo no exista
    if (licencias.find(l => l.legajo === legajo)) {
      return res.status(400).json({ error: 'Ya existe una licencia con ese legajo' });
    }
    
    const nuevaLicencia = {
      legajo,
      nombre,
      apellido,
      dni,
      fechaVencimiento,
      historialRenovaciones: []
    };
    
    licencias.push(nuevaLicencia);
    await writeLicencias(licencias);
    
    nuevaLicencia.estado = calcularEstado(nuevaLicencia.fechaVencimiento);
    res.status(201).json(nuevaLicencia);
  } catch (error) {
    console.error('Error al crear licencia:', error);
    res.status(500).json({ error: 'Error al crear la licencia' });
  }
});

// PUT - Actualizar una licencia
router.put('/:legajo', async (req, res) => {
  try {
    const { legajo: nuevoLegajo, nombre, apellido, dni, fechaVencimiento } = req.body;
    const legajo = req.params.legajo;
    
    // Validar campos requeridos
    if (!nuevoLegajo || !nombre || !apellido || !dni || !fechaVencimiento) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }
    
    const licencias = await readLicencias();
    const index = licencias.findIndex(l => l.legajo === legajo);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Licencia no encontrada' });
    }
    
    // Si cambió el legajo, verificar que no exista
    if (nuevoLegajo !== legajo && licencias.find(l => l.legajo === nuevoLegajo)) {
      return res.status(400).json({ error: 'Ya existe una licencia con ese legajo' });
    }
    
    // Preservar el historial de renovaciones
    const historialRenovaciones = licencias[index].historialRenovaciones || [];
    
    licencias[index] = {
      legajo: nuevoLegajo,
      nombre,
      apellido,
      dni,
      fechaVencimiento,
      historialRenovaciones
    };
    
    await writeLicencias(licencias);
    
    licencias[index].estado = calcularEstado(licencias[index].fechaVencimiento);
    res.json(licencias[index]);
  } catch (error) {
    console.error('Error al actualizar licencia:', error);
    res.status(500).json({ error: 'Error al actualizar la licencia' });
  }
});

// POST - Renovar una licencia (debe ir antes de GET /:legajo)
router.post('/:legajo/renovar', async (req, res) => {
  try {
    const { nuevaFechaVencimiento, observaciones } = req.body;
    const legajo = req.params.legajo;
    
    if (!nuevaFechaVencimiento) {
      return res.status(400).json({ error: 'La nueva fecha de vencimiento es requerida' });
    }
    
    const licencias = await readLicencias();
    const index = licencias.findIndex(l => l.legajo === legajo);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Licencia no encontrada' });
    }
    
    // Guardar la renovación en el historial
    const renovacion = {
      fechaRenovacion: new Date().toISOString().split('T')[0],
      fechaVencimientoAnterior: licencias[index].fechaVencimiento,
      fechaVencimientoNueva: nuevaFechaVencimiento,
      observaciones: observaciones || ''
    };
    
    // Agregar al historial
    if (!licencias[index].historialRenovaciones) {
      licencias[index].historialRenovaciones = [];
    }
    licencias[index].historialRenovaciones.push(renovacion);
    
    // Actualizar la fecha de vencimiento
    licencias[index].fechaVencimiento = nuevaFechaVencimiento;
    
    await writeLicencias(licencias);
    
    licencias[index].estado = calcularEstado(licencias[index].fechaVencimiento);
    res.json(licencias[index]);
  } catch (error) {
    console.error('Error al renovar licencia:', error);
    res.status(500).json({ error: 'Error al renovar la licencia' });
  }
});

// GET - Obtener una licencia por legajo
router.get('/:legajo', async (req, res) => {
  try {
    const licencias = await readLicencias();
    const licencia = licencias.find(l => l.legajo === req.params.legajo);
    
    if (!licencia) {
      return res.status(404).json({ error: 'Licencia no encontrada' });
    }
    
    licencia.estado = calcularEstado(licencia.fechaVencimiento);
    res.json(licencia);
  } catch (error) {
    console.error('Error al leer licencia:', error);
    res.status(500).json({ error: 'Error al obtener la licencia' });
  }
});

// DELETE - Eliminar una licencia
router.delete('/:legajo', async (req, res) => {
  try {
    const legajo = req.params.legajo;
    const licencias = await readLicencias();
    const index = licencias.findIndex(l => l.legajo === legajo);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Licencia no encontrada' });
    }
    
    licencias.splice(index, 1);
    await writeLicencias(licencias);
    
    res.json({ message: 'Licencia eliminada correctamente' });
  } catch (error) {
    console.error('Error al eliminar licencia:', error);
    res.status(500).json({ error: 'Error al eliminar la licencia' });
  }
});

module.exports = router;

