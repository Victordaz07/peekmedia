# Peek Media — Auditoría UX/UI y plan de construcción

Estado actual: 4 piezas que hoy funcionan por separado. Son el sitio (v2), el Admin (contenido del sitio y CRM), el Dashboard de clientes (CM y cliente) y `pm-store.js`. Todas guardan los datos en el navegador.

---

## 1. Problemas que hay que resolver antes de programar (bloqueantes)

1. **El contraste de los botones coral no pasa.** El texto blanco sobre `#FF5A5F` tiene una relación de ~3.0:1, y para texto de 15–17 px WCAG AA pide 4.5:1.
   - Opción A (recomendada): texto `ink #0B1F33` sobre coral, que da ~5.4:1.
   - Opción B: un tono coral más oscuro solo para botones, `#D6353C`, que da ~4.7:1 con texto blanco.
   - Afecta a todos los CTA del sitio, del Admin y del Dashboard.
2. **Hay tres productos que se pisan.** El CRM del Admin y el Dashboard tienen cada uno su propia lista de clientes. Hay que unificarlos en una sola app con roles (ver la sección 3).
3. **El acceso oculto en el punto de la P no es seguridad.** Además cualquiera puede llegar a él con la tecla Tab. En producción debe ser `/admin` con login real. El punto puede quedarse como atajo visual, siempre que lleve al login.
4. **Placeholders visibles al público.** `[Precio]`, `[Qué incluye]`, `[Respuesta]`, `[Logo cliente]` y `[Espacio para testimonio…]` no pueden salir publicados. Regla: si un bloque no tiene datos reales, la sección se oculta sola. Por ejemplo, sin testimonios no se muestra la sección de testimonios.
5. **Páginas legales obligatorias.** Meta, TikTok y Google piden URL de política de privacidad, de términos y de eliminación de datos antes de aprobar las apps. Hay que diseñarlas y publicarlas.
6. **Las cotizaciones no se guardan.** Hoy solo abren WhatsApp. Cada cotización debe crear también un prospecto en el CRM, con los servicios elegidos, para que ninguna se pierda.

## 2. Sitio público

### Estructura
- Hay 12 secciones, y es largo para un visitante que llega desde Instagram en el celular. Propuesta:
  - Hero → Marquee → Servicios + Cotizador (juntos, con pestañas "Planes" y "A tu medida") → Caso real + logos → Feed → Nosotros + Cómo trabajamos → Testimonios → FAQ → CTA.
  - "Sobre nosotros" puede ir más abajo: quien llega desde un anuncio quiere ver primero qué ofreces.
- **Botones de WhatsApp.** Hay 7 en la página. El botón flotante debería ocultarse cuando el CTA final está en pantalla, y en la parte de arriba del sitio.

### Hero
- La burbuja "¿Y si esta fuera tu marca?" tapa el texto del mockup de Instagram. Hay que moverla fuera de la tarjeta.
- Falta una prueba de confianza visible en el primer pantallazo, por ejemplo "5+ años · Santo Domingo" junto al CTA.

### Cotizador
- En celular, el resumen debe convertirse en una barra fija abajo ("3 servicios · Enviar").
- Sin precios, todo dice "A cotizar" y se siente vacío. Recomendación: rangos ("desde RD$ X") o, como mínimo, en los planes.
- Añadir la validación mínima de nombre obligatorio antes de enviar.

### Feed
- Sin imágenes reales se ve como tarjetas de texto. En producción debe leer los últimos posts desde la API de Instagram de @peekmedia.rd y actualizarse solo.

### Movimiento y accesibilidad
- Respetar `prefers-reduced-motion`: detener el marquee, las animaciones de aparición y la pulsación del punto.
- Estados de foco visibles en todos los botones, links y tarjetas del cotizador (anillo cian de 2 px).
- Las tarjetas del cotizador deben anunciarse como casillas marcables (`role="checkbox"` + `aria-checked`).
- Las preguntas frecuentes necesitan `aria-expanded`.

### Rendimiento y SEO
- El logo PNG pesa 323 KB. Pásalo a SVG, o a WebP de menos de 20 KB.
- Precargar Space Grotesk y DM Sans, solo con los pesos que se usan.
- Añadir meta descripción, imagen para compartir en redes (OG), `lang="es-DO"` y datos estructurados de `LocalBusiness` con dirección y horario.

## 3. App interna (Admin + CRM + Dashboard): una sola aplicación

### Roles
- **Admin (Peek Media):** todo lo de abajo, más el contenido del sitio, los precios, el equipo y la facturación.
- **CM:** los clientes que tiene asignados.
- **Cliente:** solo su propio espacio. Ve el resumen, el calendario, las aprobaciones, los reportes y las novedades.

### Navegación propuesta
```
Inicio (todos los clientes: pendientes, aprobaciones, alertas)
Clientes
  └ [Cliente] Resumen · Calendario · Crear · Bandeja · Aprobaciones · Reportes · Conexiones · Ficha (datos, tarifa, notas, tareas)
Prospectos (cotizaciones que llegan del sitio + pipeline)
Sitio web (lo que hoy es "Contenido del sitio" + cotizador)
Ajustes (equipo, marca, integraciones)
```

