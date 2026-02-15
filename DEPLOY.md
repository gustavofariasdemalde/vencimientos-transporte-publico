# Guía de Deploy en Render

## Pasos para deployar en Render

### 1. Preparar el repositorio

Asegúrate de tener tu código en un repositorio de GitHub, GitLab o Bitbucket.

### 2. Crear cuenta en Render

1. Ve a [render.com](https://render.com)
2. Crea una cuenta (puedes usar GitHub para login rápido)
3. Confirma tu email

### 3. Crear un nuevo Web Service

1. En el dashboard de Render, haz clic en "New +"
2. Selecciona "Web Service"
3. Conecta tu repositorio (GitHub/GitLab/Bitbucket)
4. Selecciona el repositorio de tu aplicación

### 4. Configurar el servicio

- **Name**: `gestion-vencimientos` (o el nombre que prefieras)
- **Environment**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Plan**: Selecciona "Free" (gratis)

### 5. Variables de entorno (opcional)

No necesitas variables de entorno para esta aplicación, pero puedes agregar:
- `NODE_ENV=production`
- `PORT=10000` (Render asigna el puerto automáticamente, pero puedes especificarlo)

### 6. Deploy

1. Haz clic en "Create Web Service"
2. Render comenzará a construir y deployar tu aplicación
3. Espera a que termine el proceso (puede tardar 2-5 minutos)

### 7. URL de tu aplicación

Una vez completado el deploy, Render te dará una URL como:
`https://gestion-vencimientos.onrender.com`

### 8. Persistencia de datos

**IMPORTANTE**: En el plan gratuito de Render, los archivos JSON se perderán si el servicio se duerme (después de 15 minutos de inactividad).

Para solucionar esto, tienes dos opciones:

#### Opción A: Usar un disco persistente (Recomendado)
1. En tu servicio, ve a "Disks"
2. Crea un nuevo disco
3. Monta el disco en `/opt/render/project/src/data`
4. Actualiza las rutas en `routes/licencias.js` y `routes/matafuegos.js` para usar esta ruta

#### Opción B: Usar una base de datos externa
- MongoDB Atlas (gratis)
- PostgreSQL (Render ofrece una instancia gratuita)

### Notas importantes

- El servicio gratuito se "duerme" después de 15 minutos de inactividad
- La primera carga después de dormir puede tardar ~30 segundos
- Los archivos en `/tmp` se eliminan al reiniciar
- Considera usar un servicio de base de datos para producción

### Actualizar la aplicación

Cada vez que hagas push a tu repositorio, Render detectará los cambios y hará un nuevo deploy automáticamente.

