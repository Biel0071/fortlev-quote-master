import { Skeleton } from "@/components/ui/skeleton";
import { BannerSlider } from "@/components/store/home/BannerSlider";
import type { HomeBanner } from "@/hooks/useHomeContent";

export function HomeHeroCarousel({
  banners,
  loading,
}: {
  banners: HomeBanner[];
  loading: boolean;
}) {
  if (loading && banners.length === 0) {
    return (
      <section className="px-4 sm:px-6">
        <div className="w-full overflow-hidden rounded-3xl border border-border bg-card">
          <Skeleton className="h-[220px] sm:h-[260px] lg:h-[400px] w-full" />
        </div>
      </section>
    );
  }

  const normalizedBanners = (banners ?? []).map((banner) => ({
    image_desktop_path: banner.image_desktop_path,
    image_mobile_path: banner.image_mobile_path,
    link_url: banner.link_url,
    position: Number(banner.position ?? 0),
  }));

  return (
    <section className="px-4 sm:px-6">
      <BannerSlider banners={normalizedBanners} />
    </section>
  );
}

