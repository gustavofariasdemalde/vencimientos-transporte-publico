// Verificar autenticación INMEDIATAMENTE
(function() {
    if (sessionStorage.getItem('autenticado') !== 'true') {
        window.location.replace('login.html');
        return;
    }
})();

// API base URL
const API_BASE = '/api';

// Elementos del formulario
const form = document.getElementById('renovar-form');
const legajoInput = document.getElementById('legajo');
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
    
    const legajo = legajoInput.value.trim();
    const nuevaFechaVencimiento = nuevaFechaVencimientoInput.value;
    
    if (!legajo || !nuevaFechaVencimiento) {
        mostrarMensaje('Por favor complete todos los campos', 'error');
        return;
    }
    
    try {
        // Primero verificar que la licencia existe
        const responseGet = await fetch(`${API_BASE}/licencias/${legajo}`);
        
        if (!responseGet.ok) {
            if (responseGet.status === 404) {
                mostrarMensaje('No se encontró una licencia con ese legajo', 'error');
                return;
            }
            throw new Error('Error al verificar la licencia');
        }
        
        // Renovar la licencia
        const datos = {
            nuevaFechaVencimiento: nuevaFechaVencimiento,
            observaciones: ''
        };
        
        const response = await fetch(`${API_BASE}/licencias/${legajo}/renovar`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(datos)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al renovar la licencia');
        }
        
        const licenciaRenovada = await response.json();
        mostrarMensaje(`Licencia renovada correctamente. Nueva fecha de vencimiento: ${new Date(licenciaRenovada.fechaVencimiento).toLocaleDateString('es-ES')}`, 'success');
        
        // Limpiar formulario
        form.reset();
        
    } catch (error) {
        console.error('Error:', error);
        mostrarMensaje(error.message || 'Error al renovar la licencia', 'error');
    }
});

