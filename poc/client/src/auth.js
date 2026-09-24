/* ==========================================================================
   TERRITÓRIO — AUTENTICAÇÃO MÍNIMA (Supabase Auth)
   Login único de demonstração para proteger o protótipo durante apresentações.
   Não há cadastro nem papéis: o usuário é criado direto no Supabase Auth.
   A sessão fica no localStorage (gerenciada pelo supabase-js).
   Ver docs/DOCUMENTACAO_ATUAL.md (seção de autenticação).
   ========================================================================== */

import { supabase } from './db.js';

// Sem Supabase configurado (dev sem .env.local) o login é pulado.
export const authEnabled = Boolean(supabase);

/** @returns {Promise<object|null>} sessão atual ou null. */
export async function getSession() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data?.session ?? null;
}

/**
 * @returns {Promise<{ok: boolean, message?: string}>}
 */
export async function signIn(email, password) {
  if (!supabase) return { ok: false, message: 'Autenticação indisponível.' };
  try {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      const invalid = /invalid login credentials/i.test(error.message);
      return { ok: false, message: invalid ? 'E-mail ou senha inválidos.' : error.message };
    }
    return { ok: true };
  } catch (err) {
    console.warn('[auth] signIn (exceção):', err);
    return { ok: false, message: 'Não foi possível conectar. Tente novamente.' };
  }
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}
