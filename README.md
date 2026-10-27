# Parcial: Mi Tienda — App Móvil y Web (Offline-First con Supabase y SQLite)

**Estudiante:** Denilson Daniel Cuello Palmezzano  
**Curso:** Desarrollo Móvil 2026-2  
**Tecnología:** Expo (SDK 58) con TypeScript, Expo Router v4, SQLite con Drizzle ORM y Supabase  

---

## 1. Descripción del Proyecto

Aplicación de gestión de inventario para una tienda de barrio (**Mi Tienda**), diseñada para trabajar sin interrupciones en entornos con conectividad inestable o nula (modo avión), utilizando **SQLite como fuente de verdad local** y **Supabase como respaldo en la nube**.

Cada producto almacena:
- `name`: Nombre del producto.
- `quantity`: Unidades en existencia (entero mayor o igual a 0).
- `price`: Precio unitario en pesos colombianos (entero sin decimales).
- Identificadores y marcas de tiempo (`clientId`, `updatedAt`, `syncedAt`, `deletedAt`).

---

## 2. Cómo Ejecutar el Proyecto

### Paso 1: Clonar o abrir el repositorio
```bash
git clone https://github.com/DenilsonCuello/parcial-mi-tienda-cuello.git
cd parcial-mi-tienda-cuello
```

### Paso 2: Crear el archivo `.env`
Copia el archivo de ejemplo `.env.example` y crea tu propio `.env` en la raíz del proyecto:
```bash
cp .env.example .env
```
Configura tus credenciales públicas de Supabase:
```env
EXPO_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxxxxxxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
```
> **Nota de Seguridad:** El archivo `.env` está en `.gitignore` y **nunca** debe subirse al repositorio de GitHub.

### Paso 3: Ejecutar el SQL en Supabase
En el panel de tu proyecto de Supabase, ve al **SQL Editor** y ejecuta el script provisto en `supabase.sql`:
```sql
create table if not exists public.products (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  client_id uuid not null unique,
  name text not null,
  quantity integer not null check (quantity >= 0),
  price integer not null check (price >= 0),
  updated_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.products enable row level security;

create policy "ver los míos" on public.products
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "crear los míos" on public.products
  for insert to authenticated with check ((select auth.uid()) = user_id);

create policy "editar los míos" on public.products
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "borrar los míos" on public.products
  for delete to authenticated using ((select auth.uid()) = user_id);
```
*(Asegúrate de desactivar la confirmación por correo en Authentication -> Providers -> Email para registrar e iniciar sesión de inmediato).*

### Paso 4: Instalar dependencias
```bash
npm install
```

### Paso 5: Generar y aplicar migraciones de base de datos
La migración de Drizzle ya está pre-generada en la carpeta `drizzle/`. Si deseas volver a generarla:
```bash
npm run db:generate
```

### Paso 6: Iniciar la aplicación
- **En dispositivo móvil con Expo Go (SDK 58):**
  ```bash
  npx expo start
  ```
  Escanea el código QR desde la app Expo Go en tu celular Android o iOS.
- **En navegador Web:**
  ```bash
  npx expo start --web
  ```

---

## 3. Capturas de Pantalla de la Aplicación

A continuación se evidencian las 7 pantallas y funcionalidades exigidas en el parcial:

### 01. Pantalla de Inicio de Sesión
![Login](capturas/01-login.png)

### 02. Pantalla de Registro con Validación Visible
![Registro con validación](capturas/02-registro.png)

### 03. Pantalla Principal de Inventario (Totales e Indicadores de Sincronización)
![Pantalla Principal](capturas/03-principal.png)

### 04. Formulario Editando un Producto Existente
![Formulario de Producto](capturas/04-formulario.png)

### 05. Producto Creado en Modo Avión (Marcado como Pendiente)
![Sin Conexión](capturas/05-sin-conexion.png)

### 06. Pantalla Principal Después de Sincronizar (Mensaje de Resultado)
![Sincronizado](capturas/06-sincronizado.png)

### 07. Panel de Supabase Mostrando la Tabla `products` con las Filas
![Panel de Supabase](capturas/07-supabase.png)

---

## 4. Estado de Implementación: ¿Qué quedó funcionando?

