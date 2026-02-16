import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { publicImageUrl } from "@/utils/storage";
import type { StoreCategory } from "@/hooks/useStoreCategories";

export function HomeFeaturedCategories({ categories }: { categories: StoreCategory[] }) {
  if (!categories || categories.length === 0) return null;

  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-xl font-semibold">Categorias em destaque</h2>
        <p className="text-sm text-muted-foreground">Acesse rápido os principais departamentos.</p>
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {categories.slice(0, 12).map((c: any) => {
          const img = publicImageUrl("category-images", c.image_path);
          return (
            <Link
              key={c.id}
              to={`/loja?categoria=${encodeURIComponent(c.slug)}`}
              className="group rounded-2xl border border-border bg-card p-3 hover:bg-muted/30 transition overflow-hidden"
            >
              <div className="aspect-[4/3] rounded-xl overflow-hidden border border-border bg-muted/20">
                {img ? (
                  <img src={img} alt={`Categoria ${c.name}`} className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <div className="h-full w-full fortlev-gradient opacity-60" />
                )}
              </div>

              <div className="mt-3">
                <div className="font-medium line-clamp-2">{c.name}</div>
                <div className="mt-2">
                  <Button size="sm" variant="outline" className="w-full">
                    Ver produtos
                  </Button>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
