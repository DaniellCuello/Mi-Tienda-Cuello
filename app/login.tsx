import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { Colors, Shadows } from '../constants/theme';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async () => {
    setErrorMessage(null);

    if (!email.trim()) {
      setErrorMessage('Por favor ingresa tu correo electrónico.');
      return;
    }

    if (!password) {
      setErrorMessage('Por favor ingresa tu contraseña.');
      return;
    }

    setLoading(true);
    const error = await signIn(email.trim(), password);
    setLoading(false);

    if (error) {
      if (error.includes('Invalid login credentials')) {
        setErrorMessage('Credenciales inválidas. Verifica tu correo y contraseña.');
      } else {
        setErrorMessage(error);
      }
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          {/* Cabecera con Marca */}
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Ionicons name="storefront" size={36} color={Colors.primary} />
            </View>
            <Text style={styles.title}>Mi Tienda</Text>
            <Text style={styles.subtitle}>
              Gestión de inventario para tenderos de barrio
            </Text>
          </View>

          {/* Banner de error visible */}
          {errorMessage && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={20} color={Colors.danger} style={{ marginTop: 2 }} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {/* Formulario */}
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Correo electrónico</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="tendero@correo.com"
                  placeholderTextColor={Colors.textMuted}
                  value={email}
                  onChangeText={(val) => {
                    setEmail(val);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Contraseña</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Tu contraseña secreta"
                  placeholderTextColor={Colors.textMuted}
                  value={password}
                  onChangeText={(val) => {
                    setPassword(val);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <Pressable
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeButton}
                  hitSlop={8}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={18}
                    color={Colors.textMuted}
                  />
                </Pressable>
              </View>
            </View>

            {/* Botón Ingresar */}
            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.buttonPressed,
                loading && styles.buttonDisabled,
              ]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.primaryButtonText}>Ingresar</Text>
              )}
            </Pressable>

            {/* Enlace a Registro */}
            <View style={styles.footerLink}>
              <Text style={styles.footerText}>¿No tienes una cuenta aún? </Text>
              <Link href="/registro" asChild>
                <Pressable>
                  <Text style={styles.linkText}>Regístrate aquí</Text>
                </Pressable>
              </Link>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 28,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.md,
  },
  header: {
    alignItems: 'center',
    marginBottom: 26,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.dangerLight,
    borderLeftWidth: 4,
    borderLeftColor: Colors.danger,
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: Colors.danger,
    fontWeight: '500',
    lineHeight: 18,
  },
  form: {
    gap: 18,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.inputBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    height: '100%',
  },
  eyeButton: {
    padding: 4,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    ...Shadows.sm,
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  footerLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  footerText: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  linkText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
});
