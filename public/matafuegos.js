// Verificar autenticación
if (sessionStorage.getItem('autenticado') !== 'true') {
    window.location.href = 'login.html';
}

// API base URL
const API_BASE = '/api';

let matafuegos = [];
let editandoId = null;

// Elementos del formulario
const form = document.getElementById('matafuego-form');
const formTitle = document.getElementById('form-title');
const submitBtn = document.getElementById('submit-btn');
const cancelBtn = document.getElementById('cancel-btn');
const numeroMatafuegoInput = document.getElementById('numero-matafuego');
const numeroCocheInput = document.getElementById('numero-coche');
const fechaVencimientoInput = document.getElementById('fecha-vencimiento');
const matafuegoIdInput = document.getElementById('matafuego-id');

// Elementos del modal de reemplazo
const reemplazarModal = document.getElementById('reemplazar-modal');
const reemplazarForm = document.getElementById('reemplazar-form');
const reemplazarIdInput = document.getElementById('reemplazar-id');
const nuevoNumeroMatafuegoInput = document.getElementById('nuevo-numero-matafuego');
const nuevaFechaVencimientoInput = document.getElementById('nueva-fecha-vencimiento');
const observacionesReemplazoInput = document.getElementById('observaciones-reemplazo');
const cancelarReemplazoBtn = document.getElementById('cancelar-reemplazo');
const closeModal = document.querySelector('.close-modal');

// Función para obtener el color según el estado
function obtenerColorEstado(estado) {
    switch(estado) {
        case 'VENCIDO':
            return 'vencido';
        case 'URGENTE':
            return 'urgente';
        case 'PRÓXIMO':
            return 'proximo';
        case 'OK':
            return 'ok';
        default:
            return 'ok';
    }
}

// Función para formatear fecha
function formatearFecha(fecha) {
    const date = new Date(fecha);
    return date.toLocaleDateString('es-ES', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit' 
    });
}

// Función para cargar matafuegos desde la API
async function cargarMatafuegos() {
    try {
        const response = await fetch(`${API_BASE}/matafuegos`);
        if (!response.ok) {
            throw new Error('Error al cargar matafuegos');
        }
        matafuegos = await response.json();
        renderizarTabla();
    } catch (error) {
        console.error('Error:', error);
        alert('Error al cargar los matafuegos. Por favor, recarga la página.');
    }
}

