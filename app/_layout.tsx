import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View, Platform } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { db } from '../db/client';
import migrations from '../drizzle/migrations';
import { Colors } from '../constants/theme';

function ProtectedNavigation() {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === 'login' || segments[0] === 'registro';

    if (!user && !inAuthGroup) {
      router.replace('/login');
    } else if (user && inAuthGroup) {
      router.replace('/');
    }
  }, [user, isLoading, segments]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Iniciando Mi Tienda...</Text>
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.background },
        animation: 'fade',
      }}
    >
      <Stack.Protected guard={!!user}>
        <Stack.Screen name="index" options={{ title: 'Inventario' }} />
        <Stack.Screen name="producto" options={{ title: 'Producto' }} />
      </Stack.Protected>

      <Stack.Protected guard={!user}>
        <Stack.Screen name="login" options={{ title: 'Iniciar Sesión' }} />
        <Stack.Screen name="registro" options={{ title: 'Registro' }} />
      </Stack.Protected>
    </Stack>
  );
}

function MigrationGate() {
  // En Web o entornos sin soporte de migrador binario local directo
  if (Platform.OS === 'web') {
    return (
      <AuthProvider>
        <ProtectedNavigation />
      </AuthProvider>
    );
  }

  const { success, error } = useMigrations(db, migrations);

  if (error) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorTitle}>Error en base de datos local</Text>
        <Text style={styles.errorSubtitle}>{error.message}</Text>
      </View>
    );
  }

  if (!success) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Configurando base de datos local...</Text>
      </View>
    );
  }

  return (
    <AuthProvider>
      <ProtectedNavigation />
    </AuthProvider>
  );
}

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <MigrationGate />
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: 24,
  },
  loadingText: {
    marginTop: 14,
    fontSize: 15,
    fontWeight: '500',
    color: Colors.textMuted,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.danger,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSubtitle: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});
