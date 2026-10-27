import React, { useEffect, useState } from 'react';
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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { productsRepo } from '../db/repositories/products';
import { Colors, Shadows } from '../constants/theme';

export default function ProductoFormScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const isEditing = Boolean(params.id);
  const productId = params.id ? parseInt(params.id, 10) : undefined;

  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [loadingInitial, setLoadingInitial] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Cargar datos si se está editando
  useEffect(() => {
    if (isEditing && productId) {
      productsRepo
        .getById(productId)
        .then((prod) => {
          if (prod) {
            setName(prod.name);
            setQuantity(String(prod.quantity));
            setPrice(String(prod.price));
          } else {
            setErrorMessage('El producto seleccionado no existe.');
          }
        })
        .catch((err) => {
          setErrorMessage('Error al leer el producto de la base local: ' + err.message);
        })
        .finally(() => {
          setLoadingInitial(false);
        });
    }
  }, [isEditing, productId]);

  const handleSave = async () => {
    setErrorMessage(null);

    // Validación 1: Nombre obligatorio
    if (!name.trim()) {
      setErrorMessage('El nombre del producto es obligatorio.');
      return;
    }

    // Validación 2: Cantidad entera mayor o igual a 0
    const parsedQty = parseInt(quantity.trim(), 10);
    if (isNaN(parsedQty) || parsedQty < 0 || quantity.includes('.')) {
      setErrorMessage('La cantidad debe ser un número entero mayor o igual a 0.');
      return;
    }

    // Validación 3: Precio entero mayor o igual a 0
    const parsedPrice = parseInt(price.trim(), 10);
    if (isNaN(parsedPrice) || parsedPrice < 0 || price.includes('.')) {
      setErrorMessage('El precio debe ser un número entero mayor o igual a 0 (en pesos, sin decimales).');
      return;
    }

    try {
      setSaving(true);

      if (isEditing && productId) {
        await productsRepo.update(productId, {
          name: name.trim(),
          quantity: parsedQty,
          price: parsedPrice,
        });
      } else {
        await productsRepo.create({
          name: name.trim(),
          quantity: parsedQty,
          price: parsedPrice,
        });
      }

      setSaving(false);
      router.back();
    } catch (err: any) {
      setSaving(false);
      setErrorMessage('Error al guardar en la base de datos local: ' + err.message);
    }
  };

  const calculatedSubtotal = () => {
    const q = parseInt(quantity, 10);
    const p = parseInt(price, 10);
    if (isNaN(q) || isNaN(p) || q < 0 || p < 0) return 0;
    return q * p;
  };

  if (loadingInitial) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Cargando datos del producto...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      {/* Barra superior / Header */}
      <View style={styles.topBar}>
        <Pressable
          style={styles.backBtn}
          onPress={() => router.back()}
          hitSlop={12}
        >
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.topBarTitle}>
          {isEditing ? 'Editar Producto' : 'Nuevo Producto'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          {/* Banner de error */}
          {errorMessage && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={20} color={Colors.danger} style={{ marginTop: 2 }} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {/* Formulario */}
          <View style={styles.form}>
            {/* Nombre */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nombre del producto *</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="pricetag-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Ej. Arroz Diana 1kg, Harina PAN..."
                  placeholderTextColor={Colors.textMuted}
                  value={name}
                  onChangeText={(val) => {
                    setName(val);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  autoFocus={!isEditing}
                />
              </View>
            </View>

            {/* Cantidad */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Cantidad (unidades en existencia) *</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="cube-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  placeholderTextColor={Colors.textMuted}
                  value={quantity}
                  onChangeText={(val) => {
                    setQuantity(val.replace(/[^0-9]/g, ''));
                    if (errorMessage) setErrorMessage(null);
                  }}
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* Precio */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Precio unitario en pesos (sin decimales) *</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="cash-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Ej. 3500"
                  placeholderTextColor={Colors.textMuted}
                  value={price}
                  onChangeText={(val) => {
                    setPrice(val.replace(/[^0-9]/g, ''));
                    if (errorMessage) setErrorMessage(null);
                  }}
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* Calculador de Valor Total estimado */}
            <View style={styles.previewBox}>
              <View style={styles.previewHeader}>
                <Ionicons name="calculator-outline" size={18} color={Colors.primary} />
                <Text style={styles.previewTitle}>Valor total en inventario:</Text>
              </View>
              <Text style={styles.previewValue}>
                ${calculatedSubtotal().toLocaleString('es-CO')} COP
              </Text>
              <Text style={styles.previewSubtext}>
                {quantity || 0} unidades × ${parseInt(price || '0', 10).toLocaleString('es-CO')}
              </Text>
            </View>

            {/* Botón Guardar */}
            <Pressable
              style={({ pressed }) => [
                styles.saveButton,
                pressed && styles.buttonPressed,
                saving && styles.buttonDisabled,
              ]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.saveButtonText}>
                    {isEditing ? 'Guardar Cambios' : 'Registrar Producto'}
                  </Text>
                </>
              )}
            </Pressable>
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
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: Colors.textMuted,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 56 : 24,
    paddingBottom: 16,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.inputBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.md,
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
    height: 50,
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
  previewBox: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#99F6E4',
    marginVertical: 4,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  previewTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primaryHover,
  },
  previewValue: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.primaryHover,
  },
  previewSubtext: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  saveButton: {
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
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
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
