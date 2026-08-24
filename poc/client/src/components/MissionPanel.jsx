import React from 'react';

// Painel lateral de missões
const MissionPanel = ({ 
  missoes, 
  modoAdicionar, 
  missaoSelecionada, 
  onToggleModo, 
  onMissaoClick,
  onStatusChange,
  onExcluir,
  onFechar
}) => {

  const total = missoes.length;
  const abertas = missoes.filter(m => m.status === 'aberta').length;
  const emAndamento = missoes.filter(m => m.status === 'em_andamento').length;
  const concluidas = missoes.filter(m => m.status === 'concluida').length;

  // Renderiza a view de detalhes de uma missão selecionada
  const renderDetailView = () => {
    const { id, titulo, descricao, status, prioridade, coordenadas, criadoEm, prazo } = missaoSelecionada;
    
    return (
      <div className="mission-detail fade-in">
        <button className="btn-back" onClick={onFechar}>
          &larr; Voltar para lista
        </button>
        
        <div className="detail-header">
          <span className={`badge status-${status}`}>
            {status.replace('_', ' ')}
          </span>
          <span className={`badge priority-${prioridade}`}>
            {prioridade}
          </span>
        </div>
        
        <h2 className="detail-title">{titulo}</h2>
        <p className="detail-desc">{descricao || 'Sem descrição fornecida.'}</p>
        
        <div className="detail-meta">
          <div className="meta-item">
            <span className="meta-label">Localização:</span>
            <span className="meta-value">Lat {coordenadas?.lat.toFixed(4)}, Lng {coordenadas?.lng.toFixed(4)}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Criada em:</span>
            <span className="meta-value">{criadoEm ? new Date(criadoEm).toLocaleDateString() : '—'}</span>
          </div>
          {prazo && (
            <div className="meta-item">
              <span className="meta-label">Prazo:</span>
              <span className="meta-value">{new Date(prazo).toLocaleDateString()}</span>
            </div>
          )}
        </div>
        
        <div className="detail-actions">
          {status === 'aberta' && (
            <button className="btn-primary" onClick={() => onStatusChange(id, 'em_andamento')}>
              Iniciar Missão
            </button>
          )}
          {status === 'em_andamento' && (
            <button className="btn-success" onClick={() => onStatusChange(id, 'concluida')}>
              Concluir
            </button>
          )}
          {(status === 'aberta' || status === 'em_andamento') && (
            <button className="btn-warning" onClick={() => onStatusChange(id, 'cancelada')}>
              Cancelar
            </button>
          )}
          <button className="btn-danger" onClick={() => onExcluir(id)}>
            Excluir
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="side-panel glass-panel">
      <div className="panel-header">
        <h1>Território</h1>
        <p className="subtitle">Mapa de Missões</p>
      </div>

      {!missaoSelecionada ? (
        <>
          <div className="stats-container">
            <div className="stat-pill"><span className="stat-val">{total}</span> Total</div>
            <div className="stat-pill status-aberta"><span className="stat-val">{abertas}</span> Abertas</div>
            <div className="stat-pill status-em_andamento"><span className="stat-val">{emAndamento}</span> Ativas</div>
            <div className="stat-pill status-concluida"><span className="stat-val">{concluidas}</span> Ok</div>
          </div>

          <button 
            className={`btn-add-mission ${modoAdicionar ? 'active' : ''}`}
            onClick={onToggleModo}
          >
            {modoAdicionar ? 'Cancelar Adição' : '+ Nova Missão'}
          </button>

          <div className="missions-list">
            {missoes.length === 0 ? (
              <p className="empty-state">Nenhuma missão encontrada.</p>
            ) : (
              missoes.map(missao => (
                <div 
                  key={missao.id} 
                  className="mission-card"
                  onClick={() => onMissaoClick(missao)}
                >
                  <div className="card-header">
                    <div className="status-indicator">
                      <div className={`status-dot ${missao.status}`}></div>
                      <span className="status-text">{missao.status.replace('_', ' ')}</span>
                    </div>
                    <span className={`badge priority-${missao.prioridade}`}>{missao.prioridade}</span>
                  </div>
                  <h3 className="card-title">{missao.titulo}</h3>
                  <div className="card-footer">
                    <span className="date">{missao.criadoEm ? new Date(missao.criadoEm).toLocaleDateString() : ''}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      ) : (
        renderDetailView()
      )}
    </div>
  );
};

export default MissionPanel;
