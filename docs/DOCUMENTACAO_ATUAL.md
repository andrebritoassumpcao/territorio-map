# Documentação atual — Mapa do Território

**Plataforma:** Território (territorio.ai)
**Tipo:** Protótipo visual de alta fidelidade (POC)
**Versão deste documento:** 1.2
**Data:** 18/09/2026
**Fonte de verdade do produto como está hoje:** este arquivo

> Sempre que uma funcionalidade for adicionada, alterada ou removida, este documento deve ser atualizado na mesma entrega. Ver `.cursor/rules/atualizar-documentacao-atual.mdc`.

---

## Sumário

1. [O que é o projeto hoje](#1-o-que-é-o-projeto-hoje)
2. [Como executar](#2-como-executar)
3. [Arquitetura](#3-arquitetura)
4. [Interface](#4-interface)
5. [Mapa e navegação](#5-mapa-e-navegação)
6. [Camadas e mapa-base](#6-camadas-e-mapa-base)
7. [Ferramentas de desenho](#7-ferramentas-de-desenho)
8. [Marcadores e criação de elementos](#8-marcadores-e-criação-de-elementos)
9. [Missões](#9-missões)
10. [Mutirões](#10-mutirões)
11. [Memórias](#11-memórias)
12. [Marcadores (alerta e ponto de interesse)](#12-marcadores-alerta-e-ponto-de-interesse)
13. [Filtros, busca e notificações (estado atual)](#13-filtros-busca-e-notificações-estado-atual)
14. [Gamificação visível](#14-gamificação-visível)
15. [Stack experimental (React + API)](#15-stack-experimental-react--api)
16. [Figital — autoria no mapa (Fase 1)](#16-figital--autoria-no-mapa-fase-1)
17. [Limitações conscientes](#17-limitações-conscientes)

---

## 1. O que é o projeto hoje

O repositório contém o **protótipo do Mapa** da plataforma Território: uma interface colaborativa para visualizar e criar missões, mutirões, memórias e elementos geográficos sobre um mapa.

O que o usuário vê ao abrir o projeto **não é um produto com persistência, contas ou múltiplos mapas**. É uma **POC visual** com dados mockados no cliente, focada em validar layout, ferramentas e fluxos de criação no mapa.

A documentação de regras de negócio original (`Documentacao_Regras_de_Negocio_Mapa.md`) descreve o produto planejado. O que está implementado de fato está neste arquivo. O que ainda não chegou está em `docs/FUNCIONALIDADES_PENDENTES.md`.

### Conceito em uso na POC

- Uma **única vista de mapa**. Ao carregar, o mapa dá `fitBounds` automaticamente sobre as áreas reais mockadas em Queimados e Nova Iguaçu (RJ) — não usa mais um centro fixo na região do Rio Sarapuí / Duque de Caxias.
- Elementos de **missão**, **mutirão**, **memória**, **marcador**, **linha** e **polígono**.
- **Carga inicial (fase atual):** o seed contém **apenas polígonos e trilhas de áreas reais** (contornos do OpenStreetMap). **Nenhum ponto** (missão, mutirão, memória ou marcador) é semeado ainda — esses arrays iniciam vazios; o usuário ainda pode criá-los na sessão.
- Criação e edição acontecem **só na sessão do navegador** (recarregar a página perde o que foi criado).

---

## 2. Como executar

A tela principal é o cliente vanilla em `poc/client`.

```bash
cd poc/client
npm install
npm run dev
```

A raiz do repositório (`index.html`) redireciona para `poc/client/index.html`.

Há também um servidor Express de missões em `poc/server` (`npm run dev` na porta 3001). **Esse servidor não alimenta a interface principal atual.** Ele atende apenas a stack React descrita na [seção 15](#15-stack-experimental-react--api).

---

## 3. Arquitetura

```
Territorio-map/
├── index.html                          # redireciona para o protótipo
├── Documentacao_Regras_de_Negocio_Mapa.md
├── Briefing - Mapa da plataforma.txt
├── Questionamentos Mapa.txt
├── docs/
│   ├── DOCUMENTACAO_ATUAL.md           # este arquivo
│   └── FUNCIONALIDADES_PENDENTES.md
└── poc/
    ├── client/                         # interface principal (vanilla + Leaflet)
    │   ├── index.html
    │   ├── src/app.js                  # lógica do mapa e dos fluxos
    │   ├── src/figital/model.js        # entidades Figital (percurso, totem, missão, insumo) — Fase 1
    │   ├── src/style.css
    │   └── assets/
    └── server/
        ├── index.js                    # API experimental de missões (não ligada à UI principal)
        └── figital.js                  # API Figital (percursos, totens, manifest) — Fase 1.7, ver §16
```

| Parte | Tecnologia | Papel hoje |
|-------|------------|------------|
| UI principal | HTML + CSS + JavaScript | Protótipo visual do mapa |
| Mapa | Leaflet 1.9.4 | Renderização, zoom, marcadores, linhas e polígonos |
| Tiles | Esri World Imagery + OpenStreetMap | Satélite e mapa vetorial |
| Dados | Arrays mockados em `app.js` | Na fase atual, só **áreas iniciais reais** (polígonos/trilhas de Queimados e Nova Iguaçu). Arrays de missões, mutirões, memórias e marcadores iniciam **vazios** |
| Backend da tela principal | Nenhum | Sem login, sem persistência, sem API |
| Figital (autoria) | `src/figital/model.js` + `qrcode` (npm) | Percurso, totem, missão de totem e insumo — estado em memória do navegador, ver §16 |
| Figital (API) | `poc/server/figital.js` (Express, em memória) | Percursos/totens/manifest reais; jornadas/insumos/export como stubs — ver §16 |

---

## 4. Interface

### Sidebar esquerda

- Logo Território.
- Menu estático: Home, **Mapa** (ativo), Manual, Mutirões, Comunidades, Blog. Os itens não navegam para outras telas.
- Recolher/expandir o menu (botão na sidebar e na barra superior).
- Card de nível: **Nível 3 · Guardiã**, barra de XP 720/1000 (somente visual).
- Bloco de perfil estático: **Amanda W.**, Bacia do Rio Doce.

### Barra superior

- Campo de busca com placeholder “Buscar lugares, iniciativas ou pessoas…” (**não filtra nem pesquisa**).
- Sino de notificações com badge (**não abre lista nem HUD**).

### Toolbar flutuante sobre o mapa

| Controle | O que faz |
|----------|-----------|
| Selecionar / Mover | Split button: selecionar elementos ou pan no mapa |
| Novo Marcador | Abre sub-barra para posicionar missão, mutirão ou marcador |
| Desenhar | Abre sub-barra de linha/polígono e cor |
| Filtro | Painel único (ex-Camadas + ex-Filtros): liga/desliga camadas, troca mapa-base e mostra status/categoria/período (**status, categoria e período são só visuais; não aplicam filtro no mapa**) |

### Feedback

Toasts locais (ex.: “Missão criada no ponto escolhido”). Não há barra HUD de alertas da plataforma.

### Acessibilidade (foco e movimento)

- **Foco por teclado visível:** todos os controles customizados (botões da toolbar, sub-barras, abas do modal, painéis, swatches de cor, links, miniaturas de memória) recebem um anel de foco verde via `:focus-visible`. Os checkboxes e radios com input escondido (camadas, status, tipo de marcador, papel do totem) também mostram o anel quando focados pelo teclado.
- **Tipo de marcador navegável por teclado:** os radios "Alerta / Ponto de interesse" deixaram de usar `display:none` (que os tirava da ordem de tabulação) e passaram a usar um padrão visualmente oculto, mantendo o clique no card e o foco por teclado.
- **Movimento reduzido:** com `prefers-reduced-motion: reduce`, as animações e transições (hover dos marcadores, abertura de modal, sub-barras, toasts) são praticamente anuladas.

### Controles ainda não funcionais, agora sinalizados

Os controles que existem só como composição visual passaram a **avisar** que ainda não funcionam, em vez de parecerem ativos:

- **Busca da barra superior:** campo `readonly` com selo "Em breve" e `title` explicando que a busca ainda não está disponível. Continua focável, mas não aceita digitação.
- **Sino de notificações:** aparência esmaecida (`aria-disabled`), sem hover ativo, com `title` "em breve".
- **Filtros de status / categoria / período (painel Filtro):** nota de pré-visualização no topo dessas seções — "status, categoria e período ainda não alteram o mapa". As camadas e o mapa-base continuam funcionais.

Nenhum comportamento novo foi ligado; a mudança é só de sinalização/expectativa.

- Centro inicial: lat `-22.784`, lng `-43.342`, zoom `15`.
- Zoom Leaflet no canto inferior direito (os controles nativos do Leaflet no canto padrão estão desligados).
- Cursores por modo: selecionar, mover, desenhar, posicionar.
- Clique no vazio, no modo selecionar, desmarca a forma atual.
- Atalhos:
  - **Esc** cancela rascunho, posicionamento, painéis, modal ou seleção, nesta ordem.
  - **Enter** conclui o desenho em andamento.
  - **Duplo clique** no modo desenho também conclui a forma.

Não há carregamento por viewport, cluster de marcadores nem múltiplos mapas.

---

## 6. Camadas e mapa-base

Camadas e mapa-base vivem no mesmo painel flutuante **Filtro** (botão único na toolbar, que antes era dividido em "Camadas" e "Filtros" — ver seção 4).

Camadas **fixas** (não dá para criar, renomear ou excluir camada):

| Camada | Conteúdo | Ligada por padrão |
|--------|----------|-------------------|
| Missões | Marcadores de missão | Sim |
| Mutirões | Marcadores de mutirão | Sim |
| Memórias | Miniaturas no mapa | Sim |
| Marcadores | Alertas / pontos de interesse | Sim |
| Áreas de intervenção | Linhas e polígonos | Sim |
| Infraestrutura comunitária | Placeholder desabilitado | Não |

Mapa-base:

- **Satélite** (Esri) — padrão.
- **Vetorial** (OpenStreetMap).

Há um painel de **legenda** no HTML, mas **nenhum botão da toolbar o abre**.

---

## 7. Ferramentas de desenho

### Linha

- Clique para adicionar vértices (mínimo 2).
- Cor escolhida na sub-barra (swatches + color picker).
- Nome automático: `Linha 1`, `Linha 2`, …

### Polígono

- Clique para adicionar vértices (mínimo 3).
- Preenchimento semitransparente + borda.
- Nome automático: `Área 1`, `Área 2`, …

### Seleção de forma

Ao clicar numa linha ou polígono no modo selecionar:

- Bounding box pontilhado.
- Ações no canto da caixa: **adicionar elemento dentro**, **estilo** (cor), **editar nome**, **excluir**.

**Adicionar à forma:** posiciona missão ou marcador **somente dentro** da área/trilha destacada.

**Estilo:** só a cor da linha e, em polígono, a cor de preenchimento (as mesmas swatches do desenho).

**Editar:** só o nome (até 80 caracteres).

**Excluir:** confirmação. A exclusão é imediata na memória da sessão (não é soft delete). A mesma caixa de confirmação vale para excluir pinos (missão, mutirão, marcador, totem, memória).

Dados mockados iniciais: **áreas reais** de Queimados e Nova Iguaçu, com contornos do OpenStreetMap (simplificados), seedadas via `addShapeToMap` em `app.js`:

- **Horto Municipal de Queimados** (polígono)
- **Área verde ao lado do Horto** (polígono, mata entre o Horto e o Morro da Baleia)
- **Morro da Baleia** (polígono)
- **Serra do Vulcão — Parque Municipal de Nova Iguaçu** (polígono)
- **Trilha da Serra do Vulcão** (linha)

Ao final da seed, o mapa agrupa essas camadas num `L.featureGroup` e chama `map.fitBounds(...)` (com `invalidateSize` + refit adiado) para enquadrar todas as áreas.

---

## 8. Marcadores e criação de elementos

Fluxo **Novo Marcador**:

1. Usuário escolhe o tipo (Missão, Mutirão ou Marcador).
2. Clica no mapa.
3. Abre o modal de criação já na aba correspondente.

Memória **não** entra nessa sub-barra. Memória só nasce a partir de uma missão ou de um marcador existente (“Adicionar memória”).

O modal também pode ser usado com abas (missão / mutirão / marcador). A aba Memória existe no DOM, mas fica oculta no seletor de abas.

O modal tem largura de ~560px e **altura limitada** (`min(90vh, 780px)`): cabeçalho e rodapé ficam fixos e o corpo do formulário rola por dentro, então formulários longos (ex.: missão com "O que coletar" + NPC) não estouram a tela. As opções liga/desliga (NPC no totem e na missão, "Tem prazo?" na missão) usam um **interruptor (switch)** em vez de checkbox.

### Ações no popup do pino

Todo pino (missão, mutirão, marcador, totem) tem no rodapé do card três botões só-ícone, com rótulo acessível:

- **Estilo** — abre as swatches de cor já usadas no desenho (`#1f7a4c`, `#d4832a`, `#b3241b`, `#00bcd4`, `#7c4dff` + seletor livre). A cor fica em `data.cor` e pinta o badge do pino.
- **Editar** — reabre o mesmo modal de criação, já preenchido.
- **Excluir** — pede confirmação (“Excluir esta missão? Isso não pode ser desfeito.”) e remove o pino da sessão.

Os CTAs de conteúdo (Participar, Gerar QR, Ver detalhes, Adicionar memória) continuam no corpo do card.

---

## 9. Missões

### Dados mockados na carga

**Na fase atual não há missões semeadas** — o array `missoesData` inicia vazio (o mapa começa só com polígonos/trilhas reais). O formato de cada missão mockada, quando existia, era: título, status, número de voluntários, **instrução ("o que deve ser feito")**, **catálogo "o que coletar"** (insumos estruturados: foto/vídeo/áudio/texto/GPS/formulário/memória), **recompensa**, **NPC opcional** (`npc`) e **prazo opcional** (`temPrazo` + `prazo`), além de um campo `qr` (nulo até ser gerado). Esse continua sendo o formato das missões criadas na sessão. A autoria de missão que antes ficava no totem (o que pedir / o que coletar / recompensa) foi movida para cá.

Status usados na POC visual: **Em andamento**, **Planejado**, **Ativa** (não seguem ainda o ciclo Aberta → Em andamento → Concluída → Cancelada da regra de negócio).

### Criação

Campos:

- Título (obrigatório)
- Descrição
- **O que deve ser feito** (instrução)
- **O que coletar** — construtor de insumos estruturados (tipo foto/vídeo/áudio/texto/GPS/formulário/memória, obrigatoriedade, visibilidade, grupo + mínimo, raio para GPS). Reaproveita `createItemInsumo` (`figital/model.js`), o mesmo do totem antigo.
- **Recompensa da missão**
- Categoria: Meio Ambiente & Reflorestamento; Proteção de Nascentes e Rios; Prevenção de Alagamentos e Riscos; Agricultura Urbana e Hortas
- **Prazo** — interruptor "Tem prazo?"; ligado mostra o campo de data, desligado deixa a missão contínua (sem prazo)
- **NPC opcional** — interruptor "Tem personagem que fala?"; ligado abre nome do personagem + falas

O ponto no mapa é o clique (ou o ponto interno da forma, se vier do “adicionar à área”).

### Popup da missão

- Tipo e status
- Prazo (ou "Sem prazo — missão contínua"), recompensa e voluntários (valores ilustrativos)
- **Instrução ("o que deve ser feito")** e **checklist "O que coletar"** (itens só leitura, com marca de opcional)
- **Personagem + falas** quando a missão tem NPC
- Avatares estáticos
- **Ver detalhes da missão** — só dispara toast
- **Criar mutirão para esta missão** — abre o modal de vincular mutirão existente
- **Gerar arte de QR** — gera PNG via `qrcode` (npm) com a URL `https://{dominio}/m/{mapaId}/missao/{missaoId}?s={assinatura}`, mesmo padrão e assinatura mock local (`gerarAssinaturaMock`) do QR de totem (§16). Só geração de arte (link + PNG baixável); ainda não há tela de leitura/execução do QR — o consumo continua stub de servidor.
- **Adicionar memória** — abre o fluxo de memória já ligada a essa missão
- **Estilo / Editar / Excluir** — barra de ícones no rodapé do card (ver §8)

Não há persistência, dono, permissão, alteração real de status nem lista de missões fora do mapa.

---

## 10. Mutirões

### Dados mockados

**Na fase atual não há mutirões semeados** — o array inicia vazio (o mapa começa só com polígonos/trilhas). A estrutura de cada mutirão mockado, quando existia, era: missão-pai, data/hora e vagas (ex.: `14/30 vagas`). Continua sendo o formato usado pelos mutirões criados na sessão.

### Criação na POC

Não se cria um mutirão novo. O fluxo **vincula um mutirão já listado** a um ponto do mapa, escolhendo em um select:

- Mutirão da Horta Comunitária
- Mutirão Limpeza do Rio Sarapuí
- Mutirão Plantio de Mudas
- Mutirão Pintura do Centro Comunitário

### Popup

- Missão-pai
- Data e vagas
- **Participar do mutirão** — só dispara toast (“Inscrição confirmada”)
- **Estilo / Editar / Excluir** — mesma barra de ícones dos outros pinos (§8)

Não há capacidade real, calendário, confirmação de presença, proposta pendente nem aprovação.

---

## 11. Memórias

### Dados mockados

**Na fase atual não há memórias semeadas** — os arrays iniciam vazios. O formato de cada memória mockada, quando existia, era: foto, autor, data, descrição, galeria extra e comentários de exemplo. Continua sendo o formato das memórias criadas na sessão.

### Criação

Só a partir de missão ou marcador. Campos:

- Foto (clique ou arrastar; JPG, PNG, WebP) — se não houver foto, usa imagem padrão
- Título/legenda
- Data do registro
- Vínculo (missão ou marcador; travado quando o fluxo parte do popup)

### Modal de visualização

- Galeria com foto principal e miniaturas
- Autor e data
- Descrição
- Lista de comentários
- Campo para enviar comentário (gravado só na sessão; autor fixo “Amanda”)
- **Estilo, Editar e Excluir** no cabeçalho: o lápis reabre o formulário de memória; a lixeira usa a mesma confirmação dos outros itens; o estilo grava `cor` na memória (no pino fotográfico, aparece como anel colorido)

Tipos **vídeo**, **texto puro** e **documento** não existem. Não há vínculo com mutirão.

---

## 12. Marcadores (alerta e ponto de interesse)

### Dados mockados

**Na fase atual não há marcadores semeados** — o array inicia vazio. Antes havia dois pontos de exemplo (“Ponto de Descarte Irregular” e “Pluviômetro Comunitário 01”); o formato segue disponível para marcadores criados na sessão.

### Criação

- Tipo: **Alerta Comunitário** ou **Ponto de Interesse**
- Título
- Categoria/severidade (alagamento, lixo, saneamento, equipamento social, nascente)
- Observação

Pode ficar vinculado a uma linha/área se nascer pelo “adicionar à forma”.

Popup: tipo, descrição, categoria, botão **Adicionar memória** e a barra **Estilo / Editar / Excluir** (§8). O pino pode ter cor própria (`data.cor`).

---

## 13. Filtros, busca e notificações (estado atual)

| Recurso na interface | Comportamento real |
|----------------------|--------------------|
| Painel Filtro → status da missão | Só UI; não esconde/mostra marcadores. Nota de pré-visualização avisa que não altera o mapa |
| Painel Filtro → categoria | Só troca o rótulo do dropdown. Coberto pela mesma nota de pré-visualização |
| Busca da barra superior | Campo `readonly` com selo "Em breve"; não aceita digitação |
| Sino de notificações | Botão esmaecido (`aria-disabled`) com `title` "em breve" |
| Painel Legenda | Existe no HTML, sem gatilho na toolbar |

---

## 14. Gamificação visível

Presente só como composição visual:

- Nível e barra de XP na sidebar
- Linguagem de missões/mutirões no mapa
- Paleta Território (verde sobre fundo claro, Inter)

Não há estrelas em mapas, insígnias conquistáveis, recompensas nem HUD de alertas.

---

## 15. Stack experimental (React + API)

Arquivos em `poc/client/src` (`App.jsx`, `MapView.jsx`, `MissionPanel.jsx`, `MissionForm.jsx`, `services/api.js`) e `poc/server/index.js` formam um **segundo experimento**, não a tela que o `index.html` atual entrega.

Essa stack, se ligada, oferece:

- Mapa MapLibre (estilo Carto Dark Matter), centro no Brasil
- CRUD de missões em memória no Express
- Status: `aberta`, `em_andamento`, `concluida`, `cancelada`
- Prioridade: `baixa`, `media`, `alta`, `critica`
- Soft delete (`excluidoEm`)
- Painel com contadores (total, abertas, ativas, concluídas)

**A UI principal Leaflet não consome essa API.** Tratar como código legado/experimental até ser integrado ou removido.

Endpoints do servidor:

| Método | Rota | Efeito |
|--------|------|--------|
| GET | `/api/missoes` | Lista missões ativas |
| GET | `/api/missoes/:id` | Detalhe |
| POST | `/api/missoes` | Cria (título e coordenadas obrigatórios) |
| PATCH | `/api/missoes/:id/status` | Atualiza status |
| DELETE | `/api/missoes/:id` | Soft delete |

---

## 16. Figital — autoria no mapa (Fase 1)

Entregue conforme `docs/PLANO_IMPLEMENTACAO_FIGITAL.md` / `docs/fases de implementacao/FASE_1_MAPA_FIGITAL.md`. Cobre a autoria no mapa (`poc/client`); o aplicativo do participante ainda não existe (Fases 2–5). Regras de negócio completas em `docs/CAMPANHA_FIGITAL.md`.

### Modelo de dados

`poc/client/src/figital/model.js` define **Percurso**, **Totem** e **Item de insumo**, além de validação (`validarPercurso`) e geração de URL/assinatura de QR. É o mesmo formato que `poc/server/figital.js` expõe pela API. O totem **não carrega mais missão** — passou a ter `descricao` e `roteiroNpc` opcional (pode ser `null`). A fábrica `createMissaoTotem` continua exportada para contrato, mas o app não a usa; o catálogo "o que coletar" agora vive no marcador de missão (§9).

### Totem na ficha da forma

O **"+"** de uma trilha/área selecionada (`shape-actions`) oferece **Missão**, **Totem** e **Marcador**. Totem só entra dentro da geometria selecionada (nunca pelo "Novo Marcador" solto, RN-FIG-041). O editor de totem é um **formulário único** (sem assistente de etapas): nome, **tipo do ponto** (Início, Ponto específico ou Fim), **descrição/curiosidades** e um **NPC opcional** (interruptor "Tem personagem que fala?"; ligado abre nome + falas). O totem serve só para marcar e descrever o ponto — quem conduz a ação (o que pedir/coletar/recompensa) é o marcador de missão. O mesmo fluxo reabre em modo edição pelo **lápis** no popup do totem (a barra Estilo / Editar / Excluir substituiu o botão “Editar totem”) ou pela ficha do percurso.

Validação client-side antes de liberar o percurso: só um totem `inicio` por percurso (RN-FIG-009, bloqueia no submit com toast); totem sempre nasce dentro da geometria (RN-FIG-011, herdado do fluxo "adicionar dentro"); pelo menos um totem além do início (RN-FIG-010, mostrado como pendência na ficha do percurso e no painel, não bloqueia o salvamento).

### Catálogo de insumos ("O que coletar")

Lista dinâmica do que coletar (foto, vídeo, áudio, texto, GPS/check-in, formulário, memória) com obrigatoriedade, rótulo, visibilidade (interno/mapa público) e agrupamento opcional (`grupoId` + `minimoGrupo`, para regras como "áudio ou texto"). Insumo `gps` ganha campos extras de raio em metros e obrigatoriedade do GPS. O construtor é reaproveitado no **formulário de missão** (§9); o construtor de falas do NPC também é compartilhado entre totem e missão.

### Ficha do percurso

Quando a forma selecionada já tem totens, o botão "Ficha do percurso" (ícone de mapa, ao lado de estilo/editar/excluir) abre um painel com: modo de progresso, recompensa final, texto de consentimento, período opcional, ativo/inativo, permitir replay, status de prontidão (mesma validação acima) e a lista de totens do percurso com atalhos para editar ou gerar QR.

### QR

Botão "Gerar arte de QR" no popup do totem e na ficha do percurso. Gera PNG via `qrcode` (npm) com a URL `https://{dominio}/m/{mapaId}/t/{totemId}?s={assinatura}` (§14.1); a assinatura é um hash mock local (`gerarAssinaturaMock`) até a Fase 1.7 virar a API real do produto — não é HMAC de produção. Sem exportação em PDF ainda (só PNG).

### Visibilidade e painel do mapa

Novo botão de toolbar "Painel Figital" abre um painel com: alternância de visibilidade do mapa (privado/público, `mapaVisibilidade` em memória, RN-FIG-006), lista de percursos com status pronto/pendente, indicadores (percursos, totens, jornadas — zerados até existir app de participante), lista de insumos e fila de moderação de memórias públicas como telas vazias funcionais (RN-FIG-035, preenchidas só na Fase 5), e exportação GeoJSON/CSV dos totens e geometrias atuais.

### Persistência mínima (`poc/server/figital.js`)

Endpoints reais em memória: `GET/POST /api/mapas/:mapaId/percursos`, `GET/PATCH /api/mapas/:mapaId/percursos/:id`, `GET/POST/PATCH/DELETE /api/mapas/:mapaId/totens`, `GET /api/mapas/:mapaId/percursos/:id/manifest`. Stubs que devolvem dados vazios/mock (contrato, não implementação): `POST /api/jornadas`, `GET /api/jornadas/:id`, `POST /api/jornadas/:id/checkins`, `POST /api/jornadas/:id/insumos`, `POST /api/jornadas/:id/missoes/:id/concluir`, `GET /api/mapas/:mapaId/insumos`, `GET /api/mapas/:mapaId/export`. **A UI principal ainda não chama essa API** — o mapa continua com estado em memória do navegador, como o resto da POC (§16); a API existe para a Fase 2 ter um manifesto real para baixar.

### O que a Fase 1 não cobre

- App do participante (scan, NPC, jornada, insumos de campo) — Fases 2 a 5.
- QR com HMAC real e verificação online — depende de a API da Fase 1.7 virar o backend de produto.
- Exportação de QR em PDF.
- Persistência de verdade (banco) tanto do mapa quanto da API Figital — hoje os dois são em memória e se perdem ao recarregar/reiniciar.
- Autenticação e papéis reais controlando quem vê o "+" de totem (RN-FIG-003) — na POC, qualquer pessoa que abre o mapa consegue.

---

## 17. Limitações conscientes

O protótipo atual **não implementa**:

- Autenticação, papéis (Owner, Editor, Sugestor, Visualizador) nem mapas públicos/privados reais (o toggle do painel Figital é só estado local, não controla acesso)
- Criar, listar, arquivar, excluir, transferir ou fazer fork de mapas
- Persistência (banco, PostGIS, versionamento) — inclusive a API Figital da Fase 1.7, que é em memória
- Estrelas, insígnias reais, seguir mapa
- Importação/exportação geral (GeoJSON, KML, Shapefile) nem APIs externas — a exportação Figital (§16) é específica de totens/percursos
- HUD de alertas, contadores do mapa, exploração de mapas públicos
- Filtros e busca funcionais
- Aplicativo do participante Figital (Fases 2–5, ver §16)

Esses itens, quando previstos no plano original, estão em `docs/FUNCIONALIDADES_PENDENTES.md`.

---

*Documento atualizado em 18/09/2026 — descreve o estado do código neste repositório, não o produto planejado.*
