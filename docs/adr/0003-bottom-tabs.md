# ADR-0003: @react-navigation/bottom-tabs para navegacion mobile

## Estado

Aceptado — 2026-05-07

## Contexto

La Fase 2 del plan de implementacion requiere un bottom tab navigator en la
app mobile para separar las secciones principales (Dashboard, Cargar Activo,
Perfil) del flujo de login. El proyecto ya usa `@react-navigation/native` y
`@react-navigation/native-stack` como parte del stack acordado en ADR-0001.

## Decision

Agregar `@react-navigation/bottom-tabs` como dependencia de `apps/mobile`.

## Justificacion

1. Es el paquete oficial del mismo ecosistema React Navigation que ya
   adoptamos. No introduce un framework nuevo ni conflictos de API.
2. Es la solucion idomiatica para bottom tabs en React Native con Expo,
   documentada y mantenida por el mismo equipo.

## Alternativas descartadas

- **Tabs custom con View + TouchableOpacity**: mas codigo, sin integracion
  con el sistema de navegacion, hay que reimplementar focus, deep links y
  back button. No justificado.
- **react-native-tab-view (Shopify)**: pensado para tabs swipeables
  horizontales tipo pestanas, no para navegacion principal con bottom bar.
