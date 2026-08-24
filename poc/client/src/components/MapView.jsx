import React, { useRef, useEffect } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

// Componente do Mapa usando MapLibre GL JS
const MapView = ({ missoes, modoAdicionar, onMapClick, onMissaoClick }) => {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);

  // Inicializa o mapa apenas uma vez
  useEffect(() => {
    if (mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
      center: [-47.9, -15.8], // Centro do Brasil
      zoom: 4
    });

    map.addControl(new maplibregl.NavigationControl(), 'top-right');

    map.on('click', (e) => {
      onMapClick({ lng: e.lngLat.lng, lat: e.lngLat.lat });
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Atualiza cursores e binds do modo de adicionar
  useEffect(() => {
    if (!mapRef.current) return;
    const canvas = mapRef.current.getCanvas();
    if (modoAdicionar) {
      canvas.style.cursor = 'crosshair';
    } else {
      canvas.style.cursor = 'grab';
    }
  }, [modoAdicionar]);

  // Atualiza marcadores quando a lista de missões muda
  useEffect(() => {
    if (!mapRef.current) return;

    // Limpa marcadores antigos
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Adiciona novos marcadores
    missoes.forEach(missao => {
      const coords = missao.coordenadas;
      if (!coords || typeof coords.lng !== 'number' || typeof coords.lat !== 'number') return;

      // Criação do elemento customizado (HTML div) para o marcador
      const el = document.createElement('div');
      el.className = `marker ${missao.status}`;
      
      // Adiciona classe 'pulse' se a missão estiver ativa
      if (missao.status === 'aberta' || missao.status === 'em_andamento') {
        el.classList.add('pulse');
      }

      // Ícone simples centralizado (pode ser SVG)
      el.innerHTML = '<span class="marker-icon">📍</span>';

      // Evento de clique para o marcador
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        onMissaoClick(missao);
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([coords.lng, coords.lat])
        .addTo(mapRef.current);

      markersRef.current.push(marker);
    });
  }, [missoes, onMissaoClick]);

  return (
    <div className="map-wrapper">
      {modoAdicionar && (
        <div className="add-mode-banner">
          <span>🎯</span> Clique no mapa para posicionar a missão
        </div>
      )}
      <div ref={mapContainerRef} className="map-container" />
    </div>
  );
};

export default MapView;
