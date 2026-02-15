const express = require('express');
const fs = require('fs').promises;
const path = require('path');

const router = express.Router();
const DATA_FILE = path.join(__dirname, '..', 'data', 'matafuegos.json');

// Función auxiliar para leer el archivo JSON
async function readMatafuegos() {
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
async function writeMatafuegos(matafuegos) {
  // Asegurar que el directorio existe
  const dataDir = path.dirname(DATA_FILE);
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(matafuegos, null, 2), 'utf8');
}

// Función para calcular el estado de un matafuego
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

// GET - Obtener todos los matafuegos
router.get('/', async (req, res) => {
  try {
    const matafuegos = await readMatafuegos();
    // Agregar estado calculado a cada matafuego
    const matafuegosConEstado = matafuegos.map(matafuego => ({
      ...matafuego,
      estado: calcularEstado(matafuego.fechaVencimiento)
    }));
    res.json(matafuegosConEstado);
  } catch (error) {
    console.error('Error al leer matafuegos:', error);
    res.status(500).json({ error: 'Error al obtener los matafuegos' });
  }
});

// POST - Crear un nuevo matafuego
router.post('/', async (req, res) => {
  try {
    const { numeroMatafuego, numeroCoche, fechaVencimiento } = req.body;
    
    // Validar campos requeridos
    if (!numeroMatafuego || !numeroCoche || !fechaVencimiento) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }
    
    const matafuegos = await readMatafuegos();
    
    // Generar ID único interno
    const nuevoId = matafuegos.length > 0 
      ? Math.max(...matafuegos.map(m => m.id)) + 1 
      : 1;
    
    const nuevoMatafuego = {
      id: nuevoId,
      numeroMatafuego,
      numeroCoche,
      fechaVencimiento,
      historialReemplazos: []
    };
    
    matafuegos.push(nuevoMatafuego);
    await writeMatafuegos(matafuegos);
    
    nuevoMatafuego.estado = calcularEstado(nuevoMatafuego.fechaVencimiento);
    res.status(201).json(nuevoMatafuego);
  } catch (error) {
    console.error('Error al crear matafuego:', error);
    res.status(500).json({ error: 'Error al crear el matafuego' });
  }
});

// PUT - Actualizar un matafuego
router.put('/:id', async (req, res) => {
  try {
    const { numeroMatafuego, numeroCoche, fechaVencimiento } = req.body;
    const id = parseInt(req.params.id);
    
    // Validar campos requeridos
    if (!numeroMatafuego || !numeroCoche || !fechaVencimiento) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }
    
    const matafuegos = await readMatafuegos();
    const index = matafuegos.findIndex(m => m.id === id);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Matafuego no encontrado' });
    }
    
    // Preservar el historial de reemplazos
    const historialReemplazos = matafuegos[index].historialReemplazos || [];
    
    matafuegos[index] = {
      id,
      numeroMatafuego,
      numeroCoche,
      fechaVencimiento,
      historialReemplazos
    };
    
    await writeMatafuegos(matafuegos);
    
    matafuegos[index].estado = calcularEstado(matafuegos[index].fechaVencimiento);
    res.json(matafuegos[index]);
  } catch (error) {
    console.error('Error al actualizar matafuego:', error);
    res.status(500).json({ error: 'Error al actualizar el matafuego' });
  }
});

