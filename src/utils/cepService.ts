export interface CepData {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
}

export const fetchCepData = async (cep: string): Promise<CepData | null> => {
  const cleanedCep = cep.replace(/\D/g, '');
  
  if (cleanedCep.length !== 8) {
    return null;
  }

  try {
    const response = await fetch(`https://viacep.com.br/ws/${cleanedCep}/json/`);
    const data: CepData = await response.json();
    
    if (data.erro) {
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Erro ao buscar CEP:', error);
    return null;
  }
};

export const formatAddress = (data: CepData): string => {
  const parts = [
    data.logradouro,
    data.bairro,
    `${data.localidade} - ${data.uf}`,
    data.cep.replace(/(\d{5})(\d{3})/, '$1-$2'),
  ].filter(Boolean);
  
  return parts.join(', ');
};
