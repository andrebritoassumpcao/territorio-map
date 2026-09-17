# Fase 1 — Mapa: dados e interações Figital

**Parte de:** [`PLANO_IMPLEMENTACAO_FIGITAL.md`](../PLANO_IMPLEMENTACAO_FIGITAL.md)
**Regras de negócio de referência:** [`CAMPANHA_FIGITAL.md`](../CAMPANHA_FIGITAL.md) §3, §4, §11, §14.1, §15
**Depende de:** nada (ponto de partida)
**Desbloqueia:** Fase 2 (o app só existe depois que 1.7 expõe um manifesto real)

---

## Objetivo

O mapa passa a suportar tudo que `CAMPANHA_FIGITAL.md` §11 define como responsabilidade da autoria, sem depender do app ainda existir. Ao final desta fase, um organizador consegue desenhar a Serra do Vulcão, colocar os cinco totens, configurar missões e insumos, gerar QRs e ver um painel — mesmo que a "jornada real" só chegue na Fase 3.

## Ponto de partida (contexto técnico)

- UI principal: vanilla JS + Leaflet em `poc/client` (`src/app.js`, ~84 mil linhas em arquivo único; `index.html`, ~51 KB). Dados mockados em memória, sem persistência, sem login.
- Já reaproveitável pelo Figital (§10 do documento de negócio): desenho de polígono/linha, ações da forma selecionada (`shape-actions`: adicionar dentro, editar, excluir), posicionar missão/marcador dentro de uma área, memória ligada a missão/marcador.
- Stack experimental à parte: React + MapLibre e um servidor Express (`poc/server`) com CRUD de missões em memória — não alimenta a UI principal hoje, mas é candidato natural a virar a base da API Figital (item 1.7 abaixo).

## 1.1 Modelo de dados Figital

- Definir as entidades **Percurso**, **Totem**, **Missão de totem** e **Item de insumo** como extensão do modelo atual de linha/polígono/missão/marcador (`DOCUMENTACAO_ATUAL.md` §6–9).
- Campos mínimos por entidade, conforme §3 e §15 do documento de negócio:
  - **Percurso:** `modo: sequencial|livre`, recompensa final, texto de consentimento, `ativo/inativo`, período opcional.
  - **Totem:** `papel: inicio|intermediario|fim`, QR, missão associada, roteiro do NPC.
  - **Missão de totem:** ordem, `obrigatoria: boolean`, recompensa parcial, catálogo de insumos.
  - **Item de insumo:** `tipo`, `obrigatorio`, `validacao`, `visibilidade`, `rotulo`, suporte a `grupoId`/`minimoGrupo` para regras "um dos dois obrigatório" (ex.: totem 4 da Serra do Vulcão — áudio **ou** texto).
- Decidir onde esse modelo vive no código: hoje tudo é array mockado dentro de `app.js`; recomenda-se isolar essas estruturas num módulo próprio (`src/figital/model.js` ou equivalente) mesmo antes de existir persistência real, para não crescer ainda mais o arquivo único de 84 mil linhas.

## 1.2 UI de autoria: totem e ficha do totem

- Estender o bloco `shape-actions` (`poc/client/index.html`) para que o **"+" da forma** ofereça **Totem** além de Missão e Marcador, sempre posicionando dentro da geometria selecionada (RN-FIG-041, §4.1).
- Editor de totem: papel, missão vinculada (ou criação inline), roteiro do NPC (falas), recompensa parcial, validação por insumo (ex.: GPS opcional + raio em metros) — telas descritas em §11.2 ("Editor de totem").
- Validar client-side as regras RN-FIG-009 a 011 antes de liberar o percurso para teste: exatamente um totem `inicio`, pelo menos um totem que não seja só início, todos os totens dentro da geometria (ou sobre a trilha, com tolerância).

## 1.3 Ficha do percurso

- Quando a trilha/área selecionada já tem totens, ela vira **percurso**: nova aba/ficha com modo de progresso, recompensa final, texto de consentimento e ativo/inativo (§11.2, "Ficha do percurso"; RN-FIG-004).
- Regra de bloqueio: período/recompensa final/consentimento podem ficar em branco até o primeiro totem `inicio` receber uma jornada real (RN-FIG-004) — na Fase 1 isso é só validação de formulário, já que jornada real só existe na Fase 3.
- Controle de **replay** (permitir ou não recomeçar o percurso) precisa existir aqui, mesmo que só seja consumido pela Fase 4 (RN-FIG-024).

## 1.4 Catálogo de insumos por missão

- UI para a instituição escolher, por missão, quais tipos de insumo usar (foto, vídeo, áudio, texto, GPS/check-in, formulário, memória) e marcar obrigatoriedade — schema completo em §15.
- Reaproveitar o fluxo de Memória já existente (`DOCUMENTACAO_ATUAL.md` §11) como um dos tipos de insumo (RN-FIG-040: memória herda a geolocalização do totem).

## 1.5 Geração de QR

- Botão "gerar arte de QR" por totem, produzindo PNG/PDF com nome do totem e do mapa/percurso (§11.1, item 4).
- URL no formato `https://{dominio-app}/m/{mapaId}/t/{totemId}?s={assinatura}` (§14.1). Na Fase 1, sem app ainda publicado, a assinatura pode ser gerada com um segredo local/mock — trocar pelo HMAC real do servidor assim que o item 1.7 (persistência) estiver de pé.

## 1.6 Visibilidade e ativação

- Alternar visibilidade do mapa (público/privado — ainda que o conceito de conta/permissão completo seja item de `FUNCIONALIDADES_PENDENTES.md`) e ativar/desativar percurso independentemente do mapa inteiro (RN-FIG-007, UC-03).
- Regra de UI: com mapa privado ou percurso inativo, deixar claro que QRs de teste só funcionam para quem está editando (RN-FIG-006) — mensagem explícita na ficha do percurso, não só documentação.

## 1.7 Persistência mínima (pré-requisito das fases seguintes)

- Evoluir (ou substituir) o servidor Express experimental (`poc/server`) para expor os recursos descritos em §13.1: `percursos`, `totens`, `manifest` do percurso, e stubs de `jornadas`/`insumos`/`export` (podem devolver dados vazios/mock nesta fase — o contrato importa mais que a implementação completa).
- Sem isso, a Fase 2 em diante não tem o que consumir: o app só existe se houver um `manifest` real para baixar.
- Escopo desta sub-fase é deliberadamente pequeno: não é o backend definitivo do produto (autenticação, papéis, banco geoespacial ficam em `FUNCIONALIDADES_PENDENTES.md`), é o suficiente para o app começar a existir.

## 1.8 Painel do mapa / percurso

- Tela de indicadores (participantes, taxa de conclusão, insumos por totem — §16.3) e lista de insumos com exportação CSV/GeoJSON (§11.2, "Painel de dados"). Nesta fase, com dados mockados/vazios vindos da API stub do item 1.7.
- Fila de moderação de memórias marcadas `mapa_publico` (RN-FIG-035) — pode ficar como tela vazia funcional até existirem insumos reais (Fase 5).

---

## Critério de pronto

Um organizador consegue, sem tocar em código, reconstruir o roteiro da Serra do Vulcão (§8) inteiro no mapa — geometria, 5 totens, missões com insumos, QRs baixáveis, percurso configurado — mesmo que nenhum participante real ainda consiga escaneá-los.

**Próxima fase:** [`FASE_2_FUNDACAO_APP.md`](FASE_2_FUNDACAO_APP.md)
