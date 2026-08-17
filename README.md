# 47PRIVATE — Sorteo Drop 001 (17:35)

Este paquete deja el sorteo bloqueado hasta las **17:35 del 17/08/2026**, requiere un código privado para iniciarlo y guarda **un único resultado global** en Redis.

## Archivos que debes subir a GitHub
Sube TODO el contenido de esta carpeta a la raíz del repositorio:

- `index.html`
- `participaciones_validas.csv`
- `SORTEO_COMMITMENT.txt`
- carpeta `api/` completa

## Variables de entorno obligatorias en Vercel
En el proyecto `sorteo-47private` crea estas 3 variables para Production:

1. `UPSTASH_REDIS_REST_URL`
2. `UPSTASH_REDIS_REST_TOKEN`
3. `DRAW_ADMIN_TOKEN`

Las dos primeras salen de una base Redis de Upstash. La tercera la eliges tú y NO debe aparecer en GitHub. Usa una contraseña larga y aleatoria.

Después de añadir las variables, haz **Redeploy** del último deployment.

## Comportamiento
- Antes de 17:35: botón bloqueado y backend bloqueado.
- 17:35: el botón se activa.
- Pulsas y aparece un campo de contraseña enmascarado.
- El backend verifica `DRAW_ADMIN_TOKEN`.
- Solo entonces crea una semilla criptográfica aleatoria.
- Redis usa `SET NX` para aceptar únicamente el primer resultado.
- Desde cualquier navegador o dispositivo se obtiene después el mismo resultado oficial.

## Importante
No pruebes `/api/draw` con la contraseña real antes del directo. Puedes abrir `/api/result`: antes del sorteo debe devolver `drawn: false`.
