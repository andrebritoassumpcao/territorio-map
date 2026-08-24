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
      tipo: 'memoria'
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
      tipo: 'memoria'
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
      tipo: 'memoria'
    }
  ];

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

  // Renderizar Missões
  missoesData.forEach(item => {
    const icon = createCustomIcon(
      `<div class="marker-badge missao">🌱</div>`,
      item.titulo
    );
    const popupContent = `
      <div class="context-card">
        <div class="card-header-badge">
          <span class="card-type-tag missao">🌱 Missão</span>
          <span class="card-status">🟢 ${item.status}</span>
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
          <button class="card-btn card-btn-outline-amber" onclick="openCreateMutiraoForMissao('${item.titulo}')">
            🤝 Criar mutirão para esta missão
          </button>
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
      `<div class="marker-badge mutirao">🤝</div>`,
      item.titulo
    );
    const popupContent = `
      <div class="context-card">
        <div class="card-header-badge">
          <span class="card-type-tag mutirao">🤝 Mutirão</span>
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
          🤝 Participar do mutirão
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
          <span class="marker-label">📷 ${item.titulo}</span>
        </div>
      `,
      iconSize: [140, 44],
      iconAnchor: [22, 22]
    });

    const popupContent = `
      <div class="context-card">
        <div class="card-header-badge">
          <span class="card-type-tag memoria">📷 Memória</span>
          <span class="card-status">${item.autor} • ${item.data}</span>
        </div>
        <h3 class="card-title">${item.titulo}</h3>
        <div class="card-photo-frame">
          <img src="${item.fotoUrl}" alt="Memória" onerror="this.onerror=null; this.src='${fallbackImg}';" />
        </div>
        <p style="font-size: 0.82rem; color: var(--text-muted); line-height: 1.4;">${item.descricao}</p>
        <button class="card-btn card-btn-purple" onclick="showToast('Abrindo acervo da memória...')">
          📷 Ver memória completa
        </button>
      </div>
    `;
    L.marker([item.lat, item.lng], { icon })
      .bindPopup(popupContent)
      .addTo(layerGroups.memorias);
  });

  // Renderizar Marcadores
  marcadoresData.forEach(item => {
    const icon = createCustomIcon(
      `<div class="marker-badge marcador">📍</div>`,
      item.titulo
    );
    const popupContent = `
      <div class="context-card">
        <div class="card-header-badge">
          <span class="card-type-tag" style="background:#fee2e2; color:#991b1b;">📍 Marcador</span>
        </div>
        <h3 class="card-title">${item.titulo}</h3>
        <p style="font-size: 0.82rem; color: var(--text-muted);">${item.descricao}</p>
      </div>
    `;
    L.marker([item.lat, item.lng], { icon })
      .bindPopup(popupContent)
      .addTo(layerGroups.marcadores);
  });

  // (E) ÁREAS DE INTERVENÇÃO (POLÍGONOS SVG MOCKADOS)
  const area1Coords = [
    [-22.782, -43.343],
    [-22.784, -43.338],
    [-22.787, -43.341],
    [-22.785, -43.345]
  ];
  L.polygon(area1Coords, {
    color: '#10b981',
    weight: 2,
    dashArray: '6, 6',
    fillColor: '#10b981',
    fillOpacity: 0.2
  }).bindTooltip('🟢 Área de Preservação Rio Sarapuí', { permanent: false }).addTo(layerGroups.areas);

  const area2Coords = [
    [-22.786, -43.349],
    [-22.789, -43.343],
    [-22.792, -43.346],
    [-22.790, -43.351]
  ];
  L.polygon(area2Coords, {
    color: '#f59e0b',
    weight: 2,
    dashArray: '4, 4',
    fillColor: '#f59e0b',
    fillOpacity: 0.25
  }).bindTooltip('⚠️ Zoneamento de Risco de Enchente', { permanent: false }).addTo(layerGroups.areas);

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

  // Modo Desenho (Drawing Tool Sub-bar)
  const btnDesenhar = document.getElementById('tool-desenhar');
  const drawingSubbar = document.getElementById('drawing-subbar');
  const btnCloseDraw = document.getElementById('btn-close-draw');

  if (btnDesenhar) {
    btnDesenhar.addEventListener('click', () => {
      drawingSubbar.classList.toggle('hidden');
      if (!drawingSubbar.classList.contains('hidden')) {
        showToast('🎨 Modo de desenho ativado! Escolha uma ferramenta abaixo.');
      }
    });
  }

  if (btnCloseDraw) {
    btnCloseDraw.addEventListener('click', () => {
      drawingSubbar.classList.add('hidden');
      if (btnDesenhar) btnDesenhar.classList.remove('active');
    });
  }

  // 6. MODAL DE CRIAÇÃO (+ Nova Missão)
  const btnNovaMissao = document.getElementById('btn-nova-missao');
  const creationModal = document.getElementById('creation-modal');
  const btnCancelModal = document.getElementById('btn-cancel-modal');
  const btnCloseModalX = document.getElementById('btn-close-modal-x');
  const creationForm = document.getElementById('creation-form');
  const modalTabs = document.querySelectorAll('.modal-tab');

  function openModal() {
    creationModal.classList.add('open');
  }

  function closeModal() {
    creationModal.classList.remove('open');
  }

  if (btnNovaMissao) btnNovaMissao.addEventListener('click', openModal);
  if (btnCancelModal) btnCancelModal.addEventListener('click', closeModal);
  if (btnCloseModalX) btnCloseModalX.addEventListener('click', closeModal);

  modalTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      modalTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
    });
  });

  if (creationForm) {
    creationForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const titleInput = document.getElementById('input-titulo').value || 'Nova Missão no Sarapuí';
      
      // Simular novo waypoint adicionado no centro do mapa
      const center = map.getCenter();
      const newIcon = createCustomIcon(
        `<div class="marker-badge missao">🌱</div>`,
        titleInput
      );
      
      const newPopup = `
        <div class="context-card">
          <div class="card-header-badge">
            <span class="card-type-tag missao">🌱 Missão</span>
            <span class="card-status">🟢 Recém-criada</span>
          </div>
          <h3 class="card-title">${titleInput}</h3>
          <div class="card-meta">
            <div class="card-meta-item">📅 Prazo: <strong>31/12/2026</strong></div>
            <div class="card-meta-item">👥 Participantes: <strong>1 participante (Você)</strong></div>
          </div>
          <button class="card-btn card-btn-primary" onclick="showToast('Detalhes da missão!')">Ver missão</button>
        </div>
      `;

      L.marker([center.lat, center.lng], { icon: newIcon })
        .bindPopup(newPopup)
        .addTo(layerGroups.missoes);

      closeModal();
      creationForm.reset();
      showToast(`✨ "${titleInput}" foi criada e adicionada ao mapa!`);
    });
  }

  // 7. FUNÇÃO PARA CRIAR MUTIRÃO VINCULADO À MISSÃO
  window.openCreateMutiraoForMissao = function(missaoTitulo) {
    if (creationModal) {
      creationModal.classList.add('open');
      
      // Selecionar a aba de Mutirão
      modalTabs.forEach(t => t.classList.remove('active'));
      const mutiraoTab = Array.from(modalTabs).find(t => t.textContent.includes('Mutirão'));
      if (mutiraoTab) mutiraoTab.classList.add('active');

      // Pré-selecionar a missão no select
      const selectMissao = document.getElementById('select-missao-pai');
      if (selectMissao) {
        selectMissao.value = missaoTitulo;
      }

      showToast(`🤝 Criando mutirão para a missão: "${missaoTitulo}"`);
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
    toast.innerHTML = `<span>ℹ️</span> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  };
});
