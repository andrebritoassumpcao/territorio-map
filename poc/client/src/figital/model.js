/* ==========================================================================
   FIGITAL — MODELO DE DADOS
   Entidades Percurso, Totem, Missão de totem e Item de insumo.

   Referência de regras de negócio: docs/CAMPANHA_FIGITAL.md
     §3   Objetos de negócio
     §15  Schema de insumos
     §6.1 RN-FIG-001 a 008, 041, 042 (mapa, geometria, percurso)
     §6.2 RN-FIG-009 a 016 (totens e QR)

   Este módulo só define forma de dados e validação — nenhuma dependência
   do Leaflet ou do DOM. Fase 1.7 deve reaproveitar estas mesmas formas
   no contrato da API (percursos, totens, manifest).
   ========================================================================== */

// ---------------------------------------------------------------------------
// Enumerações
// ---------------------------------------------------------------------------

export const PAPEL_TOTEM = Object.freeze({
  INICIO: 'inicio',
  INTERMEDIARIO: 'intermediario',
  FIM: 'fim'
});

export const PAPEIS_TOTEM = Object.freeze([
  PAPEL_TOTEM.INICIO,
  PAPEL_TOTEM.INTERMEDIARIO,
  PAPEL_TOTEM.FIM
]);

export const PAPEL_TOTEM_LABEL = Object.freeze({
  [PAPEL_TOTEM.INICIO]: 'Início',
  [PAPEL_TOTEM.INTERMEDIARIO]: 'Ponto específico',
  [PAPEL_TOTEM.FIM]: 'Fim'
});

export const MODO_PERCURSO = Object.freeze({
  SEQUENCIAL: 'sequencial',
  LIVRE: 'livre'
});

export const MODOS_PERCURSO = Object.freeze([MODO_PERCURSO.SEQUENCIAL, MODO_PERCURSO.LIVRE]);

export const TIPO_INSUMO = Object.freeze({
  FOTO: 'foto',
  VIDEO: 'video',
  AUDIO: 'audio',
  TEXTO: 'texto',
  GPS: 'gps',
  FORMULARIO: 'formulario',
  MEMORIA: 'memoria'
});

export const TIPOS_INSUMO = Object.freeze(Object.values(TIPO_INSUMO));

export const TIPO_INSUMO_LABEL = Object.freeze({
  [TIPO_INSUMO.FOTO]: 'Foto',
  [TIPO_INSUMO.VIDEO]: 'Vídeo',
  [TIPO_INSUMO.AUDIO]: 'Áudio',
  [TIPO_INSUMO.TEXTO]: 'Texto',
  [TIPO_INSUMO.GPS]: 'GPS / check-in',
  [TIPO_INSUMO.FORMULARIO]: 'Formulário',
  [TIPO_INSUMO.MEMORIA]: 'Memória'
});

export const VISIBILIDADE_INSUMO = Object.freeze({
  INTERNO: 'interno',
  MAPA_PUBLICO: 'mapa_publico'
});

export const VISIBILIDADES_INSUMO = Object.freeze([
  VISIBILIDADE_INSUMO.INTERNO,
  VISIBILIDADE_INSUMO.MAPA_PUBLICO
]);

// ---------------------------------------------------------------------------
// Fábricas de entidade — cada uma preenche defaults conforme §3 e §15.
// ---------------------------------------------------------------------------

let seq = 0;
function nextId(prefix) {
  seq += 1;
  return `${prefix}-${Date.now().toString(36)}-${seq}`;
}

/**
 * Item de insumo (§15). `grupoId` + `minimoGrupo` cobrem o caso
 * "um dos dois obrigatório" (ex.: totem 4 da Serra do Vulcão: áudio OU texto).
 */
export function createItemInsumo(overrides = {}) {
  const tipo = overrides.tipo || TIPO_INSUMO.FOTO;
  return {
    id: overrides.id || nextId('insumo'),
    tipo,
    obrigatorio: overrides.obrigatorio ?? true,
    rotulo: overrides.rotulo || TIPO_INSUMO_LABEL[tipo] || tipo,
    visibilidade: overrides.visibilidade || VISIBILIDADE_INSUMO.INTERNO,
    validacao: overrides.validacao || defaultValidacaoParaTipo(tipo),
    grupoId: overrides.grupoId || null,
    minimoGrupo: overrides.minimoGrupo ?? null
  };
}

