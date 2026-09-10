# Documentação atual — Mapa do Território

**Plataforma:** Território (territorio.ai)
**Tipo:** Protótipo visual de alta fidelidade (POC)
**Versão deste documento:** 1.0
**Data:** 09/09/2026
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
16. [Limitações conscientes](#16-limitações-conscientes)

---

## 1. O que é o projeto hoje

O repositório contém o **protótipo do Mapa** da plataforma Território: uma interface colaborativa para visualizar e criar missões, mutirões, memórias e elementos geográficos sobre um mapa.

O que o usuário vê ao abrir o projeto **não é um produto com persistência, contas ou múltiplos mapas**. É uma **POC visual** com dados mockados no cliente, focada em validar layout, ferramentas e fluxos de criação no mapa.

A documentação de regras de negócio original (`Documentacao_Regras_de_Negocio_Mapa.md`) descreve o produto planejado. O que está implementado de fato está neste arquivo. O que ainda não chegou está em `docs/FUNCIONALIDADES_PENDENTES.md`.

### Conceito em uso na POC

- Uma **única vista de mapa**, centrada na região do Rio Sarapuí / Duque de Caxias (RJ).
- Elementos de **missão**, **mutirão**, **memória**, **marcador**, **linha** e **polígono**.
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
    │   ├── src/style.css
    │   └── assets/
    └── server/                         # API experimental de missões (não ligada à UI principal)
```

| Parte | Tecnologia | Papel hoje |
|-------|------------|------------|
| UI principal | HTML + CSS + JavaScript | Protótipo visual do mapa |
| Mapa | Leaflet 1.9.4 | Renderização, zoom, marcadores, linhas e polígonos |
| Tiles | Esri World Imagery + OpenStreetMap | Satélite e mapa vetorial |
| Dados | Arrays mockados em `app.js` | Missões, mutirões, memórias, marcadores e áreas iniciais |
| Backend da tela principal | Nenhum | Sem login, sem persistência, sem API |

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
| Camadas | Painel para ligar/desligar camadas e trocar mapa-base |
| Filtros | Painel visual de status e categoria (**não aplica filtro no mapa**) |

### Feedback

Toasts locais (ex.: “Missão criada no ponto escolhido”). Não há barra HUD de alertas da plataforma.

---

## 5. Mapa e navegação

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
- Ações no canto da caixa: **adicionar elemento dentro**, **editar**, **excluir**.

**Adicionar à forma:** posiciona missão ou marcador **somente dentro** da área/trilha destacada.

**Editar:** nome (até 80 caracteres), cor da linha e, em polígono, cor de preenchimento.

**Excluir:** confirmação. A exclusão é imediata na memória da sessão (não é soft delete).

Dados mockados iniciais: “Área de Preservação Rio Sarapuí” e “Zoneamento de Risco de Enchente”.

---

## 8. Marcadores e criação de elementos

Fluxo **Novo Marcador**:

1. Usuário escolhe o tipo (Missão, Mutirão ou Marcador).
2. Clica no mapa.
3. Abre o modal de criação já na aba correspondente.

Memória **não** entra nessa sub-barra. Memória só nasce a partir de uma missão ou de um marcador existente (“Adicionar memória”).

O modal também pode ser usado com abas (missão / mutirão / marcador). A aba Memória existe no DOM, mas fica oculta no seletor de abas.

---

## 9. Missões

### Dados mockados na carga

Quatro missões de exemplo (nascente Sarapuí, horta comunitária, reflorestamento, monitoramento da água), com título, status, prazo e número de voluntários.

Status usados na POC visual: **Em andamento**, **Planejado**, **Ativa** (não seguem ainda o ciclo Aberta → Em andamento → Concluída → Cancelada da regra de negócio).

### Criação

Campos:

- Título (obrigatório)
- Descrição
- Categoria: Meio Ambiente & Reflorestamento; Proteção de Nascentes e Rios; Prevenção de Alagamentos e Riscos; Agricultura Urbana e Hortas
- Prazo estimado (data)

O ponto no mapa é o clique (ou o ponto interno da forma, se vier do “adicionar à área”).

### Popup da missão

- Tipo e status
- Prazo e voluntários (valores ilustrativos)
- Avatares estáticos
- **Ver detalhes da missão** — só dispara toast
- **Criar mutirão para esta missão** — abre o modal de vincular mutirão existente
- **Adicionar memória** — abre o fluxo de memória já ligada a essa missão

Não há persistência, dono, permissão, alteração real de status nem lista de missões fora do mapa.

---

## 10. Mutirões

### Dados mockados

Três mutirões de exemplo, cada um com missão-pai, data/hora e vagas (ex.: `14/30 vagas`).

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

Não há capacidade real, calendário, confirmação de presença, proposta pendente nem aprovação.

---

## 11. Memórias

### Dados mockados

Três memórias com foto, autor, data, descrição, galeria extra e comentários de exemplo.

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

Tipos **vídeo**, **texto puro** e **documento** não existem. Não há vínculo com mutirão. Não há edição da memória depois de criada.

---

## 12. Marcadores (alerta e ponto de interesse)

### Dados mockados

Dois pontos: “Ponto de Descarte Irregular” e “Pluviômetro Comunitário 01”.

### Criação

- Tipo: **Alerta Comunitário** ou **Ponto de Interesse**
- Título
- Categoria/severidade (alagamento, lixo, saneamento, equipamento social, nascente)
- Observação

Pode ficar vinculado a uma linha/área se nascer pelo “adicionar à forma”.

Popup: tipo, descrição, categoria e botão **Adicionar memória**.

---

## 13. Filtros, busca e notificações (estado atual)

| Recurso na interface | Comportamento real |
|----------------------|--------------------|
| Painel Filtros → status da missão | Só UI; não esconde/mostra marcadores |
| Painel Filtros → categoria | Só troca o rótulo do dropdown |
| Busca da barra superior | Campo sem ação |
| Sino de notificações | Botão sem ação |
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

## 16. Limitações conscientes

O protótipo atual **não implementa**:

- Autenticação, papéis (Owner, Editor, Sugestor, Visualizador) nem mapas públicos/privados
- Criar, listar, arquivar, excluir, transferir ou fazer fork de mapas
- Persistência (banco, PostGIS, versionamento)
- Estrelas, insígnias reais, seguir mapa
- Importação/exportação (GeoJSON, KML, Shapefile) nem APIs externas
- HUD de alertas, contadores do mapa, exploração de mapas públicos
- Filtros e busca funcionais

Esses itens, quando previstos no plano original, estão em `docs/FUNCIONALIDADES_PENDENTES.md`.

---

*Documento gerado em 09/09/2026 — descreve o estado do código neste repositório, não o produto planejado.*
