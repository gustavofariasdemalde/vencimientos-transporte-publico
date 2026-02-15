// Verificar autenticación
if (sessionStorage.getItem('autenticado') !== 'true') {
    window.location.href = 'login.html';
}

// API base URL
const API_BASE = '/api';

// Elementos del formulario
const form = document.getElementById('reemplazar-form');
const numeroCocheInput = document.getElementById('numero-coche');
const nuevaFechaVencimientoInput = document.getElementById('nueva-fecha-vencimiento');
const mensajeResultado = document.getElementById('mensaje-resultado');

// Función para mostrar mensaje
function mostrarMensaje(mensaje, tipo) {
    mensajeResultado.style.display = 'block';
    mensajeResultado.className = `message ${tipo}`;
    mensajeResultado.textContent = mensaje;
    
    // Ocultar después de 5 segundos
    setTimeout(() => {
        mensajeResultado.style.display = 'none';
    }, 5000);
}

// Manejar envío del formulario
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const numeroCoche = numeroCocheInput.value.trim();
    const nuevaFechaVencimiento = nuevaFechaVencimientoInput.value;
    
    if (!numeroCoche || !nuevaFechaVencimiento) {
        mostrarMensaje('Por favor complete todos los campos', 'error');
        return;
    }
    
    try {
        // Reemplazar el matafuego
        const datos = {
            numeroCoche: numeroCoche,
            nuevaFechaVencimiento: nuevaFechaVencimiento,
            observaciones: ''
        };
        
        const response = await fetch(`${API_BASE}/matafuegos/reemplazar-por-coche`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(datos)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al reemplazar el matafuego');
        }
        
        const matafuegoReemplazado = await response.json();
        mostrarMensaje(`Matafuego reemplazado correctamente. Nueva fecha de vencimiento: ${new Date(matafuegoReemplazado.fechaVencimiento).toLocaleDateString('es-ES')}`, 'success');
        
        // Limpiar formulario
        form.reset();
        
    } catch (error) {
        console.error('Error:', error);
        mostrarMensaje(error.message || 'Error al reemplazar el matafuego', 'error');
    }
});

