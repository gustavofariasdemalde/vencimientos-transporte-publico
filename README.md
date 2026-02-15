# Gestión de Vencimientos - Transporte Público

Aplicación web interna para gestionar vencimientos de documentación en una empresa de transporte público.

## Características

- **Módulo de Licencias de Conducir**: Gestión completa de licencias con cálculo automático de estados
- **Módulo de Matafuegos**: Gestión de matafuegos con identificación de coches
- **Dashboard Principal**: Resumen estadístico de todos los vencimientos
- **Sistema de Estados**: Cálculo automático de vencimientos con colores visuales
  - 🔴 VENCIDO (rojo)
  - 🟠 URGENTE (naranja) - 7 días o menos
  - 🟡 PRÓXIMO (amarillo) - 15 días o menos
  - 🟢 OK (verde) - más de 15 días

## Tecnologías

- Backend: Node.js con Express
- Base de datos: Archivos JSON (licencias.json, matafuegos.json)
- Frontend: HTML, CSS y JavaScript puro
- Arquitectura: REST API

## Instalación

1. Instalar dependencias:
```bash
npm install
```

2. Iniciar el servidor:
```bash
npm start
```

3. Abrir en el navegador:
```
http://localhost:3000
```

## Estructura del Proyecto

```
├── server.js              # Servidor principal
├── package.json           # Dependencias
├── routes/                # Rutas de la API
│   ├── licencias.js      # Endpoints de licencias
│   ├── matafuegos.js     # Endpoints de matafuegos
│   └── dashboard.js      # Endpoints del dashboard
├── data/                  # Archivos JSON de datos
│   ├── licencias.json
│   └── matafuegos.json
└── public/                # Frontend
    ├── index.html         # Dashboard
    ├── licencias.html     # Módulo de licencias
    ├── matafuegos.html    # Módulo de matafuegos
    ├── styles.css         # Estilos
    ├── dashboard.js       # Lógica del dashboard
    ├── licencias.js       # Lógica de licencias
    └── matafuegos.js      # Lógica de matafuegos
```

## API Endpoints

### Licencias
- `GET /api/licencias` - Obtener todas las licencias
- `GET /api/licencias/:id` - Obtener una licencia
- `POST /api/licencias` - Crear una licencia
- `PUT /api/licencias/:id` - Actualizar una licencia
- `DELETE /api/licencias/:id` - Eliminar una licencia

### Matafuegos
- `GET /api/matafuegos` - Obtener todos los matafuegos
- `GET /api/matafuegos/:id` - Obtener un matafuego
- `POST /api/matafuegos` - Crear un matafuego
- `PUT /api/matafuegos/:id` - Actualizar un matafuego
- `DELETE /api/matafuegos/:id` - Eliminar un matafuego

### Dashboard
- `GET /api/dashboard` - Obtener estadísticas generales

## Uso

1. **Dashboard**: Visualiza el resumen general de vencimientos
2. **Licencias**: Gestiona las licencias de conducir de los choferes
3. **Matafuegos**: Gestiona los matafuegos y su ubicación en los coches

Los estados se calculan automáticamente según la fecha actual y se actualizan en tiempo real.