// POST - Reemplazar un matafuego por coche (nueva ruta)
router.post('/reemplazar-por-coche', async (req, res) => {
  try {
    const { numeroCoche, nuevaFechaVencimiento, observaciones } = req.body;
    
    if (!numeroCoche || !nuevaFechaVencimiento) {
      return res.status(400).json({ error: 'El número de coche y la nueva fecha de vencimiento son requeridos' });
    }
    
    const matafuegos = await readMatafuegos();
    const index = matafuegos.findIndex(m => m.numeroCoche === numeroCoche.toString());
    
    if (index === -1) {
      return res.status(404).json({ error: 'No se encontró un matafuego para ese coche' });
    }
    
    // Guardar el reemplazo en el historial
    const reemplazo = {
      fechaReemplazo: new Date().toISOString().split('T')[0],
      numeroMatafuegoAnterior: matafuegos[index].numeroMatafuego,
      numeroMatafuegoNuevo: matafuegos[index].numeroMatafuego, // Mantener el mismo número
      fechaVencimientoAnterior: matafuegos[index].fechaVencimiento,
      fechaVencimientoNueva: nuevaFechaVencimiento,
      observaciones: observaciones || ''
    };
    
    // Agregar al historial
    if (!matafuegos[index].historialReemplazos) {
      matafuegos[index].historialReemplazos = [];
    }
    matafuegos[index].historialReemplazos.push(reemplazo);
    
    // Actualizar solo la fecha de vencimiento
    matafuegos[index].fechaVencimiento = nuevaFechaVencimiento;
    
    await writeMatafuegos(matafuegos);
    
    matafuegos[index].estado = calcularEstado(matafuegos[index].fechaVencimiento);
    res.json(matafuegos[index]);
  } catch (error) {
    console.error('Error al reemplazar matafuego:', error);
    res.status(500).json({ error: 'Error al reemplazar el matafuego' });
  }
});

// POST - Reemplazar un matafuego por ID (debe ir antes de GET /:id)
router.post('/:id/reemplazar', async (req, res) => {
  try {
    const { nuevoNumeroMatafuego, nuevaFechaVencimiento, observaciones } = req.body;
    const id = parseInt(req.params.id);
    
    if (!nuevoNumeroMatafuego || !nuevaFechaVencimiento) {
      return res.status(400).json({ error: 'El nuevo número de matafuego y la nueva fecha de vencimiento son requeridos' });
    }
    
    const matafuegos = await readMatafuegos();
    const index = matafuegos.findIndex(m => m.id === id);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Matafuego no encontrado' });
    }
    
    // Guardar el reemplazo en el historial
    const reemplazo = {
      fechaReemplazo: new Date().toISOString().split('T')[0],
      numeroMatafuegoAnterior: matafuegos[index].numeroMatafuego,
      numeroMatafuegoNuevo: nuevoNumeroMatafuego,
      fechaVencimientoAnterior: matafuegos[index].fechaVencimiento,
      fechaVencimientoNueva: nuevaFechaVencimiento,
      observaciones: observaciones || ''
    };
    
    // Agregar al historial
    if (!matafuegos[index].historialReemplazos) {
      matafuegos[index].historialReemplazos = [];
    }
    matafuegos[index].historialReemplazos.push(reemplazo);
    
    // Actualizar el número de matafuego y fecha de vencimiento
    matafuegos[index].numeroMatafuego = nuevoNumeroMatafuego;
    matafuegos[index].fechaVencimiento = nuevaFechaVencimiento;
    
    await writeMatafuegos(matafuegos);
    
    matafuegos[index].estado = calcularEstado(matafuegos[index].fechaVencimiento);
    res.json(matafuegos[index]);
  } catch (error) {
    console.error('Error al reemplazar matafuego:', error);
    res.status(500).json({ error: 'Error al reemplazar el matafuego' });
  }
});

// GET - Obtener un matafuego por ID
router.get('/:id', async (req, res) => {
  try {
    const matafuegos = await readMatafuegos();
    const matafuego = matafuegos.find(m => m.id === parseInt(req.params.id));
    
    if (!matafuego) {
      return res.status(404).json({ error: 'Matafuego no encontrado' });
    }
    
    matafuego.estado = calcularEstado(matafuego.fechaVencimiento);
    res.json(matafuego);
  } catch (error) {
    console.error('Error al leer matafuego:', error);
    res.status(500).json({ error: 'Error al obtener el matafuego' });
  }
});

// DELETE - Eliminar un matafuego
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const matafuegos = await readMatafuegos();
    const index = matafuegos.findIndex(m => m.id === id);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Matafuego no encontrado' });
    }
    
    matafuegos.splice(index, 1);
    await writeMatafuegos(matafuegos);
    
    res.json({ message: 'Matafuego eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar matafuego:', error);
    res.status(500).json({ error: 'Error al eliminar el matafuego' });
  }
});

module.exports = router;

