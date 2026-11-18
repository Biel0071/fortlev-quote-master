type ImageRetryProduct = { id: string; status?: string | null };

export function getImageRetryUpdates<T extends ImageRetryProduct>(
  products: T[],
  productsWithImages: Set<string>,
) {
  return products
    .filter((product) => !productsWithImages.has(product.id) && product.status === "no_image_found")
    .map(({ id }) => ({ id, status: "import_pending" as const }));
}
