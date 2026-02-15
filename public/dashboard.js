// API base URL
const API_BASE = '/api';

// Función para formatear fecha
function formatearFecha(fecha) {
    const date = new Date(fecha);
    return date.toLocaleDateString('es-ES', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit' 
    });
}

// Función para renderizar tabla de licencias a vencer
function renderizarTablaLicencias30(licencias) {
    const tbody = document.getElementById('licencias-30-tbody');
    tbody.innerHTML = '';
    
    if (licencias.length === 0) {
        tbody.innerHTML = '<tr><td colspan="2" style="text-align: center; padding: 10px;">No hay licencias próximas a vencer</td></tr>';
        return;
    }
    
    licencias.forEach(licencia => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${licencia.legajo}</td>
            <td>${formatearFecha(licencia.fechaVencimiento)}</td>
        `;
        tbody.appendChild(tr);
    });
}

// Función para renderizar tabla de matafuegos a vencer
function renderizarTablaMatafuegos30(matafuegos) {
    const tbody = document.getElementById('matafuegos-30-tbody');
    tbody.innerHTML = '';
    
    if (matafuegos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="2" style="text-align: center; padding: 10px;">No hay matafuegos próximos a vencer</td></tr>';
        return;
    }
    
    matafuegos.forEach(matafuego => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>Coche ${matafuego.numeroCoche}</strong></td>
            <td>${formatearFecha(matafuego.fechaVencimiento)}</td>
        `;
        tbody.appendChild(tr);
    });
}

// Función para cargar estadísticas del dashboard
async function cargarEstadisticas() {
    try {
        const response = await fetch(`${API_BASE}/dashboard`);
        if (!response.ok) {
            throw new Error('Error al cargar estadísticas');
        }
        const data = await response.json();
        
        // Actualizar estadísticas de licencias
        document.getElementById('licencias-total').textContent = data.licencias.total;
        document.getElementById('licencias-vencidas').textContent = data.licencias.vencidas;
        document.getElementById('licencias-proximas').textContent = data.licencias.proximas;
        
        // Renderizar tabla de licencias a vencer en 30 días
        renderizarTablaLicencias30(data.licencias.proximas30Dias || []);
        
        // Actualizar estadísticas de matafuegos
        document.getElementById('matafuegos-total').textContent = data.matafuegos.total;
        document.getElementById('matafuegos-vencidos').textContent = data.matafuegos.vencidos;
        document.getElementById('matafuegos-proximos').textContent = data.matafuegos.proximos;
        
        // Renderizar tabla de matafuegos a vencer en 30 días
        renderizarTablaMatafuegos30(data.matafuegos.proximos30Dias || []);
    } catch (error) {
        console.error('Error:', error);
        alert('Error al cargar las estadísticas. Por favor, recarga la página.');
    }
}

// Verificar autenticación
if (sessionStorage.getItem('autenticado') !== 'true') {
    window.location.href = 'login.html';
}

// Cargar estadísticas al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    cargarEstadisticas();
    
    // Actualizar cada 30 segundos
    setInterval(cargarEstadisticas, 30000);
});

