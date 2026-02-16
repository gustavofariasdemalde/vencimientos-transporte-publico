// Verificar autenticación
if (sessionStorage.getItem('autenticado') !== 'true') {
    window.location.href = 'login.html';
}

// API base URL
const API_BASE = '/api';

let licencias = [];
let editandoLegajo = null;

// Elementos del formulario
const form = document.getElementById('licencia-form');
const formTitle = document.getElementById('form-title');
const submitBtn = document.getElementById('submit-btn');
const cancelBtn = document.getElementById('cancel-btn');
const legajoInput = document.getElementById('legajo');
const nombreInput = document.getElementById('nombre');
const apellidoInput = document.getElementById('apellido');
const dniInput = document.getElementById('dni');
const fechaVencimientoInput = document.getElementById('fecha-vencimiento');
const licenciaLegajoOriginalInput = document.getElementById('licencia-legajo-original');


// Función para formatear fecha
function formatearFecha(fecha) {
    const date = new Date(fecha);
    return date.toLocaleDateString('es-ES', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit' 
    });
}

// Función para cargar licencias desde la API
async function cargarLicencias() {
    try {
        const response = await fetch(`${API_BASE}/licencias`);
        if (!response.ok) {
            throw new Error('Error al cargar licencias');
        }
        licencias = await response.json();
        renderizarTabla();
    } catch (error) {
        console.error('Error:', error);
        alert('Error al cargar las licencias. Por favor, recarga la página.');
    }
}

// Función para renderizar la tabla
function renderizarTabla() {
    const tbody = document.getElementById('licencias-tbody');
    tbody.innerHTML = '';
    
    if (licencias.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;">No hay licencias registradas</td></tr>';
        return;
    }
    
    licencias.forEach(licencia => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${licencia.legajo}</td>
            <td>${licencia.nombre}</td>
            <td>${licencia.apellido}</td>
            <td>${licencia.dni}</td>
            <td>${formatearFecha(licencia.fechaVencimiento)}</td>
            <td class="acciones">
                <button class="btn btn-edit" onclick="editarLicencia('${licencia.legajo}')">Editar</button>
                <button class="btn btn-delete" onclick="eliminarLicencia('${licencia.legajo}')">Eliminar</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Función para limpiar el formulario
function limpiarFormulario() {
    form.reset();
    licenciaLegajoOriginalInput.value = '';
    editandoLegajo = null;
    formTitle.textContent = 'Nueva Licencia';
    submitBtn.textContent = 'Guardar';
    cancelBtn.style.display = 'none';
    legajoInput.disabled = false;
}

// Función para editar una licencia
async function editarLicencia(legajo) {
    const licencia = licencias.find(l => l.legajo === legajo);
    if (!licencia) {
        alert('Licencia no encontrada');
        return;
    }
    
    editandoLegajo = legajo;
    licenciaLegajoOriginalInput.value = legajo;
    legajoInput.value = licencia.legajo;
    legajoInput.disabled = false;
    nombreInput.value = licencia.nombre;
    apellidoInput.value = licencia.apellido;
    dniInput.value = licencia.dni;
    fechaVencimientoInput.value = licencia.fechaVencimiento;
    
    formTitle.textContent = 'Editar Licencia';
    submitBtn.textContent = 'Actualizar';
    cancelBtn.style.display = 'inline-block';
    
    // Scroll al formulario
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Función para eliminar una licencia
async function eliminarLicencia(legajo) {
    if (!confirm('¿Está seguro de que desea eliminar esta licencia?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/licencias/${legajo}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error('Error al eliminar la licencia');
        }
        
        await cargarLicencias();
        alert('Licencia eliminada correctamente');
    } catch (error) {
        console.error('Error:', error);
        alert('Error al eliminar la licencia');
    }
}

// Manejar envío del formulario principal
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const datos = {
        legajo: legajoInput.value.trim(),
        nombre: nombreInput.value.trim(),
        apellido: apellidoInput.value.trim(),
        dni: dniInput.value.trim(),
        fechaVencimiento: fechaVencimientoInput.value
    };
    
    try {
        let response;
        if (editandoLegajo) {
            // Actualizar
            response = await fetch(`${API_BASE}/licencias/${editandoLegajo}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(datos)
            });
        } else {
            // Crear
            response = await fetch(`${API_BASE}/licencias`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(datos)
            });
        }
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al guardar la licencia');
        }
        
        await cargarLicencias();
        limpiarFormulario();
        alert(editandoLegajo ? 'Licencia actualizada correctamente' : 'Licencia creada correctamente');
    } catch (error) {
        console.error('Error:', error);
        alert(error.message || 'Error al guardar la licencia');
    }
});

// Manejar cancelar edición
cancelBtn.addEventListener('click', () => {
    limpiarFormulario();
});

// Cargar licencias al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    cargarLicencias();
});

// Hacer funciones globales para los botones
window.editarLicencia = editarLicencia;
window.eliminarLicencia = eliminarLicencia;