### Mejoras de UX en el Dashboard
- **Inicio multicliente.** Hoy el CM tiene que entrar cliente por cliente. Necesita una vista de "qué me toca hoy": mensajes sin responder, aprobaciones que vencen y publicaciones que fallaron.
- **Pedir cambios.** Hoy usa la ventana nativa del navegador (`prompt()`). Debe ser un panel con un comentario sobre la pieza y un historial de versiones.
- **Confirmaciones y avisos.** Las confirmaciones nativas deben pasar a diálogos propios, y cada acción debe mostrar un aviso con opción de "Deshacer".
- **Selector de fechas funcional** (7, 30 y 90 días, o personalizado) con comparación contra el período anterior.
- **Definición de cada KPI.** Un tooltip que explique cómo se calcula, por ejemplo "Interacción = interacciones / alcance".
- **Mejoras al editor de publicaciones:**
  - Una variante de texto por red.
  - Primer comentario.
  - Grupos de hashtags guardados.
  - Texto alternativo (alt text).
  - Vista previa específica de cada red.
  - Etiquetar a quién aprueba.
  - Estado de publicación por red: una publicación puede salir bien en Instagram y fallar en TikTok.
- **Estados vacíos, de carga y de error** en cada vista. Por ejemplo: "Conecta Instagram para ver métricas", la carga de una sincronización o un token vencido.
- **Onboarding del cliente:** un asistente de 3 pasos (conectar cuentas → confirmar datos → invitar aprobadores).
- **Notificaciones:** avisar por email o WhatsApp cuando hay algo por aprobar o sale el reporte mensual.
- **Móvil:** el cliente va a revisar desde el celular. La barra lateral debe pasar a una barra inferior con 4 accesos: Resumen, Calendario, Aprobaciones y Reportes.
- **Honestidad de datos:** el sello "Demo" solo existe en el mockup. En producción, cada número debe mostrar su fuente y la hora de la última actualización.

## 4. Sistema de diseño (antes de escribir código)

Hoy los estilos están repetidos elemento por elemento. Para programar hay que definir:

- **Tokens:** color (con el coral para botones corregido), tipografía (una escala de 6 tamaños), espacio, radios, sombras (hoy hay 5 distintas; reducirlas a 2) y movimiento (duraciones y curvas).
- **Componentes:**
  - Button (primario, secundario, fantasma y destructivo)
  - Pill/Badge de estado
  - Card
  - Input, Textarea, Select, Checkbox
  - Tabs/Segmented
  - KPI card
  - Gráfica de línea y sparkline
  - Tabla
  - Modal/Drawer
  - Toast
  - Empty state
  - Avatar
  - Chip de red social
- **Estados de cada componente:** normal, hover, foco, activo, deshabilitado, cargando y error.
- **Un solo vocabulario de estados:**
  - Contenido: Borrador → Por aprobar → Cambios pedidos → Aprobado → Programado → Publicado / Falló
  - Clientes: Prospecto → Activo → Pausado → Finalizado
- **Texturas:** úsalas solo en superficies decorativas (secciones grises y barra lateral), nunca detrás de tablas ni de formularios.

## 5. Arquitectura recomendada para "pasar a code"

| Capa | Recomendación |
|---|---|
| Frontend | Next.js (App Router) + TypeScript + Tailwind con los tokens de arriba |
| Backend / BD | Supabase: Postgres, login, almacenamiento de archivos y permisos por fila (cada cliente solo ve lo suyo) |
| Tareas programadas | Supabase Cron o Trigger.dev: publicar a la hora, sincronizar métricas cada día, reporte mensual |
| Publicación en redes | Fase 1: API directa de Meta (Instagram + Facebook). Fase 2: un proveedor ya aprobado (Ayrshare / Outstand) para TikTok, YouTube, LinkedIn y Google, o sus auditorías propias |
| Tiempo real | Webhooks de Meta para comentarios y mensajes |
| Correo | Resend (aprobaciones y reportes) |
| Hosting | Vercel + tu dominio unificado |

### Modelo de datos (mínimo)
`organizaciones`, `usuarios`, `membresias (rol)`, `clientes`, `cuentas_sociales (tokens cifrados)`, `publicaciones`, `publicacion_destinos (red, estado, id externo, error)`, `medios`, `aprobaciones (versión, comentario)`, `bandeja (comentario/DM/reseña, respuesta)`, `metricas_diarias (cliente, red, fecha, métrica, valor)`, `notas`, `tareas`, `prospectos (cotizaciones)`, `contenido_sitio`, `servicios`, `planes`.

## 6. Plan por fases

| Fase | Entrega | Depende de |
|---|---|---|
| 0 · Decisiones (1 sem) | Dominio, precios o rangos, redes del MVP, quién usa la app (solo CM, o también clientes), textos legales | Tú |
| 1 · Sistema de diseño (1 sem) | Tokens + componentes + contraste corregido | Fase 0 |
| 2 · Sitio + CMS + prospectos (2 sem) | Sitio publicado, contenido editable, cotizaciones guardadas en el CRM | Fase 1 |
| 3 · App: login, clientes, CRM (2 sem) | Roles, fichas de cliente, tareas, notas | Fase 2 |
| 4 · Métricas de Meta (2 sem) | Conexión OAuth de Instagram y Facebook, resumen, reportes y sincronización diaria | Meta App Review en paralelo |
| 5 · Publicar, programar y aprobar (3 sem) | Editor, calendario, flujo de aprobación, publicación a la hora | Fase 4 |
| 6 · Bandeja + notificaciones (2 sem) | Comentarios y mensajes en tiempo real, avisos por email | Fase 5 |
| 7 · Más redes | TikTok, YouTube, Google Business y LinkedIn | Auditorías o proveedor |

**Meta App Review tarda.** Pídela al terminar la Fase 3, con la política de privacidad ya publicada.

## 7. Qué necesito de ti para seguir

1. ¿Coral con texto oscuro, o coral más oscuro con texto blanco?
2. ¿Los clientes van a entrar con su propio usuario, o solo trabajas tú o tu equipo de CMs?
3. Redes del MVP: ¿solo Instagram + Facebook, o necesitas TikTok desde el inicio?
4. Dominio final.
5. Precios o rangos para planes y cotizador.
