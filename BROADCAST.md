# Broadcast Notifications — Guía de uso

Envía push notifications a todos (o algunos) usuarios de El Álbum 2026 desde tu terminal o cualquier cliente HTTP.

---

## Setup inicial (una sola vez)

### 1. Agregar tu userId como admin en Firestore

1. Abrí el app e ingresá a **Mi Cuenta**.
2. Copiá tu **ID de usuario** (empieza con `user_...`).
3. En [Firebase Console](https://console.firebase.google.com/project/control-de-postales/firestore) creá el documento:

```
Colección:  config
Documento:  broadcast_admin
Campos:     adminUserIds  →  array  →  [ "user_TU_ID_AQUI" ]
```

### 2. Desplegar la función

```bash
firebase deploy --only functions
```

---

## Cómo obtener el Bearer token

El endpoint usa tu **Clerk session token** como autenticación.
Hay dos formas de obtenerlo:

### Opción A — Desde el app (React Native, recomendado)

Usá el hook `useAuth` de Clerk. Podés agregarlo temporalmente a la pantalla de Cuenta para copiarlo:

```tsx
import { useAuth } from "@clerk/clerk-expo";

const { getToken } = useAuth();
const token = await getToken();
console.log("Bearer token:", token);
```

### Opción B — Desde el Dashboard de Clerk

1. Ir a [dashboard.clerk.com](https://dashboard.clerk.com)
2. Tu instancia → **Users** → seleccioná tu usuario
3. Clic en **"..." → Impersonate user**
4. En la URL del JWT generado, copiá el token de sesión

### Opción C — Desde las DevTools del navegador (si usás la versión web)

1. Abrí el app en web → F12 → Network
2. Buscá cualquier request a Firebase o a las Cloud Functions
3. Copiá el header `Authorization: Bearer <token>`

> **Importante:** Los tokens de Clerk expiran en ~60 segundos. Usalo inmediatamente después de obtenerlo.

---

## Estructura del request

**Endpoint:**
```
POST https://us-central1-control-de-postales.cloudfunctions.net/broadcastNotification
```

**Headers:**
```
Authorization: Bearer <clerk_session_token>
Content-Type: application/json
```

**Body:**

| Campo      | Tipo       | Requerido | Descripción                                              |
|------------|------------|-----------|----------------------------------------------------------|
| `title`    | `string`   | ✅        | Título de la notificación                                |
| `body`     | `string`   | ✅        | Cuerpo del mensaje                                       |
| `url`      | `string`   | ❌        | Link que se abre al tocar la notificación                |
| `userIds`  | `string[]` | ❌        | Lista de Clerk user IDs. Omitir = enviar a **todos**    |

---

## Ejemplos

### Enviar a todos los usuarios

```bash
curl -X POST \
  -H "Authorization: Bearer TU_TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "🎉 Ya disponible en Android",
    "body": "Invitá a tus amigos a usarla",
    "url": "https://elalbum2026.com"
  }' \
  https://us-central1-control-de-postales.cloudfunctions.net/broadcastNotification
```

### Enviar a usuarios específicos

```bash
curl -X POST \
  -H "Authorization: Bearer TU_TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Novedad importante",
    "body": "Tenemos algo nuevo para vos",
    "userIds": ["user_abc123", "user_xyz789"]
  }' \
  https://us-central1-control-de-postales.cloudfunctions.net/broadcastNotification
```

### Sin link (solo mensaje)

```bash
curl -X POST \
  -H "Authorization: Bearer TU_TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "⚽ Mundial 2026 — 30 días",
    "body": "¿Ya completaste tu álbum?"
  }' \
  https://us-central1-control-de-postales.cloudfunctions.net/broadcastNotification
```

---

## Respuesta

```json
{ "sent": 1423, "total": 1423 }
```

| Campo   | Descripción                                            |
|---------|--------------------------------------------------------|
| `sent`  | Cantidad de tokens a los que se envió exitosamente     |
| `total` | Total de tokens encontrados (usuarios con notif activa)|

---

## Comportamiento en el app

- Si el `url` está presente → al tocar la notificación se abre el link en el navegador.
- Si no hay `url` → la notificación abre el app normalmente (sin navegar a ninguna sección específica).
- Las notificaciones usan el mismo sistema de Expo Push que las de amigos y solicitudes.

---

## Errores comunes

| Error                        | Causa                                              | Solución                                         |
|------------------------------|----------------------------------------------------|--------------------------------------------------|
| `401 Missing authorization`  | No se envió el header `Authorization`             | Agregá `-H "Authorization: Bearer TOKEN"`        |
| `401 Invalid or expired`     | El token de Clerk expiró (dura ~60 seg)           | Obtené un token nuevo y reintentá               |
| `403 Forbidden — not admin`  | Tu userId no está en `config/broadcast_admin`     | Agregá tu ID al array en Firestore              |
| `400 title and body required`| Falta `title` o `body` en el body del request     | Verificá el JSON enviado                         |
| `0 tokens found`             | Ningún usuario tiene push token registrado        | Verificar que los usuarios tengan notif activas  |
