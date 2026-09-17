# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Source of truth for product state

Before describing or changing behavior, read `docs/DOCUMENTACAO_ATUAL.md` — it is the authoritative description of what is actually implemented today (architecture, screen-by-screen behavior, what's mocked vs. real, known limitations). `Documentacao_Regras_de_Negocio_Mapa.md` (repo root) describes the *planned* product, not the current state — do not treat it as current. Unimplemented planned features live in `docs/FUNCIONALIDADES_PENDENTES.md`.

**Mandatory doc-update rule** (`.cursor/rules/atualizar-documentacao-atual.mdc`, `alwaysApply: true`): in the same change that alters behavior, update `docs/DOCUMENTACAO_ATUAL.md` (what changed, stack, limits) and, if the change delivers something from `docs/FUNCIONALIDADES_PENDENTES.md`, remove that item from there. Don't invent features in the current-state doc that only exist in the old business-rules plan. Don't describe the vanilla/Leaflet POC and the React/API stack as if they were the same screen unless they are actually integrated.

## Repository shape — two unrelated experiments in one client

`poc/client` contains **two separate, non-integrated front ends**:

1. **Vanilla + Leaflet (the real UI)** — `poc/client/index.html` (loaded by root `index.html` via redirect) + `poc/client/src/app.js` (~3265 lines: map logic, all creation flows, drawing tools) + `poc/client/src/style.css`. No build framework involved at runtime for this screen beyond Vite serving static files. Entities are mocked in-memory arrays inside `app.js`; reloading the page loses everything.
2. **React + MapLibre experiment** — `App.jsx`, `components/MapView.jsx`, `components/MissionPanel.jsx`, `components/MissionForm.jsx`, `services/api.js`. This is legacy/experimental and is **not** wired into the UI users actually see. It talks to the Express API in `poc/server/index.js` (missions CRUD, in-memory, proxied via Vite's `/api` → `localhost:3001`).

When asked to "fix the map" or "add a feature to the map," assume it means #1 (`app.js`) unless the request explicitly mentions React/MapLibre/the experimental API.

### Figital (map-authoring campaign feature, Phase 1)

A third, actively-developed layer, specific to the Leaflet UI:
- `poc/client/src/figital/model.js` — entities (Percurso/route, Totem, totem-Mission, Insumo/input item), client-side validation (`validarPercurso`), QR URL/signature generation. Mirrors the shape `poc/server/figital.js` exposes over HTTP.
- `poc/server/figital.js` — Express router mounted at `/api` in `poc/server/index.js`. Real in-memory endpoints for percursos/totens/manifest; jornadas/insumos/export are intentionally empty stubs (contract-first, per `docs/fases de implementacao/FASE_1_MAPA_FIGITAL.md`).
- **The main Leaflet UI does not call this API yet** — `app.js` still holds Figital state in browser memory, same as the rest of the POC.
- Full business rules: `docs/CAMPANHA_FIGITAL.md` (rule IDs like `RN-FIG-009` are cross-referenced in code comments). Phase plan: `docs/PLANO_IMPLEMENTACAO_FIGITAL.md` and `docs/fases de implementacao/FASE_*.md`.

## Commands

```bash
# Main UI (Leaflet POC) + Figital client
cd poc/client
npm install
npm run dev        # vite dev server
npm run build       # vite build

# Experimental API (missions CRUD + Figital persistence stub), port 3001
cd poc/server
npm install
npm run dev         # node --watch index.js
```

There is no test suite, linter, or CI config in this repository — don't assume `npm test`/`npm run lint` exist.

Opening the repo root `index.html` directly just redirects to `poc/client/index.html`; it has no logic of its own.

## Architecture notes worth knowing before editing `app.js`

- Map: Leaflet 1.9.4 (loaded via CDN script tag in `index.html`, not npm), with Esri World Imagery (satellite, default) and OpenStreetMap (vector) base layers.
- Layers (missões, mutirões, memórias, marcadores, totens, áreas) are fixed — no UI to create/rename/delete a layer.
- Filters and search panels exist in the DOM but are non-functional (visual-only) — don't assume wiring exists just because the panel is present.
- Drawing tools (line/polygon) and the "add inside shape" flow (missão/totem/marcador attached to a selected geometry) are central to both the base map UX and Figital totem placement — totems can only be created via a selected shape's "+", never via the freestanding "Novo Marcador" flow (RN-FIG-041).
