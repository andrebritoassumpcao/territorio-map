import React, { useState, useEffect } from 'react';
import MapView from './components/MapView';
import MissionPanel from './components/MissionPanel';
import MissionForm from './components/MissionForm';
import { buscarMissoes, criarMissao, atualizarStatus, excluirMissao } from './services/api';

// Componente principal da aplicação
function App() {
  const [missoes, setMissoes] = useState([]);
  const [modoAdicionar, setModoAdicionar] = useState(false);
  const [missaoSelecionada, setMissaoSelecionada] = useState(null);
  const [coordenadasClique, setCoordenadasClique] = useState(null);

  // Busca as missões ao montar o componente
  useEffect(() => {
    carregarMissoes();
  }, []);

  const carregarMissoes = async () => {
    try {
      const dados = await buscarMissoes();
      setMissoes(dados);
    } catch (erro) {
      console.error('Falha ao carregar missões:', erro);
    }
  };

  const handleMapClick = (coords) => {
    if (modoAdicionar) {
      setCoordenadasClique(coords);
    }
  };

  const handleCriarMissao = async (dados) => {
    try {
      await criarMissao(dados);
      await carregarMissoes();
      setModoAdicionar(false);
      setCoordenadasClique(null);
    } catch (erro) {
      console.error('Falha ao criar missão:', erro);
    }
  };

  const handleStatusChange = async (id, novoStatus) => {
    try {
      await atualizarStatus(id, novoStatus);
      await carregarMissoes();
      if (missaoSelecionada && missaoSelecionada.id === id) {
        setMissaoSelecionada({ ...missaoSelecionada, status: novoStatus });
      }
    } catch (erro) {
      console.error('Falha ao atualizar status:', erro);
    }
  };

  const handleExcluirMissao = async (id) => {
    try {
      await excluirMissao(id);
      await carregarMissoes();
      if (missaoSelecionada && missaoSelecionada.id === id) {
        setMissaoSelecionada(null);
      }
    } catch (erro) {
      console.error('Falha ao excluir missão:', erro);
    }
  };

  return (
    <div className="app">
      <MapView 
        missoes={missoes}
        modoAdicionar={modoAdicionar}
        onMapClick={handleMapClick}
        onMissaoClick={setMissaoSelecionada}
      />
      <MissionPanel
        missoes={missoes}
        modoAdicionar={modoAdicionar}
        missaoSelecionada={missaoSelecionada}
        onToggleModo={() => { setModoAdicionar(!modoAdicionar); setCoordenadasClique(null); }}
        onMissaoClick={setMissaoSelecionada}
        onStatusChange={handleStatusChange}
        onExcluir={handleExcluirMissao}
        onFechar={() => setMissaoSelecionada(null)}
      />
      {modoAdicionar && coordenadasClique && (
        <MissionForm
          coordenadas={coordenadasClique}
          onSubmit={handleCriarMissao}
          onCancelar={() => { setModoAdicionar(false); setCoordenadasClique(null); }}
        />
      )}
    </div>
  );
}

export default App;
