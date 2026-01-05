import { ConstructionProduct, ConstructionCategory, categoryLabels } from '@/types/construction';

// Produtos extraídos da planilha de materiais de construção
export const constructionProducts: ConstructionProduct[] = [
  // AGREGADOS
  { id: 'areia-fina-m3', name: 'Areia Fina', unit: 'm³', basePrice: 72.22, category: 'agregados' },
  { id: 'areia-media-m3', name: 'Areia Média', unit: 'm³', basePrice: 72.22, category: 'agregados' },
  { id: 'areia-grossa-m3', name: 'Areia Grossa', unit: 'm³', basePrice: 72.22, category: 'agregados' },
  { id: 'saco-areia', name: 'Saco de Areia (fina/média/grossa)', unit: 'sc', basePrice: 3.50, category: 'agregados' },
  { id: 'brita-0', name: 'Brita 0', unit: 'm³', basePrice: 86.65, category: 'agregados' },
  { id: 'brita-1', name: 'Brita 1', unit: 'm³', basePrice: 86.65, category: 'agregados' },
  { id: 'pedra-rachao', name: 'Pedra Rachão', unit: 'm³', basePrice: 80.00, category: 'agregados' },
  { id: 'areola', name: 'Aréola', unit: 'm³', basePrice: 120.00, category: 'agregados' },

  // CIMENTOS E ARGAMASSAS
  { id: 'cimento-campeao-black', name: 'Cimento Campeão CPIII - Black', unit: 'sc', basePrice: 15.90, category: 'cimentos' },
  { id: 'cimento-campeao-promo', name: 'PROMOÇÃO - Cimento Campeão CPIII - 50kg', unit: 'sc', basePrice: 14.00, category: 'cimentos' },
  { id: 'cimento-liz-cpiv', name: 'Cimento LIZ CPIV - 50kg', unit: 'sc', basePrice: 21.90, category: 'cimentos' },
  { id: 'cimento-liz-cpii', name: 'Cimento LIZ CPII-E-32 - 50kg', unit: 'sc', basePrice: 22.00, category: 'cimentos' },
  { id: 'cimento-votoran', name: 'Cimento Votoran Todas as Obras 50kgs CPII 32R', unit: 'sc', basePrice: 21.90, category: 'cimentos' },
  { id: 'cal-hidratada', name: 'Cal Hidratada - 20kg BIANCAL', unit: 'sc', basePrice: 19.90, category: 'cimentos' },
  { id: 'liga-massa', name: 'Liga Para Massa 20 Kg Itaú', unit: 'sc', basePrice: 12.88, category: 'cimentos' },
  { id: 'argamassa-ac2', name: 'Argamassa AC-II 20Kg - Quartzolit', unit: 'sc', basePrice: 16.50, category: 'cimentos' },
  { id: 'massa-corrida-coral', name: 'Coral Massa Corrida Pva - 25kg', unit: 'un', basePrice: 49.90, category: 'cimentos' },
  { id: 'massa-corrida-suvinil', name: 'Massa Corrida Suvinil - 25kg', unit: 'un', basePrice: 82.83, category: 'cimentos' },
  { id: 'gesso-cola', name: 'Gesso Cola Juntalider - 5kg', unit: 'un', basePrice: 29.90, category: 'cimentos' },
  { id: 'gesso-po', name: 'Gesso Em Pó 20kg', unit: 'sc', basePrice: 25.50, category: 'cimentos' },
  { id: 'rejunte-porcelanato', name: 'Rejunte Porcelanato Quartzolit Cinza - 5kg', unit: 'un', basePrice: 54.49, category: 'cimentos' },
  { id: 'agrofilito', name: 'Agrofilito Peneira 8 Ensacado 17kg', unit: 'sc', basePrice: 7.25, category: 'cimentos' },

  // BLOCOS E TIJOLOS
  { id: 'tijolo-9furos', name: 'Tijolo 11,5x19x24 - 9 furos', unit: 'un', basePrice: 0.85, category: 'blocos-tijolos' },
  { id: 'tijolo-6furos', name: 'Tijolos 11,5x14,5x29 - 6 furos', unit: 'un', basePrice: 0.65, category: 'blocos-tijolos' },
  { id: 'tijolo-12furos', name: 'Tijolo 12x19x29 - 12 furos', unit: 'un', basePrice: 0.86, category: 'blocos-tijolos' },
  { id: 'meio-tijolo-9furos', name: 'Meio Tijolo 11,5x11,5x24 - 9 furos', unit: 'un', basePrice: 0.73, category: 'blocos-tijolos' },
  { id: 'meio-tijolo-12furos', name: 'Meio Tijolo 14x19x29 - 12 furos', unit: 'un', basePrice: 0.80, category: 'blocos-tijolos' },
  { id: 'tijolo-macico', name: 'Tijolo Maciço 5,5x11x23cm Braunas', unit: 'un', basePrice: 0.75, category: 'blocos-tijolos' },
  { id: 'tijolo-ecologico', name: 'Tijolo Ecológico', unit: 'un', basePrice: 1.30, category: 'blocos-tijolos' },
  { id: 'bloco-vazado-010', name: 'Bloco Vazado 010 - 09x19x39', unit: 'un', basePrice: 1.25, category: 'blocos-tijolos' },
  { id: 'bloco-fechado-014', name: 'Bloco Fechado 014 - 14x19x39', unit: 'un', basePrice: 1.85, category: 'blocos-tijolos' },
  { id: 'bloco-vedacao-020', name: 'Bloco Vedação 020 - 19x19x39', unit: 'un', basePrice: 2.00, category: 'blocos-tijolos' },
  { id: 'canaleta-014', name: 'Canaleta 014', unit: 'un', basePrice: 1.95, category: 'blocos-tijolos' },
  { id: 'canaleta-015', name: 'Canaleta 015 - 14x19x39', unit: 'un', basePrice: 1.88, category: 'blocos-tijolos' },
  { id: 'placa-refrataria', name: 'Placa Refratária 25mm', unit: 'un', basePrice: 3.50, category: 'blocos-tijolos' },

  // TELHAS E COBERTURAS
  { id: 'telha-fibrocimento', name: 'Telha Fibrocimento 5mm 2,44x1,10m', unit: 'un', basePrice: 49.90, category: 'telhas' },
  { id: 'telha-precon', name: 'Telha 153x110x5mm - Precon', unit: 'un', basePrice: 31.87, category: 'telhas' },
  { id: 'telha-translucida', name: 'Telha Translúcida 244x110 - Amecon', unit: 'un', basePrice: 72.55, category: 'telhas' },
  { id: 'telha-colonial-vermelha', name: 'Telha Colonial Americana Vermelha Resinada', unit: 'un', basePrice: 1.89, category: 'telhas' },
  { id: 'telha-colonial-marfim', name: 'Telha Colonial Americana Marfim Resinada', unit: 'un', basePrice: 2.44, category: 'telhas' },
  { id: 'telha-colonial-branca', name: 'Telha Colonial Americana Branca Resinada', unit: 'un', basePrice: 2.33, category: 'telhas' },
  { id: 'kit-gancho-telha', name: 'Kit C/50 Gancho P/Telha Virado J 1/4x240mm', unit: 'un', basePrice: 129.90, category: 'telhas' },

  // HIDRÁULICA
  { id: 'tubo-esgoto-100mm-6m', name: 'Tubo de Esgoto 100mm x 6MT - Tigre', unit: 'br', basePrice: 58.90, category: 'hidraulica' },
  { id: 'tubo-esgoto-75mm', name: 'Cano PVC para Esgoto 75mm - FORTLEV', unit: 'br', basePrice: 62.77, category: 'hidraulica' },
  { id: 'tubo-esgoto-50mm-6m', name: 'Tubo de Esgoto 50mm x 6MT - Tigre', unit: 'br', basePrice: 22.76, category: 'hidraulica' },
  { id: 'tubo-esgoto-40mm-6m', name: 'Tubo de Esgoto 40mm x 6MT - Tigre', unit: 'br', basePrice: 15.90, category: 'hidraulica' },
  { id: 'cano-pvc-100mm-3m', name: 'Cano PVC para Esgoto 100mm 3m Tigre', unit: 'br', basePrice: 29.90, category: 'hidraulica' },
  { id: 'curva-esgoto-100mm', name: 'Curva Esgoto Curta 100mm - Tigre', unit: 'un', basePrice: 9.90, category: 'hidraulica' },
  { id: 'te-esgoto-100mm', name: 'Tê Esgoto 100mm - Krona', unit: 'un', basePrice: 14.25, category: 'hidraulica' },
  { id: 'bucha-reducao-50x40', name: 'Bucha Redução Esgoto Longa 50x40mm - Krona', unit: 'un', basePrice: 2.40, category: 'hidraulica' },
  { id: 'reducao-150x100', name: 'Redução Excêntrica Esgoto 150x100mm Krona', unit: 'un', basePrice: 22.84, category: 'hidraulica' },
  { id: 'fossa-septica-700l', name: 'Fossa Séptica Biodigestor 700l/dia Fortlev', unit: 'un', basePrice: 1087.79, category: 'hidraulica' },
  { id: 'caixa-agua-500-fortlev', name: "Caixa d'Água de Polietileno 500L - FORTLEV", unit: 'un', basePrice: 179.89, category: 'hidraulica' },
  { id: 'caixa-agua-1000-fortlev', name: "Caixa d'Água de Polietileno 1000L - FORTLEV TANQUE", unit: 'un', basePrice: 338.99, category: 'hidraulica' },
  { id: 'caixa-agua-2000-fortlev', name: "Caixa d'Água de Polietileno 2000L - FORTLEV TANQUE", unit: 'un', basePrice: 548.99, category: 'hidraulica' },
  { id: 'caixa-agua-3000-fortlev', name: "Caixa d'Água de Polietileno 3000L - FORTLEV TANQUE", unit: 'un', basePrice: 976.98, category: 'hidraulica' },
  { id: 'caixa-agua-5000-fortlev', name: "Caixa d'Água de Polietileno 5000L - FORTLEV TANQUE", unit: 'un', basePrice: 1999.00, category: 'hidraulica' },
  { id: 'caixa-agua-10000-fortlev', name: "Caixa d'Água de Polietileno 10.000L - FORTLEV TANQUE", unit: 'un', basePrice: 3200.00, category: 'hidraulica' },
  { id: 'caixa-agua-10000-kmr', name: "Caixa d'Água de Polietileno 10.000L - KMR", unit: 'un', basePrice: 2999.00, category: 'hidraulica' },
  { id: 'caixa-agua-20000-fortlev', name: "Caixa d'Água de Polietileno 20.000L - FORTLEV", unit: 'un', basePrice: 5999.90, category: 'hidraulica' },
  { id: 'caixa-massa-350l', name: 'Caixa De Massa 350L Azul Afort', unit: 'un', basePrice: 249.89, category: 'hidraulica' },
  { id: 'tanque-duplo-fibra', name: 'Tanque Sintético Duplo Fibra Rorato 100x51cm', unit: 'un', basePrice: 165.23, category: 'hidraulica' },
  { id: 'pia-cozinha-granitada', name: 'Pia de Cozinha Granitada 150x55cm Standart Preta', unit: 'un', basePrice: 178.55, category: 'hidraulica' },
  { id: 'vaso-sanitario-sabara', name: 'Bacia Sanitária Vaso Sanitário Sabará Icasa Branco', unit: 'un', basePrice: 129.99, category: 'hidraulica' },
  { id: 'vaso-caixa-acoplada', name: 'Vaso Sanitário com Caixa Acoplada 6L ZIP Branco Incepa', unit: 'un', basePrice: 279.89, category: 'hidraulica' },
  { id: 'gabinete-pia-gemeos', name: 'Gabinete De Pia Gemeos 1,50m Cor Branco', unit: 'un', basePrice: 289.90, category: 'hidraulica' },
  { id: 'gabinete-suspenso-cuba', name: 'Gabinete Suspenso Com Cuba E Espelheira Isa', unit: 'un', basePrice: 149.80, category: 'hidraulica' },
  { id: 'mangueira-irrigacao-50m', name: 'Mangueira Irrigação Reforçada Preta 3/4 - 50m', unit: 'rl', basePrice: 62.89, category: 'hidraulica' },

  // ELÉTRICA
  { id: 'tubo-corrugado-50m', name: 'Tubo Duto Corrugado Eletroduto 2" 50m C/ Guia', unit: 'rl', basePrice: 207.40, category: 'eletrica' },
  { id: 'cabo-flexivel-25-100m', name: 'Cabo Flexível 2,5mm - 100 Metros - Verde', unit: 'rl', basePrice: 185.77, category: 'eletrica' },
  { id: 'cabo-flexivel-25-metro', name: 'Cabo Flexível 2,5mm - Metro - Verde', unit: 'm', basePrice: 2.40, category: 'eletrica' },
  { id: 'fita-isolante', name: 'Fita Isolante 19mm x 10m Preta Vonder', unit: 'un', basePrice: 8.68, category: 'eletrica' },
  { id: 'padrao-bifasico', name: 'Padrão Bífasico 7M (SAIDA AEREA)', unit: 'un', basePrice: 315.28, category: 'eletrica' },
  { id: 'painel-solar', name: 'Painel Solar Genesis Helius 545w Bifacial', unit: 'un', basePrice: 1633.33, category: 'eletrica' },

  // FERRAMENTAS
  { id: 'serra-marmore', name: 'Serra Mármore 1050W 110mm 110V LITH-LT4000', unit: 'un', basePrice: 139.89, category: 'ferramentas' },
  { id: 'disco-corte-diamantado', name: 'Disco de Corte Diamantado Segmentado 4-3/8"', unit: 'un', basePrice: 8.99, category: 'ferramentas' },
  { id: 'martelete-perfurador', name: 'Martelete Perfurador Rompedor 4 em 1 SDS Plus 1500W', unit: 'un', basePrice: 389.97, category: 'ferramentas' },
  { id: 'betoneira-400l', name: 'Betoneira 400L - CSM - Bivolt', unit: 'un', basePrice: 1999.00, category: 'ferramentas' },
  { id: 'rocadeira-stihl', name: 'Roçadeira a combustão FS 221 - STIHL', unit: 'un', basePrice: 2199.00, category: 'ferramentas' },

  // ACABAMENTOS
  { id: 'tinta-acrilica-coral-18l', name: 'Tinta Acrílica Fosca Rende Muito Branco Neve 18L Coral', unit: 'un', basePrice: 300.00, category: 'acabamentos' },
  { id: 'texturatto-suvinil', name: 'Texturatto Efeito Rústico - 26Kg - Suvinil', unit: 'un', basePrice: 159.90, category: 'acabamentos' },
  { id: 'impermeabilizante-18l', name: 'Impermeabilizante 18L - VONDER', unit: 'un', basePrice: 142.59, category: 'acabamentos' },
  { id: 'piso-porcelanato', name: 'Piso PHD52350 Porcelanato Retificado 58x58', unit: 'm²', basePrice: 15.88, category: 'acabamentos' },
  { id: 'piso-ceramico', name: 'Piso Cerâmico Esmaltado 61x61cm Caixa 2,23m² Brilhante', unit: 'cx', basePrice: 32.00, category: 'acabamentos' },
  { id: 'lajota-20x20', name: 'Caixa Lajota 20x20 - 32 un', unit: 'cx', basePrice: 60.88, category: 'acabamentos' },
  { id: 'porta-madeira-completa', name: 'Porta de Madeira completa Curupixá', unit: 'un', basePrice: 169.90, category: 'acabamentos' },
  { id: 'kit-porta-madeira-lisa', name: 'Kit Porta de Madeira Lisa 215x84cm com Batente - 10cm MGM Mogno', unit: 'un', basePrice: 221.55, category: 'acabamentos' },
  { id: 'janela-aluminio', name: 'Janela de Alumínio de Correr 100x150cm Vidro Liso', unit: 'un', basePrice: 179.77, category: 'acabamentos' },
  { id: 'lona-plastica-metro', name: 'Lona Plastica Preta 1 x 4 - 1 Metro', unit: 'm', basePrice: 5.88, category: 'acabamentos' },

  // ESTRUTURAS
  { id: 'vergalhao-ca50-6-3mm', name: 'Vergalhão CA50 6,3mm 1/4" Barra 12m - Gerdau', unit: 'br', basePrice: 15.80, category: 'estruturas' },
  { id: 'vergalhao-ca50-12-5mm', name: 'Vergalhão CA50 12,5mm 1/2" Barra 12m - Gerdau', unit: 'br', basePrice: 62.89, category: 'estruturas' },
  { id: 'vergalhao-ca50-20mm', name: 'Vergalhão CA50 20mm 3/4" Barra 12m - Gerdau', unit: 'br', basePrice: 119.99, category: 'estruturas' },
  { id: 'vergalhao-ca60-12-5mm', name: 'Vergalhão CA-60 12,5mm 12m - Gerdau', unit: 'br', basePrice: 70.32, category: 'estruturas' },
  { id: 'trelica-8l-6m', name: 'Treliça Arcelormittal Tb 8L - 6m', unit: 'un', basePrice: 42.79, category: 'estruturas' },
  { id: 'trelica-8l-12m', name: 'Treliça Arcelormittal Tb 8L - 12m', unit: 'un', basePrice: 74.99, category: 'estruturas' },
  { id: 'sapata-radier-60x60', name: 'Sapata - Radier 6,3mm (1/4) - 60x60cm', unit: 'un', basePrice: 7.50, category: 'estruturas' },
  { id: 'sapata-radier-80x80', name: 'Sapata - Radier 10mm (3/8) - 80x80cm', unit: 'un', basePrice: 35.86, category: 'estruturas' },
  { id: 'coluna-armada-6m', name: 'Coluna Armada 5/16" - 0,12 x 0,20 cm - 6M', unit: 'un', basePrice: 85.88, category: 'estruturas' },
  { id: 'estribo-4-2mm', name: 'Estribo Para Obra Ferro 3/16 4.2mm', unit: 'un', basePrice: 1.23, category: 'estruturas' },
  { id: 'malha-pop', name: 'Malha Pop Pesada Fio 4,2mm Malha 10x10cm - 2x3m', unit: 'un', basePrice: 128.83, category: 'estruturas' },
  { id: 'laje-h8-isopor', name: 'Laje H8 Com Isopor M²', unit: 'm²', basePrice: 45.77, category: 'estruturas' },
  { id: 'prego-18x24', name: 'Prego 18x24 - kg', unit: 'kg', basePrice: 12.99, category: 'estruturas' },
  { id: 'arame-pg14', name: 'Arame Pg14 - kg', unit: 'kg', basePrice: 13.20, category: 'estruturas' },

  // MADEIRAS
  { id: 'eucalipto-7-8cm-3m', name: 'Eucalipto Tratado De 7 A 8cm - 3m', unit: 'un', basePrice: 24.90, category: 'madeiras' },
  { id: 'eucalipto-14-16cm-6m', name: 'Eucalipto Tratado De 14 A 16cm - 6m', unit: 'un', basePrice: 158.76, category: 'madeiras' },
  { id: 'madeirit-pinus-9mm', name: 'Madeirit Pinus 9,0mm 1,10x2,20', unit: 'un', basePrice: 35.90, category: 'madeiras' },
  { id: 'maderite-9mm', name: 'Maderite - 9mm', unit: 'un', basePrice: 58.00, category: 'madeiras' },
  { id: 'tabua-10cm', name: 'Tábua - 10cm', unit: 'm', basePrice: 15.66, category: 'madeiras' },
  { id: 'sarrafo-pinus-3m', name: 'Sarrafo de Pinus 15x 3M', unit: 'un', basePrice: 12.50, category: 'madeiras' },

  // CHURRASQUEIRAS
  { id: 'churrasqueira-fogao-forno', name: 'Churrasqueira pré moldado SP2285 - fogão a lenha e forno', unit: 'un', basePrice: 990.00, category: 'churrasqueiras' },
  { id: 'churrasqueira-fogao', name: 'Churrasqueira pré moldado - fogão a lenha', unit: 'un', basePrice: 650.00, category: 'churrasqueiras' },
  { id: 'churrasqueira-bancada', name: 'Churrasqueira pré moldado SP2314 - bancada + kit grelha', unit: 'un', basePrice: 699.89, category: 'churrasqueiras' },
  { id: 'churrasqueira-sp2385', name: 'Churrasqueira pré moldado SP2385', unit: 'un', basePrice: 419.99, category: 'churrasqueiras' },
  { id: 'churrasqueira-completa', name: 'Churrasqueira pré moldado SP2385 - fogão, forno pizza e comum', unit: 'un', basePrice: 1299.00, category: 'churrasqueiras' },
  { id: 'servico-instalacao', name: 'SERVIÇO - Instalação Churrasqueira', unit: 'un', basePrice: 50.00, category: 'churrasqueiras' },
  { id: 'grill-giratorio', name: 'Grill Giratorio Churrasqueira Inox 5 Espetos Motor Weg Bivolt', unit: 'un', basePrice: 320.00, category: 'churrasqueiras' },
  { id: 'kit-grelha-espetos', name: 'Kit Grelha Moeda Com Suporte 75 + 2 Espetos', unit: 'un', basePrice: 89.99, category: 'churrasqueiras' },
  { id: 'prolongador-chamine-20cm', name: 'Prolongador De Chaminé Churrasqueira - 20cm', unit: 'un', basePrice: 25.00, category: 'churrasqueiras' },
  { id: 'prolongador-calda-30cm', name: 'Prolongador Calda Churrasqueira - 30cm', unit: 'un', basePrice: 25.00, category: 'churrasqueiras' },
  { id: 'chapeu-concreto', name: 'Chapéu De Concreto Chinês 41x41x6cm', unit: 'un', basePrice: 45.33, category: 'churrasqueiras' },
];

// Agrupar produtos por categoria
export const getConstructionProductsByCategory = (category: ConstructionCategory): ConstructionProduct[] => {
  return constructionProducts.filter(p => p.category === category);
};

// Obter todas as categorias que têm produtos
export const getAvailableCategories = (): ConstructionCategory[] => {
  const categories = new Set(constructionProducts.map(p => p.category));
  return Array.from(categories) as ConstructionCategory[];
};

// Categorias para filtro
export const constructionCategories = Object.entries(categoryLabels).map(([key, label]) => ({
  key: key as ConstructionCategory,
  label,
  count: constructionProducts.filter(p => p.category === key).length,
})).filter(c => c.count > 0);

// Buscar produto por ID
export const getConstructionProductById = (id: string): ConstructionProduct | undefined => {
  return constructionProducts.find(p => p.id === id);
};

// Formatar label do produto
export const getConstructionProductLabel = (product: ConstructionProduct): string => {
  return product.name;
};
