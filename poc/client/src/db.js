/* ==========================================================================
   TERRITÓRIO — PERSISTÊNCIA DO MAPA (Supabase)
   Acesso mínimo ao banco: carrega e salva o snapshot único do mapa.
   Um único mapa compartilhado (id = 'default'), gravado como JSON numa linha
   da tabela `map_state`. Ver docs/DOCUMENTACAO_ATUAL.md (seção de persistência).

   Se as variáveis VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY não estiverem
   definidas, `dbEnabled` fica false e a aplicação segue funcionando só em
   memória (comportamento antigo da POC), sem quebrar.
   ========================================================================== */

import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const dbEnabled = Boolean(url && key);

// Exportado para o módulo de autenticação (auth.js) usar a mesma instância/sessão:
// com o usuário logado, as gravações abaixo saem com o JWT e passam no RLS.
export const supabase = dbEnabled ? createClient(url, key) : null;

// Identificador do mapa único compartilhado (fase de exposição).
const MAP_ID = 'default';

if (!dbEnabled) {
  console.warn(
    '[db] Persistência desligada: defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY. ' +
    'O mapa vai funcionar só em memória (dados somem ao recarregar).'
  );
}

/**
 * Carrega o snapshot salvo do mapa único compartilhado.
 * @returns {Promise<object|null>} o objeto snapshot, ou null se não houver / erro.
 */
export async function loadSnapshot() {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('map_state')
      .select('data')
      .eq('id', MAP_ID)
      .maybeSingle();
    if (error) {
      console.warn('[db] loadSnapshot:', error.message);
      return null;
    }
    return data?.data ?? null;
  } catch (err) {
    console.warn('[db] loadSnapshot (exceção):', err);
    return null;
  }
}

/**
 * Grava (upsert) o snapshot atual do mapa.
 * @param {object} snapshot estado serializável do mapa.
 */
export async function saveSnapshot(snapshot) {
  if (!supabase) return;
  try {
    const { error } = await supabase
      .from('map_state')
      .upsert({ id: MAP_ID, data: snapshot, updated_at: new Date().toISOString() });
    if (error) console.warn('[db] saveSnapshot:', error.message);
  } catch (err) {
    console.warn('[db] saveSnapshot (exceção):', err);
  }
}
