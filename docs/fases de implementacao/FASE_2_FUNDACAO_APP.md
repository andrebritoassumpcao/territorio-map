# Fase 2 — Fundação do aplicativo separado

**Parte de:** [`PLANO_IMPLEMENTACAO_FIGITAL.md`](../PLANO_IMPLEMENTACAO_FIGITAL.md)
**Regras de negócio de referência:** [`CAMPANHA_FIGITAL.md`](../CAMPANHA_FIGITAL.md) §10, §12.1, §12.3, §13.1, §13.2, §14.1, §14.3, RN-FIG-016
**Depende de:** [`FASE_1_MAPA_FIGITAL.md`](FASE_1_MAPA_FIGITAL.md) — item 1.7 (persistência mínima) precisa existir antes de começar
**Desbloqueia:** Fase 3

---

## Objetivo

Existe um projeto novo, decisões técnicas tomadas, e ele já fala com a API Figital da Fase 1.

## 2.1 Decisões técnicas antes de escrever código de tela

- **Forma do app: PWA**, conforme recomendação explícita do documento (§12.3) — QR abre direto no navegador, sem fricção de loja de app; nativo fica como evolução caso câmera/QR/offline falhem em campo.
- **Identidade: modelo híbrido** (§13.2) — começa anônimo com ID de dispositivo/sessão, oferece "salvar na conta Território" ao final da jornada. Depende de o mapa já ter algum conceito mínimo de conta (mesmo que simplificado nesta fase).
- Repositório/projeto separado do `Territorio-map` atual (mapa e app são "dois produtos, um contrato" — §10), mas apontando para a mesma API Figital da Fase 1.7.

## 2.2 Scaffold do projeto

- Estrutura de PWA (manifest, service worker), consumo do endpoint `GET /mapas/{id}/percursos/{id}/manifest` (§13.1) — o pacote cacheável que existe justamente para o app funcionar offline depois do primeiro download (§14.3).

## 2.3 Scan de QR e deep link

- Leitor de QR (câmera) e suporte à URL `https://…/m/{mapa}/t/{totem}` como deep link direto (§12.1, "Scan / deep link").
- Validação de assinatura do QR: online contra o servidor; offline, aceitar se o totem já constar do manifesto em cache (§14.1) — implementa RN-FIG-016.

---

## Critério de pronto

Apontar a câmera do celular para um QR gerado na Fase 1 abre o app e reconhece de qual mapa/percurso/totem se trata, mesmo sem nenhuma tela de missão ainda funcionando.

**Fase anterior:** [`FASE_1_MAPA_FIGITAL.md`](FASE_1_MAPA_FIGITAL.md)
**Próxima fase:** [`FASE_3_NUCLEO_JORNADA.md`](FASE_3_NUCLEO_JORNADA.md)
