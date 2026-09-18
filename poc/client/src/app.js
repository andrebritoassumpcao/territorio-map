/* ==========================================================================
   TERRITÓRIO — MAPA COLABORATIVO (PROTÓTIPO VISUAL DE ALTA FIDELIDADE)
   LOGICA JAVASCRIPT LEVE DE INTERAÇÃO DA INTERFACE
   ========================================================================== */

import QRCode from 'qrcode';
import {
  PAPEL_TOTEM,
  PAPEL_TOTEM_LABEL,
  TIPOS_INSUMO,
  TIPO_INSUMO_LABEL,
  VISIBILIDADE_INSUMO,
  createItemInsumo,
  createTotem,
  createPercurso,
  validarPercurso,
  gerarUrlQr,
  gerarUrlQrMissao,
  gerarAssinaturaMock
} from './figital/model.js';

document.addEventListener('DOMContentLoaded', () => {
  // 1. INICIALIZAÇÃO DO MAPA (LEAFLET + SATÉLITE ESRI)
  // Vista inicial é definida via fitBounds sobre as áreas reais (Queimados / Nova Iguaçu)
  // mais abaixo; estas constantes servem apenas de fallback caso não haja shapes.
  const initialLat = -22.745;
  const initialLng = -43.525;
  const initialZoom = 12;

  const map = L.map('map', {
    zoomControl: false,
    attributionControl: false
  }).setView([initialLat, initialLng], initialZoom);

  // Re-adicionar controle de zoom em posição discreta (bottomright)
  L.control.zoom({ position: 'bottomright' }).addTo(map);

  // Camadas de Tile do Mapa
  const satelliteTile = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 19,
    attribution: 'Tiles &copy; Esri'
  });

  const streetTile = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap'
  });

  satelliteTile.addTo(map);

  // 2. GRUPOS DE CAMADAS (LAYERS)
  const layerGroups = {
    missoes: L.layerGroup().addTo(map),
    mutiroes: L.layerGroup().addTo(map),
    memorias: L.layerGroup().addTo(map),
    marcadores: L.layerGroup().addTo(map),
    areas: L.layerGroup().addTo(map),
    totens: L.layerGroup().addTo(map)
  };

  let mapTool = 'select';
  let isDrawing = false;
  let skipNextMapClick = false;
  const desenhos = [];
  const draftGroup = L.layerGroup().addTo(map);
  const selectionGroup = L.layerGroup().addTo(map);
  const drawState = {
    tool: 'poligono',
    vertices: [],
    draft: null,
    draftCasing: null,
    seqLinha: 0,
    seqArea: 0,
    color: '#1f7a4c'
  };
  const placeState = {
    type: null,
    latlng: null,
    source: null,
    shape: null,
    pickingInside: false,
    parent: null
  };
  const selection = {
    record: null,
    bbox: null
  };
  const mapItems = [];
  const parentById = new Map();
  let featureSeq = 20;
  let filtersReady = false;
  let lastEmptyPeriodToast = '';
  let pendingDelete = null;
  let editingItemId = null;

  function newFeatureId(prefix) {
    featureSeq += 1;
    return `${prefix}${featureSeq}`;
  }

  function registerMapItem(kind, data, marker) {
    const entry = { kind, data, marker };
    mapItems.push(entry);
    if (kind === 'missao' || kind === 'marcador') {
      parentById.set(data.id, entry);
    }
    return entry;
  }

  function casingStyle() {
    return {
      color: '#ffffff',
      weight: 8,
      opacity: 0.95,
      fill: false,
      fillOpacity: 0,
      interactive: true,
      bubblingMouseEvents: true,
      lineJoin: 'round',
      lineCap: 'round',
      className: 'shape-path'
    };
  }

  function lineStyle(color) {
    return {
      color,
      weight: 5,
      lineJoin: 'round',
      lineCap: 'round',
      interactive: true,
      bubblingMouseEvents: true,
      className: 'shape-path'
    };
  }

  function polyStyle(color, fillColor) {
    const fill = fillColor || color;
    return {
      stroke: true,
      color: fill,
      weight: 3,
      dashArray: '10, 7',
      opacity: 1,
      fill: true,
      fillColor: fill,
      fillOpacity: 0.28,
      lineJoin: 'round',
      interactive: true,
      bubblingMouseEvents: true,
      className: 'shape-path'
    };
  }

  function draftCasingStyle() {
    return { ...casingStyle(), interactive: false };
  }

  function draftLineStyle() {
    return { ...lineStyle(drawState.color), interactive: false };
  }

  function draftPolyStyle() {
    return { ...polyStyle(drawState.color), interactive: false };
  }

  const ICON = {
    sprout: './icons/sprout.svg',
    users: './icons/users.svg',
    camera: './icons/camera.svg',
    pin: './icons/map-pin.svg',
    totem: './icons/star.svg',
    palette: './icons/palette.svg',
    pencil: './icons/pencil.svg',
    trash: './icons/trash-2.svg'
  };

  const PIN_COLORS = [
    { color: '#1f7a4c', label: 'Verde' },
    { color: '#d4832a', label: 'Âmbar' },
    { color: '#b3241b', label: 'Vermelho' },
    { color: '#00bcd4', label: 'Ciano' },
    { color: '#7c4dff', label: 'Roxo' }
  ];

  function iconImg(src, size = 16) {
    return `<span class="ds-icon" style="width:${size}px;height:${size}px"><img src="${src}" alt="" width="${size}" height="${size}"></span>`;
  }

  function safeColor(color) {
    const c = String(color || '').trim();
    return /^#[0-9a-fA-F]{3,8}$/.test(c) ? c : '';
  }

  function typeBadge(type, color) {
    const src = {
      missao: ICON.sprout,
      mutirao: ICON.users,
      memoria: ICON.camera,
      marcador: ICON.pin,
      alerta: ICON.pin,
      totem: ICON.totem
    }[type] || ICON.pin;
    const hex = safeColor(color);
    const style = hex ? ` style="background:${hex}"` : '';
    return `<div class="marker-badge ${type}"${style}>${iconImg(src, 18)}</div>`;
  }

  function colorSwatchesHtml(kind, id, selected) {
    const current = safeColor(selected);
    const swatches = PIN_COLORS.map(({ color, label }) => {
      const active = current && current.toLowerCase() === color.toLowerCase() ? ' active' : '';
      return `<button type="button" class="color-swatch${active}" data-color="${color}" style="background:${color}" aria-label="${label}" onclick="applyMarkerColor('${kind}','${escapeJsString(id)}','${color}')"></button>`;
    }).join('');
    const pickerVal = current || '#1f7a4c';
    return `${swatches}<input type="color" value="${pickerVal}" aria-label="Cor personalizada" oninput="applyMarkerColor('${kind}','${escapeJsString(id)}', this.value)">`;
  }

  function markerActionsHtml(kind, id, selectedColor) {
    const safeId = escapeJsString(id);
    return `
      <div class="marker-actions">
        <button type="button" class="marker-action-btn" aria-label="Estilo" aria-expanded="false" aria-controls="marker-style-${kind}-${id}" onclick="toggleMarkerStyle(event,'${kind}','${safeId}')">
          ${iconImg(ICON.palette, 18)}
        </button>
        <button type="button" class="marker-action-btn" aria-label="Editar" onclick="editMapItem('${kind}','${safeId}')">
          ${iconImg(ICON.pencil, 18)}
        </button>
        <button type="button" class="marker-action-btn marker-action-danger" aria-label="Excluir" onclick="confirmDeleteMapItem('${kind}','${safeId}')">
          ${iconImg(ICON.trash, 18)}
        </button>
      </div>
      <div class="marker-style-popover hidden" id="marker-style-${kind}-${id}" role="group" aria-label="Cor do pino">
        ${colorSwatchesHtml(kind, id, selectedColor)}
      </div>
    `;
  }

  function findMapItem(kind, id) {
    return mapItems.find(m => m.kind === kind && m.data.id === id) || null;
  }

  function bindShapeClicks(record) {
    const onShapeClick = (e) => {
      L.DomEvent.stop(e);
      skipNextMapClick = true;
      setTimeout(() => { skipNextMapClick = false; }, 0);
      if (placeState.pickingInside) {
        tryPlaceInside(e.latlng);
        return;
      }
      if (mapTool !== 'select') return;
      if (record._didDrag) {
        record._didDrag = false;
        return;
      }
      selectShape(record);
    };
    record.layer.on('click', onShapeClick);
    if (record.casing) record.casing.on('click', onShapeClick);
    bindShapeDrag(record);
  }

  function cloneLatLngs(latlngs) {
    return (latlngs || []).map(ll => (
      Array.isArray(ll) ? cloneLatLngs(ll) : L.latLng(ll.lat, ll.lng)
    ));
  }

  function offsetLatLngs(latlngs, dlat, dlng) {
    return (latlngs || []).map(ll => (
      Array.isArray(ll)
        ? offsetLatLngs(ll, dlat, dlng)
        : L.latLng(ll.lat + dlat, ll.lng + dlng)
    ));
  }

  function bindShapeDrag(record) {
    const onMouseDown = (e) => {
      if (mapTool !== 'select' || placeState.pickingInside) return;
      L.DomEvent.stop(e);
      const origin = e.latlng;
      const originPoint = map.latLngToLayerPoint(origin);
      const startLayer = cloneLatLngs(record.layer.getLatLngs());
      const startCasing = record.casing ? cloneLatLngs(record.casing.getLatLngs()) : null;
      let dragging = false;
      record._didDrag = false;
      map.dragging.disable();

      const onMove = (ev) => {
        const pt = map.latLngToLayerPoint(ev.latlng);
        if (!dragging && originPoint.distanceTo(pt) < 4) return;
        if (!dragging) {
          dragging = true;
          record._didDrag = true;
          map.getContainer().classList.add('shape-grabbing');
          if (selection.record !== record) selectShape(record);
        }
        const dlat = ev.latlng.lat - origin.lat;
        const dlng = ev.latlng.lng - origin.lng;
        record.layer.setLatLngs(offsetLatLngs(startLayer, dlat, dlng));
        if (record.casing) record.casing.setLatLngs(offsetLatLngs(startCasing, dlat, dlng));
        record.latlngs = flattenLatLngs(record.layer.getLatLngs()).map(ll => [ll.lat, ll.lng]);
        if (selection.record === record && selection.bbox) {
          selection.bbox.setBounds(record.layer.getBounds());
          updateShapeActionsPosition();
        }
      };

      const onUp = () => {
        map.off('mousemove', onMove);
        map.off('mouseup', onUp);
        map.getContainer().classList.remove('shape-grabbing');
        if (mapTool === 'select' && !placeState.pickingInside) {
          map.dragging.enable();
        }
        if (dragging) {
          skipNextMapClick = true;
          setTimeout(() => { skipNextMapClick = false; }, 0);
        }
      };

      map.on('mousemove', onMove);
      map.on('mouseup', onUp);
    };

    record.layer.on('mousedown', onMouseDown);
    if (record.casing) record.casing.on('mousedown', onMouseDown);
  }

  function addShapeToMap({ tipo, titulo, latlngs, color, fillColor }) {
    const isLine = tipo === 'linha';
    const stroke = color || '#1f7a4c';
    const fill = fillColor || stroke;
    const casing = isLine ? L.polyline(latlngs, casingStyle()) : null;
    const layer = isLine
      ? L.polyline(latlngs, lineStyle(stroke))
      : L.polygon(latlngs, polyStyle(stroke, fill));

    if (casing) casing.addTo(layerGroups.areas);
    layer.addTo(layerGroups.areas);
    layer.bindTooltip(titulo, { permanent: false });

    const record = {
      id: `d${desenhos.length + 1}`,
      tipo,
      titulo,
      latlngs,
      color: stroke,
      fillColor: fill,
      layer,
      casing
    };
    desenhos.push(record);
    bindShapeClicks(record);
    return record;
  }

  function syncSwatchActive(containerId, color) {
    const root = document.getElementById(containerId);
    if (!root) return;
    root.querySelectorAll('.color-swatch').forEach(btn => {
      btn.classList.toggle('active', (btn.dataset.color || '').toLowerCase() === color.toLowerCase());
    });
  }

  function escapeJsString(value) {
    return String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  }

  function shapeKindLabel(tipo) {
    return tipo === 'linha' ? 'trilha' : 'área';
  }

  function vinculoShapeHtml(vinculo) {
    if (!vinculo) return '';
    return `<p class="card-vinculo">Vinculada à ${shapeKindLabel(vinculo.tipo)} <strong>${vinculo.titulo}</strong>.</p>`;
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function flattenLatLngs(latlngs) {
    if (!latlngs || !latlngs.length) return [];
    const first = latlngs[0];
    if (first && typeof first.lat === 'number') return latlngs;
    if (Array.isArray(first)) return flattenLatLngs(first);
    return latlngs.map(ll => L.latLng(ll));
  }

  function pointInPolygon(latlng, latlngs) {
    const pts = flattenLatLngs(latlngs).map(ll => L.latLng(ll));
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const xi = pts[i].lng;
      const yi = pts[i].lat;
      const xj = pts[j].lng;
      const yj = pts[j].lat;
      const intersect = ((yi > latlng.lat) !== (yj > latlng.lat))
        && (latlng.lng < ((xj - xi) * (latlng.lat - yi)) / ((yj - yi) || 1e-12) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  function isPointInShape(latlng, record) {
    if (!record) return false;
    if (record.tipo === 'poligono') {
      return pointInPolygon(latlng, record.layer.getLatLngs());
    }
    return record.layer.getBounds().contains(latlng);
  }

  // 3. DADOS MOCKADOS DOS WAYPOINTS

  // (A) MISSÕES (🌱 Verde) — sem pontos por enquanto (fase inicial: só polígonos/trilhas)
  const missoesData = [];

  // (B) MUTIRÕES (🤝 Laranja) — sem pontos por enquanto
  const mutiroesData = [];

  // (C) MEMÓRIAS (📷 Roxo)
  const extraFotos = [
    'https://images.unsplash.com/photo-1466692476866-aef1dfb1d5ea?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1591857177580-dc84b9c4b8b2?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?auto=format&fit=crop&w=600&q=80'
  ];

  function attachFotos(item) {
    item.fotos = [item.fotoUrl, ...extraFotos];
    return item;
  }

  const memoriasData = [];

  // (D) MARCADORES (📍 Vermelho/Teal) — sem pontos por enquanto
  const marcadoresData = [];

  // 4. RENDERIZAR WAYPOINTS NO MAPA

  // Função auxiliar para criar Ícone Div Customizado
  function createCustomIcon(badgeHtml, labelText, extraClass = '') {
    return L.divIcon({
      className: `custom-marker-wrapper ${extraClass}`,
      html: `
        <div class="custom-marker">
          ${badgeHtml}
          ${labelText ? `<span class="marker-label">${labelText}</span>` : ''}
        </div>
      `,
      iconSize: [140, 44],
      iconAnchor: [20, 20]
    });
  }

  // Fallback de Imagem Confiável caso haja falha de conexão
  const fallbackImg = 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=600&q=80';

  function parseDisplayDate(value) {
    if (!value) return null;
    const raw = String(value).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
      const d = new Date(`${raw.slice(0, 10)}T12:00:00`);
      return Number.isNaN(d.getTime()) ? null : d;
    }
    const m = raw.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?/);
    if (!m) return null;
    const year = m[3] ? Number(m[3]) : 2026;
    return new Date(year, Number(m[2]) - 1, Number(m[1]), 12);
  }

  function formatMemoryDate(value) {
    const d = parseDisplayDate(value);
    if (!d) return value || '';
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${dd}/${mm}/${d.getFullYear()}`;
  }

  function missionStatusKey(status) {
    const s = String(status || '').toLowerCase();
    if (s.includes('conclu')) return 'concluidas';
    if (s.includes('planej')) return 'planejadas';
    return 'andamento';
  }

  function categoriaKey(value) {
    const v = String(value || '').toLowerCase();
    if (['meio-ambiente', 'recursos-hidricos', 'riscos'].includes(v)) return v;
    if (v.includes('risco') || v.includes('alag')) return 'riscos';
    if (v.includes('nascent') || v.includes('hidr') || v.includes('rio') || v.includes('água') || v.includes('agua')) {
      return 'recursos-hidricos';
    }
    return 'meio-ambiente';
  }

  function memoryPanelHtml(kind, data) {
    const memorias = data.memorias || [];
    const addBtn = `<button type="button" class="card-btn card-btn-purple" onclick="openCreateMemoryFor('${kind}','${escapeJsString(data.id)}')">Adicionar memória</button>`;
    if (!memorias.length) {
      return `
        <div class="card-memory-empty">
          <p class="card-memory-empty-title">Nenhuma memória ainda</p>
          <p class="card-memory-empty-text">Guarde fotos e relatos deste lugar.</p>
          ${addBtn}
        </div>
      `;
    }
    const items = memorias.map((m, i) => `
      <button type="button" class="card-memory-item" onclick="openParentMemory('${kind}','${escapeJsString(data.id)}',${i})">
        <img src="${m.fotoUrl}" alt="" class="card-memory-thumb" onerror="this.onerror=null; this.src='${fallbackImg}';" />
        <span class="card-memory-copy">
          <span class="card-memory-title">${escapeHtml(m.titulo)}</span>
          <span class="card-memory-date">${escapeHtml(formatMemoryDate(m.data))}</span>
        </span>
      </button>
    `).join('');
    return `
      <div class="card-memory-list">${items}</div>
      ${addBtn}
    `;
  }

  function missaoSobreInner(data) {
    const desc = data.descricao
      ? `<p class="card-desc">${escapeHtml(data.descricao)}</p>`
      : '';
    const cat = data.categoriaLabel
      ? `<div class="card-meta-item">Categoria: <strong>${escapeHtml(data.categoriaLabel)}</strong></div>`
      : '';
    const volunteers = data.participantes
      ? `<div class="card-meta-item">Voluntários: <strong>${data.participantes} inscritos</strong></div>`
      : `<div class="card-meta-item">Participantes: <strong>1 participante (Você)</strong></div>`;
    const avatars = data.participantes
      ? `
        <div class="card-participants">
          <div class="avatar-stack">
            <div class="mini-avatar">AW</div>
            <div class="mini-avatar">JS</div>
            <div class="mini-avatar">MR</div>
          </div>
          <span style="font-size: 0.75rem; color: var(--text-muted);">+15 outros participantes</span>
        </div>
      `
      : '';
    const detailsLabel = data.participantes ? 'Ver detalhes da missão' : 'Ver missão';
    const instrucao = data.instrucao
      ? `
        <div class="card-instrucao">
          <span class="card-instrucao-label">O que deve ser feito</span>
          <p class="card-instrucao-text">${escapeHtml(data.instrucao)}</p>
        </div>
      `
      : '';
    const coletar = (data.insumos && data.insumos.length)
      ? `
        <div class="card-providencias">
          <span class="card-providencias-label">O que coletar</span>
          <ul class="card-providencias-list">
            ${data.insumos.map(it => `
              <li class="card-providencias-item">
                <input type="checkbox" disabled /> <span>${escapeHtml(it.rotulo || TIPO_INSUMO_LABEL[it.tipo] || it.tipo)}${it.obrigatorio ? '' : ' <em>(opcional)</em>'}</span>
              </li>
            `).join('')}
          </ul>
        </div>
      `
      : '';
    const recompensa = data.recompensa
      ? `<div class="card-meta-item">Recompensa: <strong>${escapeHtml(data.recompensa)}</strong></div>`
      : '';
    const npc = data.npc
      ? `
        <div class="card-instrucao">
          <span class="card-instrucao-label">Personagem: ${escapeHtml(data.npc.nome || '')}</span>
          ${(data.npc.falas || []).filter(f => f.texto).map(f => `<p class="card-instrucao-text">"${escapeHtml(f.texto)}"</p>`).join('')}
        </div>
      `
      : '';
    const prazoLinha = (data.temPrazo === false || !data.prazo)
      ? `<div class="card-meta-item">Prazo: <strong>Sem prazo — missão contínua</strong></div>`
      : `<div class="card-meta-item">Prazo: <strong>${escapeHtml(formatMemoryDate(data.prazo))}</strong></div>`;
    return `
      <div class="card-header-badge">
        <span class="card-type-tag missao">Missão</span>
        <span class="card-status">${escapeHtml(data.status || '')}</span>
      </div>
      <h3 class="card-title">${escapeHtml(data.titulo)}</h3>
      ${desc}
      <div class="card-meta">
        ${cat}
        ${prazoLinha}
        ${recompensa}
        ${volunteers}
      </div>
      ${instrucao}
      ${coletar}
      ${npc}
      ${avatars}
      ${vinculoShapeHtml(data.vinculo)}
      <div class="card-action-group">
        <button class="card-btn card-btn-primary" type="button" onclick="showToast('Abrindo detalhes da missão...')">${detailsLabel}</button>
        <button class="card-btn card-btn-outline-amber" type="button" onclick="openCreateMutiraoForMissao('${escapeJsString(data.titulo)}')">
          Criar mutirão para esta missão
        </button>
        <button class="card-btn card-btn-outline" type="button" onclick="gerarQrMissao('${escapeJsString(data.id)}')">
          Gerar arte de QR
        </button>
      </div>
      <div id="qr-preview-missao-${data.id}"></div>
    `;
  }

  function marcadorSobreInner(data) {
    const tag = data.tagTitle || 'Marcador';
    const tagClass = data.badgeClass || 'marcador';
    const status = data.status
      ? `<span class="card-status">${escapeHtml(data.status)}</span>`
      : '';
    const cat = data.categoriaLabel
      ? `<div class="card-meta-item">Categoria: <strong>${escapeHtml(data.categoriaLabel)}</strong></div>`
      : '';
    const desc = data.descricao
      ? `<p class="card-desc">${escapeHtml(data.descricao)}</p>`
      : '';
    return `
      <div class="card-header-badge">
        <span class="card-type-tag ${tagClass}">${escapeHtml(tag)}</span>
        ${status}
      </div>
      <h3 class="card-title">${escapeHtml(data.titulo)}</h3>
      ${desc}
      ${cat ? `<div class="card-meta">${cat}</div>` : ''}
      ${vinculoShapeHtml(data.vinculo)}
    `;
  }

  function buildParentCardHtml(kind, data, activeTab = 'sobre') {
    const id = data.id;
    const memCount = (data.memorias || []).length;
    const sobreActive = activeTab !== 'memorias';
    const badge = memCount ? `<span class="card-tab-badge">${memCount}</span>` : '';
    return `
      <div class="context-card" data-card-id="${id}">
        <div class="card-tabs" role="tablist" aria-label="Conteúdo do card">
          <button type="button" class="card-tab${sobreActive ? ' is-active' : ''}" role="tab"
            aria-selected="${sobreActive}" aria-controls="panel-sobre-${id}" id="tab-sobre-${id}"
            onclick="switchCardTab('${id}','sobre')">Sobre</button>
          <button type="button" class="card-tab${!sobreActive ? ' is-active' : ''}" role="tab"
            aria-selected="${!sobreActive}" aria-controls="panel-memorias-${id}" id="tab-memorias-${id}"
            onclick="switchCardTab('${id}','memorias')">Memórias${badge}</button>
        </div>
        <div class="card-tab-panel" id="panel-sobre-${id}" role="tabpanel" aria-labelledby="tab-sobre-${id}" ${sobreActive ? '' : 'hidden'}>
          ${kind === 'missao' ? missaoSobreInner(data) : marcadorSobreInner(data)}
        </div>
        <div class="card-tab-panel" id="panel-memorias-${id}" role="tabpanel" aria-labelledby="tab-memorias-${id}" ${sobreActive ? 'hidden' : ''}>
          ${memoryPanelHtml(kind, data)}
        </div>
        ${markerActionsHtml(kind, id, data.cor)}
      </div>
    `;
  }

  function mutiraoPopupHtml(data) {
    const parentLine = data.missaoPai
      ? `<p style="font-size:0.78rem; color: var(--text-muted); margin-bottom: 4px;">Faz parte da Missão: <strong>${escapeHtml(data.missaoPai)}</strong></p>`
      : '';
    const dataHora = data.dataHora
      ? `<div class="card-meta-item"><strong>${escapeHtml(data.dataHora)}</strong></div>`
      : `<div class="card-meta-item">Ponto marcado no território</div>`;
    const vagas = data.vagas
      ? `<div class="card-meta-item">Vagas: <strong>${escapeHtml(data.vagas)}</strong></div>`
      : `<div class="card-meta-item">Mobilização comunitária ativa</div>`;
    const tag = data.missaoPai ? 'Mutirão' : 'Mutirão Vinculado';
    return `
      <div class="context-card context-card-simple">
        <div class="card-header-badge">
          <span class="card-type-tag mutirao">${tag}</span>
          ${data.missaoPai ? '' : '<span class="card-status">Confirmado</span>'}
        </div>
        <h3 class="card-title">${escapeHtml(data.titulo)}</h3>
        ${parentLine}
        <div class="card-meta">
          ${dataHora}
          ${vagas}
        </div>
        <button class="card-btn card-btn-amber" type="button" onclick="showToast('Inscrição confirmada no mutirão!')">Participar do mutirão</button>
        ${markerActionsHtml('mutirao', data.id, data.cor)}
      </div>
    `;
  }

  const POPUP_OPTS = { maxWidth: 340, minWidth: 300 };

  function refreshParentPopup(id, activeTab = 'memorias') {
    const entry = parentById.get(id);
    if (!entry) return;
    entry.marker.setPopupContent(buildParentCardHtml(entry.kind, entry.data, activeTab));
    if (!entry.marker.isPopupOpen()) entry.marker.openPopup();
    else entry.marker.getPopup()?.update();
  }

  window.switchCardTab = function(id, tab) {
    const card = document.querySelector(`.context-card[data-card-id="${id}"]`);
    if (!card) return;
    const sobre = tab === 'sobre';
    const tabSobre = card.querySelector('#tab-sobre-' + id);
    const tabMem = card.querySelector('#tab-memorias-' + id);
    const panelSobre = card.querySelector('#panel-sobre-' + id);
    const panelMem = card.querySelector('#panel-memorias-' + id);
    tabSobre?.classList.toggle('is-active', sobre);
    tabMem?.classList.toggle('is-active', !sobre);
    if (tabSobre) tabSobre.setAttribute('aria-selected', String(sobre));
    if (tabMem) tabMem.setAttribute('aria-selected', String(!sobre));
    if (panelSobre) panelSobre.hidden = !sobre;
    if (panelMem) panelMem.hidden = sobre;
    const popup = parentById.get(id)?.marker.getPopup();
    if (popup && popup._map) {
      popup._updateLayout();
      popup._updatePosition();
    }
  };

  window.openParentMemory = function(kind, id, index) {
    const entry = parentById.get(id);
    const item = entry?.data.memorias?.[index];
    if (item) openMemoryModal(item, { kind, id });
  };

  const memoryModal = document.getElementById('memory-modal');
  const memoryFeatured = document.getElementById('memory-featured');
  const memoryThumbs = document.getElementById('memory-thumbs');
  const memoryCommentsList = document.getElementById('memory-comments-list');
  const memoryCommentInput = document.getElementById('memory-comment-input');
  let currentMemory = null;
  let currentMemoryParent = null;

  function renderMemoryComments(comments) {
    if (!memoryCommentsList) return;
    memoryCommentsList.innerHTML = comments.map(c => `
      <div class="comment-row">
        <div class="comment-avatar">${c.initials}</div>
        <div class="comment-content">
          <div class="comment-meta">
            <span class="comment-name">${c.name}</span>
            <span class="comment-date">${c.date}</span>
          </div>
          <p class="comment-text">${c.text}</p>
        </div>
      </div>
    `).join('');
    const countEl = document.getElementById('memory-comments-count');
    if (countEl) countEl.textContent = String(comments.length);
  }

  function setMemoryFeatured(src, activeIndex) {
    if (memoryFeatured) {
      memoryFeatured.src = src;
      memoryFeatured.onerror = () => { memoryFeatured.src = fallbackImg; };
    }
    if (memoryThumbs) {
      memoryThumbs.querySelectorAll('.memory-thumb').forEach((btn, i) => {
        btn.classList.toggle('active', i === activeIndex);
      });
    }
  }

  function openMemoryModal(item, parent = null) {
    currentMemory = item;
    currentMemoryParent = parent;
    const authorEl = document.getElementById('memory-author');
    const titleEl = document.getElementById('memory-title');
    const descEl = document.getElementById('memory-description');
    if (authorEl) authorEl.textContent = `${item.autor} • ${item.data}`;
    if (titleEl) titleEl.textContent = item.titulo;
    if (descEl) descEl.textContent = item.descricao;

    const fotos = item.fotos || [item.fotoUrl];
    if (memoryThumbs) {
      memoryThumbs.innerHTML = fotos.map((src, i) => `
        <button type="button" class="memory-thumb${i === 0 ? ' active' : ''}" data-index="${i}">
          <img src="${src}" alt="Miniatura ${i + 1}" onerror="this.onerror=null; this.src='${fallbackImg}';" />
        </button>
      `).join('');
      memoryThumbs.querySelectorAll('.memory-thumb').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = Number(btn.dataset.index);
          setMemoryFeatured(fotos[idx], idx);
        });
      });
    }
    setMemoryFeatured(fotos[0], 0);
    renderMemoryComments(item.comentarios || []);
    if (memoryCommentInput) memoryCommentInput.value = '';
    const stylePop = document.getElementById('memory-style-popover');
    if (stylePop) {
      stylePop.innerHTML = colorSwatchesHtml('memoria', item.id, item.cor);
      stylePop.classList.add('hidden');
    }
    document.getElementById('btn-memory-style')?.setAttribute('aria-expanded', 'false');
    if (memoryModal) memoryModal.classList.add('open');
  }

  function closeMemoryModal() {
    if (memoryModal) memoryModal.classList.remove('open');
    currentMemory = null;
    currentMemoryParent = null;
    document.getElementById('memory-style-popover')?.classList.add('hidden');
    document.getElementById('btn-memory-style')?.setAttribute('aria-expanded', 'false');
  }

  const btnCloseMemory = document.getElementById('btn-close-memory');
  if (btnCloseMemory) btnCloseMemory.addEventListener('click', closeMemoryModal);
  if (memoryModal) {
    memoryModal.addEventListener('click', (e) => {
      if (e.target === memoryModal) closeMemoryModal();
    });
  }

  const memorySendBtn = document.getElementById('memory-send-btn');
  if (memorySendBtn) {
    memorySendBtn.addEventListener('click', () => {
      const text = (memoryCommentInput?.value || '').trim();
      if (!text || !currentMemory) return;
      if (!currentMemory.comentarios) currentMemory.comentarios = [];
      currentMemory.comentarios.push({
        initials: 'AW',
        name: 'Amanda',
        date: '01/09/2026',
        text
      });
      renderMemoryComments(currentMemory.comentarios);
      memoryCommentInput.value = '';
    });
  }
  if (memoryCommentInput) {
    memoryCommentInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        memorySendBtn?.click();
      }
    });
  }

  const btnMemoryStyle = document.getElementById('btn-memory-style');
  const btnMemoryEdit = document.getElementById('btn-memory-edit');
  const btnMemoryDelete = document.getElementById('btn-memory-delete');
  if (btnMemoryStyle) {
    btnMemoryStyle.addEventListener('click', (e) => {
      e.stopPropagation();
      const pop = document.getElementById('memory-style-popover');
      if (!pop || !currentMemory) return;
      const willOpen = pop.classList.contains('hidden');
      pop.classList.toggle('hidden', !willOpen);
      btnMemoryStyle.setAttribute('aria-expanded', String(willOpen));
    });
  }
  if (btnMemoryEdit) {
    btnMemoryEdit.addEventListener('click', () => {
      if (!currentMemory) return;
      window.editMapItem('memoria', currentMemory.id);
    });
  }
  if (btnMemoryDelete) {
    btnMemoryDelete.addEventListener('click', () => {
      if (!currentMemory) return;
      window.confirmDeleteMapItem('memoria', currentMemory.id);
    });
  }

  // Renderizar Missões
  missoesData.forEach(item => {
    const icon = createCustomIcon(
      typeBadge('missao', item.cor),
      item.titulo
    );
    const marker = L.marker([item.lat, item.lng], { icon })
      .bindPopup(buildParentCardHtml('missao', item), POPUP_OPTS)
      .addTo(layerGroups.missoes);
    registerMapItem('missao', item, marker);
  });

  // Renderizar Mutirões
  mutiroesData.forEach(item => {
    const icon = createCustomIcon(
      typeBadge('mutirao', item.cor),
      item.titulo
    );
    const marker = L.marker([item.lat, item.lng], { icon })
      .bindPopup(mutiraoPopupHtml(item), POPUP_OPTS)
      .addTo(layerGroups.mutiroes);
    registerMapItem('mutirao', item, marker);
  });

  // Renderizar Memórias
  memoriasData.forEach(item => {
    const icon = L.divIcon({
      className: 'custom-marker-wrapper',
      html: `
        <div class="custom-marker">
          <img src="${item.fotoUrl}" class="marker-thumb" alt="Thumb" onerror="this.onerror=null; this.src='${fallbackImg}';" />
          <span class="marker-label">${item.titulo}</span>
        </div>
      `,
      iconSize: [140, 44],
      iconAnchor: [22, 22]
    });

    const marker = L.marker([item.lat, item.lng], { icon })
      .on('click', () => {
        if (mapTool !== 'select') return;
        openMemoryModal(item);
      })
      .addTo(layerGroups.memorias);
    registerMapItem('memoria', item, marker);
  });

  // Renderizar Marcadores
  marcadoresData.forEach(item => {
    const icon = createCustomIcon(
      typeBadge(item.badgeClass || 'marcador', item.cor),
      item.titulo
    );
    const marker = L.marker([item.lat, item.lng], { icon })
      .bindPopup(buildParentCardHtml('marcador', item), POPUP_OPTS)
      .addTo(layerGroups.marcadores);
    registerMapItem('marcador', item, marker);
  });

  map.on('popupopen', (e) => {
    const root = e.popup?.getElement();
    if (!root) return;
    root.querySelectorAll('.marker-actions, .marker-style-popover').forEach(el => {
      L.DomEvent.disableClickPropagation(el);
      L.DomEvent.disableScrollPropagation(el);
    });
  });

  // (E) ÁREAS DE INTERVENÇÃO — áreas reais (contornos do OpenStreetMap, simplificados)
  // Queimados: Horto Municipal + área verde ao lado; Morro da Baleia.
  // Nova Iguaçu: Serra do Vulcão (Parque Municipal) + trilha.
  const areasReais = [
    // Horto Municipal de Queimados (APA Luiz Gonzaga de Macedo)
    addShapeToMap({
      tipo: 'poligono',
      titulo: 'Horto Municipal de Queimados',
      latlngs: [
        [-22.702334, -43.574488],
        [-22.703377, -43.573517],
        [-22.702922, -43.570487],
        [-22.703266, -43.569934],
        [-22.702504, -43.569730],
        [-22.701701, -43.570796],
        [-22.700725, -43.572306],
        [-22.702183, -43.574000],
        [-22.701978, -43.574311]
      ],
      color: '#1f7a4c',
      fillColor: '#1f7a4c'
    }),
    // Área verde ao lado do Horto (mata entre o Horto e o Morro da Baleia,
    // traçada sobre o satélite Esri)
    addShapeToMap({
      tipo: 'poligono',
      titulo: 'Área verde ao lado do Horto',
      latlngs: [
        [-22.699200, -43.578000],
        [-22.698327, -43.572893],
        [-22.700148, -43.572335],
        [-22.701138, -43.575296],
        [-22.699911, -43.579030]
      ],
      color: '#2e9e63',
      fillColor: '#2e9e63'
    }),
    // Morro da Baleia (Parque Natural Municipal), logo acima do Horto
    addShapeToMap({
      tipo: 'poligono',
      titulo: 'Morro da Baleia',
      latlngs: [
        [-22.697356, -43.581810],
        [-22.699286, -43.579176],
        [-22.698225, -43.575193],
        [-22.695425, -43.575037],
        [-22.694884, -43.576068],
        [-22.696251, -43.580623]
      ],
      color: '#1f7a4c',
      fillColor: '#1f7a4c'
    }),
    // Serra do Vulcão — Parque Natural Municipal de Nova Iguaçu (contorno oficial simplificado)
    addShapeToMap({
      tipo: 'poligono',
      titulo: 'Serra do Vulcão — Parque Municipal de Nova Iguaçu',
      latlngs: [
        [-22.785074, -43.499806],
        [-22.802252, -43.499588],
        [-22.802150, -43.496430],
        [-22.801605, -43.493644],
        [-22.801044, -43.491155],
        [-22.802295, -43.489004],
        [-22.803052, -43.486012],
        [-22.802785, -43.484236],
        [-22.802652, -43.481155],
        [-22.802669, -43.478239],
        [-22.802674, -43.475682],
        [-22.802149, -43.473146],
        [-22.800747, -43.471177],
        [-22.800497, -43.465355],
        [-22.798224, -43.463489],
        [-22.796305, -43.462203],
        [-22.794243, -43.458101],
        [-22.793223, -43.457246],
        [-22.790393, -43.455239],
        [-22.789576, -43.455329],
        [-22.787461, -43.457487],
        [-22.786151, -43.458786],
        [-22.783681, -43.460258],
        [-22.782294, -43.461182],
        [-22.780835, -43.461695],
        [-22.779685, -43.463644],
        [-22.778916, -43.465856],
        [-22.776068, -43.464894],
        [-22.773400, -43.462810],
        [-22.772072, -43.463194],
        [-22.771431, -43.466513],
        [-22.771315, -43.469200],
        [-22.773105, -43.471230],
        [-22.775809, -43.471353],
        [-22.778468, -43.470559],
        [-22.778412, -43.473362],
        [-22.777518, -43.476123],
        [-22.778376, -43.480908],
        [-22.779383, -43.484985],
        [-22.780466, -43.488450],
        [-22.782519, -43.493139],
        [-22.786160, -43.497430],
        [-22.785727, -43.499116]
      ],
      color: '#1f7a4c',
      fillColor: '#1f7a4c'
    }),
    // Trilha na Serra do Vulcão (caminho traçado sobre o satélite)
    addShapeToMap({
      tipo: 'linha',
      titulo: 'Trilha da Serra do Vulcão',
      latlngs: [
        [-22.786400, -43.479200],
        [-22.785500, -43.478000],
        [-22.785100, -43.477000],
        [-22.785900, -43.476200],
        [-22.785000, -43.475300]
      ],
      color: '#1f7a4c'
    })
  ];

  // Enquadrar automaticamente todas as áreas reais ao carregar o mapa.
  // Usa invalidateSize + refit adiado porque o container do mapa só ganha
  // dimensões finais após o layout flex, e fitBounds depende do tamanho real.
  const areasGroup = L.featureGroup(areasReais.map(r => r.layer));
  if (areasReais.length) {
    const fitAreas = () => {
      map.invalidateSize();
      map.fitBounds(areasGroup.getBounds(), { padding: [40, 40] });
    };
    fitAreas();
    setTimeout(fitAreas, 300);
  }

  // 5. INTERAÇÕES E CONTROLES DE INTERFACE

  // Sidebar Toggle
  const sidebar = document.getElementById('sidebar');
  const sidebarToggleBtn = document.getElementById('btn-sidebar-toggle');
  const topbarSidebarToggleBtn = document.getElementById('btn-topbar-sidebar-toggle');

  function toggleSidebar() {
    sidebar.classList.toggle('collapsed');
    setTimeout(() => map.invalidateSize(), 300);
  }
  if (sidebarToggleBtn) sidebarToggleBtn.addEventListener('click', toggleSidebar);
  if (topbarSidebarToggleBtn) topbarSidebarToggleBtn.addEventListener('click', toggleSidebar);

  const btnProfile = document.getElementById('btn-profile');
  const profileMenu = document.getElementById('profile-menu');

  function closeProfileMenu() {
    if (!profileMenu || !btnProfile) return;
    profileMenu.classList.add('hidden');
    btnProfile.setAttribute('aria-expanded', 'false');
  }

  function toggleProfileMenu() {
    if (!profileMenu || !btnProfile) return;
    const isOpen = !profileMenu.classList.contains('hidden');
    profileMenu.classList.toggle('hidden', isOpen);
    btnProfile.setAttribute('aria-expanded', String(!isOpen));
  }

  if (btnProfile && profileMenu) {
    btnProfile.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleProfileMenu();
    });
    profileMenu.addEventListener('click', (e) => e.stopPropagation());
    document.addEventListener('click', closeProfileMenu);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeProfileMenu();
    });
    profileMenu.querySelector('.profile-menu-link')?.addEventListener('click', () => {
      showToast('Abrindo sua rede...');
      closeProfileMenu();
    });
    profileMenu.querySelector('.profile-empty-btn')?.addEventListener('click', () => {
      showToast('Vamos adicionar uma organização.');
      closeProfileMenu();
    });
  }

  // Painéis Flutuantes (Camadas, Filtros, Legenda)
  const toolButtons = document.querySelectorAll('.tool-btn[data-panel]');
  const floatingPanels = document.querySelectorAll('.floating-panel');

  toolButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      setMapTool('select');
      const targetPanelId = btn.getAttribute('data-panel');
      const targetPanel = document.getElementById(targetPanelId);

      // Desativar outras ferramentas
      toolButtons.forEach(b => {
        if (b !== btn && !b.classList.contains('btn-primary-action')) {
          b.classList.remove('active');
        }
      });

      // Fechar outros painéis
      floatingPanels.forEach(panel => {
        if (panel !== targetPanel) panel.classList.add('hidden');
      });

      if (targetPanel) {
        const isHidden = targetPanel.classList.contains('hidden');
        if (isHidden) {
          targetPanel.classList.remove('hidden');
          btn.classList.add('active');
        } else {
          targetPanel.classList.add('hidden');
          btn.classList.remove('active');
        }
      }
    });
  });

  // Fechar painéis ao clicar no X
  document.querySelectorAll('.btn-close-panel').forEach(closeBtn => {
    closeBtn.addEventListener('click', () => {
      const panel = closeBtn.closest('.floating-panel');
      if (panel) panel.classList.add('hidden');
      toolButtons.forEach(b => b.classList.remove('active'));
    });
  });

  // Controle de Visibilidade de Camadas via Checkboxes
  const layerCheckboxes = document.querySelectorAll('.layer-checkbox');
  layerCheckboxes.forEach(chk => {
    chk.addEventListener('change', (e) => {
      const layerName = chk.getAttribute('data-layer');
      const group = layerGroups[layerName];
      if (group) {
        if (chk.checked) {
          map.addLayer(group);
        } else {
          map.removeLayer(group);
        }
      }
    });
  });

  // Seletor de Base de Mapa (Satélite vs Vetorial)
  const baseOptions = document.querySelectorAll('.base-option');
  baseOptions.forEach(opt => {
    opt.addEventListener('click', () => {
      baseOptions.forEach(o => o.classList.remove('active'));
      opt.classList.add('active');

      const mode = opt.getAttribute('data-base');
      if (mode === 'satellite') {
        map.removeLayer(streetTile);
        map.addLayer(satelliteTile);
      } else {
        map.removeLayer(satelliteTile);
        map.addLayer(streetTile);
      }
    });
  });

  // Ferramentas de mapa: selecionar, mover, desenhar, posicionar
  const btnSelect = document.getElementById('tool-select');
  const btnPan = document.getElementById('tool-pan');
  const btnPointer = document.getElementById('tool-pointer');
  const btnPointerMenu = document.getElementById('tool-pointer-menu-btn');
  const pointerSplit = document.getElementById('tool-pointer-split');
  const pointerFlyout = document.getElementById('pointer-tool-flyout');
  const pointerIcon = document.getElementById('tool-pointer-icon');
  let lastPointerTool = 'select';
  const btnDesenhar = document.getElementById('tool-desenhar');
  const drawingSubbar = document.getElementById('drawing-subbar');
  const markerSubbar = document.getElementById('marker-subbar');
  const btnNovaMissao = document.getElementById('btn-nova-missao');
  const shapeActionsEl = document.getElementById('shape-actions');
  const shapeEditPanel = document.getElementById('shape-edit-panel');
  const confirmDeleteEl = document.getElementById('confirm-delete');
  const drawColorPicker = document.getElementById('draw-color-picker');
  const drawColorLabel = document.getElementById('draw-color-label');
  if (shapeActionsEl) L.DomEvent.disableClickPropagation(shapeActionsEl);
  if (shapeEditPanel) L.DomEvent.disableClickPropagation(shapeEditPanel);
  const PLACE_TOAST = {
    missao: 'Clique no mapa para posicionar a missão.',
    mutirao: 'Clique no mapa para posicionar o mutirão.',
    memoria: 'Clique no mapa para posicionar a memória.',
    marcador: 'Clique no mapa para posicionar o marcador.'
  };

  function setFeatureClicksEnabled(on) {
    const groups = [
      layerGroups.missoes,
      layerGroups.mutiroes,
      layerGroups.memorias,
      layerGroups.marcadores,
      layerGroups.areas
    ];
    groups.forEach(group => {
      group.eachLayer(layer => {
        if (layer._icon) layer._icon.style.pointerEvents = on ? '' : 'none';
        if (layer._path) layer._path.style.pointerEvents = on ? '' : 'none';
      });
    });
  }

  function discardDraft() {
    drawState.vertices = [];
    drawState.draft = null;
    drawState.draftCasing = null;
    draftGroup.clearLayers();
  }

  function redrawDraft(mouseLatLng) {
    if (drawState.draft) {
      draftGroup.removeLayer(drawState.draft);
      drawState.draft = null;
    }
    if (drawState.draftCasing) {
      draftGroup.removeLayer(drawState.draftCasing);
      drawState.draftCasing = null;
    }
    const pts = drawState.vertices.slice();
    if (mouseLatLng && pts.length) pts.push(mouseLatLng);
    if (pts.length < 2) return;
    const isLine = drawState.tool === 'linha';
    if (isLine) {
      drawState.draftCasing = L.polyline(pts, draftCasingStyle());
      drawState.draftCasing.addTo(draftGroup);
    }
    drawState.draft = isLine
      ? L.polyline(pts, draftLineStyle())
      : L.polygon(pts, draftPolyStyle());
    drawState.draft.addTo(draftGroup);
  }

  function addVertex(latlng) {
    drawState.vertices.push(latlng);
    L.circleMarker(latlng, {
      radius: 5,
      color: drawState.color,
      fillColor: '#ffffff',
      fillOpacity: 1,
      weight: 2,
      interactive: false
    }).addTo(draftGroup);
    redrawDraft(null);
  }

  function commitDrawing() {
    const minPoints = drawState.tool === 'linha' ? 2 : 3;
    if (drawState.vertices.length < minPoints) {
      showToast(
        drawState.tool === 'linha'
          ? 'Clique pelo menos dois pontos para criar a linha.'
          : 'Clique pelo menos três pontos para criar a área.'
      );
      return;
    }

    const verts = drawState.vertices.slice();
    const latlngs = verts.map(ll => [ll.lat, ll.lng]);
    if (drawState.tool === 'linha') {
      drawState.seqLinha += 1;
    } else {
      drawState.seqArea += 1;
    }
    const titulo = drawState.tool === 'linha'
      ? `Linha ${drawState.seqLinha}`
      : `Área ${drawState.seqArea}`;
    addShapeToMap({
      tipo: drawState.tool,
      titulo,
      latlngs,
      color: drawState.color,
      fillColor: drawState.color
    });
    discardDraft();
    if (mapTool === 'draw') setFeatureClicksEnabled(false);
    showToast(`"${titulo}" adicionada ao mapa.`);
  }

  function updateDrawColorLabel() {
    const label = drawState.tool === 'linha' ? 'Cor da linha' : 'Cor da área';
    if (drawColorLabel) drawColorLabel.textContent = 'Cor';
    if (drawColorPicker) drawColorPicker.setAttribute('aria-label', label);
    const swatches = document.getElementById('draw-color-swatches');
    if (swatches) swatches.setAttribute('aria-label', label);
  }

  function setDrawColor(color) {
    drawState.color = color;
    if (drawColorPicker) drawColorPicker.value = color;
    syncSwatchActive('draw-color-swatches', color);
    if (drawState.vertices.length >= 2) redrawDraft(null);
  }

  function closeDrawingMode() {
    isDrawing = false;
    map.getContainer().classList.remove('drawing-cursor');
    map.doubleClickZoom.enable();
    discardDraft();
    if (drawingSubbar) drawingSubbar.classList.add('hidden');
    if (btnDesenhar) btnDesenhar.classList.remove('active');
  }

  function resetPlaceState() {
    placeState.type = null;
    placeState.latlng = null;
    placeState.source = null;
    placeState.shape = null;
    placeState.pickingInside = false;
    placeState.parent = null;
  }

  function closeShapeAddFlyout() {
    const flyout = document.getElementById('shape-add-flyout');
    const addBtn = document.getElementById('btn-shape-add');
    if (flyout) flyout.classList.add('hidden');
    if (addBtn) addBtn.setAttribute('aria-expanded', 'false');
  }

  function setBboxPicking(on) {
    if (!selection.bbox) return;
    selection.bbox.setStyle(on
      ? {
          color: '#0b0f0a',
          weight: 2,
          dashArray: '6, 4',
          fill: true,
          fillColor: '#1f7a4c',
          fillOpacity: 0.22,
          interactive: false
        }
      : {
          color: '#0b0f0a',
          weight: 2,
          dashArray: '6, 4',
          fill: false,
          fillOpacity: 0,
          interactive: false
        });
  }

  function cancelShapeAttach() {
    const wasAttaching = placeState.pickingInside || placeState.source === 'shape';
    if (wasAttaching) setBboxPicking(false);
    placeState.pickingInside = false;
    if (placeState.source === 'shape') {
      placeState.source = null;
      placeState.shape = null;
      placeState.type = null;
      placeState.latlng = null;
    }
    map.getContainer().classList.remove('place-cursor');
    map.dragging.enable();
    if (wasAttaching && mapTool === 'select') {
      map.getContainer().classList.add('select-cursor');
      setFeatureClicksEnabled(true);
      if (selection.record) updateShapeActionsPosition();
    }
  }

  function startShapeAttach(kind) {
    const record = selection.record;
    if (!record) return;
    closeShapeAddFlyout();
    if (shapeEditPanel) shapeEditPanel.classList.add('hidden');
    if (shapeActionsEl) shapeActionsEl.classList.add('hidden');
    placeState.type = kind;
    placeState.source = 'shape';
    placeState.shape = record;
    placeState.pickingInside = true;
    placeState.latlng = null;
    placeState.parent = null;
    setBboxPicking(true);
    map.dragging.disable();
    map.getContainer().classList.remove('select-cursor');
    map.getContainer().classList.add('place-cursor');
    setFeatureClicksEnabled(false);
    const itemLabel = kind === 'missao' ? 'a missão' : kind === 'totem' ? 'o totem' : 'o marcador';
    showToast(`Clique dentro do destaque para posicionar ${itemLabel}.`);
  }

  function tryPlaceInside(latlng) {
    const record = placeState.shape || selection.record;
    if (!record) return;
    if (!isPointInShape(latlng, record)) {
      showToast('Esse ponto está fora da área. Clique dentro do destaque.');
      return;
    }
    placeState.latlng = latlng;
    placeState.pickingInside = false;
    map.getContainer().classList.remove('place-cursor');
    map.getContainer().classList.add('select-cursor');
    map.dragging.enable();
    openCreationModalForPlacement();
  }

  function closePlacementMode() {
    if (placeState.pickingInside || placeState.source === 'shape') {
      setBboxPicking(false);
      map.dragging.enable();
    }
    resetPlaceState();
    map.getContainer().classList.remove('place-cursor');
    if (markerSubbar) {
      markerSubbar.classList.add('hidden');
      markerSubbar.querySelectorAll('.draw-btn').forEach(b => b.classList.remove('active'));
    }
    if (btnNovaMissao) btnNovaMissao.classList.remove('active');
  }

  function clearSelection() {
    closeShapeAddFlyout();
    if (placeState.pickingInside || placeState.source === 'shape') {
      cancelShapeAttach();
    }
    selectionGroup.clearLayers();
    selection.record = null;
    selection.bbox = null;
    if (shapeActionsEl) shapeActionsEl.classList.add('hidden');
    if (shapeEditPanel) shapeEditPanel.classList.add('hidden');
    const percursoPanelEl = document.getElementById('percurso-edit-panel');
    if (percursoPanelEl) percursoPanelEl.classList.add('hidden');
  }

  function updateShapeActionsPosition() {
    if (!selection.bbox || !shapeActionsEl) return;
    const ne = selection.bbox.getBounds().getNorthEast();
    const point = map.latLngToContainerPoint(ne);
    shapeActionsEl.style.left = `${point.x}px`;
    shapeActionsEl.style.top = `${point.y}px`;
    if (placeState.source === 'shape') {
      shapeActionsEl.classList.add('hidden');
      return;
    }
    shapeActionsEl.classList.remove('hidden');
  }

  function selectShape(record) {
    if (placeState.pickingInside || placeState.source === 'shape') {
      cancelShapeAttach();
    }
    if (shapeEditPanel) shapeEditPanel.classList.add('hidden');
    closeShapeAddFlyout();
    selection.record = record;
    selectionGroup.clearLayers();
    selection.bbox = L.rectangle(record.layer.getBounds(), {
      color: '#0b0f0a',
      weight: 2,
      dashArray: '6, 4',
      fill: false,
      interactive: false
    }).addTo(selectionGroup);
    const addBtn = document.getElementById('btn-shape-add');
    if (addBtn) {
      addBtn.setAttribute('aria-label', record.tipo === 'linha' ? 'Adicionar à trilha' : 'Adicionar à área');
    }
    updateShapeActionsPosition();
    if (typeof refreshShapePercursoButton === 'function') refreshShapePercursoButton();
  }

  function closePointerFlyout() {
    if (!pointerFlyout || !btnPointerMenu) return;
    pointerFlyout.classList.add('hidden');
    btnPointerMenu.setAttribute('aria-expanded', 'false');
  }

  function openPointerFlyout() {
    if (!pointerFlyout || !btnPointerMenu) return;
    pointerFlyout.classList.remove('hidden');
    btnPointerMenu.setAttribute('aria-expanded', 'true');
  }

  function updatePointerGroupUI(tool) {
    const isPointer = tool === 'select' || tool === 'pan';
    if (isPointer) lastPointerTool = tool;

    if (pointerSplit) pointerSplit.classList.toggle('active', isPointer);
    if (btnPointer) {
      const label = lastPointerTool === 'pan' ? 'Mover' : 'Selecionar';
      btnPointer.setAttribute('aria-label', label);
      btnPointer.title = label;
    }
    if (pointerIcon) {
      pointerIcon.src = lastPointerTool === 'pan'
        ? './icons/hand.svg'
        : './icons/mouse-pointer.svg';
    }
    if (btnSelect) btnSelect.classList.toggle('selected', lastPointerTool === 'select');
    if (btnPan) btnPan.classList.toggle('selected', lastPointerTool === 'pan');
  }

  function setMapTool(tool) {
    if (tool !== 'draw') closeDrawingMode();
    if (tool !== 'place') closePlacementMode();
    if (tool !== 'select') clearSelection();
    else if (shapeEditPanel) shapeEditPanel.classList.add('hidden');

    mapTool = tool;
    isDrawing = tool === 'draw';
    updatePointerGroupUI(tool);
    closePointerFlyout();

    const container = map.getContainer();
    container.classList.toggle('drawing-cursor', tool === 'draw');
    container.classList.toggle('pan-cursor', tool === 'pan');
    container.classList.toggle('select-cursor', tool === 'select');
    container.classList.toggle('place-cursor', tool === 'place' && !!placeState.type);

    if (tool === 'draw' || tool === 'place') {
      map.doubleClickZoom.disable();
      setFeatureClicksEnabled(false);
    } else if (tool === 'pan') {
      map.doubleClickZoom.enable();
      setFeatureClicksEnabled(false);
    } else {
      map.doubleClickZoom.enable();
      setFeatureClicksEnabled(true);
    }
  }

  setMapTool('select');

  function uiClickIgnored(target) {
    return !!(target && target.closest(
      '.leaflet-control, .floating-toolbar, .drawing-subbar, .floating-panel, .shape-actions, .shape-edit-panel, .confirm-backdrop, .modal-backdrop'
    ));
  }

  function onMapClick(e) {
    if (skipNextMapClick) {
      skipNextMapClick = false;
      return;
    }
    const target = e.originalEvent?.target;
    if (uiClickIgnored(target)) return;

    if (placeState.pickingInside) {
      tryPlaceInside(e.latlng);
      return;
    }
    if (mapTool === 'draw') {
      addVertex(e.latlng);
      return;
    }
    if (mapTool === 'place' && !placeState.type) {
      showToast('Escolha um tipo para posicionar no mapa.');
      return;
    }
    if (mapTool === 'place' && placeState.type && !creationModal?.classList.contains('open')) {
      placeState.latlng = e.latlng;
      openCreationModalForPlacement();
      return;
    }
    if (mapTool === 'select') {
      clearSelection();
    }
  }

  function onDrawMapDblClick(e) {
    if (mapTool !== 'draw') return;
    L.DomEvent.stop(e);
    if (drawState.vertices.length > 0) {
      drawState.vertices.pop();
      const layers = draftGroup.getLayers();
      const lastMarker = [...layers].reverse().find(l => l instanceof L.CircleMarker);
      if (lastMarker) draftGroup.removeLayer(lastMarker);
    }
    commitDrawing();
  }

  function onDrawMapMouseMove(e) {
    if (mapTool !== 'draw' || drawState.vertices.length === 0) return;
    redrawDraft(e.latlng);
  }

  function onMapKeyDown(e) {
    if (e.target instanceof Element && e.target.closest('input, textarea, select, [contenteditable="true"]')) return;

    if (e.key === 'Escape') {
      if (pointerFlyout && !pointerFlyout.classList.contains('hidden')) {
        closePointerFlyout();
        return;
      }
      const shapeAddFlyout = document.getElementById('shape-add-flyout');
      if (shapeAddFlyout && !shapeAddFlyout.classList.contains('hidden')) {
        closeShapeAddFlyout();
        return;
      }
      if (confirmDeleteEl && !confirmDeleteEl.classList.contains('hidden')) {
        pendingDelete = null;
        confirmDeleteEl.classList.add('hidden');
        return;
      }
      if (creationModal && creationModal.classList.contains('open')) {
        closeModal();
        return;
      }
      if (placeState.pickingInside || placeState.source === 'shape') {
        cancelShapeAttach();
        showToast('Posicionamento cancelado.');
        return;
      }
      if (shapeEditPanel && !shapeEditPanel.classList.contains('hidden')) {
        shapeEditPanel.classList.add('hidden');
        return;
      }
      const percursoPanelForEsc = document.getElementById('percurso-edit-panel');
      if (percursoPanelForEsc && !percursoPanelForEsc.classList.contains('hidden')) {
        percursoPanelForEsc.classList.add('hidden');
        return;
      }
      if (mapTool === 'draw' && drawState.vertices.length > 0) {
        discardDraft();
        showToast('Rascunho cancelado.');
        return;
      }
      if (mapTool === 'draw') {
        setMapTool('select');
        return;
      }
      if (selection.record) {
        clearSelection();
        return;
      }
      if (mapTool === 'place') {
        setMapTool('select');
        showToast('Posicionamento cancelado.');
        return;
      }
    }
    if (e.key === 'Enter' && mapTool === 'draw') {
      e.preventDefault();
      commitDrawing();
    }
  }

  map.on('click', onMapClick);
  map.on('dblclick', onDrawMapDblClick);
  map.on('mousemove', onDrawMapMouseMove);
  map.on('zoom move moveend', updateShapeActionsPosition);
  document.addEventListener('keydown', onMapKeyDown);

  if (btnPointer) {
    btnPointer.addEventListener('click', () => {
      floatingPanels.forEach(panel => panel.classList.add('hidden'));
      toolButtons.forEach(b => b.classList.remove('active'));
      setMapTool(lastPointerTool);
    });
  }

  if (btnPointerMenu) {
    btnPointerMenu.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = pointerFlyout && !pointerFlyout.classList.contains('hidden');
      if (isOpen) {
        closePointerFlyout();
      } else {
        floatingPanels.forEach(panel => panel.classList.add('hidden'));
        openPointerFlyout();
      }
    });
  }

  [btnSelect, btnPan].forEach(btn => {
    if (!btn) return;
    btn.addEventListener('click', () => {
      floatingPanels.forEach(panel => panel.classList.add('hidden'));
      toolButtons.forEach(b => b.classList.remove('active'));
      setMapTool(btn.getAttribute('data-tool'));
    });
  });

  document.addEventListener('click', (e) => {
    const group = document.getElementById('pointer-tool-group');
    if (group && !group.contains(e.target)) closePointerFlyout();
    if (shapeActionsEl && !shapeActionsEl.contains(e.target)) closeShapeAddFlyout();
  });

  if (btnDesenhar && drawingSubbar) {
    btnDesenhar.addEventListener('click', () => {
      floatingPanels.forEach(panel => panel.classList.add('hidden'));
      toolButtons.forEach(b => b.classList.remove('active'));
      const willOpen = drawingSubbar.classList.contains('hidden');
      if (willOpen) {
        setMapTool('draw');
        drawingSubbar.classList.remove('hidden');
        btnDesenhar.classList.add('active');
        const activeBtn = drawingSubbar.querySelector('.draw-btn.active');
        drawState.tool = activeBtn?.getAttribute('data-draw') || 'poligono';
        updateDrawColorLabel();
        showToast('Clique no mapa para adicionar pontos. Duplo clique ou Enter para concluir. Esc para cancelar.');
      } else {
        setMapTool('select');
      }
    });

    drawingSubbar.querySelectorAll('.draw-btn[data-draw]').forEach(btn => {
      btn.addEventListener('click', () => {
        drawingSubbar.querySelectorAll('.draw-btn[data-draw]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const mode = btn.getAttribute('data-draw');
        discardDraft();
        drawState.tool = mode;
        updateDrawColorLabel();
        if (mode === 'linha') showToast('Modo de desenho de linha ativado');
        if (mode === 'poligono') showToast('Modo de polígono ativado');
      });
    });
  }

  document.querySelectorAll('#draw-color-swatches .color-swatch').forEach(btn => {
    btn.addEventListener('click', () => setDrawColor(btn.dataset.color));
  });
  if (drawColorPicker) {
    drawColorPicker.addEventListener('input', () => setDrawColor(drawColorPicker.value));
  }

  if (btnNovaMissao && markerSubbar) {
    btnNovaMissao.addEventListener('click', () => {
      floatingPanels.forEach(panel => panel.classList.add('hidden'));
      toolButtons.forEach(b => b.classList.remove('active'));
      const willOpen = markerSubbar.classList.contains('hidden');
      if (willOpen) {
        setMapTool('place');
        markerSubbar.classList.remove('hidden');
        btnNovaMissao.classList.add('active');
      } else {
        setMapTool('select');
      }
    });

    markerSubbar.querySelectorAll('.draw-btn[data-place]').forEach(btn => {
      btn.addEventListener('click', () => {
        markerSubbar.querySelectorAll('.draw-btn[data-place]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        placeState.type = btn.getAttribute('data-place');
        map.getContainer().classList.add('place-cursor');
        setFeatureClicksEnabled(false);
        showToast(PLACE_TOAST[placeState.type] || PLACE_TOAST.marcador);
      });
    });
  }

  function openShapeEdit(mode = 'name') {
    const record = selection.record;
    if (!record) return;
    const nameInput = document.getElementById('input-shape-name');
    const strokeInput = document.getElementById('input-shape-stroke');
    const fillInput = document.getElementById('input-shape-fill');
    const fillGroup = document.getElementById('shape-fill-group');
    const nameGroup = document.getElementById('shape-name-group');
    const strokeGroup = document.getElementById('shape-stroke-group');
    const titleEl = document.getElementById('shape-edit-title');
    if (nameInput) nameInput.value = record.titulo;
    if (strokeInput) strokeInput.value = record.color;
    if (fillInput) fillInput.value = record.fillColor || record.color;
    const styleMode = mode === 'style';
    if (titleEl) titleEl.textContent = styleMode ? 'Estilo' : 'Editar nome';
    nameGroup?.classList.toggle('hidden', styleMode);
    strokeGroup?.classList.toggle('hidden', !styleMode);
    if (fillGroup) fillGroup.classList.toggle('hidden', !styleMode || record.tipo === 'linha');
    syncSwatchActive('edit-stroke-swatches', record.color);
    syncSwatchActive('edit-fill-swatches', record.fillColor || record.color);
    if (shapeEditPanel) shapeEditPanel.classList.remove('hidden');
  }

  function saveShapeEdit() {
    const record = selection.record;
    if (!record) return;
    const nameInput = document.getElementById('input-shape-name');
    const strokeInput = document.getElementById('input-shape-stroke');
    const fillInput = document.getElementById('input-shape-fill');
    const name = (nameInput?.value || '').trim() || record.titulo;
    const stroke = strokeInput?.value || record.color;
    const fill = fillInput?.value || record.fillColor || stroke;
    record.titulo = name;
    record.color = stroke;
    record.fillColor = fill;
    if (record.tipo === 'linha') {
      record.layer.setStyle(lineStyle(stroke));
    } else {
      record.layer.setStyle(polyStyle(stroke, fill));
    }
    record.layer.unbindTooltip();
    record.layer.bindTooltip(name, { permanent: false });
    if (shapeEditPanel) shapeEditPanel.classList.add('hidden');
    const percursoDaForma = typeof getPercursoForShape === 'function' ? getPercursoForShape(record) : null;
    if (percursoDaForma) {
      percursoDaForma.titulo = name;
      if (typeof refreshFigitalPanel === 'function') refreshFigitalPanel();
    }
    showToast('Alterações salvas.');
  }

  function openDeleteConfirm() {
    if (!selection.record || !confirmDeleteEl) return;
    pendingDelete = { type: 'shape' };
    const msgEl = document.getElementById('confirm-delete-message');
    if (msgEl) {
      msgEl.textContent = selection.record.tipo === 'linha'
        ? 'Excluir esta linha? Isso não pode ser desfeito.'
        : 'Excluir esta área? Isso não pode ser desfeito.';
    }
    confirmDeleteEl.classList.remove('hidden');
  }

  function deleteSelectedShape() {
    const record = selection.record;
    if (!record) return;
    layerGroups.areas.removeLayer(record.layer);
    if (record.casing) layerGroups.areas.removeLayer(record.casing);
    const idx = desenhos.indexOf(record);
    if (idx >= 0) desenhos.splice(idx, 1);

    // Fase 1.2/1.3: se a forma era um percurso, remove os totens e o percurso junto
    if (typeof getPercursoForShape === 'function') {
      const percurso = getPercursoForShape(record);
      if (percurso) {
        (percurso.totens || []).forEach(t => {
          const entry = totemEntries.get(t.id);
          if (entry) {
            layerGroups.totens.removeLayer(entry.marker);
            totemEntries.delete(t.id);
            const mi = mapItems.findIndex(m => m.kind === 'totem' && m.data.id === t.id);
            if (mi >= 0) mapItems.splice(mi, 1);
          }
        });
        percursosById.delete(percurso.id);
        percursoIdByShapeId.delete(record.id);
        if (typeof refreshFigitalPanel === 'function') refreshFigitalPanel();
      }
    }

    clearSelection();
    pendingDelete = null;
    if (confirmDeleteEl) confirmDeleteEl.classList.add('hidden');
    showToast(record.tipo === 'linha' ? 'Linha excluída.' : 'Área excluída.');
  }

  const btnShapeAdd = document.getElementById('btn-shape-add');
  const shapeAddFlyout = document.getElementById('shape-add-flyout');
  const btnShapeStyle = document.getElementById('btn-shape-style');
  const btnShapeEdit = document.getElementById('btn-shape-edit');
  const btnShapeDelete = document.getElementById('btn-shape-delete');
  const btnShapeEditCancel = document.getElementById('btn-shape-edit-cancel');
  const btnShapeEditSave = document.getElementById('btn-shape-edit-save');
  const btnConfirmCancel = document.getElementById('btn-confirm-cancel');
  const btnConfirmDelete = document.getElementById('btn-confirm-delete');

  if (btnShapeAdd && shapeAddFlyout) {
    L.DomEvent.disableClickPropagation(shapeAddFlyout);
    btnShapeAdd.addEventListener('click', (e) => {
      e.stopPropagation();
      if (shapeEditPanel) shapeEditPanel.classList.add('hidden');
      const isOpen = !shapeAddFlyout.classList.contains('hidden');
      if (isOpen) {
        closeShapeAddFlyout();
      } else {
        shapeAddFlyout.classList.remove('hidden');
        btnShapeAdd.setAttribute('aria-expanded', 'true');
      }
    });
    shapeAddFlyout.querySelectorAll('[data-attach]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        startShapeAttach(btn.getAttribute('data-attach'));
      });
    });
  }
  if (btnShapeStyle) btnShapeStyle.addEventListener('click', (e) => {
    e.stopPropagation();
    openShapeEdit('style');
  });
  if (btnShapeEdit) btnShapeEdit.addEventListener('click', (e) => {
    e.stopPropagation();
    openShapeEdit('name');
  });
  if (btnShapeDelete) btnShapeDelete.addEventListener('click', (e) => {
    e.stopPropagation();
    openDeleteConfirm();
  });
  if (btnShapeEditCancel) btnShapeEditCancel.addEventListener('click', () => {
    if (shapeEditPanel) shapeEditPanel.classList.add('hidden');
  });
  if (btnShapeEditSave) btnShapeEditSave.addEventListener('click', saveShapeEdit);
  if (btnConfirmCancel) btnConfirmCancel.addEventListener('click', () => {
    pendingDelete = null;
    if (confirmDeleteEl) confirmDeleteEl.classList.add('hidden');
  });
  if (btnConfirmDelete) btnConfirmDelete.addEventListener('click', () => {
    if (pendingDelete?.type === 'item') {
      deleteMapItem(pendingDelete.kind, pendingDelete.id);
      pendingDelete = null;
      if (confirmDeleteEl) confirmDeleteEl.classList.add('hidden');
    } else {
      deleteSelectedShape();
    }
  });
  if (confirmDeleteEl) {
    confirmDeleteEl.addEventListener('click', (e) => {
      if (e.target === confirmDeleteEl) {
        pendingDelete = null;
        confirmDeleteEl.classList.add('hidden');
      }
    });
  }

  function wireEditSwatches(containerId, inputId) {
    const input = document.getElementById(inputId);
    document.querySelectorAll(`#${containerId} .color-swatch`).forEach(btn => {
      btn.addEventListener('click', () => {
        if (input) input.value = btn.dataset.color;
        syncSwatchActive(containerId, btn.dataset.color);
      });
    });
    if (input) {
      input.addEventListener('input', () => syncSwatchActive(containerId, input.value));
    }
  }
  wireEditSwatches('edit-stroke-swatches', 'input-shape-stroke');
  wireEditSwatches('edit-fill-swatches', 'input-shape-fill');

  // Filtros de exibição (status, categoria, período)
  const filterTrigger = document.getElementById('filter-category-trigger');
  const filterMenu = document.getElementById('filter-category-menu');
  const filterLabel = document.getElementById('filter-category-label');
  const filterDateFrom = document.getElementById('filter-date-from');
  const filterDateTo = document.getElementById('filter-date-to');
  const filterClearDates = document.getElementById('filter-clear-dates');
  let selectedCategory = 'todas';

  function getFilterState() {
    const statuses = new Set();
    document.querySelectorAll('.filter-status-checkbox:checked').forEach(chk => {
      statuses.add(chk.getAttribute('data-status'));
    });
    const from = parseDisplayDate(filterDateFrom?.value);
    let to = parseDisplayDate(filterDateTo?.value);
    if (to) to = new Date(to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59, 999);
    return { statuses, category: selectedCategory, dateFrom: from, dateTo: to };
  }

  function inDateRange(date, from, to) {
    if (!from && !to) return true;
    if (!date) return true;
    const t = date.getTime();
    if (from && t < from.getTime()) return false;
    if (to && t > to.getTime()) return false;
    return true;
  }

  function itemMatchesFilters(kind, data, state) {
    if (kind === 'missao') {
      if (!state.statuses.has(missionStatusKey(data.status))) return false;
      if (state.category !== 'todas' && categoriaKey(data.categoria) !== state.category) return false;
      if (!inDateRange(parseDisplayDate(data.prazo), state.dateFrom, state.dateTo)) return false;
    } else if (kind === 'mutirao') {
      if (!inDateRange(parseDisplayDate(data.dataHora), state.dateFrom, state.dateTo)) return false;
    } else if (kind === 'memoria') {
      if (!inDateRange(parseDisplayDate(data.data), state.dateFrom, state.dateTo)) return false;
    } else if (kind === 'marcador') {
      if (state.category !== 'todas' && data.categoria && categoriaKey(data.categoria) !== state.category) {
        return false;
      }
    }
    return true;
  }

  function applyFilters() {
    const state = getFilterState();
    if (filterClearDates) {
      filterClearDates.classList.toggle('hidden', !state.dateFrom && !state.dateTo);
    }

    const groupByKind = {
      missao: layerGroups.missoes,
      mutirao: layerGroups.mutiroes,
      memoria: layerGroups.memorias,
      marcador: layerGroups.marcadores
    };

    let datedVisible = 0;
    let datedTotal = 0;

    mapItems.forEach(entry => {
      const group = groupByKind[entry.kind];
      if (!group) return;
      const visible = itemMatchesFilters(entry.kind, entry.data, state);
      if (visible) {
        if (!group.hasLayer(entry.marker)) group.addLayer(entry.marker);
      } else if (group.hasLayer(entry.marker)) {
        group.removeLayer(entry.marker);
      }
      if (entry.kind === 'missao' || entry.kind === 'mutirao' || entry.kind === 'memoria') {
        datedTotal += 1;
        if (visible) datedVisible += 1;
      }
    });

    if (
      filtersReady
      && (state.dateFrom || state.dateTo)
      && datedTotal > 0
      && datedVisible === 0
    ) {
      const key = `${filterDateFrom?.value || ''}|${filterDateTo?.value || ''}`;
      if (key !== lastEmptyPeriodToast) {
        lastEmptyPeriodToast = key;
        showToast('Nada neste período. Tente outras datas.');
      }
    } else if (datedVisible > 0) {
      lastEmptyPeriodToast = '';
    }
  }

  if (filterTrigger && filterMenu) {
    filterTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = !filterMenu.classList.contains('hidden');
      filterMenu.classList.toggle('hidden', isOpen);
      filterTrigger.setAttribute('aria-expanded', String(!isOpen));
    });

    filterMenu.querySelectorAll('.filter-option').forEach(opt => {
      opt.addEventListener('click', () => {
        filterMenu.querySelectorAll('.filter-option').forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
        selectedCategory = opt.getAttribute('data-value') || 'todas';
        if (filterLabel) filterLabel.textContent = opt.textContent.trim();
        filterMenu.classList.add('hidden');
        filterTrigger.setAttribute('aria-expanded', 'false');
        applyFilters();
      });
    });
  }

  document.querySelectorAll('.filter-status-checkbox').forEach(chk => {
    chk.addEventListener('change', applyFilters);
  });
  if (filterDateFrom) filterDateFrom.addEventListener('change', applyFilters);
  if (filterDateTo) filterDateTo.addEventListener('change', applyFilters);
  if (filterClearDates) {
    filterClearDates.addEventListener('click', () => {
      if (filterDateFrom) filterDateFrom.value = '';
      if (filterDateTo) filterDateTo.value = '';
      lastEmptyPeriodToast = '';
      applyFilters();
    });
  }

  applyFilters();
  filtersReady = true;

  // 6. MODAL DE CRIAÇÃO (+ Novo Elemento)
  const creationModal = document.getElementById('creation-modal');
  const btnCancelModal = document.getElementById('btn-cancel-modal');
  const btnCloseModalX = document.getElementById('btn-close-modal-x');
  const creationForm = document.getElementById('creation-form');
  const modalTabs = document.querySelectorAll('.modal-tab');
  const modalTitleEl = document.getElementById('creation-modal-title');
  const modalTabsEl = document.getElementById('creation-modal-tabs');
  const btnSubmitModal = document.getElementById('btn-submit-modal');
  let currentActiveTab = 'missao';
  const MODAL_TITLES = {
    missao: 'Nova missão',
    mutirao: 'Vincular mutirão',
    memoria: 'Nova memória',
    marcador: 'Novo marcador',
    totem: 'Novo totem'
  };
  const EDIT_TITLES = {
    missao: 'Editar missão',
    mutirao: 'Editar mutirão',
    memoria: 'Editar memória',
    marcador: 'Editar marcador',
    totem: 'Editar totem'
  };
  let editingTotemId = null;

  // Memória Upload Elements
  const dropzoneMemoria = document.getElementById('dropzone-memoria');
  const inputFotoMemoria = document.getElementById('input-foto-memoria');
  const dropzonePrompt = document.getElementById('dropzone-prompt');
  const dropzonePreview = document.getElementById('dropzone-preview');
  const imgPreviewMemoria = document.getElementById('img-preview-memoria');
  const btnRemovePhoto = document.getElementById('btn-remove-photo');
  let loadedMemoriaPhoto = null;

  // Marcador Radio Elements
  const optionTipoAlerta = document.getElementById('option-tipo-alerta');
  const optionTipoInteresse = document.getElementById('option-tipo-interesse');

  function openModal() {
    if (creationModal) creationModal.classList.add('open');
  }

  function restoreMemoryVinculoSelect() {
    const select = document.getElementById('select-vinculo-memoria');
    if (select) select.disabled = false;
    const helper = document.getElementById('memory-vinculo-helper');
    if (helper) helper.textContent = 'Escolha a missão ou o marcador ligado a esta memória.';
  }

  function setMemoryVinculo(kind, titulo) {
    const select = document.getElementById('select-vinculo-memoria');
    if (!select) return;
    const exists = Array.from(select.options).some(opt => opt.value === titulo);
    if (!exists) {
      const opt = document.createElement('option');
      opt.value = titulo;
      opt.textContent = `${kind === 'marcador' ? 'Marcador' : 'Missão'}: ${titulo}`;
      select.appendChild(opt);
    }
    select.value = titulo;
    select.disabled = true;
    const helper = document.getElementById('memory-vinculo-helper');
    if (helper) {
      helper.textContent = kind === 'marcador'
        ? 'Esta memória fica ligada a este marcador.'
        : 'Esta memória fica ligada a esta missão.';
    }
  }

  function closeModal() {
    if (creationModal) creationModal.classList.remove('open');
    creationModal?.querySelector('.modal-card')?.classList.remove('is-totem-wizard');
    if (modalTabsEl) modalTabsEl.classList.remove('hidden');
    if (modalTitleEl) modalTitleEl.textContent = 'Novo Elemento no Mapa';
    restoreMemoryVinculoSelect();
    editingTotemId = null;
    editingItemId = null;
    if (placeState.source === 'shape' || placeState.pickingInside) {
      cancelShapeAttach();
    } else {
      placeState.latlng = null;
      placeState.parent = null;
      if (placeState.source === 'parent') {
        placeState.source = null;
        placeState.type = null;
      }
    }
  }

  function openCreationModalForPlacement() {
    editingItemId = null;
    if (placeState.type === 'totem') {
      editingTotemId = null;
      resetTotemForm(placeState.shape);
    }
    if (placeState.type === 'missao') {
      resetMissaoForm();
    }
    if (modalTitleEl) modalTitleEl.textContent = MODAL_TITLES[placeState.type] || 'Novo marcador';
    if (modalTabsEl) modalTabsEl.classList.add('hidden');
    setActiveTab(placeState.type || 'marcador');
    openModal();
  }

  if (btnCancelModal) btnCancelModal.addEventListener('click', closeModal);
  if (btnCloseModalX) btnCloseModalX.addEventListener('click', closeModal);

  // Alternância de Abas no Modal
  function setActiveTab(tabName) {
    currentActiveTab = tabName;

    // Atualiza estado visual das abas
    modalTabs.forEach(tab => {
      const isTarget = tab.dataset.tab === tabName;
      tab.classList.toggle('active', isTarget);
    });

    // Exibe o painel de conteúdo correto e ajusta os campos obrigatórios
    const panels = document.querySelectorAll('.tab-panel');
    panels.forEach(panel => {
      const isTargetPanel = panel.id === `tab-content-${tabName}`;
      panel.style.display = isTargetPanel ? 'flex' : 'none';
      
      // Ajusta o 'required' dos inputs para não bloquear o submit de abas ocultas
      const inputs = panel.querySelectorAll('input, select, textarea');
      inputs.forEach(input => {
        if (isTargetPanel) {
          if (input.dataset.originalRequired === 'true') {
            input.required = true;
          }
        } else {
          if (input.required) {
            input.dataset.originalRequired = 'true';
            input.required = false;
          }
        }
      });
    });

    // Atualiza o texto e estilo do botão de confirmação conforme o UX Writing da aba
    if (btnSubmitModal) {
      btnSubmitModal.className = 'card-btn';
      if (btnCancelModal) btnCancelModal.classList.remove('hidden');
      const isEditing = !!editingItemId || !!editingTotemId;
      if (tabName === 'totem') {
        btnSubmitModal.classList.add('card-btn-primary');
        btnSubmitModal.textContent = isEditing ? 'Salvar totem' : 'Criar totem';
      } else {
        if (tabName === 'missao') {
          btnSubmitModal.classList.add('card-btn-primary');
          btnSubmitModal.textContent = isEditing ? 'Salvar missão' : 'Criar Missão';
        } else if (tabName === 'mutirao') {
          btnSubmitModal.classList.add('card-btn-amber');
          btnSubmitModal.textContent = isEditing ? 'Salvar mutirão' : 'Vincular Mutirão';
        } else if (tabName === 'memoria') {
          btnSubmitModal.classList.add('card-btn-purple');
          btnSubmitModal.textContent = isEditing ? 'Salvar memória' : 'Salvar Memória';
        } else if (tabName === 'marcador') {
          btnSubmitModal.classList.add('card-btn-primary');
          btnSubmitModal.textContent = isEditing ? 'Salvar marcador' : 'Adicionar Marcador';
        }
      }
    }
  }

  modalTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      setActiveTab(tab.dataset.tab || 'missao');
    });
  });

  // Upload de Imagem na aba Memória
  if (dropzoneMemoria && inputFotoMemoria) {
    dropzoneMemoria.addEventListener('click', (e) => {
      if (e.target !== btnRemovePhoto) {
        inputFotoMemoria.click();
      }
    });

    inputFotoMemoria.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          loadedMemoriaPhoto = event.target.result;
          imgPreviewMemoria.src = loadedMemoriaPhoto;
          dropzonePrompt.classList.add('hidden');
          dropzonePreview.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
      }
    });

    if (btnRemovePhoto) {
      btnRemovePhoto.addEventListener('click', (e) => {
        e.stopPropagation();
        loadedMemoriaPhoto = null;
        inputFotoMemoria.value = '';
        imgPreviewMemoria.src = '';
        dropzonePreview.classList.add('hidden');
        dropzonePrompt.classList.remove('hidden');
      });
    }

    // Suporte a Drag and Drop
    dropzoneMemoria.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzoneMemoria.style.borderColor = 'var(--primary)';
    });
    dropzoneMemoria.addEventListener('dragleave', () => {
      dropzoneMemoria.style.borderColor = '#cbd5e1';
    });
    dropzoneMemoria.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzoneMemoria.style.borderColor = '#cbd5e1';
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        inputFotoMemoria.files = e.dataTransfer.files;
        const event = new Event('change');
        inputFotoMemoria.dispatchEvent(event);
      }
    });
  }

  // Seleção de Tipo de Marcador (Alerta vs Ponto de Interesse)
  if (optionTipoAlerta && optionTipoInteresse) {
    optionTipoAlerta.addEventListener('click', () => {
      optionTipoAlerta.classList.add('active');
      optionTipoInteresse.classList.remove('active');
      optionTipoAlerta.querySelector('input').checked = true;
    });

    optionTipoInteresse.addEventListener('click', () => {
      optionTipoInteresse.classList.add('active');
      optionTipoAlerta.classList.remove('active');
      optionTipoInteresse.querySelector('input').checked = true;
    });
  }

  // Submit do Formulário do Modal
  if (creationForm) {
    creationForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const center = placeState.latlng || map.getCenter();
      const vinculoForma = placeState.source === 'shape' && placeState.shape
        ? { tipo: placeState.shape.tipo, titulo: placeState.shape.titulo }
        : null;
      const memoryParent = placeState.parent;

      if (currentActiveTab === 'missao') {
        const titleInput = document.getElementById('input-titulo-missao').value || 'Nova Missão no Território';
        const descInput = document.getElementById('input-descricao-missao').value || 'Ação comunitária para melhoria local.';
        const catInput = document.getElementById('select-categoria-missao').value;
        const instrucaoInput = (document.getElementById('input-instrucao-missao')?.value || '').trim();
        const recompensaInput = (document.getElementById('input-recompensa-missao')?.value || '').trim();
        const temPrazo = !!document.getElementById('toggle-prazo-missao')?.checked;
        const prazoInput = temPrazo ? document.getElementById('input-prazo-missao').value : '';
        const insumos = missaoInsumosBuilder.get();
        const temNpc = !!document.getElementById('toggle-npc-missao')?.checked;
        const npc = temNpc
          ? {
              nome: document.getElementById('input-npc-nome-missao')?.value || 'Guardiã do território',
              falas: missaoFalasBuilder.get()
            }
          : null;
        const editing = editingItemId && findMapItem('missao', editingItemId);
        if (editing) {
          Object.assign(editing.data, {
            titulo: titleInput,
            descricao: descInput,
            temPrazo,
            prazo: prazoInput,
            categoria: categoriaKey(catInput),
            categoriaLabel: catInput,
            instrucao: instrucaoInput,
            insumos,
            recompensa: recompensaInput,
            npc
          });
          refreshPinAppearance(editing);
          refreshPinPopup(editing);
          showToast(`Missão "${titleInput}" atualizada.`);
        } else {
          const newData = {
            id: newFeatureId('m'),
            lat: center.lat,
            lng: center.lng,
            titulo: titleInput,
            descricao: descInput,
            status: 'Em andamento',
            temPrazo,
            prazo: prazoInput,
            categoria: categoriaKey(catInput),
            categoriaLabel: catInput,
            instrucao: instrucaoInput,
            insumos,
            recompensa: recompensaInput,
            npc,
            qr: null,
            vinculo: vinculoForma,
            memorias: [],
            tipo: 'missao'
          };

          const newIcon = createCustomIcon(
            typeBadge('missao', newData.cor),
            titleInput
          );

          const marker = L.marker([center.lat, center.lng], { icon: newIcon })
            .bindPopup(buildParentCardHtml('missao', newData), POPUP_OPTS)
            .addTo(layerGroups.missoes);
          registerMapItem('missao', newData, marker);
          applyFilters();

          showToast(`Missão "${titleInput}" criada no ponto escolhido.`);
        }

      } else if (currentActiveTab === 'mutirao') {
        const mutiraoTitle = document.getElementById('select-mutirao-existente').value;
        const editing = editingItemId && findMapItem('mutirao', editingItemId);
        if (editing) {
          editing.data.titulo = mutiraoTitle;
          refreshPinAppearance(editing);
          refreshPinPopup(editing);
          showToast(`Mutirão "${mutiraoTitle}" atualizado.`);
        } else {
          const newIcon = createCustomIcon(
            typeBadge('mutirao'),
            mutiraoTitle
          );

          const newData = {
            id: newFeatureId('mu'),
            lat: center.lat,
            lng: center.lng,
            titulo: mutiraoTitle,
            dataHora: formatMemoryDate(new Date().toISOString().slice(0, 10)),
            tipo: 'mutirao'
          };

          const marker = L.marker([center.lat, center.lng], { icon: newIcon })
            .bindPopup(mutiraoPopupHtml(newData), POPUP_OPTS)
            .addTo(layerGroups.mutiroes);
          registerMapItem('mutirao', newData, marker);
          applyFilters();

          showToast(`"${mutiraoTitle}" vinculado no ponto escolhido.`);
        }

      } else if (currentActiveTab === 'memoria') {
        const memoriaTitle = document.getElementById('input-titulo-memoria').value || 'Memória Fotográfica';
        const memoriaData = document.getElementById('input-data-memoria').value;
        const parentKind = memoryParent?.kind;
        const parentId = memoryParent?.id;
        const parentEntry = parentId ? parentById.get(parentId) : null;
        if (!parentEntry) {
          showToast('Escolha a missão ou o marcador ligado a esta memória.');
          return;
        }
        const photoSrc = loadedMemoriaPhoto || 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=400&q=80';
        const parentName = parentEntry.data.titulo;
        const vinculoFrase = parentKind === 'marcador'
          ? `Ligada ao marcador ${parentName}.`
          : `Ligada à missão ${parentName}.`;

        if (editingItemId) {
          const existing = (parentEntry.data.memorias || []).find(m => m.id === editingItemId);
          if (existing) {
            existing.titulo = memoriaTitle;
            existing.data = memoriaData;
            existing.descricao = vinculoFrase;
            if (loadedMemoriaPhoto) {
              existing.fotoUrl = loadedMemoriaPhoto;
              existing.fotos = [loadedMemoriaPhoto, ...(existing.fotos || []).slice(1)];
            }
            const pin = findMapItem('memoria', existing.id);
            if (pin) refreshPinAppearance(pin);
            refreshParentPopup(parentId, 'memorias');
            showToast(`Memória "${memoriaTitle}" atualizada.`);
          }
        } else {
          const newMemoria = {
            id: newFeatureId('mem'),
            titulo: memoriaTitle,
            autor: 'Amanda',
            data: memoriaData,
            fotoUrl: photoSrc,
            descricao: vinculoFrase,
            fotos: [photoSrc, ...extraFotos],
            comentarios: []
          };

          if (!parentEntry.data.memorias) parentEntry.data.memorias = [];
          parentEntry.data.memorias.push(newMemoria);
          refreshParentPopup(parentId, 'memorias');

          showToast(`Memória ligada ${parentKind === 'marcador' ? 'ao marcador' : 'à missão'} ${parentName}.`);
        }

      } else if (currentActiveTab === 'marcador') {
        const tipoMarcador = document.querySelector('input[name="tipo-marcador"]:checked')?.value || 'alerta';
        const marcadorTitle = document.getElementById('input-titulo-marcador').value || 'Marcador Territorial';
        const marcadorCat = document.getElementById('select-categoria-marcador').value;
        const marcadorDesc = document.getElementById('input-descricao-marcador').value || 'Anotação comunitária no território.';

        const badgeClass = tipoMarcador === 'alerta' ? 'alerta' : 'marcador';
        const tagTitle = tipoMarcador === 'alerta' ? 'Alerta Comunitário' : 'Ponto de Interesse';
        const editing = editingItemId && findMapItem('marcador', editingItemId);
        if (editing) {
          Object.assign(editing.data, {
            titulo: marcadorTitle,
            descricao: marcadorDesc,
            categoria: categoriaKey(marcadorCat),
            categoriaLabel: marcadorCat,
            badgeClass,
            tagTitle
          });
          refreshPinAppearance(editing);
          refreshPinPopup(editing);
          showToast(`Marcador "${marcadorTitle}" atualizado.`);
        } else {
          const newData = {
            id: newFeatureId('mar'),
            lat: center.lat,
            lng: center.lng,
            titulo: marcadorTitle,
            descricao: marcadorDesc,
            status: 'Ativo',
            categoria: categoriaKey(marcadorCat),
            categoriaLabel: marcadorCat,
            badgeClass,
            tagTitle,
            vinculo: vinculoForma,
            memorias: [],
            tipo: 'marcador'
          };

          const newIcon = createCustomIcon(
            typeBadge(badgeClass, newData.cor),
            marcadorTitle
          );

          const marker = L.marker([center.lat, center.lng], { icon: newIcon })
            .bindPopup(buildParentCardHtml('marcador', newData), POPUP_OPTS)
            .addTo(layerGroups.marcadores);
          registerMapItem('marcador', newData, marker);
          applyFilters();

          showToast(`Marcador "${marcadorTitle}" adicionado no ponto escolhido.`);
        }

      } else if (currentActiveTab === 'totem') {
        const ok = submitTotemForm(center);
        if (!ok) return; // validação falhou; mantém modal aberto
      }

      // Resetar formulário e fechar modal
      closeModal();
      setMapTool('select');
      creationForm.reset();
      if (btnRemovePhoto && loadedMemoriaPhoto) {
        btnRemovePhoto.click();
      }
      setActiveTab('missao');
    });
  }

  window.openCreateMemoryFor = function(kind, id) {
    const parent = parentById.get(id);
    if (!parent) return;
    map.closePopup();
    editingItemId = null;
    placeState.type = 'memoria';
    placeState.source = 'parent';
    placeState.parent = { kind, id, titulo: parent.data.titulo };
    placeState.shape = null;
    placeState.pickingInside = false;
    placeState.latlng = parent.marker.getLatLng();
    if (modalTitleEl) modalTitleEl.textContent = 'Nova memória';
    if (modalTabsEl) modalTabsEl.classList.add('hidden');
    setActiveTab('memoria');
    setMemoryVinculo(kind, parent.data.titulo);
    openModal();
  };

  // 7. FUNÇÃO PARA CRIAR MUTIRÃO VINCULADO À MISSÃO
  window.openCreateMutiraoForMissao = function(missaoTitulo) {
    if (creationModal) {
      placeState.type = 'mutirao';
      placeState.latlng = map.getCenter();
      if (modalTitleEl) modalTitleEl.textContent = 'Vincular mutirão';
      if (modalTabsEl) modalTabsEl.classList.add('hidden');
      openModal();
      setActiveTab('mutirao');

      const selectMutirao = document.getElementById('select-mutirao-existente');
      if (selectMutirao) {
        selectMutirao.focus();
      }
      showToast(`Selecione o mutirão existente para associar à missão "${missaoTitulo}"`);
    }
  };

  // ==========================================================================
  // 9. FIGITAL — FASE 1 (percurso, totem, missão de totem, insumos, QR, painel)
  // Referência: docs/CAMPANHA_FIGITAL.md e docs/fases de implementacao/FASE_1_MAPA_FIGITAL.md
  // ==========================================================================

  const MAPA_ID = 'mapa-demo-1';
  let mapaVisibilidade = 'privado'; // 'privado' | 'publico' — RN-FIG-006
  const percursosById = new Map();       // percursoId -> Percurso
  const percursoIdByShapeId = new Map(); // desenho.id -> percursoId
  const totemEntries = new Map();        // totemId -> { data: Totem, marker }

  function getPercursoForShape(record) {
    const percursoId = percursoIdByShapeId.get(record.id);
    return percursoId ? percursosById.get(percursoId) : null;
  }

  function getOrCreatePercursoForShape(record) {
    let percurso = getPercursoForShape(record);
    if (percurso) return percurso;
    percurso = createPercurso({
      mapaId: MAPA_ID,
      geometriaId: record.id,
      titulo: record.titulo
    });
    percursosById.set(percurso.id, percurso);
    percursoIdByShapeId.set(record.id, percurso.id);
    return percurso;
  }

  function nextTotemNome(percurso) {
    const n = (percurso.totens || []).length + 1;
    return `Totem ${n}`;
  }

  // ---- Construtor reutilizável: falas do NPC (totem e missão) ----

  function createFalasBuilder({ listId, addBtnId }) {
    const state = [];
    function render() {
      const container = document.getElementById(listId);
      if (!container) return;
      container.innerHTML = state.map((fala, i) => `
        <div class="totem-fala-row" data-fala-index="${i}">
          <div class="totem-fala-row-header">
            <span>Fala ${i + 1}</span>
            <button type="button" class="row-remove-btn" data-remove-fala="${i}">Remover</button>
          </div>
          <textarea class="form-textarea totem-fala-texto" rows="2" placeholder="Ex: Bem-vinda à serra. Siga até o mirante." data-fala-texto="${i}">${escapeHtml(fala.texto || '')}</textarea>
        </div>
      `).join('') || '<p class="figital-empty-state">Nenhuma fala ainda. Adicione a primeira.</p>';

      container.querySelectorAll('[data-remove-fala]').forEach(btn => {
        btn.addEventListener('click', () => {
          syncFromDom();
          state.splice(Number(btn.getAttribute('data-remove-fala')), 1);
          render();
        });
      });
      container.querySelectorAll('[data-fala-texto]').forEach(area => {
        area.addEventListener('input', () => {
          const idx = Number(area.getAttribute('data-fala-texto'));
          if (state[idx]) state[idx].texto = area.value;
        });
      });
    }
    function syncFromDom() {
      const container = document.getElementById(listId);
      if (!container) return;
      container.querySelectorAll('[data-fala-texto]').forEach(area => {
        const idx = Number(area.getAttribute('data-fala-texto'));
        if (state[idx]) state[idx].texto = area.value;
      });
    }
    function set(falas) {
      state.length = 0;
      (falas || []).forEach(f => state.push({ ...f }));
      render();
    }
    function get() {
      syncFromDom();
      return state.map(f => ({ ...f }));
    }
    const addBtn = document.getElementById(addBtnId);
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        syncFromDom();
        state.push({ id: `fala${state.length + 1}`, texto: '' });
        render();
      });
    }
    return { render, syncFromDom, set, get };
  }

  // ---- Construtor reutilizável: catálogo de insumos "O que coletar" (§15) ----

  function createInsumosBuilder({ listId, addBtnId }) {
    const state = [];
    function render() {
      const container = document.getElementById(listId);
      if (!container) return;
      container.innerHTML = state.map((item, i) => `
        <div class="totem-insumo-row" data-insumo-index="${i}">
          <div class="totem-insumo-row-header">
            <span>Item ${i + 1}</span>
            <button type="button" class="row-remove-btn" data-remove-insumo="${i}">Remover</button>
          </div>
          <div class="totem-insumo-row-fields">
            <label class="totem-insumo-field">
              <span>Tipo</span>
              <select class="form-select" data-insumo-field="tipo" data-index="${i}">
                ${TIPOS_INSUMO.map(t => `<option value="${t}" ${item.tipo === t ? 'selected' : ''}>${TIPO_INSUMO_LABEL[t]}</option>`).join('')}
              </select>
            </label>
            <label class="totem-insumo-field">
              <span>Onde aparece</span>
              <select class="form-select" data-insumo-field="visibilidade" data-index="${i}">
                <option value="${VISIBILIDADE_INSUMO.INTERNO}" ${item.visibilidade === VISIBILIDADE_INSUMO.INTERNO ? 'selected' : ''}>Só internamente</option>
                <option value="${VISIBILIDADE_INSUMO.MAPA_PUBLICO}" ${item.visibilidade === VISIBILIDADE_INSUMO.MAPA_PUBLICO ? 'selected' : ''}>No mapa público</option>
              </select>
            </label>
            <label class="totem-insumo-field" style="grid-column: 1 / -1">
              <span>Rótulo</span>
              <input type="text" class="form-input" data-insumo-field="rotulo" data-index="${i}" value="${escapeHtml(item.rotulo || '')}" placeholder="Ex: Foto do vale" />
            </label>
            <label class="percurso-toggle" style="font-size:0.76rem">
              <input type="checkbox" data-insumo-field="obrigatorio" data-index="${i}" ${item.obrigatorio ? 'checked' : ''} />
              <span>Obrigatório</span>
            </label>
          </div>
          <div class="totem-insumo-row-extra">
            <label class="totem-insumo-field">
              <span>Grupo</span>
              <input type="text" class="form-input" data-insumo-field="grupoId" data-index="${i}" value="${escapeHtml(item.grupoId || '')}" placeholder="Opcional" />
            </label>
            <label class="totem-insumo-field">
              <span>Mínimo no grupo</span>
              <input type="number" class="form-input" min="1" data-insumo-field="minimoGrupo" data-index="${i}" value="${item.minimoGrupo ?? ''}" placeholder="Ex: 1" />
            </label>
            ${item.tipo === 'gps' ? `
            <label class="totem-insumo-field">
              <span>Raio em metros</span>
              <input type="number" class="form-input" min="1" data-insumo-field="raioMetros" data-index="${i}" value="${item.validacao?.distanciaMaximaM ?? 80}" />
            </label>
            <label class="percurso-toggle" style="font-size:0.76rem">
              <input type="checkbox" data-insumo-field="gpsObrigatorio" data-index="${i}" ${item.validacao?.gpsObrigatorio ? 'checked' : ''} />
              <span>GPS obrigatório</span>
            </label>` : ''}
          </div>
        </div>
      `).join('') || '<p class="figital-empty-state">Nenhum item ainda. Adicione foto, áudio, texto ou GPS.</p>';

      container.querySelectorAll('[data-remove-insumo]').forEach(btn => {
        btn.addEventListener('click', () => {
          syncFromDom();
          state.splice(Number(btn.getAttribute('data-remove-insumo')), 1);
          render();
        });
      });
      container.querySelectorAll('[data-insumo-field="tipo"]').forEach(sel => {
        sel.addEventListener('change', () => {
          syncFromDom();
          render(); // tipo mudou: re-render para mostrar/esconder campos de GPS
        });
      });
      container.querySelectorAll('[data-insumo-field]').forEach(el => {
        if (el.getAttribute('data-insumo-field') === 'tipo') return;
        el.addEventListener('input', () => syncFromDom());
        el.addEventListener('change', () => syncFromDom());
      });
    }
    function syncFromDom() {
      const container = document.getElementById(listId);
      if (!container) return;
      state.forEach((item, i) => {
        const row = container.querySelector(`[data-insumo-index="${i}"]`);
        if (!row) return;
        const tipoEl = row.querySelector('[data-insumo-field="tipo"]');
        const visEl = row.querySelector('[data-insumo-field="visibilidade"]');
        const rotuloEl = row.querySelector('[data-insumo-field="rotulo"]');
        const obrigEl = row.querySelector('[data-insumo-field="obrigatorio"]');
        const grupoEl = row.querySelector('[data-insumo-field="grupoId"]');
        const minGrupoEl = row.querySelector('[data-insumo-field="minimoGrupo"]');
        const raioEl = row.querySelector('[data-insumo-field="raioMetros"]');
        const gpsObrigEl = row.querySelector('[data-insumo-field="gpsObrigatorio"]');
        if (tipoEl) item.tipo = tipoEl.value;
        if (visEl) item.visibilidade = visEl.value;
        if (rotuloEl) item.rotulo = rotuloEl.value;
        if (obrigEl) item.obrigatorio = obrigEl.checked;
        item.grupoId = grupoEl?.value ? grupoEl.value.trim() : null;
        item.minimoGrupo = minGrupoEl?.value ? Number(minGrupoEl.value) : null;
        if (item.tipo === 'gps') {
          item.validacao = {
            distanciaMaximaM: raioEl?.value ? Number(raioEl.value) : 80,
            gpsObrigatorio: !!gpsObrigEl?.checked
          };
        }
      });
    }
    function set(itens) {
      state.length = 0;
      (itens || []).forEach(it => state.push({ ...it, validacao: { ...(it.validacao || {}) } }));
      render();
    }
    function get() {
      syncFromDom();
      return state.map(it => createItemInsumo(it));
    }
    const addBtn = document.getElementById(addBtnId);
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        syncFromDom();
        state.push(createItemInsumo({ tipo: 'foto' }));
        render();
      });
    }
    return { render, syncFromDom, set, get };
  }

  const totemFalasBuilder = createFalasBuilder({ listId: 'totem-npc-falas', addBtnId: 'btn-add-fala' });
  const missaoFalasBuilder = createFalasBuilder({ listId: 'missao-npc-falas', addBtnId: 'btn-add-fala-missao' });
  const missaoInsumosBuilder = createInsumosBuilder({ listId: 'missao-insumos-list', addBtnId: 'btn-add-insumo-missao' });
  missaoInsumosBuilder.set([]);

  // ---- Toggles: NPC opcional (totem/missão) e prazo opcional (missão) ----

  function bindNpcToggle(toggleId, sectionId, falasBuilder) {
    const toggle = document.getElementById(toggleId);
    const section = document.getElementById(sectionId);
    if (!toggle || !section) return;
    const sync = () => {
      section.hidden = !toggle.checked;
      if (toggle.checked) falasBuilder.render();
    };
    toggle.addEventListener('change', sync);
    sync();
  }
  bindNpcToggle('toggle-npc-totem', 'totem-npc-section', totemFalasBuilder);
  bindNpcToggle('toggle-npc-missao', 'missao-npc-section', missaoFalasBuilder);

  const togglePrazoMissao = document.getElementById('toggle-prazo-missao');
  const prazoMissaoWrapper = document.getElementById('prazo-missao-wrapper');
  if (togglePrazoMissao && prazoMissaoWrapper) {
    const syncPrazo = () => { prazoMissaoWrapper.hidden = !togglePrazoMissao.checked; };
    togglePrazoMissao.addEventListener('change', syncPrazo);
    syncPrazo();
  }

  // Reset dos campos estruturados da missão ao abrir o modal para uma nova missão.
  function resetMissaoForm() {
    missaoInsumosBuilder.set([]);
    missaoFalasBuilder.set([]);
    const toggleNpc = document.getElementById('toggle-npc-missao');
    const npcSection = document.getElementById('missao-npc-section');
    if (toggleNpc) toggleNpc.checked = false;
    if (npcSection) npcSection.hidden = true;
    const togglePrazo = document.getElementById('toggle-prazo-missao');
    const prazoWrapper = document.getElementById('prazo-missao-wrapper');
    if (togglePrazo) togglePrazo.checked = true;
    if (prazoWrapper) prazoWrapper.hidden = false;
    const recompensa = document.getElementById('input-recompensa-missao');
    if (recompensa) recompensa.value = '';
  }

  function toDateInputValue(value) {
    const d = parseDisplayDate(value);
    if (!d) return '';
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  function setSelectByCategoria(selectEl, data) {
    if (!selectEl) return;
    if (data.categoriaLabel) {
      const byLabel = Array.from(selectEl.options).find(o => o.value === data.categoriaLabel);
      if (byLabel) {
        selectEl.value = byLabel.value;
        return;
      }
    }
    const key = categoriaKey(data.categoria);
    const match = Array.from(selectEl.options).find(o => categoriaKey(o.value) === key);
    if (match) selectEl.value = match.value;
  }

  function fillMissaoForm(data) {
    const title = document.getElementById('input-titulo-missao');
    const desc = document.getElementById('input-descricao-missao');
    const instrucao = document.getElementById('input-instrucao-missao');
    const recompensa = document.getElementById('input-recompensa-missao');
    const prazo = document.getElementById('input-prazo-missao');
    const togglePrazo = document.getElementById('toggle-prazo-missao');
    const prazoWrapper = document.getElementById('prazo-missao-wrapper');
    const toggleNpc = document.getElementById('toggle-npc-missao');
    const npcSection = document.getElementById('missao-npc-section');
    const npcNome = document.getElementById('input-npc-nome-missao');
    if (title) title.value = data.titulo || '';
    if (desc) desc.value = data.descricao || '';
    if (instrucao) instrucao.value = data.instrucao || '';
    if (recompensa) recompensa.value = data.recompensa || '';
    setSelectByCategoria(document.getElementById('select-categoria-missao'), data);
    const hasPrazo = data.temPrazo !== false && !!data.prazo;
    if (togglePrazo) togglePrazo.checked = hasPrazo;
    if (prazoWrapper) prazoWrapper.hidden = !hasPrazo;
    if (prazo) prazo.value = toDateInputValue(data.prazo);
    missaoInsumosBuilder.set(data.insumos || []);
    const temNpc = !!data.npc;
    if (toggleNpc) toggleNpc.checked = temNpc;
    if (npcSection) npcSection.hidden = !temNpc;
    if (npcNome) npcNome.value = data.npc?.nome || 'Guardiã do território';
    missaoFalasBuilder.set(data.npc?.falas || []);
  }

  function fillMarcadorForm(data) {
    const isAlerta = data.badgeClass === 'alerta' || (!data.badgeClass && data.tagTitle !== 'Ponto de Interesse');
    if (optionTipoAlerta && optionTipoInteresse) {
      optionTipoAlerta.classList.toggle('active', isAlerta);
      optionTipoInteresse.classList.toggle('active', !isAlerta);
      const alertaInput = optionTipoAlerta.querySelector('input');
      const interesseInput = optionTipoInteresse.querySelector('input');
      if (alertaInput) alertaInput.checked = isAlerta;
      if (interesseInput) interesseInput.checked = !isAlerta;
    }
    const title = document.getElementById('input-titulo-marcador');
    const desc = document.getElementById('input-descricao-marcador');
    if (title) title.value = data.titulo || '';
    if (desc) desc.value = data.descricao || '';
    setSelectByCategoria(document.getElementById('select-categoria-marcador'), data);
  }

  function fillMutiraoForm(data) {
    const select = document.getElementById('select-mutirao-existente');
    if (!select) return;
    const exists = Array.from(select.options).some(opt => opt.value === data.titulo);
    if (!exists && data.titulo) {
      const opt = document.createElement('option');
      opt.value = data.titulo;
      opt.textContent = data.titulo;
      select.appendChild(opt);
    }
    select.value = data.titulo;
  }

  function fillMemoriaForm(data) {
    const title = document.getElementById('input-titulo-memoria');
    const dateInput = document.getElementById('input-data-memoria');
    if (title) title.value = data.titulo || '';
    if (dateInput) dateInput.value = toDateInputValue(data.data) || dateInput.value;
    if (data.fotoUrl && imgPreviewMemoria && dropzonePrompt && dropzonePreview) {
      loadedMemoriaPhoto = data.fotoUrl;
      imgPreviewMemoria.src = data.fotoUrl;
      dropzonePrompt.classList.add('hidden');
      dropzonePreview.classList.remove('hidden');
    }
  }

  function pinBadgeType(entry) {
    if (entry.kind === 'marcador') return entry.data.badgeClass || 'marcador';
    return entry.kind;
  }

  function pinLabel(entry) {
    return entry.kind === 'totem' ? entry.data.nome : entry.data.titulo;
  }

  function refreshPinAppearance(entry) {
    if (!entry?.marker) return;
    if (entry.kind === 'memoria') {
      const hex = safeColor(entry.data.cor);
      const ring = hex ? `box-shadow: 0 0 0 3px ${hex};` : '';
      entry.marker.setIcon(L.divIcon({
        className: 'custom-marker-wrapper',
        html: `
          <div class="custom-marker">
            <img src="${entry.data.fotoUrl}" class="marker-thumb" alt="" style="${ring}" onerror="this.onerror=null; this.src='${fallbackImg}';" />
            <span class="marker-label">${escapeHtml(entry.data.titulo)}</span>
          </div>
        `,
        iconSize: [140, 44],
        iconAnchor: [22, 22]
      }));
      return;
    }
    const extra = entry.kind === 'totem' ? 'marker-totem' : '';
    entry.marker.setIcon(createCustomIcon(
      typeBadge(pinBadgeType(entry), entry.data.cor),
      pinLabel(entry),
      extra
    ));
  }

  function refreshPinPopup(entry, activeTab = 'sobre') {
    if (!entry?.marker) return;
    if (entry.kind === 'missao' || entry.kind === 'marcador') {
      entry.marker.setPopupContent(buildParentCardHtml(entry.kind, entry.data, activeTab));
    } else if (entry.kind === 'mutirao') {
      entry.marker.setPopupContent(mutiraoPopupHtml(entry.data));
    } else if (entry.kind === 'totem') {
      entry.marker.setPopupContent(typeof totemPopupHtml === 'function' ? totemPopupHtml(entry.data) : entry.marker.getPopup()?.getContent());
    }
    if (entry.marker.isPopupOpen()) entry.marker.getPopup()?.update();
  }

  function deleteCopy(kind) {
    return {
      missao: 'Excluir esta missão? Isso não pode ser desfeito.',
      mutirao: 'Excluir este mutirão? Isso não pode ser desfeito.',
      memoria: 'Excluir esta memória? Isso não pode ser desfeito.',
      marcador: 'Excluir este marcador? Isso não pode ser desfeito.',
      totem: 'Excluir este totem? Isso não pode ser desfeito.'
    }[kind] || 'Excluir este item? Isso não pode ser desfeito.';
  }

  function toastDeleted(kind) {
    return {
      missao: 'Missão excluída.',
      mutirao: 'Mutirão excluído.',
      memoria: 'Memória excluída.',
      marcador: 'Marcador excluído.',
      totem: 'Totem excluído.'
    }[kind] || 'Item excluído.';
  }

  function removeFromLayer(entry) {
    if (!entry?.marker) return;
    const group = {
      missao: layerGroups.missoes,
      mutirao: layerGroups.mutiroes,
      memoria: layerGroups.memorias,
      marcador: layerGroups.marcadores,
      totem: layerGroups.totens
    }[entry.kind];
    group?.removeLayer(entry.marker);
  }

  function deleteNestedMemory(id) {
    for (const parent of parentById.values()) {
      const list = parent.data.memorias || [];
      const idx = list.findIndex(m => m.id === id);
      if (idx >= 0) {
        list.splice(idx, 1);
        refreshParentPopup(parent.data.id, 'memorias');
        return true;
      }
    }
    return false;
  }

  function deleteTotemRecord(id) {
    const entry = typeof totemEntries !== 'undefined' ? totemEntries.get(id) : null;
    if (entry) {
      layerGroups.totens.removeLayer(entry.marker);
      totemEntries.delete(id);
      const percurso = percursosById.get(entry.data.percursoId);
      if (percurso) {
        percurso.totens = (percurso.totens || []).filter(t => t.id !== id);
      }
      if (typeof refreshFigitalPanel === 'function') refreshFigitalPanel();
    }
  }

  function deleteMapItem(kind, id) {
    map.closePopup();
    closeMemoryModal();
    if (kind === 'memoria') {
      deleteNestedMemory(id);
    }
    if (kind === 'totem') {
      deleteTotemRecord(id);
    }
    const entry = findMapItem(kind, id);
    if (entry) {
      removeFromLayer(entry);
      const mi = mapItems.indexOf(entry);
      if (mi >= 0) mapItems.splice(mi, 1);
      if (kind === 'missao' || kind === 'marcador') parentById.delete(id);
    }
    showToast(toastDeleted(kind));
  }

  window.toggleMarkerStyle = function(event, kind, id) {
    event?.stopPropagation();
    const pop = document.getElementById(`marker-style-${kind}-${id}`);
    if (!pop) return;
    const willOpen = pop.classList.contains('hidden');
    document.querySelectorAll('.marker-style-popover').forEach(el => el.classList.add('hidden'));
    pop.classList.toggle('hidden', !willOpen);
    const btn = event?.currentTarget;
    if (btn) btn.setAttribute('aria-expanded', String(willOpen));
  };

  window.applyMarkerColor = function(kind, id, color) {
    const hex = safeColor(color);
    if (!hex) return;
    if (kind === 'memoria') {
      const nested = [...parentById.values()].flatMap(p => (p.data.memorias || []).map(m => ({ parent: p, memory: m })))
        .find(row => row.memory.id === id);
      if (nested) nested.memory.cor = hex;
      const pin = findMapItem('memoria', id);
      if (pin) {
        pin.data.cor = hex;
        refreshPinAppearance(pin);
      }
      const pop = document.getElementById('memory-style-popover');
      if (pop) {
        pop.querySelectorAll('.color-swatch').forEach(btn => {
          btn.classList.toggle('active', (btn.dataset.color || '').toLowerCase() === hex.toLowerCase());
        });
      }
      return;
    }
    const entry = findMapItem(kind, id);
    if (!entry) return;
    entry.data.cor = hex;
    refreshPinAppearance(entry);
    const pop = document.getElementById(`marker-style-${kind}-${id}`);
    if (pop) {
      pop.querySelectorAll('.color-swatch').forEach(btn => {
        btn.classList.toggle('active', (btn.dataset.color || '').toLowerCase() === hex.toLowerCase());
      });
      const picker = pop.querySelector('input[type="color"]');
      if (picker) picker.value = hex;
    }
  };

  window.confirmDeleteMapItem = function(kind, id) {
    map.closePopup();
    pendingDelete = { type: 'item', kind, id };
    const msgEl = document.getElementById('confirm-delete-message');
    if (msgEl) msgEl.textContent = deleteCopy(kind);
    confirmDeleteEl?.classList.remove('hidden');
  };

  window.editMapItem = function(kind, id) {
    map.closePopup();
    if (kind === 'totem') {
      openTotemEditor(id);
      return;
    }
    const entry = findMapItem(kind, id);
    if (kind !== 'memoria' && !entry) return;
    editingItemId = id;
    editingTotemId = null;
    if (kind === 'missao' && entry) {
      placeState.type = 'missao';
      placeState.source = null;
      placeState.parent = null;
      fillMissaoForm(entry.data);
    } else if (kind === 'marcador' && entry) {
      placeState.type = 'marcador';
      placeState.source = null;
      placeState.parent = null;
      fillMarcadorForm(entry.data);
    } else if (kind === 'mutirao' && entry) {
      placeState.type = 'mutirao';
      placeState.source = null;
      placeState.parent = null;
      fillMutiraoForm(entry.data);
    } else if (kind === 'memoria') {
      let memory = entry?.data;
      let parent = currentMemoryParent;
      if (!memory) {
        for (const p of parentById.values()) {
          const found = (p.data.memorias || []).find(m => m.id === id);
          if (found) {
            memory = found;
            parent = { kind: p.kind, id: p.data.id, titulo: p.data.titulo };
            break;
          }
        }
      }
      if (!memory || !parent) return;
      placeState.type = 'memoria';
      placeState.source = 'parent';
      placeState.parent = parent;
      placeState.latlng = parentById.get(parent.id)?.marker.getLatLng() || map.getCenter();
      fillMemoriaForm(memory);
      setMemoryVinculo(parent.kind, parent.titulo);
      closeMemoryModal();
    }
    if (modalTitleEl) modalTitleEl.textContent = EDIT_TITLES[kind] || 'Editar';
    if (modalTabsEl) modalTabsEl.classList.add('hidden');
    setActiveTab(kind);
    openModal();
  };

  // ---- Formulário do totem (ponto simples: nome, tipo, descrição, NPC opcional) ----

  function getTotemPapel() {
    return document.querySelector('input[name="papel-totem"]:checked')?.value || PAPEL_TOTEM.INTERMEDIARIO;
  }

  function setTotemPapel(papel) {
    const radio = document.querySelector(`input[name="papel-totem"][value="${papel}"]`);
    if (radio) radio.checked = true;
    updateTotemPapelHelper();
  }

  function setFormError(id, show) {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('hidden', !show);
  }

  function updateTotemPapelHelper() {
    const helper = document.getElementById('totem-papel-helper');
    if (!helper) return;
    helper.textContent = getTotemPapel() === PAPEL_TOTEM.INICIO
      ? 'Só pode haver um totem de início neste percurso.'
      : 'Todo percurso precisa de um totem de início.';
  }

  function validateTotemNome() {
    const nome = (document.getElementById('input-nome-totem')?.value || '').trim();
    const ok = nome.length > 0;
    setFormError('totem-nome-error', !ok);
    if (!ok) document.getElementById('input-nome-totem')?.focus();
    return ok;
  }

  document.querySelectorAll('input[name="papel-totem"]').forEach(radio => {
    radio.addEventListener('change', updateTotemPapelHelper);
  });

  function resetTotemForm(shapeRecord) {
    const percurso = shapeRecord ? getPercursoForShape(shapeRecord) : null;
    const nomeInput = document.getElementById('input-nome-totem');
    const descricaoInput = document.getElementById('input-descricao-totem');
    const npcNomeInput = document.getElementById('input-npc-nome');
    const toggleNpc = document.getElementById('toggle-npc-totem');
    const npcSection = document.getElementById('totem-npc-section');

    if (nomeInput) nomeInput.value = percurso ? nextTotemNome(percurso) : 'Totem 1';
    const temInicio = percurso ? (percurso.totens || []).some(t => t.papel === PAPEL_TOTEM.INICIO) : false;
    setTotemPapel(temInicio ? PAPEL_TOTEM.INTERMEDIARIO : PAPEL_TOTEM.INICIO);
    setFormError('totem-nome-error', false);
    if (descricaoInput) descricaoInput.value = '';
    if (npcNomeInput) npcNomeInput.value = 'Guardiã do território';
    if (toggleNpc) toggleNpc.checked = false;
    if (npcSection) npcSection.hidden = true;

    totemFalasBuilder.set([]);
    updateTotemPapelHelper();
  }

  function openTotemEditor(totemId) {
    const entry = totemEntries.get(totemId);
    if (!entry) return;
    const totem = entry.data;
    map.closePopup();
    editingTotemId = totemId;
    placeState.type = 'totem';
    placeState.source = null;
    placeState.shape = null;
    placeState.pickingInside = false;
    placeState.latlng = null;

    const nomeInput = document.getElementById('input-nome-totem');
    const descricaoInput = document.getElementById('input-descricao-totem');
    const npcNomeInput = document.getElementById('input-npc-nome');
    const toggleNpc = document.getElementById('toggle-npc-totem');
    const npcSection = document.getElementById('totem-npc-section');

    if (nomeInput) nomeInput.value = totem.nome;
    setTotemPapel(totem.papel);
    setFormError('totem-nome-error', false);
    if (descricaoInput) descricaoInput.value = totem.descricao || '';

    const temNpc = !!totem.roteiroNpc;
    if (toggleNpc) toggleNpc.checked = temNpc;
    if (npcSection) npcSection.hidden = !temNpc;
    if (npcNomeInput) npcNomeInput.value = totem.roteiroNpc?.nome || 'Guardiã do território';
    totemFalasBuilder.set(totem.roteiroNpc?.falas || []);
    updateTotemPapelHelper();

    if (modalTitleEl) modalTitleEl.textContent = `Editar totem — ${totem.nome}`;
    if (modalTabsEl) modalTabsEl.classList.add('hidden');
    setActiveTab('totem');
    openModal();
  }
  window.editarTotem = openTotemEditor;

  function submitTotemForm(centerFallback) {
    if (!validateTotemNome()) return false;

    const nome = (document.getElementById('input-nome-totem')?.value || '').trim() || 'Totem';
    const papel = getTotemPapel();
    const descricao = document.getElementById('input-descricao-totem')?.value || '';
    const temNpc = !!document.getElementById('toggle-npc-totem')?.checked;
    const roteiroNpc = temNpc
      ? {
          nome: document.getElementById('input-npc-nome')?.value || 'Guardiã do território',
          falas: totemFalasBuilder.get()
        }
      : null;

    const isEditing = !!editingTotemId;
    const existingEntry = isEditing ? totemEntries.get(editingTotemId) : null;

    // Descobre a que percurso/forma este totem pertence
    let shapeRecord;
    let percurso;
    if (isEditing && existingEntry) {
      percurso = percursosById.get(existingEntry.data.percursoId);
      shapeRecord = desenhos.find(d => d.id === percurso?.geometriaId);
    } else {
      shapeRecord = placeState.shape || selection.record;
      if (!shapeRecord) {
        showToast('Selecione uma trilha ou área antes de adicionar um totem.');
        return false;
      }
      percurso = getOrCreatePercursoForShape(shapeRecord);
    }
    if (!percurso) {
      showToast('Não foi possível localizar o percurso deste totem.');
      return false;
    }

    // RN-FIG-009: só um totem "inicio" por percurso
    if (papel === PAPEL_TOTEM.INICIO) {
      const outroInicio = (percurso.totens || []).find(t => t.papel === PAPEL_TOTEM.INICIO && t.id !== editingTotemId);
      if (outroInicio) {
        showToast(`Este percurso já tem um totem de início ("${outroInicio.nome}"). Troque o tipo ou edite o outro.`);
        return false;
      }
    }

    const lat = isEditing ? existingEntry.data.lat : (centerFallback?.lat ?? map.getCenter().lat);
    const lng = isEditing ? existingEntry.data.lng : (centerFallback?.lng ?? map.getCenter().lng);

    const totemData = createTotem({
      id: isEditing ? editingTotemId : undefined,
      percursoId: percurso.id,
      mapaId: MAPA_ID,
      nome,
      lat,
      lng,
      papel,
      descricao,
      roteiroNpc,
      qr: existingEntry?.data.qr || null
    });
    if (existingEntry?.data.cor) totemData.cor = existingEntry.data.cor;

    if (isEditing) {
      Object.assign(existingEntry.data, totemData);
      updateTotemMarker(existingEntry);
    } else {
      const marker = createTotemMarker(totemData);
      const entry = { data: totemData, marker };
      totemEntries.set(totemData.id, entry);
      percurso.totens.push(totemData);
      registerMapItem('totem', totemData, marker);
    }

    if (shapeRecord) {
      percursoIdByShapeId.set(shapeRecord.id, percurso.id);
      if (selection.record === shapeRecord) updateShapeActionsPosition();
    }

    refreshFigitalPanel();
    showToast(isEditing ? `Totem "${nome}" atualizado.` : `Totem "${nome}" criado no ponto escolhido.`);
    editingTotemId = null;
    totemFalasBuilder.set([]);
    return true;
  }

  function totemPopupHtml(totem) {
    const descricao = totem.descricao
      ? `<p class="card-desc">${escapeHtml(totem.descricao)}</p>`
      : '<p class="card-desc">Sem descrição ainda.</p>';
    const npc = totem.roteiroNpc
      ? `<div class="card-meta"><div class="card-meta-item">Personagem: <strong>${escapeHtml(totem.roteiroNpc.nome || '—')}</strong></div></div>`
      : '';
    return `
      <div class="context-card context-card-simple">
        <div class="card-header-badge">
          <span class="card-type-tag totem">Totem · ${escapeHtml(PAPEL_TOTEM_LABEL[totem.papel] || totem.papel)}</span>
        </div>
        <h3 class="card-title">${escapeHtml(totem.nome)}</h3>
        ${descricao}
        ${npc}
        <div class="card-action-group">
          <button class="card-btn card-btn-outline-amber" type="button" onclick="gerarQrTotem('${escapeJsString(totem.id)}')">Gerar arte de QR</button>
        </div>
        <div id="qr-preview-${totem.id}"></div>
        ${markerActionsHtml('totem', totem.id, totem.cor)}
      </div>
    `;
  }

  function createTotemMarker(totem) {
    const icon = createCustomIcon(typeBadge('totem', totem.cor), totem.nome, 'marker-totem');
    return L.marker([totem.lat, totem.lng], { icon })
      .bindPopup(totemPopupHtml(totem), POPUP_OPTS)
      .addTo(layerGroups.totens);
  }

  function updateTotemMarker(entry) {
    const { data, marker } = entry;
    marker.setLatLng([data.lat, data.lng]);
    marker.setIcon(createCustomIcon(typeBadge('totem', data.cor), data.nome, 'marker-totem'));
    marker.setPopupContent(totemPopupHtml(data));
    if (marker.isPopupOpen()) marker.getPopup()?.update();
  }

  window.gerarQrMissao = async function(missaoId) {
    const entry = parentById.get(missaoId);
    if (!entry || entry.kind !== 'missao') return;
    const missao = entry.data;
    const assinatura = gerarAssinaturaMock(MAPA_ID, missaoId);
    const url = gerarUrlQrMissao({ mapaId: MAPA_ID, missaoId, assinatura });
    missao.qr = { url, assinatura, geradoEm: new Date().toISOString() };
    try {
      const dataUrl = await QRCode.toDataURL(url, { width: 260, margin: 1 });
      const target = document.getElementById(`qr-preview-missao-${missaoId}`);
      const nomeArquivo = `qr-missao-${missao.titulo}`.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      if (target) {
        target.innerHTML = `
          <div class="qr-preview-box">
            <img src="${dataUrl}" alt="QR da missão ${escapeHtml(missao.titulo)}" />
            <span class="qr-preview-url">${escapeHtml(url)}</span>
            <a class="btn-secondary" download="${nomeArquivo}.png" href="${dataUrl}">Baixar PNG</a>
          </div>
        `;
      }
      showToast(`QR gerado para "${missao.titulo}".`);
    } catch (err) {
      showToast('Não foi possível gerar o QR agora.');
    }
  };

  window.gerarQrTotem = async function(totemId) {
    const entry = totemEntries.get(totemId);
    if (!entry) return;
    const totem = entry.data;
    const assinatura = gerarAssinaturaMock(MAPA_ID, totemId);
    const url = gerarUrlQr({ mapaId: MAPA_ID, totemId, assinatura });
    totem.qr = { url, assinatura, geradoEm: new Date().toISOString() };
    try {
      const dataUrl = await QRCode.toDataURL(url, { width: 260, margin: 1 });
      const target = document.getElementById(`qr-preview-${totemId}`);
      const percurso = percursosById.get(totem.percursoId);
      const nomeArquivo = `qr-${totem.nome}-${percurso?.titulo || 'percurso'}`.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      if (target) {
        target.innerHTML = `
          <div class="qr-preview-box">
            <img src="${dataUrl}" alt="QR do totem ${escapeHtml(totem.nome)}" />
            <span class="qr-preview-url">${escapeHtml(url)}</span>
            <a class="btn-secondary" download="${nomeArquivo}.png" href="${dataUrl}">Baixar PNG</a>
          </div>
        `;
      }
      showToast(`QR gerado para "${totem.nome}".`);
      refreshFigitalPanel();
    } catch (err) {
      showToast('Não foi possível gerar o QR agora.');
    }
  };

  // ---- Ficha do percurso (Fase 1.3) ----

  const percursoEditPanel = document.getElementById('percurso-edit-panel');
  if (percursoEditPanel) L.DomEvent.disableClickPropagation(percursoEditPanel);
  const btnShapePercurso = document.getElementById('btn-shape-percurso');
  const btnPercursoCancel = document.getElementById('btn-percurso-cancel');
  const btnPercursoSave = document.getElementById('btn-percurso-save');

  function pontoDentroDaGeometriaChecker(shapeRecord) {
    return (totem) => isPointInShape(L.latLng(totem.lat, totem.lng), shapeRecord);
  }

  function renderPercursoStatus(percurso, shapeRecord) {
    const el = document.getElementById('percurso-status');
    if (!el) return;
    const { pronto, erros } = validarPercurso(percurso, pontoDentroDaGeometriaChecker(shapeRecord));
    el.className = `percurso-status ${pronto ? 'is-pronto' : 'is-pendente'}`;
    el.innerHTML = pronto
      ? '<strong>Pronto.</strong> Este percurso pode ser reconstruído e testado ponta a ponta (critério de pronto da Fase 1).'
      : `<strong>Faltam ajustes:</strong><ul>${erros.map(e => `<li>${escapeHtml(e)}</li>`).join('')}</ul>`;
  }

  function renderPercursoVisibilidadeAviso(percurso) {
    const el = document.getElementById('percurso-visibilidade-aviso');
    if (!el) return;
    el.textContent = (mapaVisibilidade === 'privado' || !percurso.ativo)
      ? 'Mapa privado ou percurso inativo: os QRs gerados aqui só funcionam para quem está editando este mapa (RN-FIG-006).'
      : '';
  }

  function renderPercursoTotensList(percurso) {
    const container = document.getElementById('percurso-totens-list');
    const countEl = document.getElementById('percurso-totens-count');
    if (countEl) countEl.textContent = String((percurso.totens || []).length);
    if (!container) return;
    if (!percurso.totens.length) {
      container.innerHTML = '<p class="figital-empty-state">Nenhum totem ainda. Use o "+" da forma para adicionar.</p>';
      return;
    }
    container.innerHTML = percurso.totens.map(t => `
      <div class="percurso-totem-row">
        <div class="totem-row-info">
          <span>${escapeHtml(t.nome)}</span>
          <span class="totem-row-papel">${escapeHtml(PAPEL_TOTEM_LABEL[t.papel] || t.papel)}</span>
        </div>
        <div class="totem-row-actions">
          <button type="button" data-editar-totem="${t.id}">Editar</button>
          <button type="button" data-qr-totem="${t.id}">QR</button>
        </div>
      </div>
    `).join('');

    container.querySelectorAll('[data-editar-totem]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (percursoEditPanel) percursoEditPanel.classList.add('hidden');
        openTotemEditor(btn.getAttribute('data-editar-totem'));
      });
    });
    container.querySelectorAll('[data-qr-totem]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-qr-totem');
        const entry = totemEntries.get(id);
        if (entry) {
          entry.marker.openPopup();
          window.gerarQrTotem(id);
        }
      });
    });
  }

  function openPercursoPanel() {
    const shapeRecord = selection.record;
    if (!shapeRecord) return;
    const percurso = getPercursoForShape(shapeRecord);
    if (!percurso) return;
    if (shapeEditPanel) shapeEditPanel.classList.add('hidden');
    closeShapeAddFlyout();

    const nomeEl = document.getElementById('percurso-geometria-nome');
    if (nomeEl) nomeEl.textContent = `${shapeKindLabel(shapeRecord.tipo) === 'trilha' ? 'Trilha' : 'Área'}: ${shapeRecord.titulo}`;

    document.getElementById('percurso-modo').value = percurso.modo;
    document.getElementById('percurso-recompensa-final').value = percurso.recompensaFinal;
    document.getElementById('percurso-consentimento').value = percurso.textoConsentimento;
    document.getElementById('percurso-periodo-inicio').value = percurso.periodoInicio || '';
    document.getElementById('percurso-periodo-fim').value = percurso.periodoFim || '';
    document.getElementById('percurso-ativo').checked = !!percurso.ativo;
    document.getElementById('percurso-replay').checked = !!percurso.permiteReplay;

    renderPercursoStatus(percurso, shapeRecord);
    renderPercursoTotensList(percurso);
    renderPercursoVisibilidadeAviso(percurso);

    if (percursoEditPanel) percursoEditPanel.classList.remove('hidden');
  }

  function savePercursoPanel() {
    const shapeRecord = selection.record;
    if (!shapeRecord) return;
    const percurso = getPercursoForShape(shapeRecord);
    if (!percurso) return;
    percurso.modo = document.getElementById('percurso-modo').value;
    percurso.recompensaFinal = document.getElementById('percurso-recompensa-final').value;
    percurso.textoConsentimento = document.getElementById('percurso-consentimento').value;
    percurso.periodoInicio = document.getElementById('percurso-periodo-inicio').value;
    percurso.periodoFim = document.getElementById('percurso-periodo-fim').value;
    percurso.ativo = document.getElementById('percurso-ativo').checked;
    percurso.permiteReplay = document.getElementById('percurso-replay').checked;
    percurso.titulo = shapeRecord.titulo;

    renderPercursoStatus(percurso, shapeRecord);
    renderPercursoVisibilidadeAviso(percurso);
    refreshFigitalPanel();
    showToast('Percurso salvo.');
  }

  if (btnShapePercurso) {
    btnShapePercurso.addEventListener('click', (e) => {
      e.stopPropagation();
      openPercursoPanel();
    });
  }
  if (btnPercursoCancel) {
    btnPercursoCancel.addEventListener('click', () => {
      if (percursoEditPanel) percursoEditPanel.classList.add('hidden');
    });
  }
  if (btnPercursoSave) btnPercursoSave.addEventListener('click', savePercursoPanel);

  function refreshShapePercursoButton() {
    const record = selection.record;
    const percurso = record ? getPercursoForShape(record) : null;
    if (btnShapePercurso) {
      btnShapePercurso.classList.toggle('hidden', !percurso || !(percurso.totens || []).length);
    }
  }

  // ---- Painel do mapa Figital (Fase 1.6 visibilidade + Fase 1.8 indicadores/export) ----

  const figitalPercursosList = document.getElementById('figital-percursos-list');
  const indPercursos = document.getElementById('ind-percursos');
  const indTotens = document.getElementById('ind-totens');

  function refreshFigitalPanel() {
    const percursos = Array.from(percursosById.values());
    if (indPercursos) indPercursos.textContent = String(percursos.length);
    if (indTotens) indTotens.textContent = String(totemEntries.size);

    if (figitalPercursosList) {
      if (!percursos.length) {
        figitalPercursosList.innerHTML = '<p class="figital-empty-state">Nenhum percurso ainda. Coloque um totem numa trilha ou área para criar o primeiro.</p>';
      } else {
        figitalPercursosList.innerHTML = percursos.map(p => {
          const shapeRecord = desenhos.find(d => d.id === p.geometriaId);
          const { pronto } = validarPercurso(p, shapeRecord ? pontoDentroDaGeometriaChecker(shapeRecord) : null);
          return `
            <div class="figital-percurso-row">
              <span>${escapeHtml(p.titulo)} <span class="totem-row-papel">(${(p.totens || []).length} totens)</span></span>
              <span class="${pronto ? 'badge-pronto' : 'badge-pendente'}">${pronto ? 'Pronto' : 'Pendente'}</span>
            </div>
          `;
        }).join('');
      }
    }
    refreshShapePercursoButton();
  }

  const mapaVisibilidadeSelector = document.getElementById('mapa-visibilidade-selector');
  const mapaVisibilidadeHelper = document.getElementById('mapa-visibilidade-helper');
  if (mapaVisibilidadeSelector) {
    mapaVisibilidadeSelector.querySelectorAll('[data-visibilidade]').forEach(btn => {
      btn.addEventListener('click', () => {
        mapaVisibilidadeSelector.querySelectorAll('[data-visibilidade]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        mapaVisibilidade = btn.getAttribute('data-visibilidade');
        if (mapaVisibilidadeHelper) {
          mapaVisibilidadeHelper.textContent = mapaVisibilidade === 'publico'
            ? 'Público: qualquer pessoa vê a geometria e pode iniciar jornada nos percursos ativos (RN-FIG-006).'
            : 'Privado: só quem colabora no mapa vê a geometria e inicia jornada de teste (RN-FIG-006).';
        }
        showToast(`Mapa marcado como ${mapaVisibilidade === 'publico' ? 'público' : 'privado'}.`);
        refreshFigitalPanel();
        if (selection.record) renderPercursoVisibilidadeAviso(getPercursoForShape(selection.record) || { ativo: false });
      });
    });
  }

  function shapesToGeoJson() {
    const shapeFeatures = desenhos.map(d => {
      const percurso = getPercursoForShape(d);
      return {
        type: 'Feature',
        properties: {
          tipo: d.tipo,
          titulo: d.titulo,
          percursoId: percurso?.id || null,
          modo: percurso?.modo || null,
          ativo: percurso?.ativo ?? null
        },
        geometry: {
          type: d.tipo === 'linha' ? 'LineString' : 'Polygon',
          coordinates: d.tipo === 'linha'
            ? d.latlngs.map(([lat, lng]) => [lng, lat])
            : [[...d.latlngs.map(([lat, lng]) => [lng, lat]), [d.latlngs[0][1], d.latlngs[0][0]]]]
        }
      };
    });
    const totemFeatures = Array.from(totemEntries.values()).map(({ data }) => ({
      type: 'Feature',
      properties: {
        tipo: 'totem',
        nome: data.nome,
        papel: data.papel,
        percursoId: data.percursoId,
        descricao: data.descricao || ''
      },
      geometry: { type: 'Point', coordinates: [data.lng, data.lat] }
    }));
    return { type: 'FeatureCollection', features: [...shapeFeatures, ...totemFeatures] };
  }

  function downloadBlob(content, filename, mime) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const btnExportGeojson = document.getElementById('btn-export-geojson');
  if (btnExportGeojson) {
    btnExportGeojson.addEventListener('click', () => {
      downloadBlob(JSON.stringify(shapesToGeoJson(), null, 2), 'figital-mapa.geojson', 'application/geo+json');
      showToast('GeoJSON exportado.');
    });
  }

  const btnExportCsv = document.getElementById('btn-export-csv');
  if (btnExportCsv) {
    btnExportCsv.addEventListener('click', () => {
      const rows = [['id', 'nome', 'papel', 'percurso', 'lat', 'lng', 'descricao']];
      totemEntries.forEach(({ data }) => {
        const percurso = percursosById.get(data.percursoId);
        rows.push([
          data.id, data.nome, data.papel, percurso?.titulo || '', data.lat, data.lng,
          data.descricao || ''
        ]);
      });
      const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
      downloadBlob(csv, 'figital-totens.csv', 'text/csv');
      showToast('CSV exportado.');
    });
  }

  refreshFigitalPanel();

  // 8. TOAST NOTIFICATION UTILITY
  window.showToast = function(message) {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  };
});