/** Validação mínima sugerida por tipo (§15, tabela "Validações mínimas"). */
export function defaultValidacaoParaTipo(tipo) {
  switch (tipo) {
    case TIPO_INSUMO.FOTO:
      return { tamanhoMaxMb: 10 };
    case TIPO_INSUMO.VIDEO:
      return { duracaoMaxSeg: 30 };
    case TIPO_INSUMO.AUDIO:
      return { duracaoMaxSeg: 30 };
    case TIPO_INSUMO.TEXTO:
      return { comprimentoMin: 1, comprimentoMax: 500 };
    case TIPO_INSUMO.GPS:
      return { gpsObrigatorio: false, distanciaMaximaM: 80 };
    case TIPO_INSUMO.FORMULARIO:
      return { campos: [] };
    case TIPO_INSUMO.MEMORIA:
      return { herdaCoordenadaDoTotem: true };
    default:
      return {};
  }
}

/**
 * Missão de totem (§3.5 / §6.3 / §6.8): missão do mapa com os campos
 * extras da jornada — instrução do NPC, ordem, recompensa parcial e
 * catálogo de insumos.
 */
export function createMissaoTotem(overrides = {}) {
  return {
    id: overrides.id || nextId('missaototem'),
    totemId: overrides.totemId || null,
    titulo: overrides.titulo || '',
    instrucaoNpc: overrides.instrucaoNpc || '',
    ordem: overrides.ordem ?? 1,
    obrigatoria: overrides.obrigatoria ?? true,
    recompensaParcial: overrides.recompensaParcial || '',
    catalogoInsumos: overrides.catalogoInsumos || []
  };
}

/**
 * Totem (§3.4 / RN-FIG-005): ponto de trilha com papel (início/específico/fim),
 * descrição/curiosidades do local, roteiro de NPC **opcional** e QR. Fica dentro
 * da geometria do percurso (RN-FIG-011), nunca solto via "Novo marcador"
 * (RN-FIG-041). A autoria de missão (o que pedir/coletar) mudou para o marcador
 * de missão do mapa — o totem não carrega mais missão.
 */
export function createTotem(overrides = {}) {
  return {
    id: overrides.id || nextId('totem'),
    percursoId: overrides.percursoId || null,
    mapaId: overrides.mapaId || null,
    nome: overrides.nome || 'Totem',
    lat: overrides.lat ?? null,
    lng: overrides.lng ?? null,
    papel: overrides.papel || PAPEL_TOTEM.INTERMEDIARIO,
    descricao: overrides.descricao || '',
    roteiroNpc: overrides.roteiroNpc || null, // { nome, falas: [{id, texto}] } ou null (NPC opcional)
    qr: overrides.qr || null // { url, assinatura, geradoEm }
  };
}

/**
 * Percurso (§3.3 / RN-FIG-004 / RN-FIG-042): a trilha ou área vira
 * percurso quando recebe o primeiro totem.
 */
export function createPercurso(overrides = {}) {
  return {
    id: overrides.id || nextId('percurso'),
    mapaId: overrides.mapaId || null,
    geometriaId: overrides.geometriaId || null, // id do desenho (linha/polígono) que virou percurso
    titulo: overrides.titulo || '',
    modo: overrides.modo || MODO_PERCURSO.SEQUENCIAL,
    recompensaFinal: overrides.recompensaFinal || '',
    textoConsentimento: overrides.textoConsentimento || '',
    ativo: overrides.ativo ?? false,
    permiteReplay: overrides.permiteReplay ?? false,
    periodoInicio: overrides.periodoInicio || '',
    periodoFim: overrides.periodoFim || '',
    totens: overrides.totens || [] // lista de Totem
  };
}

// ---------------------------------------------------------------------------
// Validação — RN-FIG-009, 010, 011
// ---------------------------------------------------------------------------

/**
 * Valida um percurso contra as regras mínimas para liberar jornada.
 * `pontoDentroDaGeometria(totem)` é injetado pelo chamador porque só o
 * app.js sabe desenhar/consultar a geometria Leaflet (RN-FIG-011).
 *
 * Retorna { pronto: boolean, erros: string[] }.
 */
