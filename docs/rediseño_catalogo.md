Plan de Rediseño: Catálogo de Perfumes Premium

     🎯 Objetivo

     Transformar el frontend actual a un diseño limpio, elegante, moderno y minimalista que refleje la
     naturaleza premium de los perfumes.

     📊 Diagnóstico Aurora

     - Problema detectado: CSS duplicado (inline vs externo con estilos conflictivos)
     - Situación actual: Funcional pero genérico, no refleja "lujo premium"
     - Oportunidad: Transformación visual del 60% solo con CSS

     🎨 Propuesta de Diseño

     Paleta de Color Premium

     - Negro/Dorado/Blanco (inspirado en Chanel, Dior, Tom Ford)
     - Reemplazar gradiente morado/azul por negro elegante + acentos dorados
     - Colores: #1a1a1a (negro), #d4af37 (oro), #fafaf9 (blanco cálido)

     Tipografía Luxury

     - Playfair Display (serif elegante) para títulos/productos
     - Inter (sans moderna) para UI/texto general
     - Cormorant Garamond (serif delicado) para marcas

     Componentes Clave

     1. Product Cards: Hover con borde dorado, animaciones suaves, sombras sutiles
     2. Header: Gradiente oscuro con título en texto dorado gradient
     3. Filtros: Minimalistas con custom selects y focus states gold
     4. Carrito Flotante: Rediseñado con pulse animation y total en gold gradient
     5. Microanimaciones: FadeIn staggered, hover effects, shimmer

     📋 Implementación por Fases

     Fase 1: Quick Wins (1-2h) ⭐ RECOMENDADA

     Impacto: 60% de transformación visual
     - Crear /assets/premium.css con sistema de diseño completo
     - Variables CSS (colores, tipografía, espaciado)
     - Integrar Google Fonts
     - Eliminar CSS conflictivo (/assets/styles.css)
     - Migrar CSS inline a archivo externo

     Fase 2: Refinamiento (3-5h) ⭐ RECOMENDADA

     Impacto: Experiencia premium completa
     - Rediseñar product cards con hover effects
     - Header premium con pattern overlay
     - Toggle mayorista/minorista refinado (pill style)
     - Modal checkout luxury
     - Microanimaciones (fadeIn, shimmer, pulse)

     Fase 3: Excelencia (5-8h) - OPCIONAL

     Impacto: E-commerce clase mundial
     - Skeleton loaders con shimmer
     - Lazy loading de imágenes
     - Toast notifications elegantes
     - Performance optimization
     - Accesibilidad AA

     🚀 Recomendación de Aurora

     Aprobar Fase 1 + Fase 2 (4-7 horas totales) para transformación completa que posicione el catálogo como
      e-commerce premium competitivo con Sephora/Dior.

     ✅ Archivos a Modificar

     - Crear: /assets/premium.css (nuevo sistema de diseño)
     - Editar: index.html (actualizar link CSS, eliminar inline styles)
     - Eliminar: /assets/styles.css (conflicto visual)