export type InstitutionalStep = {
  title: string;
  description: string;
};

export type InstitutionalTestimonial = {
  name: string;
  city: string;
  rating: 1 | 2 | 3 | 4 | 5;
  deliveryPhotoAlt?: string;
  workRef?: string;
  videoUrl?: string;
  quote: string;
};

export type InstitutionalPageModel = {
  title: string;
  subtitle: string;
  sections: Array<
    | {
        kind: "rich";
        title: string;
        paragraphs?: string[];
        bullets?: string[];
      }
    | {
        kind: "steps";
        title: string;
        steps: InstitutionalStep[];
      }
    | {
        kind: "testimonials";
        title: string;
        testimonials: InstitutionalTestimonial[];
      }
    | {
        kind: "legal";
        title: string;
        clauses: Array<{ heading: string; body: string[] }>;
      }
  >;
};

export function getInstitutionalModel(slug: string, storeName: string): InstitutionalPageModel | null {
  const s = (slug ?? "").toLowerCase();

  if (s === "sobre-a-empresa" || s === "sobre") {
    return {
      title: "Sobre Nossa Empresa",
      subtitle:
        "Empresa com 15 anos de atuação no mercado de materiais de construção, atendendo pessoa física, profissionais da obra e construtoras.",
      sections: [
        {
          kind: "rich",
          title: "Apresentação",
          paragraphs: [
            `${storeName} atua há 15 anos no segmento de materiais de construção, com foco em atendimento consultivo, agilidade logística e compra segura.`,
            "Atendemos clientes finais, profissionais e empresas, oferecendo orientação técnica e uma operação preparada para demandas de obra e reformas.",
          ],
        },
        {
          kind: "rich",
          title: "Estrutura",
          bullets: [
            "Loja física",
            "Showroom",
            "Mais de 50 colaboradores",
            "Atendimento presencial, online e via WhatsApp",
          ],
        },
        {
          kind: "rich",
          title: "Missão",
          paragraphs: ["Fornecer produtos de qualidade com responsabilidade e compromisso, garantindo clareza na compra e suporte ao cliente."],
        },
        {
          kind: "rich",
          title: "Visão",
          paragraphs: ["Ser referência regional em atendimento, confiança e eficiência na entrega de materiais."],
        },
        {
          kind: "rich",
          title: "Valores",
          bullets: ["Ética", "Transparência", "Compromisso", "Qualidade"],
        },
        {
          kind: "rich",
          title: "Diferenciais",
          bullets: ["Atendimento especializado", "Estoque amplo", "Entrega eficiente", "Compra segura"],
        },
      ],
    };
  }

  if (s === "como-comprar") {
    return {
      title: "Como comprar",
      subtitle: "Um passo a passo claro para você comprar com segurança e acompanhar seu pedido.",
      sections: [
        {
          kind: "steps",
          title: "Etapas da compra",
          steps: [
            {
              title: "1. Escolha do produto",
              description: "Use a busca e navegue por categorias para encontrar o material ideal.",
            },
            {
              title: "2. Adicione ao carrinho",
              description: "Selecione a quantidade e avance para finalizar.",
            },
            {
              title: "3. Calcule o frete",
              description: "Informe o CEP. O sistema utiliza as regras já existentes para cálculo automático.",
            },
            {
              title: "4. Escolha o pagamento",
              description: "Até 10x sem juros, PIX com 7% de desconto e Boleto.",
            },
            {
              title: "5. Acompanhe o pedido",
              description: "Na Área do Cliente você acompanha status, rastreamento e histórico.",
            },
          ],
        },
      ],
    };
  }

  if (s === "entrega-e-retirada" || s === "entrega") {
    return {
      title: "Entrega e retirada",
      subtitle: "Informações objetivas sobre prazos, retirada e acompanhamento do pedido.",
      sections: [
        {
          kind: "rich",
          title: "Entrega",
          bullets: [
            "Prazo informado no checkout",
            "Cálculo automático por CEP",
            "Regras de frete mantidas conforme o sistema atual",
          ],
        },
        {
          kind: "rich",
          title: "Retirada",
          bullets: [
            "Retirada disponível conforme confirmação do pedido",
            "Cliente pode retirar com caminhão próprio",
            "Informações e orientações são fornecidas após confirmação",
          ],
        },
        {
          kind: "rich",
          title: "Rastreamento",
          paragraphs: ["O acompanhamento do pedido e do status de entrega está disponível na Área do Cliente."],
        },
      ],
    };
  }

  if (s === "formas-de-pagamento" || s === "pagamento" || s === "pagamentos") {
    return {
      title: "Pagamentos",
      subtitle: "Parcelamento, PIX, boleto e confirmação do pedido — de forma simples e transparente.",
      sections: [
        {
          kind: "rich",
          title: "Parcelamento",
          paragraphs: ["Todos os produtos podem ser pagos em até 10x sem juros."],
        },
        {
          kind: "rich",
          title: "PIX",
          paragraphs: [
            "7% de desconto aplicado automaticamente.",
            "O valor com desconto é exibido na página do produto e no momento da compra.",
          ],
        },
        {
          kind: "rich",
          title: "Boleto",
          paragraphs: ["Pagamento via boleto sujeito ao prazo de compensação bancária."],
        },
        {
          kind: "rich",
          title: "Tabela de parcelas",
          paragraphs: ["Exibição de 1x a 10x, com parcelamento fixo e sem juros."],
        },
      ],
    };
  }

  if (s === "seguranca") {
    return {
      title: "Segurança",
      subtitle: "Compromisso com proteção de dados, ambiente seguro e processamento confiável.",
      sections: [
        {
          kind: "rich",
          title: "Ambiente criptografado",
          paragraphs: ["Utilizamos conexões criptografadas para proteger a navegação e a transmissão de informações."],
        },
        {
          kind: "rich",
          title: "Processamento seguro",
          paragraphs: ["Os processos de compra e pagamento seguem boas práticas de segurança e validação."],
        },
        {
          kind: "rich",
          title: "Proteção de dados",
          paragraphs: ["Adotamos medidas técnicas e organizacionais para reduzir riscos de acesso não autorizado."],
        },
        {
          kind: "rich",
          title: "Monitoramento antifraude",
          paragraphs: ["Aplicamos monitoramentos e validações para identificar comportamentos suspeitos e proteger transações."],
        },
      ],
    };
  }

  if (s === "depoimentos" || s === "referencias" || s === "depoimentos-e-referencias") {
    return {
      title: "Depoimentos e referências",
      subtitle: "Prova social real de quem compra e recebe seus materiais com confiança.",
      sections: [
        {
          kind: "testimonials",
          title: "Avaliações",
          testimonials: [
            {
              name: "Carlos A.",
              city: "São Paulo - SP",
              rating: 5,
              quote: "Entrega rápida e atendimento muito claro. Comprei tranquilo e chegou certinho.",
              workRef: "Reforma residencial",
              deliveryPhotoAlt: "Foto da entrega na residência",
            },
            {
              name: "Mariana S.",
              city: "Campinas - SP",
              rating: 5,
              quote: "Ótima experiência, me orientaram na compra e as condições de pagamento ajudaram muito.",
              workRef: "Obra comercial",
              deliveryPhotoAlt: "Foto da entrega em obra",
            },
            {
              name: "Equipe Obra Norte",
              city: "Jundiaí - SP",
              rating: 4,
              quote: "Bom estoque e agilidade na separação. Voltaremos a comprar.",
              workRef: "Construção",
              deliveryPhotoAlt: "Foto da entrega em canteiro",
            },
          ],
        },
      ],
    };
  }

  if (s === "politica-comercial" || s === "politica-de-vendas" || s === "termos-de-uso" || s === "trocas-e-devolucoes") {
    return {
      title: "Política comercial (unificada)",
      subtitle: "Regras formais aplicáveis a vendas, trocas, devoluções e garantia.",
      sections: [
        {
          kind: "legal",
          title: "Condições gerais",
          clauses: [
            {
              heading: "1. Direito de arrependimento",
              body: [
                "Nos termos do Código de Defesa do Consumidor, o cliente poderá exercer o direito de arrependimento no prazo de 7 (sete) dias corridos contados do recebimento do produto, quando aplicável.",
                "A solicitação deverá ser formalizada pelos canais oficiais de atendimento, com identificação do pedido.",
              ],
            },
            {
              heading: "2. Produtos com defeito",
              body: [
                "Em caso de vício ou defeito, o cliente deverá comunicar o ocorrido e seguir as orientações para análise e eventual substituição, conforme legislação vigente.",
              ],
            },
            {
              heading: "3. Garantia",
              body: [
                "A garantia observará as condições do fabricante e a legislação aplicável.",
                "Quando necessário, poderá ser exigida documentação de compra e registro do produto.",
              ],
            },
            {
              heading: "4. Cancelamento e reembolso",
              body: [
                "O cancelamento seguirá as condições de processamento do pedido e os prazos operacionais aplicáveis.",
                "O reembolso, quando devido, ocorrerá pela mesma forma de pagamento ou conforme meios permitidos e acordados, respeitados os prazos financeiros das instituições envolvidas.",
              ],
            },
          ],
        },
      ],
    };
  }

  if (s === "politica-de-privacidade" || s === "lgpd" || s === "politica-de-privacidade-e-lgpd") {
    return {
      title: "Política de privacidade e LGPD",
      subtitle: "Informações formais sobre coleta, uso, armazenamento e direitos do titular.",
      sections: [
        {
          kind: "legal",
          title: "Disposições",
          clauses: [
            {
              heading: "1. Coleta de dados",
              body: [
                "Coletamos dados fornecidos pelo titular e dados de navegação necessários para funcionamento e segurança.",
              ],
            },
            {
              heading: "2. Finalidade",
              body: [
                "Os dados são utilizados para execução de pedidos, atendimento, comunicação e melhoria de experiência, quando aplicável.",
              ],
            },
            {
              heading: "3. Compartilhamento",
              body: [
                "O compartilhamento poderá ocorrer com parceiros essenciais à execução do serviço (ex.: logística e meios de pagamento), quando necessário e conforme base legal.",
              ],
            },
            {
              heading: "4. Segurança",
              body: [
                "Adotamos medidas técnicas e organizacionais para proteção dos dados contra acessos não autorizados.",
              ],
            },
            {
              heading: "5. Direitos do titular",
              body: [
                "O titular poderá solicitar confirmação de tratamento, acesso, correção, anonimização, portabilidade ou eliminação, conforme aplicável, por meio de canal oficial de contato.",
              ],
            },
            {
              heading: "6. Cookies e consentimento",
              body: [
                "Utilizamos cookies para melhorar a experiência, segurança e medição. O titular pode aceitar ou configurar preferências no banner exibido no site.",
              ],
            },
          ],
        },
      ],
    };
  }

  return null;
}
