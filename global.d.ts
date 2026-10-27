declare module '*.sql' {
  const content: string;
  export default content;
}

declare module 'drizzle-orm' {
  export const desc: any;
  export const eq: any;
  export const isNull: any;
  export const or: any;
  export const lt: any;
}

declare module 'drizzle-orm/sqlite-core' {
  export const integer: any;
  export const sqliteTable: any;
  export const text: any;
  export const real: any;
  export const index: any;
}

declare module 'drizzle-orm/expo-sqlite' {
  export const drizzle: any;
  export function useLiveQuery(query: any): { data: any[]; error?: Error };
}

declare module 'drizzle-orm/expo-sqlite/migrator' {
  export function useMigrations(
    db: any,
    migrations: any
  ): { success: boolean; error?: Error };
}
