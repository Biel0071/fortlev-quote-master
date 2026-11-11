import areiaIcon from "@/assets/category-icons/areia.png";
import blocosIcon from "@/assets/category-icons/blocos.png";
import churrasqueiraIcon from "@/assets/category-icons/churrasqueira.png";
import cimentoIcon from "@/assets/category-icons/cimento.png";
import eletricaIcon from "@/assets/category-icons/eletrica.png";
import ferramentasIcon from "@/assets/category-icons/ferramentas.png";
import madeiraIcon from "@/assets/category-icons/madeira.png";
import pinturaIcon from "@/assets/category-icons/pintura.png";
import vergalhaoIcon from "@/assets/category-icons/vergalhao.png";

/**
 * Mapeia categorias de construção para os ícones PNG oficiais locais em alta resolução.
 */
export function resolveCategoryPng(name?: string | null, slug?: string | null): string | null {
  const key = `${slug ?? ""} ${name ?? ""}`.trim().toLowerCase();

  if (/(ferragem|vergalh|arma|aco|aço)/.test(key)) return vergalhaoIcon;
  if (/(cimento|argamassa|rejunte|massa|laje|cal|gesso)/.test(key)) return cimentoIcon;
  if (/(bloco|tijolo|alvenaria|basic|material|canaleta)/.test(key)) return blocosIcon;
  if (/(madeira|telhad|telha|cobertura|forro|porta|janela)/.test(key)) return madeiraIcon;
  if (/(elétrica|eletrica|fio|cabo|tomada|interruptor)/.test(key)) return eletricaIcon;
  if (/(ferramenta|obra|martelo|broca|serra|equip|betoneira)/.test(key)) return ferramentasIcon;
  if (/(pintura|tinta|verniz|textura)/.test(key)) return pinturaIcon;
  if (/(churrasqueira|gourmet|lazer)/.test(key)) return churrasqueiraIcon;
  if (/(areia|brita|pedra|agregado|piso|porcelanato|revest)/.test(key)) return areiaIcon;
  if (/(hidráulica|hidraulica|cano|tubo|caixa|esgoto)/.test(key)) return cimentoIcon;

  return null;
}
