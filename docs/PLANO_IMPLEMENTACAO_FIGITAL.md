# Plano de Implementação — Figital no Mapa e Aplicativo do Participante

**Plataforma:** Território (territorio.ai)
**Baseado em:** [`docs/CAMPANHA_FIGITAL.md`](CAMPANHA_FIGITAL.md) (v2.1), [`docs/DOCUMENTACAO_ATUAL.md`](DOCUMENTACAO_ATUAL.md) (09/09/2026) e [`docs/FUNCIONALIDADES_PENDENTES.md`](FUNCIONALIDADES_PENDENTES.md)
**Data deste plano:** 15/09/2026
**Escopo:** Roteiro de entrega — não é uma nova regra de negócio. As regras continuam em `CAMPANHA_FIGITAL.md`; este documento só ordena o trabalho em fases.

> Este arquivo é o índice do plano. O detalhe de cada fase está em [`fases de implementacao/`](fases%20de%20implementacao/), um arquivo por fase.

---

## Ponto de partida (o que existe hoje)

- **UI principal:** vanilla JS + Leaflet em `poc/client` (`src/app.js`, ~84 mil linhas de código em arquivo único; `index.html`, ~51 KB). Dados mockados em memória, sem persistência, sem login.
- **Já reaproveitável pelo Figital** (citado em `CAMPANHA_FIGITAL.md` §10): desenho de polígono/linha, ações da forma selecionada (`shape-actions`: adicionar dentro, editar, excluir), posicionar missão/marcador dentro de uma área, memória ligada a missão/marcador.
- **Stack experimental à parte:** React + MapLibre (`poc/client/src/App.jsx`, `MapView.jsx`, etc.) e um servidor Express (`poc/server`) com CRUD de missões em memória. **Não alimenta a UI principal** — é candidato natural a virar a base da futura API Figital (Fase 1, item 1.7), mas hoje é código legado/paralelo.
- **Nada do Figital existe ainda:** sem campo de totem, sem papel (início/intermediário/fim), sem QR, sem percurso, sem jornada, sem insumo, sem app do participante.

Duas lacunas estruturais que atravessam todas as fases e por isso são decididas cedo, não descobertas no meio do caminho:

1. **Persistência.** O mapa hoje só tem estado de sessão do navegador. Sem alguma forma de guardar percurso/totem/missão além do reload, não existe "manifesto" para o app baixar nem "insumo" para voltar ao painel — o contrato entre mapa e app (§10 do documento de negócio) não se sustenta em dados mockados no cliente.
2. **Identidade.** O modelo híbrido (anônimo → oferece salvar na conta) é a recomendação do próprio documento (§13.2), mas depende de o mapa já ter algum conceito de conta/colaborador, hoje inexistente na POC (`FUNCIONALIDADES_PENDENTES.md`, seção "Permissões e colaboração").

Este plano trata a persistência mínima como parte da **Fase 1** (não da Fase 2), porque sem ela a Fase 1 produz só formulários decorativos — exatamente o problema que a POC já tem hoje com Missões e Mutirões (`DOCUMENTACAO_ATUAL.md`, seções 9–10: "sem persistência, sem alteração real de status").

---

## Visão geral das fases

| Fase | Arquivo | Objetivo | Onde roda |
|------|---------|----------|-----------|
| **1** | [`FASE_1_MAPA_FIGITAL.md`](fases%20de%20implementacao/FASE_1_MAPA_FIGITAL.md) | Mapa sabe representar e configurar Figital (percurso, totem, missão+insumos, QR, painel) | `poc/client` (mapa existente) |
| **2** | [`FASE_2_FUNDACAO_APP.md`](fases%20de%20implementacao/FASE_2_FUNDACAO_APP.md) | Fundação técnica do aplicativo separado do participante | Novo projeto |
| **3** | [`FASE_3_NUCLEO_JORNADA.md`](fases%20de%20implementacao/FASE_3_NUCLEO_JORNADA.md) | Núcleo da jornada: scan, NPC, execução de missão, insumos | App do participante |
| **4** | [`FASE_4_OFFLINE_SINCRONIZACAO.md`](fases%20de%20implementacao/FASE_4_OFFLINE_SINCRONIZACAO.md) | Offline, sincronização e casos de borda de campo | App do participante + API |
| **5** | [`FASE_5_INTEGRACAO_PILOTO.md`](fases%20de%20implementacao/FASE_5_INTEGRACAO_PILOTO.md) | Integração de volta ao painel do mapa e piloto real (Serra do Vulcão) | Mapa + App + API |

A Fase 1 é o que foi pedido como prioridade imediata ("dados de campanha figital que ainda não estão no mapa"). As Fases 2 a 5 iniciam e completam o aplicativo separado.

---

## Dependências entre fases

```
Fase 1 (mapa + persistência mínima)
   └─► Fase 2 (app fala com a API da Fase 1)
          └─► Fase 3 (jornada com rede)
                 └─► Fase 4 (jornada sem rede / casos de borda)
                        └─► Fase 5 (dados reais voltam ao painel + piloto físico)
```

Não é possível iniciar a Fase 2 antes de a Fase 1.7 (persistência mínima) existir — é a única dependência dura fora da ordem sequencial natural. As Fases 3 e 4 podem, na prática, avançar em paralelo com ajustes finos da Fase 1 (ex.: schema de insumos), desde que o contrato da API não mude sem aviso.

---

## Fora deste plano

Este plano não cobre os itens de `FUNCIONALIDADES_PENDENTES.md` que não são pré-requisito direto do Figital (mapa como repositório multi-mapa, papéis completos Owner/Editor/Sugestor/Visualizador, estrelas e insígnias gerais, importação/exportação GeoJSON/KML/Shapefile fora do Figital). Onde o Figital depende minimamente de algo desse conjunto (ex.: algum conceito de conta para o modelo híbrido de identidade), isso é sinalizado explicitamente na fase correspondente, mas a implementação completa desses itens é tratada como plano à parte.
