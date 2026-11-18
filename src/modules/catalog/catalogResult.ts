export function chooseCatalogProducts<T>(
  remoteProducts: T[] | null | undefined,
  fallbackProducts: T[],
): T[] {
  return remoteProducts ?? fallbackProducts;
}

export function describeCatalogError(error: unknown): string {
  const queryError = error as { code?: string; message?: string; name?: string };
  if (queryError?.code === "42501" || /permission|row-level security|not authorized/i.test(queryError?.message ?? "")) {
    return "Sem permissão para consultar os produtos desta loja.";
  }
  if (queryError?.name === "TypeError" || /ENOTFOUND|ECONN|failed to fetch|network/i.test(queryError?.message ?? "")) {
    return "Banco indisponível. Produtos locais não verificados foram ocultados.";
  }
  return "Não foi possível carregar os produtos do banco.";
}