### Funcionalidades Obligatorias (100% Completas)
- [x] **Autenticación completa con Supabase Auth:** Registro (`signUp`), Inicio de sesión (`signInWithPassword`) y Cierre de sesión (`signOut`).
- [x] **Persistencia de sesión en SecureStore:** Adaptador por fragmentos en `lib/secureStorage.ts` (sin AsyncStorage). La sesión sobrevive al cerrar y volver a abrir la app.
- [x] **Rutas protegidas con `Stack.Protected`:** Sin sesión solo existen `login` y `registro`; con sesión solo existen `index` (Principal) y `producto` (Formulario).
- [x] **Base de datos local SQLite con Drizzle ORM:**
  - Esquema limpio en `db/schema.ts` sin importaciones de Expo para compatibilidad con Node.
  - UUID generado en repositorio (`db/repositories/products.ts`) con `Crypto.randomUUID()`.
  - Migración con `drizzle-kit generate` y aplicada con `useMigrations` en `app/_layout.tsx`.
  - Pantalla principal reactiva con `useLiveQuery`.
- [x] **Operaciones CRUD en modo avión (offline):** Creación, edición y eliminación de productos funcionan sin internet.
- [x] **Confirmación al eliminar:** Diálogo modal claro para evitar eliminaciones accidentales.
- [x] **Indicador de sincronización en cada producto:** Badge verde "En la nube" vs Badge amarillo "Pendiente de subir".
- [x] **Sincronización bidireccional (`services/sync.ts`):**
  1. *Bajar:* Descarga de Supabase los productos del usuario e inserta los faltantes en SQLite.
  2. *Subir:* Envía los pendientes locales con `upsert` por `client_id` y actualiza `syncedAt`.
  3. Muestra mensaje con el resultado exacto (ej. `"2 subidos, 1 bajado"`).

### Puntos Extra Implementados (Hasta +0.5 en la nota)
- [x] **Borrado sincronizado con borrado lógico (`deletedAt`):** Al eliminar un producto se marca con timestamp local y, al sincronizar, se elimina de Supabase y se purga en local.
- [x] **Regla de conflicto "Gana el último cambio":** Al bajar productos existentes se comparan `updated_at` y se conserva la versión más reciente.
- [x] **Sincronización automática al recuperar la conexión:** Listener con `@react-native-community/netinfo` que detecta la reactivación de red y ejecuta la sincronización en segundo plano.
- [x] **Búsqueda por nombre en la pantalla principal:** Filtro instantáneo en tiempo real sobre la lista reactiva de productos.

---

## 5. Estructura del Proyecto

```text
├── app/
│   ├── _layout.tsx        # Rutas protegidas con Stack.Protected y MigrationGate
│   ├── index.tsx          # Pantalla principal (inventario, métricas, búsqueda y sincronización)
│   ├── login.tsx          # Pantalla de inicio de sesión
│   ├── registro.tsx       # Pantalla de registro de usuario con validaciones
│   └── producto.tsx       # Formulario para crear y editar productos (offline-first)
├── capturas/              # Las 7 capturas de pantalla obligatorias
├── constants/
│   └── theme.ts           # Paleta de colores moderna y sombras
├── context/
│   └── AuthContext.tsx    # Contexto global de autenticación con Supabase
├── db/
│   ├── client.ts          # Conexión SQLite con Drizzle ORM
│   ├── schema.ts          # Definición de la tabla products en Drizzle
│   └── repositories/
│       └── products.ts    # Repositorio de acceso a datos y queries
├── drizzle/               # Archivos de migración generados por drizzle-kit
├── hooks/
│   └── useProducts.ts     # Hook reactivo de productos (useLiveQuery y totales)
├── lib/
│   ├── secureStorage.ts   # Adaptador SecureStore por fragmentos (sin AsyncStorage)
│   └── supabase.ts        # Cliente de Supabase configurado con SecureStore
├── services/
│   └── sync.ts            # Lógica de sincronización en 2 pasos con Supabase
├── AI-LOG.md              # Bitácora obligatoria de uso de herramientas de IA
├── README.md              # Documentación técnica completa
├── supabase.sql           # DDL y políticas de RLS para Supabase
├── babel.config.js        # Configuración de Babel para imports de SQL
├── metro.config.js        # Configuración de Metro para resolver SQL y WASM
└── drizzle.config.ts      # Configuración de Drizzle Kit
```

