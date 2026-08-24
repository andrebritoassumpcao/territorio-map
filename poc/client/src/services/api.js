// Módulo de serviço da API para interação com o backend

export const buscarMissoes = async () => {
  const response = await fetch('/api/missoes');
  if (!response.ok) throw new Error('Erro ao buscar missões');
  return response.json();
};

export const criarMissao = async (dados) => {
  const response = await fetch('/api/missoes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(dados),
  });
  if (!response.ok) throw new Error('Erro ao criar missão');
  return response.json();
};

export const atualizarStatus = async (id, status) => {
  const response = await fetch(`/api/missoes/${id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status }),
  });
  if (!response.ok) throw new Error('Erro ao atualizar status');
  return response.json();
};

export const excluirMissao = async (id) => {
  const response = await fetch(`/api/missoes/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Erro ao excluir missão');
  return response.json();
};
