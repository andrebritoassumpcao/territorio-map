/* ==========================================================================
   FIGITAL — FASE 1.7: PERSISTÊNCIA MÍNIMA
   Expõe percursos, totens e o manifesto do percurso (§13.1 de
   docs/CAMPANHA_FIGITAL.md), mais stubs de jornadas/insumos/export.

   Escopo deliberadamente pequeno (docs/fases de implementacao/FASE_1_MAPA_FIGITAL.md,
   item 1.7): não é o backend definitivo (sem autenticação, papéis ou banco
   geoespacial — isso fica em FUNCIONALIDADES_PENDENTES.md). O contrato
   importa mais que a implementação completa; por isso jornadas/insumos/export
   ficam como stubs que devolvem dados vazios/mock.
   ========================================================================== */

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// ---------------------------------------------------------------------------
// Base de dados em memória
// ---------------------------------------------------------------------------

/** @type {Array<object>} */
const percursos = [];
/** @type {Array<object>} */
const totens = [];

const MODOS_VALIDOS = ['sequencial', 'livre'];
const PAPEIS_VALIDOS = ['inicio', 'intermediario', 'fim'];

function agora() {
  return new Date().toISOString();
}

function encontrarPercurso(mapaId, percursoId) {
  return percursos.find((p) => p.id === percursoId && p.mapaId === mapaId && !p.excluidoEm);
}

function totensDoPercurso(percursoId) {
  return totens.filter((t) => t.percursoId === percursoId && !t.excluidoEm);
}

/**
 * Mesma checagem de RN-FIG-009/010 que o cliente faz em
 * poc/client/src/figital/model.js (validarPercurso). RN-FIG-011 (totem
 * dentro da geometria) não é verificável aqui porque este servidor de
 * Fase 1 não guarda a geometria — fica a cargo do cliente, que já
 * garante isso no fluxo de posicionamento ("+" da forma).
 */
function validarPercursoParaJornada(percurso) {
  const seusTotens = totensDoPercurso(percurso.id);
  const erros = [];
  const inicios = seusTotens.filter((t) => t.papel === 'inicio');
  if (inicios.length === 0) erros.push('Falta um totem com papel "inicio" (RN-FIG-009).');
  if (inicios.length > 1) erros.push('Só pode existir um totem "inicio" (RN-FIG-009).');
  if (seusTotens.filter((t) => t.papel !== 'inicio').length === 0) {
    erros.push('Falta ao menos um totem intermediário ou de fim (RN-FIG-010).');
  }
  return { pronto: erros.length === 0, erros };
}

// ---------------------------------------------------------------------------
// Percursos — GET/POST /mapas/:mapaId/percursos, PATCH .../:percursoId
// ---------------------------------------------------------------------------

router.get('/mapas/:mapaId/percursos', (req, res) => {
  const { mapaId } = req.params;
  const lista = percursos.filter((p) => p.mapaId === mapaId && !p.excluidoEm);
  res.status(200).json(lista.map((p) => ({ ...p, totens: totensDoPercurso(p.id).map((t) => t.id) })));
});

router.post('/mapas/:mapaId/percursos', (req, res) => {
  const { mapaId } = req.params;
  const { titulo, geometriaId, modo, recompensaFinal, textoConsentimento, periodoInicio, periodoFim, permiteReplay } = req.body || {};

  if (!geometriaId) {
    return res.status(400).json({ mensagem: 'O campo "geometriaId" é obrigatório (RN-FIG-002: todo percurso pertence a uma geometria).' });
  }
  const modoDefinido = modo || 'sequencial';
  if (!MODOS_VALIDOS.includes(modoDefinido)) {
    return res.status(400).json({ mensagem: `Modo inválido. Valores permitidos: ${MODOS_VALIDOS.join(', ')}.` });
  }

  const novo = {
    id: uuidv4(),
    mapaId,
    geometriaId,
    titulo: titulo ? String(titulo).trim() : 'Percurso sem nome',
    modo: modoDefinido,
    recompensaFinal: recompensaFinal || '',
    textoConsentimento: textoConsentimento || '',
    periodoInicio: periodoInicio || null,
    periodoFim: periodoFim || null,
    ativo: false,
    permiteReplay: !!permiteReplay,
    criadoEm: agora(),
    atualizadoEm: agora(),
    excluidoEm: null
  };
  percursos.push(novo);
  res.status(201).json({ ...novo, totens: [] });
});

router.get('/mapas/:mapaId/percursos/:percursoId', (req, res) => {
  const percurso = encontrarPercurso(req.params.mapaId, req.params.percursoId);
  if (!percurso) return res.status(404).json({ mensagem: 'Percurso não encontrado.' });
  res.status(200).json({ ...percurso, totens: totensDoPercurso(percurso.id).map((t) => t.id) });
});

