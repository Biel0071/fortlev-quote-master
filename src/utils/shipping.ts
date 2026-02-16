export function calcShipping(subtotal: number) {
  // Regra escolhida: até 800 = 15%, até 300 = 20%, acima de 800 = 10%, mínimo R$30
  const pct = subtotal <= 300 ? 0.2 : subtotal <= 800 ? 0.15 : 0.1;
  const value = Math.max(30, subtotal * pct);
  return { pct, value };
}
