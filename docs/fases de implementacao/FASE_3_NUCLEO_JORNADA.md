# Fase 3 — Núcleo da jornada do participante

**Parte de:** [`PLANO_IMPLEMENTACAO_FIGITAL.md`](../PLANO_IMPLEMENTACAO_FIGITAL.md)
**Regras de negócio de referência:** [`CAMPANHA_FIGITAL.md`](../CAMPANHA_FIGITAL.md) §5.2, §12.1, §14.2, §15, RN-FIG-015, RN-FIG-017/018, RN-FIG-020, RN-FIG-028–031, RN-FIG-033/034, RN-FIG-045, RN-FIG-047
**Depende de:** [`FASE_2_FUNDACAO_APP.md`](FASE_2_FUNDACAO_APP.md)
**Desbloqueia:** Fase 4

---

## Objetivo

O fluxo descrito em §5.2 do documento de negócio funciona ponta a ponta para um único percurso, com rede disponível (offline fica para a Fase 4).

## 3.1 Consentimento

- Tela de finalidades dos insumos daquele mapa (pesquisa, acervo interno, publicação no mapa) antes do primeiro envio (RN-FIG-033).
- Recusar impede iniciar jornada se o percurso coleta insumo pessoal (RN-FIG-034).

## 3.2 Cena do NPC

- Renderizar o roteiro fixo por totem a partir do JSON do manifesto (exemplo de schema em §14.2) — texto, áudio opcional, sem chatbot livre no piloto (RN-FIG-047).

## 3.3 Execução de missão e captura de insumo

- Telas por tipo de bloco: câmera (foto/vídeo), áudio, texto, formulário, GPS/check-in, memória — schema e validações mínimas em §15 (ex.: duração máxima de áudio/vídeo, distância máxima ao totem quando GPS é obrigatório).
- Suporte a grupo "um dos dois obrigatório" (`grupoId` + `minimoGrupo`) — necessário já no piloto por causa do totem 4 da Serra do Vulcão (áudio **ou** texto).
- Fechar missão só quando todos os insumos obrigatórios daquela missão estiverem presentes e validados (RN-FIG-020).

## 3.4 Progresso e ordem

- Modo sequencial (padrão do piloto): missão N só abre após a N−1 obrigatória concluída (RN-FIG-017/018). Modo livre como alternativa configurável no percurso.
- Check-in exige scan do QR; GPS é reforço opcional por missão, nunca bloqueio único (RN-FIG-015/045) — importante porque a trilha real tem sinal fraco.

## 3.5 Recompensas

- Parcial ao concluir a missão do totem; final só com todas as obrigatórias do percurso concluídas; uma não substitui a outra (RN-FIG-028–030).
- Tela de "carteira/progresso" (§12.1).

---

## Critério de pronto

Com internet, uma pessoa real percorre a Serra do Vulcão do totem 1 ao 5, entrega os insumos pedidos em cada parada e recebe as recompensas parciais e a final.

**Fase anterior:** [`FASE_2_FUNDACAO_APP.md`](FASE_2_FUNDACAO_APP.md)
**Próxima fase:** [`FASE_4_OFFLINE_SINCRONIZACAO.md`](FASE_4_OFFLINE_SINCRONIZACAO.md)