router.patch('/mapas/:mapaId/percursos/:percursoId', (req, res) => {
  const percurso = encontrarPercurso(req.params.mapaId, req.params.percursoId);
  if (!percurso) return res.status(404).json({ mensagem: 'Percurso não encontrado.' });

  const campos = ['titulo', 'modo', 'recompensaFinal', 'textoConsentimento', 'periodoInicio', 'periodoFim', 'ativo', 'permiteReplay'];
  campos.forEach((campo) => {
    if (Object.prototype.hasOwnProperty.call(req.body || {}, campo)) {
      percurso[campo] = req.body[campo];
    }
  });

  if (percurso.modo && !MODOS_VALIDOS.includes(percurso.modo)) {
    return res.status(400).json({ mensagem: `Modo inválido. Valores permitidos: ${MODOS_VALIDOS.join(', ')}.` });
  }

  // RN-FIG-007: ativar um percurso sem totem de início não abre jornada nova,
  // mas a Fase 1 ainda permite salvar o estado — o aviso vai no corpo da resposta.
  const validacao = validarPercursoParaJornada(percurso);
  percurso.atualizadoEm = agora();

  res.status(200).json({ ...percurso, totens: totensDoPercurso(percurso.id).map((t) => t.id), prontoParaJornada: validacao.pronto, avisos: validacao.erros });
});

// ---------------------------------------------------------------------------
// Totens — GET/POST /mapas/:mapaId/totens
// ---------------------------------------------------------------------------

router.get('/mapas/:mapaId/totens', (req, res) => {
  const { mapaId } = req.params;
  const { percursoId } = req.query;
  let lista = totens.filter((t) => t.mapaId === mapaId && !t.excluidoEm);
  if (percursoId) lista = lista.filter((t) => t.percursoId === percursoId);
  res.status(200).json(lista);
});

router.post('/mapas/:mapaId/totens', (req, res) => {
  const { mapaId } = req.params;
  const { percursoId, nome, lat, lng, papel, missao, roteiroNpc } = req.body || {};

  if (!percursoId || !encontrarPercurso(mapaId, percursoId)) {
    return res.status(400).json({ mensagem: 'O campo "percursoId" deve apontar para um percurso existente deste mapa (RN-FIG-002).' });
  }
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return res.status(400).json({ mensagem: 'Os campos "lat" e "lng" são obrigatórios e numéricos (o totem fica dentro da geometria — RN-FIG-011, verificado no mapa).' });
  }
  const papelDefinido = papel || 'intermediario';
  if (!PAPEIS_VALIDOS.includes(papelDefinido)) {
    return res.status(400).json({ mensagem: `Papel inválido. Valores permitidos: ${PAPEIS_VALIDOS.join(', ')}.` });
  }
  if (papelDefinido === 'inicio') {
    const outroInicio = totensDoPercurso(percursoId).find((t) => t.papel === 'inicio');
    if (outroInicio) {
      return res.status(409).json({ mensagem: `Este percurso já tem um totem de início ("${outroInicio.nome}"). Só pode haver um (RN-FIG-009).` });
    }
  }

  const novo = {
    id: uuidv4(),
    mapaId,
    percursoId,
    nome: nome ? String(nome).trim() : 'Totem',
    lat,
    lng,
    papel: papelDefinido,
    missao: missao || null,
    roteiroNpc: roteiroNpc || { nome: '', falas: [] },
    qr: null,
    criadoEm: agora(),
    atualizadoEm: agora(),
    excluidoEm: null
  };
  totens.push(novo);
  res.status(201).json(novo);
});

router.get('/mapas/:mapaId/totens/:totemId', (req, res) => {
  const totem = totens.find((t) => t.id === req.params.totemId && t.mapaId === req.params.mapaId && !t.excluidoEm);
  if (!totem) return res.status(404).json({ mensagem: 'Totem não encontrado.' });
  res.status(200).json(totem);
});

router.patch('/mapas/:mapaId/totens/:totemId', (req, res) => {
  const totem = totens.find((t) => t.id === req.params.totemId && t.mapaId === req.params.mapaId && !t.excluidoEm);
  if (!totem) return res.status(404).json({ mensagem: 'Totem não encontrado.' });

  const campos = ['nome', 'lat', 'lng', 'papel', 'missao', 'roteiroNpc', 'qr'];
  campos.forEach((campo) => {
    if (Object.prototype.hasOwnProperty.call(req.body || {}, campo)) {
      totem[campo] = req.body[campo];
    }
  });
  if (totem.papel === 'inicio') {
    const outroInicio = totensDoPercurso(totem.percursoId).find((t) => t.papel === 'inicio' && t.id !== totem.id);
    if (outroInicio) {
      return res.status(409).json({ mensagem: `Este percurso já tem um totem de início ("${outroInicio.nome}"). Só pode haver um (RN-FIG-009).` });
    }
  }
  totem.atualizadoEm = agora();
  res.status(200).json(totem);
});

