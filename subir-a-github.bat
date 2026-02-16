@echo off
echo ========================================
echo SUBIENDO PROYECTO A GITHUB
echo ========================================
echo.

echo Paso 1: Verificando estado de Git...
git status
echo.

echo Paso 2: Agregando todos los archivos...
git add .
echo.

echo Paso 3: Verificando que el remote esté configurado...
git remote -v
echo.

echo Paso 4: Intentando hacer push...
echo.
echo NOTA: Si te pide usuario y contraseña:
echo - Usuario: tu usuario de GitHub (gustavofariasdemalde)
echo - Contraseña: usa un Personal Access Token (NO tu contraseña normal)
echo.
echo Para crear un token:
echo 1. Ve a: https://github.com/settings/tokens
echo 2. Click en "Generate new token (classic)"
echo 3. Dale un nombre y selecciona el scope "repo"
echo 4. Copia el token y úsalo como contraseña
echo.

git push -u origin main

echo.
echo ========================================
if %ERRORLEVEL% EQU 0 (
    echo ¡EXITO! El proyecto se subió correctamente.
) else (
    echo ERROR: No se pudo subir. Revisa los mensajes arriba.
    echo.
    echo Si necesitas autenticarte, ejecuta primero:
    echo   gh auth login
)
echo ========================================
pause

