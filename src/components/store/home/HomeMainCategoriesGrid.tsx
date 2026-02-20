import { Link } from "react-router-dom";
import { publicImageUrl } from "@/utils/storage";
import { cn } from "@/lib/utils";
import type { StoreCategory } from "@/hooks/useStoreCategories";

export function HomeMainCategoriesGrid({ categories }: { categories: StoreCategory[] }) {
  const items = (categories ?? []).slice(0, 6);
  if (items.length === 0) return null;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((c) => {
        const img = publicImageUrl("category-images", c.image_path ?? null);
        return (
          <Link
            key={c.id}
            to={`/loja?categoria=${encodeURIComponent(c.slug)}`}
            className={cn(
              "group relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm",
              "transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-md",
            )}
            aria-label={`Ver produtos de ${c.name}`}
          >
            <div className="aspect-[16/10]">
              {img ? (
                <img src={img} alt={`Categoria ${c.name}`} className="h-full w-full object-cover" loading="lazy" />
              ) : (
                <div className="h-full w-full fortlev-gradient opacity-80" />
              )}
            </div>

            <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />

            <div className="absolute inset-x-0 bottom-0 p-4">
              <div className="text-base font-semibold leading-tight text-foreground text-center">{c.name}</div>
              <div className="mt-2 flex justify-center">
                <span className="inline-flex h-11 items-center rounded-xl border border-border bg-background/70 px-4 text-sm font-semibold">
                  Ver produtos
                </span>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
