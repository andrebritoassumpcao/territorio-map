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
- Prazo opcional; missão contínua se não houver prazo; vencimento **não** muda status sozinho
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

Não misturar com o MVP antigo do mapa. Figital no mapa: geometria + interações (missões e totens). Detalhe de fluxo, regras (RN-FIG), casos de uso e divisão mapa vs. app: [`docs/CAMPANHA_FIGITAL.md`](CAMPANHA_FIGITAL.md).

Pendências resumidas até existir implementação:

- Interações Figital sobre polígono/trilha: totens = marcadores com QR e papéis início / intermediário / fim
- Jornada, modo sequencial ou livre, recompensa final e consentimento **por trilha/área** (percurso)
- Missões de totem com NPC roteirizado e catálogo de insumos (foto, vídeo, áudio, texto, GPS, formulário, memória)
- Aplicativo do participante (PWA no piloto): scan, consentimento no mapa, jornada, fila offline
- Painel no mapa: jornadas por percurso, insumos, indicadores, exportação
- Jornada só começa no QR de início daquele percurso; totem intermediário sem jornada não executa missão
