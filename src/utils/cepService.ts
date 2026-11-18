export interface CepData {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
}

export const fetchCepData = async (
  cep: string,
  signal?: AbortSignal,
  timeoutMs = 6000
): Promise<CepData | null> => {
  const cleanedCep = cep.replace(/\D/g, '');
  
  if (cleanedCep.length !== 8) {
    return null;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const onExternalAbort = () => controller.abort();

  if (signal) {
    if (signal.aborted) {
      clearTimeout(timer);
      return null;
    }
    signal.addEventListener('abort', onExternalAbort, { once: true });
  }

  try {
    const response = await fetch(`https://viacep.com.br/ws/${cleanedCep}/json/`, {
      signal: controller.signal,
    });
    if (!response.ok) {
      return null;
    }
    const data: CepData = await response.json();
    
    if (data.erro) {
      return null;
    }
    
    return data;
  } catch (error) {
    if ((error as { name?: string })?.name !== 'AbortError') {
      console.error('Erro ao buscar CEP:', error);
    }
    return null;
  } finally {
    clearTimeout(timer);
    if (signal) {
      signal.removeEventListener('abort', onExternalAbort);
    }
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
