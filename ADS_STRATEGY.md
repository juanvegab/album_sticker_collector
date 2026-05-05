# Estrategia de Monetización: Álbum de Postales Digital - Mundial

## 🎯 Objetivo

Alcanzar un ingreso mínimo mensual de **$100 USD** optimizando el tiempo de estancia (long session) del usuario en la aplicación.

## 📊 Métricas Estimadas para la Meta

- **DAU Necesario:** 150 - 250 usuarios activos.
- **eCPM Objetivo:** $0.50 - $1.50 (Tráfico mixto).
- **Estrategia de Carga:** Alta retención + Refresco de anuncios.

## 🛠 Configuración de AdMob

### 1. Anuncios Fijos (Banners)

- **Cantidad:** 1 por pantalla (Total 5 pantallas).
- **Tipo:** Banners Adaptables (se ajustan al ancho de pantalla).
- **Optimización:** Configurar **Refresh Rate** en la consola de AdMob entre 30 y 60 segundos para maximizar impresiones en sesiones largas.

### 2. Anuncios Nativos (Cards)

- **Ubicación:** 1 anuncio al inicio de cada sección (49 secciones en total).
- **Dimensiones:** 100px x 50px (simulando el tamaño de una postal/sticker).
- **Estética:** Aplicar estilos CSS para igualar fuentes, bordes y colores del álbum.
- **Etiquetado:** Incluir obligatoriamente la etiqueta "Anuncio" (Ad) para cumplir políticas de Google.

## 🚀 Implementación Técnica (React Native + Expo)

### Stack Tecnológico

- **Librería:** `react-native-google-mobile-ads`
- **Renderizado:** `FlashList` (Shopify) para manejo eficiente de 1,000+ elementos.

### Estrategia de Carga (Lazy Loading)

- **Inyección Lógica:** Interpolar el anuncio como un objeto más dentro del array de datos al inicio de cada sección.
- **Visibilidad:** Usar `onViewableItemsChanged` para cargar el anuncio nativo solo cuando el usuario haga scroll hacia esa sección, mejorando la métrica de _Viewability_ y el eCPM.

## 📝 Checklist de Lanzamiento (Apple & Google)

- [ ] **App Tracking Transparency (ATT):** Implementar el popup de permiso de rastreo en iOS para evitar caída de ingresos.
- [ ] **app.json Config:** Asegurar que `androidAppId` e `iosAppId` estén correctamente vinculados.
- [ ] **Garantía de Contenido:** El contenido del álbum debe ser siempre superior al área de publicidad para evitar penalizaciones por "Inventario de poco valor".
- [ ] **Validación:** Comprobar que los anuncios no obstruyan la funcionalidad de marcado de postales.

---

_Documento generado para el flujo de desarrollo del Álbum Digital._