// Función para renderizar la tabla
function renderizarTabla() {
    const tbody = document.getElementById('matafuegos-tbody');
    tbody.innerHTML = '';
    
    if (matafuegos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">No hay matafuegos registrados</td></tr>';
        return;
    }
    
    matafuegos.forEach(matafuego => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${matafuego.numeroMatafuego}</td>
            <td><strong>Coche ${matafuego.numeroCoche}</strong></td>
            <td>${formatearFecha(matafuego.fechaVencimiento)}</td>
            <td><span class="estado ${obtenerColorEstado(matafuego.estado)}">${matafuego.estado}</span></td>
            <td class="acciones">
                <button class="btn btn-edit" onclick="editarMatafuego(${matafuego.id})">Editar</button>
                <button class="btn btn-primary" onclick="abrirModalReemplazar(${matafuego.id})" style="padding: 5px 10px; font-size: 14px;">Reemplazar</button>
                <button class="btn btn-delete" onclick="eliminarMatafuego(${matafuego.id})">Eliminar</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Función para limpiar el formulario
function limpiarFormulario() {
    form.reset();
    matafuegoIdInput.value = '';
    editandoId = null;
    formTitle.textContent = 'Nuevo Matafuego';
    submitBtn.textContent = 'Guardar';
    cancelBtn.style.display = 'none';
}

// Función para editar un matafuego
async function editarMatafuego(id) {
    const matafuego = matafuegos.find(m => m.id === id);
    if (!matafuego) {
        alert('Matafuego no encontrado');
        return;
    }
    
    editandoId = id;
    matafuegoIdInput.value = id;
    numeroMatafuegoInput.value = matafuego.numeroMatafuego;
    numeroCocheInput.value = matafuego.numeroCoche;
    fechaVencimientoInput.value = matafuego.fechaVencimiento;
    
    formTitle.textContent = 'Editar Matafuego';
    submitBtn.textContent = 'Actualizar';
    cancelBtn.style.display = 'inline-block';
    
    // Scroll al formulario
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Función para abrir modal de reemplazo
function abrirModalReemplazar(id) {
    const matafuego = matafuegos.find(m => m.id === id);
    if (!matafuego) {
        alert('Matafuego no encontrado');
        return;
    }
    
    reemplazarIdInput.value = id;
    nuevoNumeroMatafuegoInput.value = '';
    nuevaFechaVencimientoInput.value = '';
    observacionesReemplazoInput.value = '';
    reemplazarModal.style.display = 'block';
}

// Función para cerrar modal de reemplazo
function cerrarModalReemplazar() {
    reemplazarModal.style.display = 'none';
    reemplazarForm.reset();
}

// Función para eliminar un matafuego
async function eliminarMatafuego(id) {
    if (!confirm('¿Está seguro de que desea eliminar este matafuego?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/matafuegos/${id}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error('Error al eliminar el matafuego');
        }
        
        await cargarMatafuegos();
        alert('Matafuego eliminado correctamente');
    } catch (error) {
        console.error('Error:', error);
        alert('Error al eliminar el matafuego');
    }
}

// Manejar envío del formulario principal
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const datos = {
        numeroMatafuego: numeroMatafuegoInput.value.trim(),
        numeroCoche: numeroCocheInput.value.trim(),
        fechaVencimiento: fechaVencimientoInput.value
    };
    
    try {
        let response;
        if (editandoId) {
            // Actualizar
            response = await fetch(`${API_BASE}/matafuegos/${editandoId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(datos)
            });
        } else {
            // Crear
            response = await fetch(`${API_BASE}/matafuegos`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(datos)
            });
        }
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al guardar el matafuego');
        }
        
        await cargarMatafuegos();
        limpiarFormulario();
        alert(editandoId ? 'Matafuego actualizado correctamente' : 'Matafuego creado correctamente');
    } catch (error) {
        console.error('Error:', error);
        alert(error.message || 'Error al guardar el matafuego');
    }
});

// Manejar envío del formulario de reemplazo
reemplazarForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const id = reemplazarIdInput.value;
    const datos = {
        nuevoNumeroMatafuego: nuevoNumeroMatafuegoInput.value.trim(),
        nuevaFechaVencimiento: nuevaFechaVencimientoInput.value,
        observaciones: observacionesReemplazoInput.value.trim()
    };
    
    try {
        const response = await fetch(`${API_BASE}/matafuegos/${id}/reemplazar`, {
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
        
        await cargarMatafuegos();
        cerrarModalReemplazar();
        alert('Matafuego reemplazado correctamente');
    } catch (error) {
        console.error('Error:', error);
        alert(error.message || 'Error al reemplazar el matafuego');
    }
});

// Manejar cancelar edición
cancelBtn.addEventListener('click', () => {
    limpiarFormulario();
});

// Manejar cerrar modal
closeModal.addEventListener('click', cerrarModalReemplazar);
cancelarReemplazoBtn.addEventListener('click', cerrarModalReemplazar);

// Cerrar modal al hacer clic fuera
window.addEventListener('click', (e) => {
    if (e.target === reemplazarModal) {
        cerrarModalReemplazar();
    }
});

// Cargar matafuegos al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    cargarMatafuegos();
});

// Hacer funciones globales para los botones
window.editarMatafuego = editarMatafuego;
window.eliminarMatafuego = eliminarMatafuego;
window.abrirModalReemplazar = abrirModalReemplazar;
