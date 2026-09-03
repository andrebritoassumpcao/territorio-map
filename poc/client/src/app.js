/* ==========================================================================
   TERRITÓRIO — MAPA COLABORATIVO (PROTÓTIPO VISUAL DE ALTA FIDELIDADE)
   LOGICA JAVASCRIPT LEVE DE INTERAÇÃO DA INTERFACE
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // 1. INICIALIZAÇÃO DO MAPA (LEAFLET + SATÉLITE ESRI)
  // Coordenadas focadas na região do Rio Sarapuí / Duque de Caxias - RJ (captura original)
  const initialLat = -22.784;
  const initialLng = -43.342;
  const initialZoom = 15;

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
    areas: L.layerGroup().addTo(map)
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

  function casingStyle(isPoly) {
    return {
      color: '#ffffff',
      weight: isPoly ? 7 : 8,
      opacity: 0.95,
      fill: false,
      fillOpacity: 0,
      interactive: true,
      bubblingMouseEvents: true,
      lineJoin: 'round',
      lineCap: 'round'
    };
  }

  function lineStyle(color) {
    return {
      color,
      weight: 5,
      lineJoin: 'round',
      lineCap: 'round',
      interactive: true,
      bubblingMouseEvents: true
    };
  }

  function polyStyle(color, fillColor) {
    return {
      color,
      weight: 4,
      fillColor: fillColor || color,
      fillOpacity: 0.28,
      lineJoin: 'round',
      interactive: true,
      bubblingMouseEvents: true
    };
  }

  function draftCasingStyle() {
    return { ...casingStyle(drawState.tool !== 'linha'), interactive: false };
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
    pin: './icons/map-pin.svg'
  };

  function iconImg(src, size = 16) {
    return `<span class="ds-icon" style="width:${size}px;height:${size}px"><img src="${src}" alt="" width="${size}" height="${size}"></span>`;
  }

  function typeBadge(type) {
    const src = {
      missao: ICON.sprout,
      mutirao: ICON.users,
      memoria: ICON.camera,
      marcador: ICON.pin,
      alerta: ICON.pin
    }[type] || ICON.pin;
    return `<div class="marker-badge ${type}">${iconImg(src, 18)}</div>`;
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
      selectShape(record);
    };
    record.layer.on('click', onShapeClick);
    record.casing.on('click', onShapeClick);
  }

  function addShapeToMap({ tipo, titulo, latlngs, color, fillColor }) {
    const isLine = tipo === 'linha';
    const stroke = color || '#1f7a4c';
    const fill = fillColor || stroke;
    const casing = isLine
      ? L.polyline(latlngs, casingStyle(false))
      : L.polygon(latlngs, casingStyle(true));
    const layer = isLine
      ? L.polyline(latlngs, lineStyle(stroke))
      : L.polygon(latlngs, polyStyle(stroke, fill));

    casing.addTo(layerGroups.areas);
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

  function memoryActionHtml(kind, titulo, lat, lng) {
    return `<button type="button" class="card-btn card-btn-purple" onclick="openCreateMemoryFor('${kind}','${escapeJsString(titulo)}',${lat},${lng})">Adicionar memória</button>`;
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

  // (A) MISSÕES (🌱 Verde)
  const missoesData = [
    {
      id: 'm1',
      lat: -22.783,
      lng: -43.341,
      titulo: 'Recuperação da nascente Sarapuí',
      status: 'Em andamento',
      prazo: '30/09/2026',
      participantes: 18,
      tipo: 'missao'
    },
    {
      id: 'm2',
      lat: -22.788,
      lng: -43.348,
      titulo: 'Horta Comunitária Urbana',
      status: 'Em andamento',
      prazo: '15/10/2026',
      participantes: 24,
      tipo: 'missao'
    },
    {
      id: 'm3',
      lat: -22.779,
      lng: -43.336,
      titulo: 'Reflorestamento de Encosta',
      status: 'Planejado',
      prazo: '12/11/2026',
      participantes: 9,
      tipo: 'missao'
    },
    {
      id: 'm4',
      lat: -22.786,
      lng: -43.332,
      titulo: 'Monitoramento da Qualidade da Água',
      status: 'Em andamento',
      prazo: '30/12/2026',
      participantes: 12,
      tipo: 'missao'
    }
  ];

  // (B) MUTIRÕES (🤝 Laranja)
  const mutiroesData = [
    {
      id: 'mu1',
      lat: -22.785,
      lng: -43.344,
      titulo: 'Limpeza do Rio Sarapuí',
      missaoPai: 'Rio Vivo',
      dataHora: '24/09 • 09:00',
      vagas: '14/30 vagas',
      tipo: 'mutirao'
    },
    {
      id: 'mu2',
      lat: -22.782,
      lng: -43.346,
      titulo: 'Plantio Coletivo de 200 Mudas',
      missaoPai: 'Reflorestamento',
      dataHora: '28/09 • 08:30',
      vagas: '22/25 vagas',
      tipo: 'mutirao'
    },
    {
      id: 'mu3',
      lat: -22.791,
      lng: -43.339,
      titulo: 'Oficina de Bio-Construção',
      missaoPai: 'Horta Urbana',
      dataHora: '05/10 • 14:00',
      vagas: '8/15 vagas',
      tipo: 'mutirao'
    }
  ];

  // (C) MEMÓRIAS (📷 Roxo)
  const extraFotos = [
    'https://images.unsplash.com/photo-1466692476866-aef1dfb1d5ea?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1591857177580-dc84b9c4b8b2?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?auto=format&fit=crop&w=600&q=80'
  ];

  const memoriasData = [
    {
      id: 'mem1',
      lat: -22.784,
      lng: -43.340,
      titulo: 'Antes da recuperação da nascente',
      autor: 'André',
      data: '12/08/2026',
      fotoUrl: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=600&q=80',
      descricao: 'Registro fotográfico da área antes do plantio comunitário e obras de macrodrenagem.',
      tipo: 'memoria',
      comentarios: [
        { initials: 'AW', name: 'Amanda', date: '13/08/2026', text: 'Importante ter esse registro do antes.' }
      ]
    },
    {
      id: 'mem2',
      lat: -22.787,
      lng: -43.343,
      titulo: 'Registro da Grande Enchente',
      autor: 'Dona Maria',
      data: '04/03/2026',
      fotoUrl: 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?auto=format&fit=crop&w=600&q=80',
      descricao: 'Nível da água na Avenida Comendador Teles durante a tempestade de verão.',
      tipo: 'memoria',
      comentarios: [
        { initials: 'JS', name: 'José', date: '05/03/2026', text: 'Nunca tinha visto a água tão alta.' }
      ]
    },
    {
      id: 'mem3',
      lat: -22.780,
      lng: -43.349,
      titulo: 'Primeira colheita da horta',
      autor: 'João',
      data: '19/05/2026',
      fotoUrl: 'https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?auto=format&fit=crop&w=600&q=80',
      descricao: 'Celebração da comunidade com a primeira colheita orgânica do bairro.',
      tipo: 'memoria',
      comentarios: [
        { initials: 'MD', name: 'Maria', date: '19/05/2026', text: 'Que momento incrível! A horta ficou linda' },
        { initials: 'CS', name: 'Carlos', date: '20/05/2026', text: 'Parabéns a todos que participaram! Vamos marcar a próxima colheita.' },
        { initials: 'AL', name: 'Ana', date: '20/05/2026', text: 'As crianças adoraram participar!' }
      ]
    }
  ];

  memoriasData.forEach(item => {
    item.fotos = [item.fotoUrl, ...extraFotos];
  });

  // (D) MARCADORES (📍 Vermelho/Teal)
  const marcadoresData = [
    {
      id: 'mar1',
      lat: -22.789,
      lng: -43.345,
      titulo: 'Ponto de Descarte Irregular',
      descricao: 'Área com acúmulo de entulho necessitando de fiscalização.',
      tipo: 'marcador'
    },
    {
      id: 'mar2',
      lat: -22.781,
      lng: -43.338,
      titulo: 'Pluviômetro Comunitário 01',
      descricao: 'Estação pluviométrica mantida pelos moradores.',
      tipo: 'marcador'
    }
  ];

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

  const memoryModal = document.getElementById('memory-modal');
  const memoryFeatured = document.getElementById('memory-featured');
  const memoryThumbs = document.getElementById('memory-thumbs');
  const memoryCommentsList = document.getElementById('memory-comments-list');
  const memoryCommentInput = document.getElementById('memory-comment-input');
  let currentMemory = null;

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

  function openMemoryModal(item) {
    currentMemory = item;
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
    if (memoryModal) memoryModal.classList.add('open');
  }

  function closeMemoryModal() {
    if (memoryModal) memoryModal.classList.remove('open');
    currentMemory = null;
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

  // Renderizar Missões
  missoesData.forEach(item => {
    const icon = createCustomIcon(
      typeBadge('missao'),
      item.titulo
    );
    const popupContent = `
      <div class="context-card">
        <div class="card-header-badge">
          <span class="card-type-tag missao">Missão</span>
          <span class="card-status">${item.status}</span>
        </div>
        <h3 class="card-title">${item.titulo}</h3>
        <div class="card-meta">
          <div class="card-meta-item">📅 Prazo: <strong>${item.prazo}</strong></div>
          <div class="card-meta-item">👥 Voluntários: <strong>${item.participantes} inscritos</strong></div>
        </div>
        <div class="card-participants">
          <div class="avatar-stack">
            <div class="mini-avatar">AW</div>
            <div class="mini-avatar">JS</div>
            <div class="mini-avatar">MR</div>
          </div>
          <span style="font-size: 0.75rem; color: var(--text-muted);">+15 outros participantes</span>
        </div>
        <div class="card-action-group">
          <button class="card-btn card-btn-primary" onclick="showToast('Abrindo detalhes da missão...')">
            Ver detalhes da missão →
          </button>
          <button class="card-btn card-btn-outline-amber" onclick="openCreateMutiraoForMissao('${escapeJsString(item.titulo)}')">
            Criar mutirão para esta missão
          </button>
          ${memoryActionHtml('missao', item.titulo, item.lat, item.lng)}
        </div>
      </div>
    `;
    L.marker([item.lat, item.lng], { icon })
      .bindPopup(popupContent)
      .addTo(layerGroups.missoes);
  });

  // Renderizar Mutirões
  mutiroesData.forEach(item => {
    const icon = createCustomIcon(
      typeBadge('mutirao'),
      item.titulo
    );
    const popupContent = `
      <div class="context-card">
        <div class="card-header-badge">
          <span class="card-type-tag mutirao">Mutirão</span>
        </div>
        <h3 class="card-title">${item.titulo}</h3>
        <p style="font-size:0.78rem; color: var(--text-muted); margin-bottom: 4px;">
          Faz parte da Missão: <strong>${item.missaoPai}</strong>
        </p>
        <div class="card-meta">
          <div class="card-meta-item">📅 <strong>${item.dataHora}</strong></div>
          <div class="card-meta-item">👥 Vagas: <strong>${item.vagas}</strong></div>
        </div>
        <button class="card-btn card-btn-amber" onclick="showToast('Inscrição confirmada no mutirão!')">
          Participar do mutirão
        </button>
      </div>
    `;
    L.marker([item.lat, item.lng], { icon })
      .bindPopup(popupContent)
      .addTo(layerGroups.mutiroes);
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

    L.marker([item.lat, item.lng], { icon })
      .on('click', () => {
        if (mapTool !== 'select') return;
        openMemoryModal(item);
      })
      .addTo(layerGroups.memorias);
  });

  // Renderizar Marcadores
  marcadoresData.forEach(item => {
    const icon = createCustomIcon(
      typeBadge('marcador'),
      item.titulo
    );
    const popupContent = `
      <div class="context-card">
        <div class="card-header-badge">
          <span class="card-type-tag marcador">Marcador</span>
        </div>
        <h3 class="card-title">${item.titulo}</h3>
        <p style="font-size: 0.82rem; color: var(--text-muted);">${item.descricao}</p>
        <div class="card-action-group">
          ${memoryActionHtml('marcador', item.titulo, item.lat, item.lng)}
        </div>
      </div>
    `;
    L.marker([item.lat, item.lng], { icon })
      .bindPopup(popupContent)
      .addTo(layerGroups.marcadores);
  });

  // (E) ÁREAS DE INTERVENÇÃO
  addShapeToMap({
    tipo: 'poligono',
    titulo: 'Área de Preservação Rio Sarapuí',
    latlngs: [
      [-22.782, -43.343],
      [-22.784, -43.338],
      [-22.787, -43.341],
      [-22.785, -43.345]
    ],
    color: '#1f7a4c',
    fillColor: '#1f7a4c'
  });
  addShapeToMap({
    tipo: 'poligono',
    titulo: 'Zoneamento de Risco de Enchente',
    latlngs: [
      [-22.786, -43.349],
      [-22.789, -43.343],
      [-22.792, -43.346],
      [-22.790, -43.351]
    ],
    color: '#d4832a',
    fillColor: '#d4832a'
  });

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
    drawState.draftCasing = isLine
      ? L.polyline(pts, draftCasingStyle())
      : L.polygon(pts, draftCasingStyle());
    drawState.draft = isLine
      ? L.polyline(pts, draftLineStyle())
      : L.polygon(pts, draftPolyStyle());
    drawState.draftCasing.addTo(draftGroup);
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
    const itemLabel = kind === 'missao' ? 'a missão' : 'o marcador';
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

  function openShapeEdit() {
    const record = selection.record;
    if (!record) return;
    const nameInput = document.getElementById('input-shape-name');
    const strokeInput = document.getElementById('input-shape-stroke');
    const fillInput = document.getElementById('input-shape-fill');
    const fillGroup = document.getElementById('shape-fill-group');
    if (nameInput) nameInput.value = record.titulo;
    if (strokeInput) strokeInput.value = record.color;
    if (fillInput) fillInput.value = record.fillColor || record.color;
    if (fillGroup) fillGroup.classList.toggle('hidden', record.tipo === 'linha');
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
    showToast('Alterações salvas.');
  }

  function openDeleteConfirm() {
    if (!selection.record || !confirmDeleteEl) return;
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
    layerGroups.areas.removeLayer(record.casing);
    const idx = desenhos.indexOf(record);
    if (idx >= 0) desenhos.splice(idx, 1);
    clearSelection();
    if (confirmDeleteEl) confirmDeleteEl.classList.add('hidden');
    showToast(record.tipo === 'linha' ? 'Linha excluída.' : 'Área excluída.');
  }

  const btnShapeAdd = document.getElementById('btn-shape-add');
  const shapeAddFlyout = document.getElementById('shape-add-flyout');
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
  if (btnShapeEdit) btnShapeEdit.addEventListener('click', (e) => {
    e.stopPropagation();
    openShapeEdit();
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
    if (confirmDeleteEl) confirmDeleteEl.classList.add('hidden');
  });
  if (btnConfirmDelete) btnConfirmDelete.addEventListener('click', deleteSelectedShape);
  if (confirmDeleteEl) {
    confirmDeleteEl.addEventListener('click', (e) => {
      if (e.target === confirmDeleteEl) confirmDeleteEl.classList.add('hidden');
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

  // Dropdown de categoria (Filtros de Exibição)
  const filterTrigger = document.getElementById('filter-category-trigger');
  const filterMenu = document.getElementById('filter-category-menu');
  const filterLabel = document.getElementById('filter-category-label');

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
        if (filterLabel) filterLabel.textContent = opt.textContent.trim();
        filterMenu.classList.add('hidden');
        filterTrigger.setAttribute('aria-expanded', 'false');
      });
    });
  }

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
    marcador: 'Novo marcador'
  };

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
    if (modalTabsEl) modalTabsEl.classList.remove('hidden');
    if (modalTitleEl) modalTitleEl.textContent = 'Novo Elemento no Mapa';
    restoreMemoryVinculoSelect();
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
      if (tabName === 'missao') {
        btnSubmitModal.classList.add('card-btn-primary');
        btnSubmitModal.textContent = 'Criar Missão';
      } else if (tabName === 'mutirao') {
        btnSubmitModal.classList.add('card-btn-amber');
        btnSubmitModal.textContent = 'Vincular Mutirão';
      } else if (tabName === 'memoria') {
        btnSubmitModal.classList.add('card-btn-purple');
        btnSubmitModal.textContent = 'Salvar Memória';
      } else if (tabName === 'marcador') {
        btnSubmitModal.classList.add('card-btn-primary');
        btnSubmitModal.textContent = 'Adicionar Marcador';
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
        const prazoInput = document.getElementById('input-prazo-missao').value;

        const newIcon = createCustomIcon(
          typeBadge('missao'),
          titleInput
        );

        const newPopup = `
          <div class="context-card">
            <div class="card-header-badge">
              <span class="card-type-tag missao">Missão</span>
              <span class="card-status">Ativa</span>
            </div>
            <h3 class="card-title">${titleInput}</h3>
            <p style="font-size: 0.82rem; color: #475569; margin: 4px 0 10px;">${descInput}</p>
            <div class="card-meta">
              <div class="card-meta-item">🏷️ Categoria: <strong>${catInput}</strong></div>
              <div class="card-meta-item">📅 Prazo: <strong>${prazoInput}</strong></div>
              <div class="card-meta-item">👥 Participantes: <strong>1 participante (Você)</strong></div>
            </div>
            ${vinculoShapeHtml(vinculoForma)}
            <div class="card-action-group">
              <button class="card-btn card-btn-primary" onclick="showToast('Detalhes da missão!')">Ver missão</button>
              ${memoryActionHtml('missao', titleInput, center.lat, center.lng)}
            </div>
          </div>
        `;

        L.marker([center.lat, center.lng], { icon: newIcon })
          .bindPopup(newPopup)
          .addTo(layerGroups.missoes);

        showToast(`Missão "${titleInput}" criada no ponto escolhido.`);

      } else if (currentActiveTab === 'mutirao') {
        const mutiraoTitle = document.getElementById('select-mutirao-existente').value;

        const newIcon = createCustomIcon(
          typeBadge('mutirao'),
          mutiraoTitle
        );

        const newPopup = `
          <div class="context-card">
            <div class="card-header-badge">
              <span class="card-type-tag mutirao">Mutirão Vinculado</span>
              <span class="card-status">Confirmado</span>
            </div>
            <h3 class="card-title">${mutiraoTitle}</h3>
            <div class="card-meta">
              <div class="card-meta-item">Ponto marcado no território</div>
              <div class="card-meta-item">Mobilização comunitária ativa</div>
            </div>
            <button class="card-btn card-btn-amber" onclick="showToast('Inscrição no mutirão!')">Quero Participar</button>
          </div>
        `;

        L.marker([center.lat, center.lng], { icon: newIcon })
          .bindPopup(newPopup)
          .addTo(layerGroups.mutiroes);

        showToast(`"${mutiraoTitle}" vinculado no ponto escolhido.`);

      } else if (currentActiveTab === 'memoria') {
        const memoriaTitle = document.getElementById('input-titulo-memoria').value || 'Memória Fotográfica';
        const memoriaData = document.getElementById('input-data-memoria').value;
        const memoriaVinculo = document.getElementById('select-vinculo-memoria').value;
        const parentKind = memoryParent?.kind || 'missao';
        const parentName = memoryParent?.titulo || memoriaVinculo;
        if (!parentName) {
          showToast('Escolha a missão ou o marcador ligado a esta memória.');
          return;
        }
        const photoSrc = loadedMemoriaPhoto || 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=400&q=80';
        const vinculoFrase = parentKind === 'marcador'
          ? `Ligada ao marcador ${parentName}.`
          : `Ligada à missão ${parentName}.`;

        const newIcon = createCustomIcon(
          typeBadge('memoria'),
          memoriaTitle
        );

        const newMemoria = {
          titulo: memoriaTitle,
          autor: 'Amanda',
          data: memoriaData,
          fotoUrl: photoSrc,
          descricao: vinculoFrase,
          fotos: [photoSrc, ...extraFotos],
          comentarios: []
        };

        L.marker([center.lat, center.lng], { icon: newIcon })
          .on('click', () => {
            if (mapTool !== 'select') return;
            openMemoryModal(newMemoria);
          })
          .addTo(layerGroups.memorias);

        showToast(`Memória ligada ${parentKind === 'marcador' ? 'ao marcador' : 'à missão'} ${parentName}.`);

      } else if (currentActiveTab === 'marcador') {
        const tipoMarcador = document.querySelector('input[name="tipo-marcador"]:checked')?.value || 'alerta';
        const marcadorTitle = document.getElementById('input-titulo-marcador').value || 'Marcador Territorial';
        const marcadorCat = document.getElementById('select-categoria-marcador').value;
        const marcadorDesc = document.getElementById('input-descricao-marcador').value || 'Anotação comunitária no território.';

        const badgeClass = tipoMarcador === 'alerta' ? 'alerta' : 'marcador';
        const tagTitle = tipoMarcador === 'alerta' ? 'Alerta Comunitário' : 'Ponto de Interesse';

        const newIcon = createCustomIcon(
          typeBadge(badgeClass),
          marcadorTitle
        );

        const newPopup = `
          <div class="context-card">
            <div class="card-header-badge">
              <span class="card-type-tag ${badgeClass}">${tagTitle}</span>
              <span class="card-status">Ativo</span>
            </div>
            <h3 class="card-title">${marcadorTitle}</h3>
            <p style="font-size: 0.82rem; color: #475569; margin: 4px 0 10px;">${marcadorDesc}</p>
            <div class="card-meta">
              <div class="card-meta-item">Categoria: <strong>${marcadorCat}</strong></div>
            </div>
            ${vinculoShapeHtml(vinculoForma)}
            <div class="card-action-group">
              ${memoryActionHtml('marcador', marcadorTitle, center.lat, center.lng)}
            </div>
          </div>
        `;

        L.marker([center.lat, center.lng], { icon: newIcon })
          .bindPopup(newPopup)
          .addTo(layerGroups.marcadores);

        showToast(`Marcador "${marcadorTitle}" adicionado no ponto escolhido.`);
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

  window.openCreateMemoryFor = function(kind, titulo, lat, lng) {
    map.closePopup();
    placeState.type = 'memoria';
    placeState.source = 'parent';
    placeState.parent = { kind, titulo };
    placeState.shape = null;
    placeState.pickingInside = false;
    placeState.latlng = L.latLng(lat, lng);
    if (modalTitleEl) modalTitleEl.textContent = 'Nova memória';
    if (modalTabsEl) modalTabsEl.classList.add('hidden');
    setActiveTab('memoria');
    setMemoryVinculo(kind, titulo);
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
