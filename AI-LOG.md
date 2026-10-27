# Registro de Asistencia con Inteligencia Artificial (AI-LOG)

**Estudiante:** Denilson Daniel Cuello Palmezzano  
**Materia:** Desarrollo Móvil 2026-2  
**Proyecto:** Parcial Mi Tienda — App móvil y web con SQLite y Supabase (Expo SDK 58)  
**Fecha:** 26 de Octubre de 2026  

---

## 1. Prompts Utilizados

### Prompt Inicial
> *"Ayúdame a desarrollar la siguiente app móvil y web... con la mejor estética moderna posible basándote en las especificaciones del parcial (Mi Tienda) y con Expo Go SDK 58."*

### Prompts de Seguimiento y Refinamiento
1. *"Configura la base de datos local SQLite con Drizzle ORM siguiendo estrictamente la regla de no importar expo-crypto dentro de db/schema.ts."*
2. *"Adapta los componentes para compatibilidad total con Expo Go SDK 58 y React 19 utilizando los iconos de @expo/vector-icons."*
3. *"Implementa la sincronización bidireccional en services/sync.ts respetando el orden estricto: primero bajar los datos de Supabase e insertar en SQLite, luego subir los pendientes locales con upsert por client_id."*
4. *"Agrega los puntos extra: borrado lógico sincronizado (deletedAt), regla gana el último cambio en conflictos, auto-sincronización al detectar conexión con NetInfo y búsqueda por nombre en la lista principal."*

---

## 2. Ajustes y Correcciones al Código Generado

Durante la implementación guiada por IA, se identificaron y aplicaron las siguientes correcciones manuales y arquitectónicas:

1. **Aislamiento estricto de `db/schema.ts`:**
   - *Situación:* La IA sugirió inicialmente generar los UUID dentro de los valores por defecto del esquema usando `expo-crypto`.
   - *Corrección:* Se removió cualquier importación de Expo en `db/schema.ts` para evitar que `drizzle-kit generate` fallara con el error `Unexpected "typeof"`. La generación del UUID se trasladó exclusivamente al repositorio (`db/repositories/products.ts`) utilizando `Crypto.randomUUID()`.

2. **Resolución de tipos en Expo SDK 58 (React 19):**
   - *Situación:* Las librerías de iconos de terceros basadas en React 18 presentaron inconsistencias de tipado con las nuevas propiedades de React 19.
   - *Corrección:* Se reemplazó por `@expo/vector-icons/Ionicons`, garantizando soporte nativo y compilación TypeScript limpia con `npx tsc --noEmit`.

3. **Adaptador de persistencia de sesión sin AsyncStorage:**
   - *Situación:* La IA sugirió `@react-native-async-storage/async-storage` para la sesión de Supabase.
   - *Corrección:* En estricto cumplimiento de las reglas del examen, se utilizó exclusivamente el adaptador `lib/secureStorage.ts` con fragmentación (chunking) de 1000 caracteres sobre `expo-secure-store` en móvil y `localStorage` en web, evitando la penalización de entrega.

4. **Reglas de conflicto y borrado sincronizado (Puntos Extra):**
   - *Ajuste:* Se perfeccionó la lógica de `upsertFromRemote` para comparar fechas ISO y aplicar la regla de "gana el último cambio", además de propagar el borrado lógico a Supabase y purgar la fila en la base SQLite local tras la confirmación.

---

## 3. Alucinaciones Detectadas y Verificación

- **Alucinación de sintaxis de paquetes:** Se detectó una sugerencia inicial de importar `useLiveQuery` desde `drizzle-orm` general en lugar de `drizzle-orm/expo-sqlite`. Se corrigió verificando las exportaciones reales del módulo.
- **Drizzle Kit dialect:** Se verificó que `drizzle.config.ts` utilizara `dialect: 'sqlite'` y `driver: 'expo'`, garantizando la generación precisa de la migración `0000_quiet_absorbing_man.sql` y `migrations.js`.

---

## 4. Conclusión
El uso de la herramienta de IA permitió agilizar el maquetado visual moderno y la estructuración del flujo CRUD offline-first, mientras que las reglas y validaciones estrictas del parcial fueron auditadas y ajustadas línea por línea por el estudiante.
