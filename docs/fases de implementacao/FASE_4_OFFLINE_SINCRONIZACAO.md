# Fase 4 — Offline, sincronização e casos de borda

**Parte de:** [`PLANO_IMPLEMENTACAO_FIGITAL.md`](../PLANO_IMPLEMENTACAO_FIGITAL.md)
**Regras de negócio de referência:** [`CAMPANHA_FIGITAL.md`](../CAMPANHA_FIGITAL.md) §12.3, §14.3, RN-FIG-007, RN-FIG-014, RN-FIG-024, RN-FIG-026, RN-FIG-027, UC-08, UC-09
**Depende de:** [`FASE_3_NUCLEO_JORNADA.md`](FASE_3_NUCLEO_JORNADA.md)
**Desbloqueia:** Fase 5

---

## Objetivo

O app sobrevive às condições reais de campo descritas no próprio documento como risco central do piloto (§12.3: "câmera, QR e cache offline variam por celular").

## 4.1 Fila offline

- Depois do primeiro `manifest` baixado, totens/falas/schemas ficam no aparelho; fotos/áudios vão para fila local; conclusão de missão pode ser otimista no aparelho, confirmada no servidor na sincronização (RN-FIG-026, §14.3).
- UI explícita de "guardado no celular — envia quando houver rede" (§12.1) e de recompensa final "quase lá, falta enviar" enquanto não confirmada pelo servidor.

## 4.2 Estados da jornada

- Implementar a máquina de estados completa: `INICIADA → EM_ANDAMENTO → CONCLUIDA`, com desvio para `ABANDONADA` por inatividade (padrão 7 dias, configurável — RN-FIG-027), percurso desativado ou mapa arquivado (RN-FIG-007).

## 4.3 Casos de borda já mapeados nos casos de uso

- **UC-08:** QR de totem intermediário/fim sem jornada ativa não executa missão — mostra mensagem pedindo para ir ao totem de início (RN-FIG-014), com direção via GPS se disponível.
- **UC-09:** sinal ruim — scan continua funcionando se o manifesto do percurso já estiver em cache; primeiro scan sem manifesto e sem rede pede para se aproximar de cobertura ou baixar o percurso antes da trilha.
- **RN-FIG-024:** replay do mesmo percurso só se ele estiver ativo, a jornada anterior estiver concluída/abandonada e o organizador permitir — este controle precisa existir na ficha do percurso (Fase 1.3).

---

## Critério de pronto

O app se comporta corretamente sem rede na trilha, sincroniza ao reconectar, e os casos de QR fora de ordem ou sinal ruim têm resposta definida — não crash nem tela em branco.

**Fase anterior:** [`FASE_3_NUCLEO_JORNADA.md`](FASE_3_NUCLEO_JORNADA.md)
**Próxima fase:** [`FASE_5_INTEGRACAO_PILOTO.md`](FASE_5_INTEGRACAO_PILOTO.md)