export function validarPercurso(percurso, pontoDentroDaGeometria) {
  const erros = [];
  const totens = percurso?.totens || [];

  const inicios = totens.filter(t => t.papel === PAPEL_TOTEM.INICIO);
  if (inicios.length === 0) {
    erros.push('Falta um totem com papel "Início" (RN-FIG-009).');
  } else if (inicios.length > 1) {
    erros.push('Só pode existir um totem com papel "Início" neste percurso (RN-FIG-009).');
  }

  const naoSoInicio = totens.filter(t => t.papel !== PAPEL_TOTEM.INICIO);
  if (naoSoInicio.length === 0) {
    erros.push('Falta pelo menos um totem intermediário ou de fim (RN-FIG-010).');
  }

  if (typeof pontoDentroDaGeometria === 'function') {
    totens.forEach(t => {
      if (!pontoDentroDaGeometria(t)) {
        erros.push(`O totem "${t.nome}" está fora da geometria do percurso (RN-FIG-011).`);
      }
    });
  }

  if (!percurso?.modo) {
    erros.push('O percurso precisa de um modo de progresso, sequencial ou livre (RN-FIG-004).');
  }

  return { pronto: erros.length === 0, erros };
}

/**
 * Um totem "inicio" pode ficar sem missão (só abre a jornada, §3.4).
 * Intermediário e fim exigem missão associada.
 */
export function totemPrecisaDeMissao(totem) {
  return totem?.papel !== PAPEL_TOTEM.INICIO;
}

// ---------------------------------------------------------------------------
// QR — §14.1
// ---------------------------------------------------------------------------

/**
 * Assinatura mock local (Fase 1, sem servidor de verdade — RN-FIG-016
 * pede HMAC real, que entra quando 1.7 vira a API Figital de verdade).
 * Não usar em produção: é só um hash curto e determinístico.
 */
export function gerarAssinaturaMock(mapaId, totemId, segredoLocal = 'figital-fase1-mock') {
  const base = `${mapaId}:${totemId}:${segredoLocal}`;
  let hash = 0;
  for (let i = 0; i < base.length; i += 1) {
    hash = (hash * 31 + base.charCodeAt(i)) >>> 0;
  }
  return hash.toString(36);
}

/**
 * URL profunda do totem (§14.1): https://{dominio-app}/m/{mapaId}/t/{totemId}?s={assinatura}
 */
export function gerarUrlQr({ dominio = 'app.territorio.ai', mapaId, totemId, assinatura }) {
  const s = assinatura || gerarAssinaturaMock(mapaId, totemId);
  return `https://${dominio}/m/${mapaId}/t/${totemId}?s=${s}`;
}

/**
 * URL profunda da missão do mapa (mesmo padrão do totem, §14.1):
 * https://{dominio-app}/m/{mapaId}/missao/{missaoId}?s={assinatura}
 */
export function gerarUrlQrMissao({ dominio = 'app.territorio.ai', mapaId, missaoId, assinatura }) {
  const s = assinatura || gerarAssinaturaMock(mapaId, missaoId);
  return `https://${dominio}/m/${mapaId}/missao/${missaoId}?s=${s}`;
}

// ---------------------------------------------------------------------------
// Manifesto do percurso (§13.1 GET /mapas/{id}/percursos/{id}/manifest)
// Mesmo formato que a Fase 1.7 deve devolver na API — construído aqui
// para o painel/preview do NPC poderem reaproveitar sem duplicar forma.
// ---------------------------------------------------------------------------

export function construirManifestoPercurso(percurso) {
  return {
    percursoId: percurso.id,
    titulo: percurso.titulo,
    modo: percurso.modo,
    recompensaFinal: percurso.recompensaFinal,
    textoConsentimento: percurso.textoConsentimento,
    ativo: percurso.ativo,
    permiteReplay: percurso.permiteReplay,
    totens: (percurso.totens || []).map(t => ({
      totemId: t.id,
      nome: t.nome,
      papel: t.papel,
      lat: t.lat,
      lng: t.lng,
      descricao: t.descricao || '',
      npc: t.roteiroNpc || null
    }))
  };
}
