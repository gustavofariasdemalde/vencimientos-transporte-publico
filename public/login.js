// Clave de administrador
const CLAVE_ADMINISTRADOR = 'administrador';

// Elementos del formulario
const form = document.getElementById('login-form');
const claveInput = document.getElementById('clave');
const errorMessage = document.getElementById('error-message');

// Verificar si ya está autenticado
if (sessionStorage.getItem('autenticado') === 'true') {
    window.location.href = 'index.html';
}

// Función para mostrar error
function mostrarError(mensaje) {
    errorMessage.textContent = mensaje;
    errorMessage.classList.add('show');
    setTimeout(() => {
        errorMessage.classList.remove('show');
    }, 3000);
}

// Manejar envío del formulario
form.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const clave = claveInput.value.trim();
    
    if (!clave) {
        mostrarError('Por favor ingrese la clave');
        return;
    }
    
    if (clave === CLAVE_ADMINISTRADOR) {
        // Guardar autenticación en sessionStorage
        sessionStorage.setItem('autenticado', 'true');
        // Redirigir al dashboard
        window.location.href = 'index.html';
    } else {
        mostrarError('Clave incorrecta. Por favor intente nuevamente.');
        claveInput.value = '';
        claveInput.focus();
    }
});

// Enfocar el campo de clave al cargar
document.addEventListener('DOMContentLoaded', () => {
    claveInput.focus();
});

