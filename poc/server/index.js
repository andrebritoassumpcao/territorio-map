import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = process.env.PORT || 3001;

// Configuração de Middlewares Globais
app.use(cors()); // Habilita requisições cross-origin (CORS)
app.use(express.json()); // Middleware para interpretar requisições com corpo JSON

// Middleware para registro (log) de requisições HTTP
app.use((req, res, next) => {
  const dataHora = new Date().toISOString();
  console.log(`[${dataHora}] ${req.method} ${req.originalUrl}`);
  next();
});

// Enums para validação de dados
const STATUS_VALIDOS = ['aberta', 'em_andamento', 'concluida', 'cancelada'];
const PRIORIDADES_VALIDAS = ['baixa', 'media', 'alta', 'critica'];

// Base de dados em memória inicializada com 3 missões de exemplo no Brasil
const agora = new Date().toISOString();

let missoes = [
  {
    id: uuidv4(),
    titulo: 'Reflorestamento Parque Nacional',
    descricao: 'Projeto de reflorestamento e recuperação de áreas degradadas no Parque Nacional do Rio de Janeiro.',
    status: 'aberta',
    prioridade: 'alta',
    prazo: '2026-12-31T23:59:59.000Z',
    coordenadas: {
      lng: -43.1729,
      lat: -22.9068
    },
    criadoEm: agora,
    atualizadoEm: agora,
    excluidoEm: null
  },
  {
    id: uuidv4(),
    titulo: 'Monitoramento de Enchentes',
    descricao: 'Monitoramento em tempo real dos pontos de alagamento e risco de enchentes na região metropolitana de São Paulo.',
    status: 'em_andamento',
    prioridade: 'critica',
    prazo: '2026-09-15T23:59:59.000Z',
    coordenadas: {
      lng: -46.6333,
      lat: -23.5505
    },
    criadoEm: agora,
    atualizadoEm: agora,
    excluidoEm: null
  },
  {
    id: uuidv4(),
    titulo: 'Limpeza de Nascentes',
    descricao: 'Ação comunitária de despoluição e preservação de nascentes d\'água em Belo Horizonte.',
    status: 'concluida',
    prioridade: 'media',
    prazo: '2026-07-30T23:59:59.000Z',
    coordenadas: {
      lng: -43.9378,
      lat: -19.9167
    },
    criadoEm: agora,
    atualizadoEm: agora,
    excluidoEm: null
  }
];

// ==========================================================
// ROTAS DA API DE MISSÕES
// ==========================================================

/**
 * GET /api/missoes
 * Retorna a lista de todas as missões ativas (não excluídas logicamente).
 */
app.get('/api/missoes', (req, res) => {
  const missoesAtivas = missoes.filter((m) => m.excluidoEm === null);
  res.status(200).json(missoesAtivas);
});

/**
 * GET /api/missoes/:id
 * Retorna os detalhes de uma missão específica por ID.
 */
app.get('/api/missoes/:id', (req, res) => {
  const { id } = req.params;
  const missao = missoes.find((m) => m.id === id && m.excluidoEm === null);

  if (!missao) {
    return res.status(404).json({ mensagem: 'Missão não encontrada.' });
  }

  res.status(200).json(missao);
});

/**
 * POST /api/missoes
 * Cria uma nova missão.
 */
app.post('/api/missoes', (req, res) => {
  const { titulo, descricao, status, prioridade, prazo, coordenadas } = req.body;

  // Validação dos campos obrigatórios
  if (!titulo || typeof titulo !== 'string' || titulo.trim() === '') {
    return res.status(400).json({ mensagem: 'O campo "titulo" é obrigatório e deve ser um texto válido.' });
  }

  if (!coordenadas || typeof coordenadas.lng !== 'number' || typeof coordenadas.lat !== 'number') {
    return res.status(400).json({
      mensagem: 'O campo "coordenadas" é obrigatório e deve conter os valores numéricos "lng" e "lat".'
    });
  }

  // Validação de status (se fornecido)
  const statusDefinido = status || 'aberta';
  if (!STATUS_VALIDOS.includes(statusDefinido)) {
    return res.status(400).json({
      mensagem: `Status inválido. Valores permitidos: ${STATUS_VALIDOS.join(', ')}.`
    });
  }

  // Validação de prioridade (se fornecida)
  const prioridadeDefinida = prioridade || 'media';
  if (!PRIORIDADES_VALIDAS.includes(prioridadeDefinida)) {
    return res.status(400).json({
      mensagem: `Prioridade inválida. Valores permitidos: ${PRIORIDADES_VALIDAS.join(', ')}.`
    });
  }

  const dataAtual = new Date().toISOString();

  const novaMissao = {
    id: uuidv4(),
    titulo: titulo.trim(),
    descricao: descricao ? String(descricao).trim() : '',
    status: statusDefinido,
    prioridade: prioridadeDefinida,
    prazo: prazo ? new Date(prazo).toISOString() : null,
    coordenadas: {
      lng: Number(coordenadas.lng),
      lat: Number(coordenadas.lat)
    },
    criadoEm: dataAtual,
    atualizadoEm: dataAtual,
    excluidoEm: null
  };

  missoes.push(novaMissao);

  res.status(201).json(novaMissao);
});

/**
 * PATCH /api/missoes/:id/status
 * Atualiza apenas o status de uma missão existente.
 */
app.patch('/api/missoes/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status || !STATUS_VALIDOS.includes(status)) {
    return res.status(400).json({
      mensagem: `Status inválido ou não fornecido. Valores permitidos: ${STATUS_VALIDOS.join(', ')}.`
    });
  }

  const missaoIndex = missoes.findIndex((m) => m.id === id && m.excluidoEm === null);

  if (missaoIndex === -1) {
    return res.status(404).json({ mensagem: 'Missão não encontrada.' });
  }

  const dataAtual = new Date().toISOString();
  missoes[missaoIndex].status = status;
  missoes[missaoIndex].atualizadoEm = dataAtual;

  res.status(200).json(missoes[missaoIndex]);
});

/**
 * DELETE /api/missoes/:id
 * Realiza o soft delete (exclusão lógica) de uma missão.
 */
app.delete('/api/missoes/:id', (req, res) => {
  const { id } = req.params;
  const missaoIndex = missoes.findIndex((m) => m.id === id && m.excluidoEm === null);

  if (missaoIndex === -1) {
    return res.status(404).json({ mensagem: 'Missão não encontrada ou já excluída.' });
  }

  const dataAtual = new Date().toISOString();
  missoes[missaoIndex].excluidoEm = dataAtual;
  missoes[missaoIndex].atualizadoEm = dataAtual;

  res.status(200).json({
    mensagem: 'Missão excluída com sucesso.',
    id: id
  });
});

// Middleware de tratamento global de erros
app.use((err, req, res, next) => {
  console.error('Erro interno no servidor:', err);
  res.status(500).json({
    mensagem: 'Ocorreu um erro interno no servidor.',
    erro: process.env.NODE_ENV === 'production' ? null : err.message
  });
});

// Inicialização do servidor
app.listen(PORT, () => {
  console.log(`Servidor de Missões da POC rodando na porta ${PORT}`);
});
