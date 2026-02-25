# Corrección de Error de Zona Horaria en Fechas

## Problema Detectado
Al cargar una fecha de vencimiento en matafuegos o licencias (ej: 01/12), el sistema guardaba la fecha correctamente en la base de datos, pero en la tabla de visualización mostraba un día menos (30/11). Sin embargo, al editar el registro, sí mostraba la fecha correcta.

## Causa Raíz
El error se debía a un **problema de interpretación de zona horaria (timezone)**:

1. El usuario ingresaba la fecha como string (ej: "2024-12-01")
2. La función `formatearFecha()` convertía este string a un objeto `Date` de JavaScript
3. JavaScript interpretaba automáticamente la fecha como UTC (Coordinated Universal Time)
4. La zona horaria local (Argentina UTC-3) restaba 3 horas de la fecha
5. Esto causaba que la fecha se decrementara en 1 día en la visualización

Este problema ocurría solo en la visualización inicial porque JavaScript recalculaba la zona horaria. En la edición, el valor guardado ya estaba en la base de datos sin el error, por eso mostraba correctamente.

## Solución Implementada
Se reemplazó la función `formatearFecha()` en **todos los archivos JavaScript** para que:

**Antes (INCORRECTO):**
```javascript
function formatearFecha(fecha) {
    const date = new Date(fecha);  // ← Interpreta como UTC
    return date.toLocaleDateString('es-ES', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit' 
    });
}
```

**Después (CORRECTO):**
```javascript
function formatearFecha(fecha) {
    if (!fecha) return '';
    const [año, mes, día] = fecha.split('-');  // ← Sin conversión a Date
    return `${día}/${mes}/${año}`;  // ← Formato directo
}
```

**Archivos modificados:**
- `public/matafuegos.js`
- `public/licencias.js`
- `public/dashboard.js`
- `public/reemplazar-matafuego.js`
- `public/renovar-licencia.js`

## Resultado
✅ Las fechas ahora se muestran correctamente en todas las tablas sin desfase de zonas horarias
✅ No hay diferencia entre la fecha mostrada en la tabla y la fecha mostrada al editar
✅ La solución es simple y evita dependencias de la zona horaria del servidor

## Impacto
Ningún impacto negativo. Es una corrección que afecta solo la visualización de fechas sin cambiar cómo se guardan en la base de datos.
