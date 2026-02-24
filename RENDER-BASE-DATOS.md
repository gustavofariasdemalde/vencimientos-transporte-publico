# Configurar base de datos en Render (para que los datos no se pierdan)

La aplicación ya está preparada para usar **PostgreSQL**. Solo hay que crear la base de datos en Render y conectar el servicio.

## Pasos en Render

### 1. Crear la base de datos PostgreSQL

1. Entrá a [dashboard.render.com](https://dashboard.render.com).
2. Clic en **"New +"** → **"PostgreSQL"**.
3. Elegí un nombre (por ejemplo: `vencimientos-db`).
4. Región: la misma que tu Web Service.
5. Plan: **Free** (gratis).
6. Clic en **"Create Database"**.
7. Esperá a que esté listo (status "Available").

### 2. Copiar la URL de conexión

1. En la página de la base de datos, en **"Connections"**, vas a ver **"Internal Database URL"**.
2. Clic en **"Copy"** para copiarla (empieza con `postgres://`).

### 3. Conectar la base de datos al Web Service

1. Andá a tu **Web Service** (la aplicación vencimientos-transporte-publico).
2. Entrá a **"Environment"** (menú izquierdo).
3. Clic en **"Add Environment Variable"**.
4. **Key:** `DATABASE_URL`
5. **Value:** pegá la URL que copiaste (Internal Database URL).
6. Guardá con **"Save Changes"**.

Render va a redeployar solo. Cuando termine, la aplicación usará PostgreSQL y **los datos ya no se van a borrar** al reiniciar o dormir el servicio.

---

## Resumen

| Variable       | Valor                    |
|----------------|--------------------------|
| **Key**        | `DATABASE_URL`           |
| **Value**      | (Internal Database URL de tu PostgreSQL en Render) |

No hace falta tocar código ni repositorio: solo crear la base de datos, copiar la URL y agregar la variable de entorno al Web Service.
