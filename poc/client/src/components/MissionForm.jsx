import React, { useState } from 'react';

// Modal glassmorphism para criar uma nova missão
const MissionForm = ({ coordenadas, onSubmit, onCancelar }) => {
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [prioridade, setPrioridade] = useState('media');
  const [prazo, setPrazo] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      titulo,
      descricao,
      prioridade,
      prazo: prazo || undefined,
      coordenadas
    });
  };

  return (
    <div className="modal-backdrop">
      <div className="mission-form-modal glass-panel fade-in">
        <h2>Nova Missão</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Título *</label>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              required
              placeholder="Ex: Resgate de Suprimentos"
              autoFocus
            />
          </div>
          
          <div className="form-group">
            <label>Descrição</label>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Detalhes da missão..."
              rows="3"
            />
          </div>
          
          <div className="form-row">
            <div className="form-group half">
              <label>Prioridade</label>
              <select value={prioridade} onChange={(e) => setPrioridade(e.target.value)}>
                <option value="baixa">Baixa</option>
                <option value="media">Média</option>
                <option value="alta">Alta</option>
                <option value="critica">Crítica</option>
              </select>
            </div>
            
            <div className="form-group half">
              <label>Prazo (opcional)</label>
              <input
                type="date"
                value={prazo}
                onChange={(e) => setPrazo(e.target.value)}
              />
            </div>
          </div>
          
          <div className="form-group location-info">
            <label>Localização Selecionada:</label>
            <div className="coords-display">
              Lat: {coordenadas.lat.toFixed(4)}, Lng: {coordenadas.lng.toFixed(4)}
            </div>
          </div>
          
          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={onCancelar}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary">
              Criar Missão
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MissionForm;
