# Funcionalidades planejadas ainda não presentes

**Origem:** `Documentacao_Regras_de_Negocio_Mapa.md`, `Briefing - Mapa da plataforma.txt` e `Questionamentos Mapa.txt`.
**Comparado com:** `docs/DOCUMENTACAO_ATUAL.md` (estado do protótipo em 09/09/2026).

Este arquivo **não** descreve o produto atual. Lista só o que o plano original já definiu e a POC **ainda não tem**. Quando um item for implementado, mova-o para a documentação atual e apague-o daqui.

As interações **Figital** (totens com QR, NPC, app do participante) não faziam parte desse MVP antigo. O plano completo está em [`docs/CAMPANHA_FIGITAL.md`](CAMPANHA_FIGITAL.md); o tópico no fim deste arquivo é só o ponteiro.

---

## Mapa como repositório

- Criar mapa (nome, visibilidade público/privado, descrição e tags)
- Vários mapas por pessoa ou organização, com dono (pessoa ou admins da org)
- Transferência de propriedade com aceite do novo dono
- Fork de mapa público (cópia só dos dados geográficos, com referência ao original)
- Arquivar / desarquivar (somente leitura, oculto da busca, acessível por link)
- Exclusão lógica com retenção de 30 dias e restauração
- Versionamento do mapa (quem, quando, o quê) e reversão para versão anterior

## Permissões e colaboração

- Papéis Owner, Editor, Sugestor e Visualizador
- Mapa público visível sem login; privado só para colaborador
- Convite por link (1, 7, 30 dias ou permanente) e solicitação de acesso
- Aprovação do dono ao incluir colaborador, com nível de permissão
- Sugestões pendentes (elemento só aparece depois de aprovado; expira em 30 dias)

## Estrelas e insígnias

- Uma estrela por usuário autenticado, com possibilidade de remover
- Contagem pública de estrelas e notificação ao dono
- Insígnias no perfil (estrelas acumuladas, colaboração, sugestões aceitas, mapas criados)

## Camadas e elementos geográficos (além do desenho da POC)

- Camadas criadas pelo usuário (agrupador), com um elemento em várias camadas
- Categorias fixas de negócio: Missão, Memória, Alerta, Mutirão, Outro
- Soft delete de elementos
- Autor da marcação podendo editar enquanto for colaborador

## Missões (regras de negócio)

- Missão sempre pertencente a um mapa
- Ciclo de status: Aberta → Em andamento → Concluída / Cancelada (com reabertura)
- Vencimento **não** muda status sozinho (o prazo opcional / missão contínua já está na UI — interruptor "Tem prazo?", ver DOCUMENTACAO_ATUAL §9)
- Só Owner/Editor criam e mudam status
- Zero ou mais mutirões por missão

## Mutirões

- Mutirão sempre ligado a uma missão (local herdado ou próprio na mesma região)
- Owner/Editor publicam na hora; Sugestor só propõe (aprovação; expira em 30 dias)
- Capacidade máxima opcional de participantes
- Integração com calendário e confirmação de presença já existentes na plataforma Território

## Memórias (além da foto na POC)

- Tipos vídeo, texto e documento
- Vínculo opcional também a mutirão
- Edição após publicação (autor, Owner ou Editor)
- Soft delete alinhado ao dos elementos geográficos

## Interface e navegação do produto

- Entrar na seção Mapas vendo **os próprios mapas** primeiro
- Explorar mapas públicos, com busca por nome, localização e tags
- Seguir / deixar de seguir mapa público (notificações sem ser colaborador)
- Contadores no mapa atual: colaboradores, missões, mutirões, memórias, marcações, estrelas
- Barra HUD de alertas para usuário logado (nova missão, status, mutirão, convite, sugestão, estrela)
- Atalho real para perfil (gestão de mapas e conquistas) e para a trilha de memórias/acervo
- Renderização só do que está no viewport

## Interoperabilidade e API (já marcadas como etapa futura no plano)

- Importar GeoJSON, KML, Shapefile (e validar tipo/tamanho)
- Exportar dados em formatos abertos
- Ingerir acervo de soluções (raspagem) e camadas ambientais
- API para puxar mapeamentos de emergência de plataformas parceiras

## Figital (plano novo — ver documento próprio)

Não misturar com o MVP antigo do mapa. Figital no mapa: geometria + interações (missões e totens). Detalhe de fluxo, regras (RN-FIG), casos de uso e divisão mapa vs. app: [`docs/CAMPANHA_FIGITAL.md`](CAMPANHA_FIGITAL.md). Roteiro de entrega por fases: [`docs/PLANO_IMPLEMENTACAO_FIGITAL.md`](PLANO_IMPLEMENTACAO_FIGITAL.md).

**Fase 1 (autoria no mapa) já implementada** — totem com papel/QR/NPC/insumos, ficha do percurso, catálogo de insumos, geração de QR, visibilidade do mapa e painel Figital, persistência mínima da API. Estado atual em [`docs/DOCUMENTACAO_ATUAL.md`](DOCUMENTACAO_ATUAL.md) §16.

Pendências resumidas (Fases 2 a 5, aplicativo do participante):

- Aplicativo do participante (PWA no piloto): scan de QR, consentimento, cena do NPC, execução de missão com envio de insumo, fila offline
- Jornada de verdade (status INICIADA/EM_ANDAMENTO/CONCLUIDA/ABANDONADA), recompensa parcial e final liberadas por eventos reais do app
- Jornada só começa no QR de início daquele percurso; totem intermediário sem jornada não executa missão (UC-08)
- Sincronização offline e casos de borda de campo (sinal fraco, retomar jornada)
- Insumos reais voltando ao painel do mapa (hoje o painel Figital só tem telas vazias funcionais) e piloto físico (Serra do Vulcão)
- QR com HMAC real assinado pelo servidor (hoje a Fase 1 usa um mock local) e verificação online/offline
- Persistência de banco de verdade da **API Figital** (`poc/server/figital.js`) ainda é em memória do processo. O **mapa da UI principal (Leaflet)** já persiste no Supabase (snapshot único compartilhado) — ver `DOCUMENTACAO_ATUAL.md` §18
