import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import { useAuth } from '../context/AuthContext';
import { useProducts } from '../hooks/useProducts';
import { syncProducts, type SyncResult } from '../services/sync';
import { type Product } from '../db/schema';
import { Colors, Shadows } from '../constants/theme';

export default function PrincipalScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { products, stats, isProductPending, deleteProduct } = useProducts();

  const [searchQuery, setSearchQuery] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [syncBanner, setSyncBanner] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(true);

  // Detector de conectividad y Sincronización Automática al volver online (Punto extra)
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = Boolean(state.isConnected && state.isInternetReachable !== false);
      setIsOnline((prev) => {
        // Si antes estaba offline y ahora vuelve la conexión, auto-sincronizar
        if (!prev && online && user?.id) {
          triggerSync(true);
        }
        return online;
      });
    });

    return () => unsubscribe();
  }, [user?.id]);

  // Ejecutar sincronización (manual o automática)
  const triggerSync = async (isAuto = false) => {
    if (syncing) return;
    setSyncing(true);

    try {
      const result: SyncResult = await syncProducts(user?.id);
      if (result.success) {
        setSyncBanner({
          type: 'success',
          message: isAuto
            ? `Conexión recuperada: ${result.message}`
            : `Sincronización completada: ${result.message}`,
        });
      } else {
        setSyncBanner({
          type: 'error',
          message: result.message,
        });
      }
    } catch (err: any) {
      setSyncBanner({
        type: 'error',
        message: err?.message || 'Error al conectar con Supabase',
      });
    } finally {
      setSyncing(false);
    }
  };

  // Confirmación al eliminar (Punto obligatorio: mantener presionado o confirmación)
  const confirmDelete = (product: Product) => {
    setProductToDelete(product);
  };

  const handleExecuteDelete = async () => {
    if (!productToDelete) return;
    try {
      await deleteProduct(productToDelete.id);
      setProductToDelete(null);
      setSyncBanner({
        type: 'info',
        message: `Producto "${productToDelete.name}" eliminado de la tienda`,
      });
    } catch (err: any) {
      Alert.alert('Error', 'No se pudo eliminar el producto: ' + err.message);
    }
  };

  // Filtrado por nombre (Punto extra)
  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  return (
    <View style={styles.container}>
      {/* ============================================================== */}
      {/* 1. Header con Información de Usuario y Botón Cerrar Sesión      */}
      {/* ============================================================== */}
      <View style={styles.topHeader}>
        <View style={styles.brandRow}>
          <View style={styles.logoBadge}>
            <Ionicons name="storefront" size={22} color="#FFFFFF" />
          </View>
          <View>
            <Text style={styles.brandTitle}>Mi Tienda</Text>
            <View style={styles.onlineBadge}>
              {isOnline ? (
                <>
                  <Ionicons name="wifi" size={12} color={Colors.success} />
                  <Text style={styles.onlineText}>En línea</Text>
                </>
              ) : (
                <>
                  <Ionicons name="airplane" size={12} color={Colors.accent} />
                  <Text style={styles.offlineText}>Sin internet (Modo avión)</Text>
                </>
              )}
            </View>
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [styles.logoutButton, pressed && { opacity: 0.7 }]}
          onPress={() => {
            Alert.alert(
              'Cerrar sesión',
              '¿Deseas salir de tu cuenta en este dispositivo?',
              [
                { text: 'Cancelar', style: 'cancel' },
                {
                  text: 'Cerrar sesión',
                  style: 'destructive',
                  onPress: () => signOut(),
                },
              ]
            );
          }}
          hitSlop={8}
        >
          <Ionicons name="log-out-outline" size={18} color={Colors.danger} />
          <Text style={styles.logoutText}>Salir</Text>
        </Pressable>
      </View>

      {/* ============================================================== */}
      {/* 2. Banner de Resultado de Sincronización                      */}
      {/* ============================================================== */}
      {syncBanner && (
        <View
          style={[
            styles.banner,
            syncBanner.type === 'success' && styles.bannerSuccess,
            syncBanner.type === 'error' && styles.bannerError,
            syncBanner.type === 'info' && styles.bannerInfo,
          ]}
        >
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {syncBanner.type === 'success' ? (
              <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
            ) : syncBanner.type === 'error' ? (
              <Ionicons name="cloud-offline" size={18} color={Colors.danger} />
            ) : (
              <Ionicons name="cloud-done" size={18} color={Colors.primary} />
            )}
            <Text
              style={[
                styles.bannerText,
                syncBanner.type === 'success' && { color: '#065F46' },
                syncBanner.type === 'error' && { color: '#991B1B' },
                syncBanner.type === 'info' && { color: '#115E59' },
              ]}
            >
              {syncBanner.message}
            </Text>
          </View>
          <Pressable onPress={() => setSyncBanner(null)} hitSlop={8}>
            <Ionicons name="close" size={16} color={Colors.textMuted} />
          </Pressable>
        </View>
      )}

      {/* ============================================================== */}
      {/* 3. Tarjetas de Métricas de Inventario (Totales Obligatorios)  */}
      {/* ============================================================== */}
      <View style={styles.statsContainer}>
        {/* Total Valor */}
        <View style={[styles.statCard, styles.statCardPrimary]}>
          <View style={styles.statIconBadge}>
            <Ionicons name="cash-outline" size={18} color={Colors.primary} />
          </View>
          <Text style={styles.statLabel}>Valor Total</Text>
          <Text style={styles.statNumber}>
            ${stats.totalValue.toLocaleString('es-CO')}
          </Text>
          <Text style={styles.statSub}>Pesos en existencia</Text>
        </View>

        {/* Total Unidades */}
        <View style={styles.statCard}>
          <View style={[styles.statIconBadge, { backgroundColor: '#F1F5F9' }]}>
            <Ionicons name="cube-outline" size={18} color={Colors.text} />
          </View>
          <Text style={styles.statLabel}>Unidades</Text>
          <Text style={styles.statNumber}>{stats.totalUnits}</Text>
          <Text style={styles.statSub}>Productos totales</Text>
        </View>

        {/* Pendientes de subir */}
        <View style={[styles.statCard, stats.pendingCount > 0 && styles.statCardPending]}>
          <View
            style={[
              styles.statIconBadge,
              { backgroundColor: stats.pendingCount > 0 ? Colors.accentLight : '#F1F5F9' },
            ]}
          >
            <Ionicons
              name="cloud-upload-outline"
              size={18}
              color={stats.pendingCount > 0 ? Colors.accent : Colors.textMuted}
            />
          </View>
          <Text style={styles.statLabel}>Pendientes</Text>
          <Text
            style={[
              styles.statNumber,
              stats.pendingCount > 0 && { color: Colors.accent },
            ]}
          >
            {stats.pendingCount}
          </Text>
          <Text style={styles.statSub}>Por subir a la nube</Text>
        </View>
      </View>

      {/* ============================================================== */}
      {/* 4. Barra de Acciones: Sincronizar + Agregar                    */}
      {/* ============================================================== */}
      <View style={styles.actionsBar}>
        {/* Botón Sincronizar */}
        <Pressable
          style={({ pressed }) => [
            styles.syncButton,
            pressed && { opacity: 0.85 },
            syncing && { opacity: 0.7 },
          ]}
          onPress={() => triggerSync(false)}
          disabled={syncing}
        >
          {syncing ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="sync-outline" size={18} color="#FFFFFF" />
          )}
          <Text style={styles.syncButtonText}>
            {syncing ? 'Sincronizando...' : 'Sincronizar'}
          </Text>
        </Pressable>

        {/* Botón Agregar Producto */}
        <Pressable
          style={({ pressed }) => [
            styles.addButton,
            pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
          ]}
          onPress={() => router.push('/producto')}
        >
          <Ionicons name="add" size={20} color="#FFFFFF" />
          <Text style={styles.addButtonText}>Agregar</Text>
        </Pressable>
      </View>

      {/* ============================================================== */}
      {/* 5. Barra de Búsqueda (Punto extra)                            */}
      {/* ============================================================== */}
      <View style={styles.searchWrapper}>
        <Ionicons name="search-outline" size={18} color={Colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar producto por nombre..."
          placeholderTextColor={Colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
            <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
          </Pressable>
        )}
      </View>

      {/* ============================================================== */}
      {/* 6. Lista de Productos Reactiva (useLiveQuery)                 */}
      {/* ============================================================== */}
      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={syncing}
            onRefresh={() => triggerSync(false)}
            colors={[Colors.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="storefront-outline" size={40} color={Colors.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>
              {searchQuery ? 'Sin coincidencias' : 'Inventario vacío'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery
                ? `No encontramos productos con el nombre "${searchQuery}".`
                : 'Anota tus productos para llevar el control con o sin internet.'}
            </Text>
            {!searchQuery && (
              <Pressable
                style={styles.emptyButton}
                onPress={() => router.push('/producto')}
              >
                <Ionicons name="add" size={18} color="#FFFFFF" />
                <Text style={styles.emptyButtonText}>Registrar primer producto</Text>
              </Pressable>
            )}
          </View>
        }
        renderItem={({ item }) => {
          const pending = isProductPending(item);
          const itemSubtotal = item.quantity * item.price;

          return (
            <Pressable
              style={({ pressed }) => [
                styles.productCard,
                pressed && styles.productCardPressed,
              ]}
              onPress={() => router.push(`/producto?id=${item.id}`)}
              onLongPress={() => confirmDelete(item)}
              delayLongPress={350}
            >
              <View style={styles.productMainRow}>
                {/* Información del producto */}
                <View style={styles.productInfo}>
                  <Text style={styles.productName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <View style={styles.productDetails}>
                    <Text style={styles.productQty}>
                      {item.quantity} {item.quantity === 1 ? 'unidad' : 'unidades'}
                    </Text>
                    <Text style={styles.dotSeparator}>•</Text>
                    <Text style={styles.productPrice}>
                      ${item.price.toLocaleString('es-CO')} c/u
                    </Text>
                  </View>
                  <Text style={styles.productSubtotal}>
                    Subtotal: ${itemSubtotal.toLocaleString('es-CO')}
                  </Text>
                </View>

                {/* Acciones e Indicador de Sincronización */}
                <View style={styles.productRightCol}>
                  {/* Badge de Sincronización obligatorio */}
                  {pending ? (
                    <View style={styles.badgePending}>
                      <Ionicons name="cloud-upload-outline" size={12} color="#B45309" />
                      <Text style={styles.badgePendingText}>Pendiente</Text>
                    </View>
                  ) : (
                    <View style={styles.badgeSynced}>
                      <Ionicons name="checkmark-circle" size={12} color="#065F46" />
                      <Text style={styles.badgeSyncedText}>En la nube</Text>
                    </View>
                  )}

                  {/* Botón directo de eliminar */}
                  <Pressable
                    style={styles.deleteIconButton}
                    onPress={() => confirmDelete(item)}
                    hitSlop={8}
                  >
                    <Ionicons name="trash-outline" size={16} color={Colors.danger} />
                  </Pressable>
                </View>
              </View>
            </Pressable>
          );
        }}
      />

      {/* ============================================================== */}
      {/* 7. Modal de Confirmación de Eliminación                        */}
      {/* ============================================================== */}
      <Modal
        visible={productToDelete !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setProductToDelete(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconWrap}>
              <Ionicons name="warning-outline" size={32} color={Colors.danger} />
            </View>
            <Text style={styles.modalTitle}>¿Eliminar producto?</Text>
            <Text style={styles.modalDesc}>
              ¿Estás seguro de que deseas eliminar{' '}
              <Text style={{ fontWeight: '700', color: Colors.text }}>
                "{productToDelete?.name}"
              </Text>
              ? Esta acción se sincronizará cuando tengas internet.
            </Text>

            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalCancelBtn}
                onPress={() => setProductToDelete(null)}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={styles.modalDeleteBtn}
                onPress={handleExecuteDelete}
              >
                <Text style={styles.modalDeleteText}>Sí, eliminar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 54 : 20,
    paddingBottom: 16,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoBadge: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.sm,
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.4,
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  onlineText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.success,
  },
  offlineText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.accent,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.dangerLight,
  },
  logoutText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.danger,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  bannerSuccess: {
    backgroundColor: Colors.successLight,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  bannerError: {
    backgroundColor: Colors.dangerLight,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  bannerInfo: {
    backgroundColor: Colors.primaryLight,
    borderWidth: 1,
    borderColor: '#99F6E4',
  },
  bannerText: {
    fontSize: 13,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  statCardPrimary: {
    borderColor: '#99F6E4',
    backgroundColor: '#F0FDFA',
  },
  statCardPending: {
    borderColor: '#FDE68A',
    backgroundColor: '#FFFBEB',
  },
  statIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textMuted,
    textTransform: 'uppercase',
  },
  statNumber: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.text,
    marginTop: 2,
  },
  statSub: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 2,
  },
  actionsBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 14,
    gap: 10,
  },
  syncButton: {
    flex: 1,
    flexDirection: 'row',
    height: 46,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    ...Shadows.sm,
  },
  syncButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  addButton: {
    flexDirection: 'row',
    height: 46,
    paddingHorizontal: 18,
    backgroundColor: Colors.text,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    ...Shadows.sm,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    height: '100%',
  },
  listContent: {
    padding: 16,
    gap: 10,
    flexGrow: 1,
  },
  productCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  productCardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  productMainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  productInfo: {
    flex: 1,
    paddingRight: 10,
  },
  productName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  productDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  productQty: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primaryHover,
  },
  dotSeparator: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  productPrice: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  productSubtotal: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
    marginTop: 4,
  },
  productRightCol: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  badgeSynced: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeSyncedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46',
  },
  badgePending: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgePendingText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B45309',
  },
  deleteIconButton: {
    padding: 6,
    marginTop: 10,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 6,
    maxWidth: 280,
    lineHeight: 18,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 18,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    ...Shadows.lg,
  },
  modalIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.dangerLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
    textAlign: 'center',
  },
  modalDesc: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    width: '100%',
  },
  modalCancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  modalDeleteBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.danger,
  },
  modalDeleteText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