router.delete('/mapas/:mapaId/totens/:totemId', (req, res) => {
  const totem = totens.find((t) => t.id === req.params.totemId && t.mapaId === req.params.mapaId && !t.excluidoEm);
  if (!totem) return res.status(404).json({ mensagem: 'Totem não encontrado ou já excluído.' });
  totem.excluidoEm = agora();
  totem.atualizadoEm = agora();
  res.status(200).json({ mensagem: 'Totem excluído.', id: totem.id });
});

// ---------------------------------------------------------------------------
// Manifesto do percurso — GET /mapas/:mapaId/percursos/:percursoId/manifest
// Pacote cacheável offline que o app (Fase 2+) baixa (§13.1, §14.3).
// ---------------------------------------------------------------------------

router.get('/mapas/:mapaId/percursos/:percursoId/manifest', (req, res) => {
  const percurso = encontrarPercurso(req.params.mapaId, req.params.percursoId);
  if (!percurso) return res.status(404).json({ mensagem: 'Percurso não encontrado.' });

  const seusTotens = totensDoPercurso(percurso.id);
  const validacao = validarPercursoParaJornada(percurso);

  res.status(200).json({
    mapaId: percurso.mapaId,
    percursoId: percurso.id,
    titulo: percurso.titulo,
    modo: percurso.modo,
    recompensaFinal: percurso.recompensaFinal,
    textoConsentimento: percurso.textoConsentimento,
    ativo: percurso.ativo,
    permiteReplay: percurso.permiteReplay,
    prontoParaJornada: validacao.pronto,
    avisos: validacao.erros,
    geradoEm: agora(),
    totens: seusTotens.map((t) => ({
      totemId: t.id,
      nome: t.nome,
      papel: t.papel,
      lat: t.lat,
      lng: t.lng,
      npc: t.roteiroNpc,
      missao: t.missao
    }))
  });
});

// ---------------------------------------------------------------------------
// Stubs — jornadas, insumos, export (§13.1). Contrato existe; a Fase 3/4/5
// é que preenche de verdade. Aqui só garantimos que o formato da resposta
// já é o que o app e o painel vão esperar.
// ---------------------------------------------------------------------------

router.post('/jornadas', (req, res) => {
  const { percursoId, totemInicioId } = req.body || {};
  if (!percursoId) {
    return res.status(400).json({ mensagem: 'O campo "percursoId" é obrigatório (RN-FIG-013: a jornada começa no totem de início daquele percurso).' });
  }
  res.status(201).json({
    id: uuidv4(),
    percursoId,
    totemInicioId: totemInicioId || null,
    status: 'INICIADA',
    progresso: [],
    criadoEm: agora(),
    aviso: 'Stub da Fase 1.7 — sem app do participante ainda (Fase 3). Não persiste de verdade entre reinícios do servidor.'
  });
});

router.get('/jornadas/:id', (req, res) => {
  res.status(200).json({
    id: req.params.id,
    status: 'INICIADA',
    progresso: [],
    aviso: 'Stub da Fase 1.7 — implementação real na Fase 3/4.'
  });
});

router.post('/jornadas/:id/checkins', (req, res) => {
  res.status(201).json({ jornadaId: req.params.id, aceito: true, aviso: 'Stub da Fase 1.7.' });
});

router.post('/jornadas/:id/insumos', (req, res) => {
  res.status(201).json({ jornadaId: req.params.id, insumoId: uuidv4(), status: 'recebido', aviso: 'Stub da Fase 1.7 — sem armazenamento de mídia ainda.' });
});

router.post('/jornadas/:id/missoes/:missaoId/concluir', (req, res) => {
  res.status(200).json({ jornadaId: req.params.id, missaoId: req.params.missaoId, concluida: true, aviso: 'Stub da Fase 1.7.' });
});

router.get('/mapas/:mapaId/insumos', (req, res) => {
  res.status(200).json({ mapaId: req.params.mapaId, insumos: [], aviso: 'Sem insumos reais até existir jornada de participante (Fase 3+).' });
});

router.get('/mapas/:mapaId/export', (req, res) => {
  const formato = (req.query.formato || 'geojson').toLowerCase();
  if (formato === 'csv') {
    res.status(200).type('text/csv').send('id,nome,papel,percurso\n');
    return;
  }
  res.status(200).json({ type: 'FeatureCollection', features: [] });
});

export default router;
