function slugifyChunk(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[’'`]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getProductSlug(product: { id?: string | null; name?: string | null }) {
  const nameSlug = slugifyChunk(String(product.name ?? "produto")) || "produto";
  const id = String(product.id ?? "").trim();
  return id ? `${nameSlug}--${id}` : nameSlug;
}

export function matchesProductSlug(product: { id?: string | null; name?: string | null }, rawSlug?: string | null) {
  const slug = String(rawSlug ?? "").trim();
  const id = String(product.id ?? "").trim();

  if (!slug || !id) return false;
  if (slug === id) return true;
  if (getProductSlug(product) === slug) return true;

  const suffix = slug.includes("--") ? slug.split("--").pop()?.trim() ?? "" : "";
  if (suffix && suffix === id) return true;

  return slugifyChunk(String(product.name ?? "")) === slug;
}