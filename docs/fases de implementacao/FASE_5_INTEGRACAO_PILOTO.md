# Fase 5 — Integração de volta ao mapa e piloto real

**Parte de:** [`PLANO_IMPLEMENTACAO_FIGITAL.md`](../PLANO_IMPLEMENTACAO_FIGITAL.md)
**Regras de negócio de referência:** [`CAMPANHA_FIGITAL.md`](../CAMPANHA_FIGITAL.md) §8, §11.3, §16.1, §16.2, §16.3, §18, RN-FIG-035, UC-03, UC-08, UC-10
**Depende de:** [`FASE_4_OFFLINE_SINCRONIZACAO.md`](FASE_4_OFFLINE_SINCRONIZACAO.md)
**Desbloqueia:** nada — fecha o plano

---

## Objetivo

Fechar o ciclo mapa → app → mapa e validar com o roteiro Serra do Vulcão (§8) como piloto real, não simulação.

## 5.1 Eventos e dados voltando para o painel

- Emitir os eventos de §16.1 (`jornada_iniciada`, `checkin_totem`, `insumo_enviado`, `missao_concluida`, `recompensa_parcial/final`, `jornada_concluida/abandonada`, `sync_offline`) e os metadados de §16.2 para alimentar o painel construído na Fase 1.8 com dados reais em vez de mock.
- Indicadores reais: participantes/jornadas por percurso, taxa de conclusão, tempo médio entre totens, abandono por totem, mapa de calor de check-ins, contagem de insumos por tipo (§16.3).

## 5.2 Memória pública e moderação

- Insumo com visibilidade `mapa_publico` vira memória (ou elemento equivalente) no mapa, passando pela fila de moderação já preparada na Fase 1.8 se essa opção estiver ligada (RN-FIG-035).

## 5.3 Piloto real ponta a ponta

- Instalar os 5 totens físicos da Serra do Vulcão (fora do software — impressão e material de campo, §11.3), testar QRs como Owner/Editor (UC-03/UC-08 exceção de modo teste), depois abrir para participantes reais.

## 5.4 Ajustes finais e itens que ficam como decisão institucional

Os pontos de §18 ("Questões em aberto") não são bloqueadores de código, mas devem ser fechados até aqui:

- Participação de menor (UC-10)
- LGPD completa (base legal, retenção, DPO, termos)
- Stack mobile definitiva pós-PWA
- Política de moderação (automática, fila humana ou publicação imediata)
- Política de replay entre temporadas

---

## Critério de pronto

O piloto Serra do Vulcão roda de ponta a ponta com participantes reais, e a instituição consegue ver os insumos, indicadores e exportações no painel do mapa.

**Fase anterior:** [`FASE_4_OFFLINE_SINCRONIZACAO.md`](FASE_4_OFFLINE_SINCRONIZACAO.md)
