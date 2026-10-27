import { supabase } from '../lib/supabase';
import { productsRepo } from '../db/repositories/products';

export interface SyncResult {
  success: boolean;
  uploaded: number;
  downloaded: number;
  message: string;
}

/**
 * Función principal de sincronización requerida por el examen.
 * Realiza dos pasos estrictos en orden:
 * 1. Bajar: Trae de Supabase los productos del usuario e inserta o actualiza en SQLite.
 * 2. Subir: Envía los productos locales pendientes con upsert a Supabase y actualiza syncedAt.
 */
export async function syncProducts(userId?: string): Promise<SyncResult> {
  let downloadedCount = 0;
  let uploadedCount = 0;

  try {
    // Verificar sesión y autenticación
    const { data: authData, error: sessionError } = await supabase.auth.getSession();
    let currentSession = authData?.session;

    if (!currentSession) {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        throw new Error('Debes iniciar sesión o registrarte con tu correo en la app antes de sincronizar.');
      }
    }

    const currentUserId = currentSession?.user?.id || (await supabase.auth.getUser()).data.user?.id;
    if (!currentUserId) {
      throw new Error('No se pudo identificar el usuario autenticado para sincronizar.');
    }

    // ==========================================
    // PASO 1: Bajar de Supabase
    // ==========================================
    const { data: remoteProducts, error: fetchError } = await supabase
      .from('products')
      .select('*');

    if (fetchError) {
      throw new Error(`Error al bajar de la nube: ${fetchError.message}`);
    }

    if (remoteProducts && Array.isArray(remoteProducts)) {
      for (const remote of remoteProducts) {
        const action = await productsRepo.upsertFromRemote({
          client_id: remote.client_id,
          name: remote.name,
          quantity: remote.quantity,
          price: remote.price,
          updated_at: remote.updated_at,
          deleted_at: remote.deleted_at ?? null,
        });

        if (action === 'inserted' || action === 'updated') {
          downloadedCount++;
        }
      }
    }

    // ==========================================
    // PASO 2: Subir productos pendientes
    // ==========================================
    const pendingProducts = await productsRepo.getPending();

    for (const p of pendingProducts) {
      // Manejo de borrado sincronizado (Punto extra)
      if (p.deletedAt) {
        const { error: delError } = await supabase
          .from('products')
          .delete()
          .eq('client_id', p.clientId);

        if (!delError) {
          await productsRepo.purgeDeleted(p.clientId);
          uploadedCount++;
        }
        continue;
      }

      // Upsert de producto modificado o nuevo
      const uploadTimestamp = p.updatedAt;
      const { error: upsertError } = await supabase.from('products').upsert(
        {
          user_id: currentUserId,
          client_id: p.clientId,
          name: p.name,
          quantity: p.quantity,
          price: p.price,
          updated_at: uploadTimestamp.toISOString(),
        },
        { onConflict: 'client_id' }
      );

      if (upsertError) {
        console.error(`Error subiendo producto ${p.name}:`, upsertError);
        continue;
      }

      // Marcar como sincronizado con syncedAt = updatedAt que se subió
      await productsRepo.markSynced(p.clientId, uploadTimestamp);
      uploadedCount++;
    }

    return {
      success: true,
      uploaded: uploadedCount,
      downloaded: downloadedCount,
      message: `${uploadedCount} subidos, ${downloadedCount} bajados`,
    };
  } catch (err: any) {
    const errorMsg =
      err?.message?.includes('Network') || err?.message?.includes('Failed to fetch')
        ? 'Sin conexión a internet. No se pudo sincronizar.'
        : err?.message || 'Error desconocido al sincronizar';

    return {
      success: false,
      uploaded: uploadedCount,
      downloaded: downloadedCount,
      message: errorMsg,
    };
  }
}

