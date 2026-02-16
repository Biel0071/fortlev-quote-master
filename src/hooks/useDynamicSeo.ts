import { useEffect } from "react";

type Seo = {
  meta_title: string | null;
  meta_description: string | null;
  og_image_path: string | null;
};

function upsertMeta(name: string, content: string) {
  let el = document.head.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("name", name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertOg(property: string, content: string) {
  let el = document.head.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("property", property);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertCanonical(url: string) {
  let el = document.head.querySelector(`link[rel="canonical"]`) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", url);
}

export function useDynamicSeo({
  title,
  description,
  ogImageUrl,
  canonicalPath = "/",
}: {
  title: string;
  description: string;
  ogImageUrl?: string | null;
  canonicalPath?: string;
}) {
  useEffect(() => {
    if (typeof document === "undefined") return;

    document.title = title;
    upsertMeta("description", description);

    upsertOg("og:title", title);
    upsertOg("og:description", description);
    upsertOg("og:type", "website");

    if (ogImageUrl) upsertOg("og:image", ogImageUrl);

    const origin = window.location.origin;
    upsertCanonical(origin + canonicalPath);
  }, [title, description, ogImageUrl, canonicalPath]);
}

export function pickHomeSeo(seo: Seo | null | undefined) {
  const fallbackTitle = "Depósito de Materiais | Compre Online";
  const fallbackDesc = "Ofertas de materiais de construção com entrega rápida e compra segura. Adicione ao carrinho e finalize seu pedido.";

  return {
    title: (seo?.meta_title ?? "").trim() || fallbackTitle,
    description: (seo?.meta_description ?? "").trim() || fallbackDesc,
  };
}
