# Documentação de Regras de Negócio — Feature Mapa

**Plataforma:** Território (territorio.ai)
**Tipo:** Feature nova em sistema existente
**Versão do documento:** 1.0
**Data:** 07/08/2026
**Escopo:** Regras de negócio — MVP

---

## Sumário

1. [Visão Geral](#1-visão-geral)
2. [Módulo 1 — Mapa como Repositório](#2-módulo-1--mapa-como-repositório)
3. [Módulo 2 — Sistema de Permissões](#3-módulo-2--sistema-de-permissões)
4. [Módulo 3 — Estrelas e Insígnias](#4-módulo-3--estrelas-e-insígnias)
5. [Módulo 4 — Elementos Geográficos](#5-módulo-4--elementos-geográficos)
6. [Módulo 5 — Missões](#6-módulo-5--missões)
7. [Módulo 6 — Mutirões](#7-módulo-6--mutirões)
8. [Módulo 7 — Memórias](#8-módulo-7--memórias)
9. [Módulo 8 — Interface e Navegação](#9-módulo-8--interface-e-navegação)
10. [Módulo 9 — Interoperabilidade (Futuro)](#10-módulo-9--interoperabilidade-futuro)
11. [Módulo 10 — API Futura](#11-módulo-10--api-futura)
12. [Glossário](#12-glossário)
13. [Matriz de Permissões Consolidada](#13-matriz-de-permissões-consolidada)

---

## 1. Visão Geral

### 1.1. Contexto

O **Território** é uma plataforma digital que mapeia e organiza soluções de resiliência climática e adaptação conduzidas por comunidades, pessoas ou organizações. A feature **Mapa** será uma interface de mapa interativo, colaborativo e interoperável, que reúne missões, mutirões, memórias e dados geoespaciais em uma visualização geográfica navegável.

### 1.2. Conceito Central

O Mapa funciona como um **repositório colaborativo**, inspirado no modelo do GitHub:

- Cada mapa é um **projeto** que pertence a uma pessoa ou organização
- Mapas podem receber **contribuições** de outros usuários mediante permissão
- Usuários podem **criar cópias independentes** (fork) de mapas públicos
- A comunidade **reconhece** mapas relevantes por meio de estrelas

### 1.3. Ponto de Partida Conceitual

> *"O Território começa onde o GeoInfo termina."*

Enquanto plataformas como o GeoInfo (Embrapa) são infraestruturas institucionais de dados espaciais, o Território volta-se à **ação comunitária**: é um espaço vivo, gamificado e colaborativo, pensado para pessoas e organizações que agem no território.

### 1.4. Posicionamento na Plataforma

- O Mapa é uma **seção/funcionalidade** acessível a partir do menu ou dashboard existente do Território
- **Não** é a tela inicial (home) da plataforma no MVP

---

## 2. Módulo 1 — Mapa como Repositório

### 2.1. Criação de Mapa

| Regra | Descrição |
|-------|-----------|
| **RN-MAP-001** | Qualquer usuário autenticado pode criar um novo mapa |
| **RN-MAP-002** | Não existe limite de quantidade de mapas por usuário ou organização |
| **RN-MAP-003** | Ao criar um mapa, os campos **nome** e **visibilidade** (público ou privado) são obrigatórios |
| **RN-MAP-004** | Os campos **descrição** e **tags** são opcionais na criação |
| **RN-MAP-005** | O nome do mapa possui limite máximo de **100 caracteres** |
| **RN-MAP-006** | A descrição do mapa não possui limite de caracteres |
| **RN-MAP-007** | Cada mapa pode receber até **20 tags** definidas livremente pelo proprietário |
| **RN-MAP-008** | O mapa é criado **vazio**, sem camadas ou elementos pré-definidos |
| **RN-MAP-009** | O criador do mapa torna-se automaticamente o **proprietário (Owner)** |

### 2.2. Propriedade

| Regra | Descrição |
|-------|-----------|
| **RN-MAP-010** | Um mapa pertence a uma **pessoa** ou a uma **organização** |
| **RN-MAP-011** | Quando o mapa pertence a uma **pessoa**, apenas ela é proprietária |
| **RN-MAP-012** | Quando o mapa pertence a uma **organização**, todos os **administradores da organização** têm poder de proprietário sobre o mapa |
| **RN-MAP-013** | A visibilidade do mapa (público ou privado) pode ser alterada a qualquer momento pelo proprietário |

### 2.3. Transferência de Propriedade

| Regra | Descrição |
|-------|-----------|
| **RN-MAP-014** | O proprietário pode transferir a propriedade do mapa para outro usuário ou organização |
| **RN-MAP-015** | A transferência exige **aceite do novo proprietário** — não é automática |
| **RN-MAP-016** | Após a transferência, o **antigo proprietário** se torna automaticamente um **colaborador com permissão de edição** |
| **RN-MAP-017** | Enquanto o novo proprietário não aceitar a transferência, o mapa permanece com o proprietário original |

### 2.4. Fork (Cópia Independente)

| Regra | Descrição |
|-------|-----------|
| **RN-MAP-018** | Qualquer usuário autenticado pode fazer fork de um **mapa público** |
| **RN-MAP-019** | O fork copia apenas os **dados geográficos** (camadas e marcações) do mapa original |
| **RN-MAP-020** | O fork **não copia**: colaboradores, estrelas, histórico de versões, missões ou mutirões |
| **RN-MAP-021** | O mapa forkado exibe uma **referência visível** ao mapa original, incluindo nome do mapa e do proprietário original (ex: *"Forkado de [Mapa X] por [Usuário Y]"*) |
| **RN-MAP-022** | O fork é um mapa **independente** — alterações no fork não afetam o original e vice-versa |
| **RN-MAP-023** | O usuário que fez o fork torna-se o proprietário do novo mapa |

### 2.5. Arquivamento

| Regra | Descrição |
|-------|-----------|
| **RN-MAP-024** | Apenas o proprietário pode arquivar um mapa |
| **RN-MAP-025** | Um mapa arquivado fica em modo **somente leitura** — ninguém pode editar, criar elementos ou alterar configurações |
| **RN-MAP-026** | Um mapa arquivado fica **oculto** de buscas e da exploração pública |
| **RN-MAP-027** | Um mapa arquivado permanece **acessível via link direto** |
| **RN-MAP-028** | O proprietário pode **desarquivar** um mapa a qualquer momento, restaurando todas as permissões e a visibilidade original |

### 2.6. Exclusão

| Regra | Descrição |
|-------|-----------|
| **RN-MAP-029** | Apenas o proprietário pode excluir um mapa |
| **RN-MAP-030** | A exclusão é **lógica** (soft delete) — o mapa não é removido imediatamente do sistema |
| **RN-MAP-031** | Após a exclusão lógica, o mapa entra em um **período de retenção de 30 dias** |
| **RN-MAP-032** | Durante o período de retenção, o proprietário pode **restaurar** o mapa |
| **RN-MAP-033** | Após os 30 dias de retenção, o mapa é **excluído fisicamente** de forma irreversível |
| **RN-MAP-034** | A exclusão de um mapa exclui todos os seus elementos vinculados: camadas, marcações, missões, mutirões e memórias |
| **RN-MAP-035** | Os colaboradores são notificados quando um mapa é excluído |

### 2.7. Versionamento

| Regra | Descrição |
|-------|-----------|
| **RN-MAP-036** | O mapa possui **versionamento automático**: cada alteração gera uma nova versão no histórico |
| **RN-MAP-037** | O histórico de versões registra: **quem** fez a alteração, **quando** e **o que** foi alterado |
| **RN-MAP-038** | O proprietário e editores podem **reverter** o mapa para qualquer versão anterior |
| **RN-MAP-039** | A reversão cria uma **nova versão** no histórico (não apaga o histórico anterior) |
| **RN-MAP-040** | O versionamento se aplica ao **mapa como um todo**, não a elementos individuais |

> [!NOTE]
> O versionamento de elementos geográficos individuais (marcações, linhas, polígonos) **não** faz parte do MVP. Apenas o mapa possui histórico de versões.

---

## 3. Módulo 2 — Sistema de Permissões

### 3.1. Papéis

O sistema possui **quatro papéis** em relação a um mapa:

| Papel | Descrição |
|-------|-----------|
| **Proprietário (Owner)** | Pessoa ou administradores da organização que detêm o mapa. Controle total. |
| **Editor** | Colaborador com permissão de edição. Pode criar, editar e excluir elementos. |
| **Sugestor** | Colaborador com permissão de sugestão. Pode propor elementos e alterações, sujeitos a aprovação. |
| **Visualizador** | Colaborador com permissão apenas de visualização. Pode ver o mapa e seus elementos. |

### 3.2. Regras Gerais de Permissão

| Regra | Descrição |
|-------|-----------|
| **RN-PERM-001** | Apenas o **proprietário** pode alterar as permissões de colaboradores |
| **RN-PERM-002** | Apenas o **proprietário** pode remover colaboradores |
| **RN-PERM-003** | Apenas o **proprietário** pode alterar a visibilidade do mapa (público/privado) |
| **RN-PERM-004** | Apenas o **proprietário** pode arquivar, excluir ou transferir o mapa |
| **RN-PERM-005** | Mapas **públicos** podem ser visualizados por qualquer pessoa, **mesmo sem login** |
| **RN-PERM-006** | Funcionalidades interativas (dar estrela, comentar, seguir) exigem **login** |
| **RN-PERM-007** | Mapas **privados** são visíveis apenas para o proprietário e seus colaboradores |
| **RN-PERM-008** | Usuários **anônimos** (não logados) podem visualizar mapas públicos em modo somente leitura |

### 3.3. Convite e Colaboração

| Regra | Descrição |
|-------|-----------|
| **RN-PERM-009** | A colaboração pode ser iniciada de **duas formas**: convite via link compartilhável ou solicitação de acesso pelo interessado |
| **RN-PERM-010** | O proprietário gera um **link de convite** com prazo de validade configurável: **1 dia, 7 dias, 30 dias ou permanente** |
| **RN-PERM-011** | Toda solicitação ou uso de link de convite **requer aprovação** do proprietário |
| **RN-PERM-012** | O proprietário define o **nível de permissão** ao aprovar o novo colaborador (Visualizar, Sugerir ou Editar) |
| **RN-PERM-013** | Qualquer pessoa pode solicitar acesso a um mapa público sem convite (sujeito a aprovação) |

### 3.4. Permissão "Sugerir" — Detalhamento

| Regra | Descrição |
|-------|-----------|
| **RN-PERM-014** | O Sugestor pode **criar novos elementos geográficos** (marcadores, linhas, polígonos), que ficam com status **"pendente"** até aprovação do Owner ou Editor |
| **RN-PERM-015** | O Sugestor pode **comentar** e **propor alterações** em elementos existentes |
| **RN-PERM-016** | O Sugestor pode **propor a criação** de mutirões (gerando uma proposta pendente) |
| **RN-PERM-017** | Elementos criados por Sugestores **não são visíveis** para outros usuários até serem aprovados |
| **RN-PERM-018** | Sugestões não aprovadas **expiram automaticamente após 30 dias** |

### 3.5. Fluxo de Aprovação de Sugestões

```
Sugestor cria elemento/proposta
         │
         ▼
  Status: PENDENTE
         │
         ├──── Owner/Editor APROVA ──── Status: APROVADO (elemento publicado)
         │
         ├──── Owner/Editor REJEITA ──── Status: REJEITADO (notifica sugestor)
         │
         └──── 30 dias sem resposta ──── Status: EXPIRADO (notifica sugestor)
```

---

## 4. Módulo 3 — Estrelas e Insígnias

### 4.1. Sistema de Estrelas

| Regra | Descrição |
|-------|-----------|
| **RN-STAR-001** | Qualquer usuário **autenticado** pode dar **uma estrela** a um mapa |
| **RN-STAR-002** | Cada usuário pode dar **no máximo uma estrela** por mapa |
| **RN-STAR-003** | O usuário pode **remover** a estrela a qualquer momento |
| **RN-STAR-004** | O proprietário **pode** dar estrela ao seu próprio mapa |
| **RN-STAR-005** | Todas as estrelas possuem **peso igual**, independentemente do perfil do usuário |
| **RN-STAR-006** | A contagem de estrelas é exibida publicamente no mapa |
| **RN-STAR-007** | O proprietário recebe uma **notificação** quando seu mapa recebe uma nova estrela |

### 4.2. Sistema de Insígnias

| Regra | Descrição |
|-------|-----------|
| **RN-BADGE-001** | As insígnias são atribuídas ao **perfil do usuário ou da organização**, não ao mapa em si |
| **RN-BADGE-002** | O mapa exibe apenas a **contagem de estrelas**, sem selo/insígnia próprio |
| **RN-BADGE-003** | As insígnias relacionadas a mapas são conquistadas por **ações realizadas na plataforma** |

#### Critérios de Insígnias (MVP)

| Categoria | Critério de Exemplo | Descrição |
|-----------|---------------------|-----------|
| Estrelas recebidas | Acumulado de estrelas em todos os seus mapas | Ex: 10, 50, 100, 500 estrelas totais |
| Colaboração | Colaborar em mapas de outros usuários | Ex: colaborou em 5, 10, 25 mapas |
| Sugestões aceitas | Ter sugestões aprovadas em mapas de terceiros | Ex: 10, 50 sugestões aprovadas |
| Criação de mapas | Quantidade de mapas criados e mantidos | Ex: criou 3, 10, 25 mapas |

> [!IMPORTANT]
> Os **nomes das insígnias**, as **faixas numéricas** exatas e o **visual** de cada insígnia devem ser definidos em conjunto com a equipe de design e produto. Esta documentação define apenas os **critérios/categorias** elegíveis.

---

## 5. Módulo 4 — Elementos Geográficos

### 5.1. Tipos de Elementos

O mapa suporta os seguintes tipos de elementos geográficos:

| Tipo | Descrição |
|------|-----------|
| **Marcador (Ponto)** | Ponto de interesse em uma coordenada específica |
| **Linha / Rota** | Sequência de pontos conectados representando caminhos ou limites lineares |
| **Polígono (Área)** | Forma fechada representando uma região ou área geográfica |

### 5.2. Categorias de Elementos

| Regra | Descrição |
|-------|-----------|
| **RN-GEO-001** | Todo elemento geográfico deve ser classificado em uma **categoria** |
| **RN-GEO-002** | As categorias disponíveis no MVP são: **Missão, Memória, Alerta, Mutirão, Outro** |
| **RN-GEO-003** | As categorias são **fixas** no MVP — o usuário não pode criar categorias personalizadas |

> [!NOTE]
> As categorias poderão ser expandidas em versões futuras.

### 5.3. Camadas (Layers)

| Regra | Descrição |
|-------|-----------|
| **RN-GEO-004** | O mapa **não possui camadas pré-definidas** — todas são criadas pelo usuário |
| **RN-GEO-005** | A camada funciona como um **agrupador** visual de elementos |
| **RN-GEO-006** | Um mesmo elemento pode pertencer a **múltiplas camadas** |
| **RN-GEO-007** | O usuário pode **ocultar ou exibir** camadas individualmente na visualização |
| **RN-GEO-008** | Apenas Owner e Editor podem **criar, renomear ou excluir** camadas |

### 5.4. Propriedade e Permissões de Elementos

| Regra | Descrição |
|-------|-----------|
| **RN-GEO-009** | Apenas **Owner** e **Editor** podem criar elementos geográficos diretamente |
| **RN-GEO-010** | **Sugestores** podem criar elementos, que ficam com status **pendente** (ver RN-PERM-014) |
| **RN-GEO-011** | Podem editar um elemento: o **Owner**, o **Editor** e o **autor da marcação** (desde que continue como colaborador do mapa) |
| **RN-GEO-012** | Um elemento pertence a **exatamente um mapa** |
| **RN-GEO-013** | A exclusão de elementos é **lógica** (soft delete) |

### 5.5. Anotações e Estilos

| Regra | Descrição |
|-------|-----------|
| **RN-GEO-014** | Elementos podem receber **anotações textuais** (descrição, observações) |
| **RN-GEO-015** | Elementos podem receber **estilos visuais** personalizados (cor, ícone, espessura de linha) |

> [!NOTE]
> Os tipos específicos de estilos e suas limitações devem ser definidos com o time de desenvolvimento e design.

---

## 6. Módulo 5 — Missões

### 6.1. Definição

Uma **missão** representa um **objetivo** a ser alcançado dentro de um território. É o "o que precisa ser feito". A execução prática de uma missão acontece por meio de **mutirões** (eventos organizados para cumprir o objetivo).

### 6.2. Regras de Criação

| Regra | Descrição |
|-------|-----------|
| **RN-MISS-001** | Apenas **Owner** e **Editor** podem criar missões |
| **RN-MISS-002** | Uma missão **sempre** possui uma localização geográfica (coordenada no mapa) |
| **RN-MISS-003** | Uma missão **sempre** pertence a um mapa — não pode existir sem mapa |
| **RN-MISS-004** | Uma missão pertence a **exatamente um mapa** no MVP |
| **RN-MISS-005** | A missão é representada como um **elemento geográfico** da categoria "Missão" no mapa |

> [!NOTE]
> **Visão futura:** missões poderão ser vinculadas a múltiplos mapas (cross-map) em versões posteriores.

### 6.3. Temporalidade

| Regra | Descrição |
|-------|-----------|
| **RN-MISS-006** | A missão possui **data de criação** (automática) |
| **RN-MISS-007** | O **prazo** (data limite) é **opcional** — o criador escolhe se deseja definir |
| **RN-MISS-008** | Missões sem prazo definido são consideradas **contínuas** até mudança manual de status |
| **RN-MISS-009** | Missões com prazo vencido **não mudam de status automaticamente** — a alteração é manual |

### 6.4. Ciclo de Vida (Status)

| Status | Descrição |
|--------|-----------|
| **Aberta** | Missão criada e disponível para ação. Status inicial. |
| **Em Andamento** | Missão com pelo menos uma ação em curso (ex: mutirão criado). |
| **Concluída** | Objetivo da missão foi alcançado. |
| **Cancelada** | Missão foi abandonada ou tornou-se irrelevante. |

| Regra | Descrição |
|-------|-----------|
| **RN-MISS-010** | Apenas **Owner** e **Editor** podem alterar o status de uma missão |
| **RN-MISS-011** | Uma missão inicia sempre com status **"Aberta"** |
| **RN-MISS-012** | As transições de status permitidas são: |

```
                    ┌────────────────────────┐
                    │                        │
                    ▼                        │
  ABERTA ───► EM ANDAMENTO ───► CONCLUÍDA   │
    │               │                        │
    │               │                        │
    └───────────────┴──────► CANCELADA ──────┘
                              (pode reabrir)
```

> [!NOTE]
> Uma missão **cancelada** pode ser reaberta (voltando ao status "Aberta") pelo Owner ou Editor.

### 6.5. Relação Missão ↔ Mutirão

| Regra | Descrição |
|-------|-----------|
| **RN-MISS-013** | Uma missão pode ter **zero ou mais** mutirões vinculados |
| **RN-MISS-014** | Um mutirão **sempre** pertence a uma missão (ver Módulo 6) |

---

## 7. Módulo 6 — Mutirões

### 7.1. Definição

Um **mutirão** é um **evento prático** organizado para executar o objetivo de uma missão. É o "como fazer" — uma ação coletiva com data, local e participantes.

### 7.2. Relação com Missão

| Regra | Descrição |
|-------|-----------|
| **RN-MUT-001** | Um mutirão **sempre** pertence a uma missão |
| **RN-MUT-002** | Uma missão pode ter **um ou mais** mutirões |
| **RN-MUT-003** | Um mutirão herda a **localização** da missão, mas pode ter localização própria (dentro da mesma região) |

### 7.3. Criação de Mutirões

| Regra | Descrição |
|-------|-----------|
| **RN-MUT-004** | **Owner** e **Editor** podem criar mutirões **diretamente** (publicação imediata) |
| **RN-MUT-005** | **Sugestor** pode **propor** a criação de um mutirão, gerando uma **proposta pendente** |
| **RN-MUT-006** | Propostas de mutirão devem ser **aprovadas** pelo Owner (ou Editor) antes de se tornarem um mutirão oficial |
| **RN-MUT-007** | Propostas de mutirão não aprovadas **expiram após 30 dias** |
| **RN-MUT-008** | **Visualizador** não pode criar nem propor mutirões |

### 7.4. Fluxo de Criação por Papel

```
┌─────────────────────────────────────────────────────┐
│                   OWNER / EDITOR                     │
│                                                      │
│   Cria mutirão ──► Publicação imediata               │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│                     SUGESTOR                         │
│                                                      │
│   Propõe mutirão ──► Proposta PENDENTE               │
│                           │                          │
│                    Owner/Editor                      │
│                     avalia                           │
│                    ┌──┴──┐                           │
│                APROVA  REJEITA                       │
│                  │       │                           │
│           Mutirão     Notifica                       │
│           criado     sugestor                        │
└─────────────────────────────────────────────────────┘
```

### 7.5. Participantes

| Regra | Descrição |
|-------|-----------|
| **RN-MUT-009** | O mutirão pode definir opcionalmente uma **capacidade máxima** de participantes |
| **RN-MUT-010** | Se nenhuma capacidade for definida, o número de participantes é **ilimitado** |
| **RN-MUT-011** | O calendário e a confirmação de presença utilizam funcionalidades **já existentes** no sistema Território |

> [!NOTE]
> Os detalhes de calendário e confirmação de presença já estão implementados no sistema atual e não fazem parte do escopo desta documentação.

---

## 8. Módulo 7 — Memórias

### 8.1. Definição

Uma **memória** é um registro documental de uma ação, situação ou observação no território. É o acervo vivo da plataforma — fotos, vídeos, textos e documentos que documentam a história do território.

### 8.2. Tipos de Registro

| Tipo | Descrição |
|------|-----------|
| **Foto** | Imagem capturada ou carregada |
| **Vídeo** | Registro audiovisual |
| **Texto** | Relato, depoimento ou anotação escrita |
| **Documento** | Arquivo (ex: PDF, relatório) |

### 8.3. Regras de Criação e Vínculo

| Regra | Descrição |
|-------|-----------|
| **RN-MEM-001** | Apenas **Owner** e **Editor** podem criar memórias |
| **RN-MEM-002** | Uma memória **sempre** deve estar vinculada a um mapa |
| **RN-MEM-003** | Uma memória **sempre** possui **geolocalização** (coordenada no mapa) |
| **RN-MEM-004** | Uma memória pode ser **opcionalmente** vinculada a uma **missão** específica |
| **RN-MEM-005** | Uma memória pode ser **opcionalmente** vinculada a um **mutirão** específico |
| **RN-MEM-006** | Uma memória é representada como um **elemento geográfico** da categoria "Memória" no mapa |

### 8.4. Interação com Memórias

| Regra | Descrição |
|-------|-----------|
| **RN-MEM-007** | Memórias podem receber **comentários** de usuários autenticados |
| **RN-MEM-008** | Memórias podem ser **editadas** após publicação pelo autor, Owner ou Editor |
| **RN-MEM-009** | A exclusão de memórias segue a mesma regra de exclusão lógica dos elementos geográficos (ver RN-GEO-013) |

---

## 9. Módulo 8 — Interface e Navegação

### 9.1. Tela Inicial da Seção Mapas

| Regra | Descrição |
|-------|-----------|
| **RN-NAV-001** | Ao acessar a seção de Mapas, o usuário vê **primeiro seus próprios mapas** |
| **RN-NAV-002** | O usuário tem a opção de **explorar mapas públicos** de outros usuários |
| **RN-NAV-003** | A busca de mapas públicos permite filtrar por: **nome do mapa**, **localização** e **tags** |

### 9.2. Seguir Mapas

| Regra | Descrição |
|-------|-----------|
| **RN-NAV-004** | Qualquer usuário autenticado pode **"seguir"** um mapa público |
| **RN-NAV-005** | Seguir um mapa permite receber **notificações** de atualizações sem ser colaborador |
| **RN-NAV-006** | O usuário pode **deixar de seguir** a qualquer momento |
| **RN-NAV-007** | Seguir um mapa **não** concede nenhuma permissão adicional — é equivalente a um "watch" |

### 9.3. Contadores / Indicadores

| Regra | Descrição |
|-------|-----------|
| **RN-NAV-008** | O mapa exibe **contadores numéricos** referentes ao **mapa atual** sendo visualizado |
| **RN-NAV-009** | Os indicadores exibidos no MVP são **fixos** e **não configuráveis** |
| **RN-NAV-010** | Os indicadores são **calculados automaticamente** a partir da base de dados interna |
| **RN-NAV-011** | Nenhum indicador vem de APIs externas no MVP |

#### Indicadores do MVP

| Indicador | Descrição |
|-----------|-----------|
| Colaboradores | Quantidade de colaboradores ativos no mapa |
| Missões | Quantidade total de missões no mapa |
| Mutirões | Quantidade total de mutirões no mapa |
| Memórias | Quantidade total de memórias registradas |
| Marcações | Quantidade total de elementos geográficos |
| Estrelas | Quantidade de estrelas recebidas pelo mapa |

### 9.4. Barra HUD de Alertas

| Regra | Descrição |
|-------|-----------|
| **RN-NAV-012** | A barra HUD exibe notificações contextuais para o usuário |
| **RN-NAV-013** | A HUD é visível apenas para **usuários autenticados** |

#### Tipos de Notificação no MVP

| Tipo | Descrição | Destinatário |
|------|-----------|-------------|
| Nova missão | Missão criada em mapa que o usuário segue ou colabora | Seguidores e colaboradores |
| Status de missão | Atualização de status de missão (ex: concluída) | Seguidores e colaboradores |
| Novo mutirão | Mutirão criado em mapa que o usuário segue ou colabora | Seguidores e colaboradores |
| Convite recebido | Convite de colaboração em um mapa | Usuário convidado |
| Sugestão pendente | Nova sugestão aguardando aprovação | Owner e Editores |
| Proposta de mutirão | Proposta de mutirão aguardando aprovação | Owner e Editores |
| Nova estrela | Mapa do usuário recebeu uma nova estrela | Proprietário do mapa |

> [!IMPORTANT]
> **Alertas de emergência climática** (dados de APIs externas) **não** fazem parte do MVP. Serão implementados na etapa de Interoperabilidade.

### 9.5. Navegação no Mapa

| Regra | Descrição |
|-------|-----------|
| **RN-NAV-014** | O mapa possui botões de **Zoom In / Zoom Out** para ampliar ou reduzir a visualização |
| **RN-NAV-015** | A renderização é **otimizada por viewport** — o sistema carrega e renderiza apenas os dados da região visível na tela |
| **RN-NAV-016** | Existe botão de acesso rápido ao **Perfil** do usuário a partir do mapa |
| **RN-NAV-017** | Existe botão de acesso rápido às **Memórias** (trilha de memórias/acervo) |

### 9.6. Design e Experiência

| Regra | Descrição |
|-------|-----------|
| **RN-NAV-018** | A interface deve seguir uma linguagem **gamificada** (missões, recompensas, insígnias, HUD) |
| **RN-NAV-019** | A interface deve manter **clareza acima de tudo** — hierarquia visual clara, evitando sobrecarga |
| **RN-NAV-020** | Interações devem ser **leves** — janelas suspensas com gestos simples |
| **RN-NAV-021** | A identidade visual segue a **paleta do Território** (azul marinho sobre fundo claro) |

---

## 10. Módulo 9 — Interoperabilidade (Futuro)

> [!WARNING]
> Este módulo está marcado como **etapa futura** e não faz parte do escopo do MVP. As regras abaixo são diretrizes para planejamento.

### 10.1. Ingestão de Dados Externos

| Regra | Descrição |
|-------|-----------|
| **RN-INT-001** | O mapa deverá suportar a **importação de dados geoespaciais** de fontes externas |
| **RN-INT-002** | A importação de dados é permitida para **Owner** e **Editor** |
| **RN-INT-003** | Antes da importação, o sistema deve **validar**: tipo de arquivo (extensão) e tamanho |

### 10.2. Importação de Mapas

| Regra | Descrição |
|-------|-----------|
| **RN-INT-004** | Deve ser possível importar mapas de outras plataformas para visualização dentro do Território |
| **RN-INT-005** | Os formatos de importação/exportação suportados deverão seguir padrões abertos (ex: GeoJSON, KML, Shapefile) |

### 10.3. Exportação de Dados

| Regra | Descrição |
|-------|-----------|
| **RN-INT-006** | O mapa deverá permitir a exportação de seus dados em formatos abertos |
| **RN-INT-007** | Os formatos e permissões de exportação serão definidos na etapa de planejamento desta feature |

### 10.4. Questões em Aberto

As seguintes questões deverão ser respondidas antes da implementação:

- Quais fontes externas serão suportadas inicialmente?
- Os dados importados podem ser editados dentro da plataforma?
- Como lidar com dados duplicados entre fontes?
- Existe sincronização automática com fontes externas?
- Os dados permanecem vinculados à origem?
- Quais formatos de exportação serão suportados na primeira versão?
- Existe limitação de exportação para mapas privados?

---

## 11. Módulo 10 — API Futura

> [!WARNING]
> Este módulo está marcado como **etapa futura** e não faz parte do escopo do MVP. As regras abaixo são diretrizes para planejamento.

### 11.1. Visão

| Regra | Descrição |
|-------|-----------|
| **RN-API-001** | A plataforma deverá disponibilizar uma **API** para integração com plataformas parceiras |
| **RN-API-002** | A API permitirá, futuramente, **puxar mapeamentos de emergências** realizados por outras plataformas e exibi-los no Território |

### 11.2. Questões em Aberto

As seguintes questões deverão ser respondidas antes da implementação:

- A integração será apenas de leitura ou também de escrita?
- Os dados externos poderão ser modificados dentro do Território?
- Como será feita a autenticação de APIs parceiras?
- Como conflitos entre plataformas serão tratados?

---

## 12. Glossário

| Termo | Definição |
|-------|-----------|
| **Mapa** | Repositório colaborativo de dados geoespaciais pertencente a um usuário ou organização |
| **Owner (Proprietário)** | Pessoa ou administradores da organização que possuem controle total sobre o mapa |
| **Editor** | Colaborador com permissão de criar, editar e excluir elementos do mapa |
| **Sugestor** | Colaborador que pode propor elementos e alterações, sujeitas a aprovação |
| **Visualizador** | Colaborador com permissão apenas de visualização |
| **Seguidor** | Usuário que segue um mapa público para receber notificações, sem ser colaborador |
| **Missão** | Objetivo a ser alcançado em um território. Contém zero ou mais mutirões. |
| **Mutirão** | Evento prático organizado para executar o objetivo de uma missão |
| **Memória** | Registro documental (foto, vídeo, texto, documento) de uma ação ou situação no território |
| **Elemento Geográfico** | Marcador, linha ou polígono posicionado no mapa |
| **Camada (Layer)** | Agrupador visual de elementos geográficos |
| **Fork** | Cópia independente de um mapa, mantendo referência ao original |
| **Estrela** | Indicador de relevância dado por um usuário a um mapa |
| **Insígnia** | Reconhecimento atribuído ao perfil do usuário por ações realizadas na plataforma |
| **HUD** | Heads-Up Display — barra de notificações e alertas sobreposta ao mapa |
| **Viewport** | Região visível do mapa na tela do usuário |
| **Soft Delete** | Exclusão lógica que marca o registro como excluído sem removê-lo fisicamente do banco |

---

## 13. Matriz de Permissões Consolidada

### 13.1. Ações sobre o Mapa

| Ação | Anônimo | Visualizador | Sugestor | Editor | Owner |
|------|---------|-------------|----------|--------|-------|
| Ver mapa público | ✅ | ✅ | ✅ | ✅ | ✅ |
| Ver mapa privado | ❌ | ✅ | ✅ | ✅ | ✅ |
| Dar estrela | ❌ | ✅ | ✅ | ✅ | ✅ |
| Seguir mapa | ❌ | ✅ | ✅ | ✅ | ✅ |
| Fazer fork (mapa público) | ❌ | ✅ | ✅ | ✅ | ✅ |
| Alterar visibilidade | ❌ | ❌ | ❌ | ❌ | ✅ |
| Gerenciar colaboradores | ❌ | ❌ | ❌ | ❌ | ✅ |
| Transferir propriedade | ❌ | ❌ | ❌ | ❌ | ✅ |
| Arquivar mapa | ❌ | ❌ | ❌ | ❌ | ✅ |
| Excluir mapa | ❌ | ❌ | ❌ | ❌ | ✅ |
| Reverter versão | ❌ | ❌ | ❌ | ✅ | ✅ |

### 13.2. Ações sobre Elementos Geográficos

| Ação | Anônimo | Visualizador | Sugestor | Editor | Owner |
|------|---------|-------------|----------|--------|-------|
| Visualizar elementos | ✅* | ✅ | ✅ | ✅ | ✅ |
| Criar elemento (direto) | ❌ | ❌ | ❌ | ✅ | ✅ |
| Criar elemento (pendente) | ❌ | ❌ | ✅ | ❌ | ❌ |
| Editar elemento | ❌ | ❌ | ❌ | ✅ | ✅ |
| Editar (autor da marcação)** | ❌ | ❌ | ❌ | ✅ | ✅ |
| Excluir elemento | ❌ | ❌ | ❌ | ✅ | ✅ |
| Criar/excluir camadas | ❌ | ❌ | ❌ | ✅ | ✅ |
| Aprovar/rejeitar sugestões | ❌ | ❌ | ❌ | ✅ | ✅ |

*\* Apenas em mapas públicos*
*\*\* O autor de uma marcação pode editá-la desde que continue como colaborador com permissão de edição*

### 13.3. Ações sobre Missões e Mutirões

| Ação | Anônimo | Visualizador | Sugestor | Editor | Owner |
|------|---------|-------------|----------|--------|-------|
| Visualizar missões | ✅* | ✅ | ✅ | ✅ | ✅ |
| Criar missão | ❌ | ❌ | ❌ | ✅ | ✅ |
| Alterar status de missão | ❌ | ❌ | ❌ | ✅ | ✅ |
| Criar mutirão (direto) | ❌ | ❌ | ❌ | ✅ | ✅ |
| Propor mutirão (pendente) | ❌ | ❌ | ✅ | ❌ | ❌ |
| Aprovar proposta de mutirão | ❌ | ❌ | ❌ | ✅ | ✅ |

*\* Apenas em mapas públicos*

### 13.4. Ações sobre Memórias

| Ação | Anônimo | Visualizador | Sugestor | Editor | Owner |
|------|---------|-------------|----------|--------|-------|
| Visualizar memórias | ✅* | ✅ | ✅ | ✅ | ✅ |
| Criar memória | ❌ | ❌ | ❌ | ✅ | ✅ |
| Editar memória | ❌ | ❌ | ❌ | ✅ | ✅ |
| Comentar memória | ❌ | ✅ | ✅ | ✅ | ✅ |

*\* Apenas em mapas públicos*

---

> [!TIP]
> **Próximo passo:** Criar o diagrama de fluxo de casos de uso em Mermaid com base nestas regras de negócio.

---

*Documento gerado em 07/08/2026 — Versão 1.0*
*Baseado no Briefing do Mapa da Plataforma Território e sessão de levantamento de requisitos.*
