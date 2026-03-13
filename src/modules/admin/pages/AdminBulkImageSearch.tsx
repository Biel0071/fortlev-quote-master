import { useEffect, useState, useRef, useCallback } from "react";
import { cloud } from "@/lib/cloud";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { ProductImageSearchModal } from "@/components/admin/ProductImageSearchModal";
import {
  searchGoogleProductImages,
  importGoogleProductImages,
  type GoogleImageResult,
  type ImageSearchSource,
} from "@/services/googleImages";
import {
  ImageIcon, Search, ArrowLeft, Trash2, X, CheckSquare, RefreshCw,
  Zap, StopCircle, Play, Clock, CheckCircle2, XCircle, BarChart3,
  RotateCcw, AlertTriangle, FileText, Sparkles, Wand2, Activity,
  Gauge, Users, Timer,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

/* ───── Types ───── */
type ProductRow = {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  imageCount: number;
  images: Array<{ id: string; path: string; sort_order: number }>;
};

type JobStatus = "pending" | "processing" | "completed" | "error" | "retry";

type JobEntry = {
  productId: string;
  productName: string;
  status: JobStatus;
  imagesFound: number;
  imagesSaved: number;
  descriptionGenerated: boolean;
  techSheetGenerated: boolean;
  time: number;
  error?: string;
  retryCount: number;
  step: string;
  workerId: number;
};

type PipelineStats = {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  errors: number;
  retries: number;
  imagesApproved: number;
  descriptionsGenerated: number;
  activeWorkers: number;
  startTime: number;
  avgTimePerProduct: number;
  throughput: number; // products/min
};

type RunHistory = {
  date: string;
  total: number;
  completed: number;
  errors: number;
  avgTime: number;
  duration: number;
};

/* ───── Constants ───── */
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const MAX_WORKERS = 15;
const AI_MAX_CONCURRENT = 3;
const MAX_IMAGES_PER_PRODUCT = 8;
const MAX_RETRIES = 3;
const RETRY_DELAY_429 = 30_000;
const RETRY_DELAYS_AI = [5_000, 10_000, 20_000];
const INTER_WORKER_DELAY = 200;
const SOURCES_FALLBACK: ImageSearchSource[] = ["bing", "google", "mercado_livre"];

function getPublicUrl(path: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/product-images/${path}`;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function extractBaseKeyword(name: string): string {
  return name
    .toLowerCase()
    .replace(/\d+/g, "")
    .replace(/\s*(x|mm|cm|m²|kg|lt|ml|un|pç|pc)\s*/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .slice(0, 2)
    .join(" ");
}

/* ───── Semaphore for concurrency control ───── */
class Semaphore {
  private queue: Array<() => void> = [];
  private running = 0;
  constructor(private max: number) {}
  get active() { return this.running; }
  async acquire(): Promise<void> {
    if (this.running < this.max) {
      this.running++;
      return;
    }
    return new Promise<void>((resolve) => {
      this.queue.push(() => { this.running++; resolve(); });
    });
  }
  release() {
    this.running--;
    const next = this.queue.shift();
    if (next) next();
  }
}

export default function AdminBulkImageSearch() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductRow | null>(null);
  const [detailProduct, setDetailProduct] = useState<ProductRow | null>(null);
  const [filter, setFilter] = useState<"all" | "no-images" | "incomplete">("no-images");
  const [deletingImageId, setDeletingImageId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [workerCount, setWorkerCount] = useState(MAX_WORKERS);

  // Pipeline state
  const [pipelineRunning, setPipelineRunning] = useState(false);
  const [stats, setStats] = useState<PipelineStats | null>(null);
  const [jobs, setJobs] = useState<JobEntry[]>([]);
  const [runHistory, setRunHistory] = useState<RunHistory[]>([]);
  const abortRef = useRef(false);
  const jobsRef = useRef<JobEntry[]>([]);
  const statsRef = useRef<PipelineStats | null>(null);

  // Image cache: key → images
  const imageCacheRef = useRef(new Map<string, GoogleImageResult[]>());

  // AI concurrency limiter (max 3 simultaneous AI calls even with 15 workers)
  const aiSemRef = useRef(new Semaphore(AI_MAX_CONCURRENT));

  /* ─── Pagination-aware load ─── */
  const load = async () => {
    setLoading(true);
    const PAGE_SIZE = 1000;
    let allData: any[] = [];
    let from = 0;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await cloud
        .from("store_products")
        .select("id, name, description, active, sku, store_product_images(id, path, sort_order)")
        .order("name", { ascending: true })
        .range(from, from + PAGE_SIZE - 1);

      if (error) {
        toast({ title: "Erro", description: error.message, variant: "destructive" });
        setProducts([]);
        setLoading(false);
        return;
      }

      const batch = data ?? [];
      allData = [...allData, ...batch];
      hasMore = batch.length === PAGE_SIZE;
      from += PAGE_SIZE;
    }

    const mapped = allData.map((p: any) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      active: p.active,
      imageCount: Array.isArray(p.store_product_images) ? p.store_product_images.length : 0,
      images: Array.isArray(p.store_product_images)
        ? (p.store_product_images as any[]).sort((a: any, b: any) => a.sort_order - b.sort_order)
        : [],
    }));
    setProducts(mapped);

    if (detailProduct) {
      const updated = mapped.find((p) => p.id === detailProduct.id);
      if (updated) setDetailProduct(updated);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const getFilteredProducts = useCallback(() => {
    if (filter === "no-images") return products.filter((p) => p.imageCount === 0);
    if (filter === "incomplete") return products.filter((p) => p.imageCount < MAX_IMAGES_PER_PRODUCT);
    return products;
  }, [products, filter]);

  const filtered = getFilteredProducts();
  const noImagesCount = products.filter((p) => p.imageCount === 0).length;
  const incompleteCount = products.filter((p) => p.imageCount > 0 && p.imageCount < MAX_IMAGES_PER_PRODUCT).length;
  const noDescriptionCount = products.filter((p) => !p.description || p.description.trim().length < 20).length;

  const openSearch = (product: ProductRow) => { setSelectedProduct(product); setSearchOpen(true); };
  const openDetail = (product: ProductRow) => { setDetailProduct(product); setSelectedImages(new Set()); setSelectionMode(false); };

  const toggleImageSelection = (imageId: string) => {
    setSelectedImages((prev) => {
      const next = new Set(prev);
      if (next.has(imageId)) next.delete(imageId); else next.add(imageId);
      return next;
    });
  };

  const selectAllImages = () => {
    if (!detailProduct) return;
    if (selectedImages.size === detailProduct.images.length) setSelectedImages(new Set());
    else setSelectedImages(new Set(detailProduct.images.map((img) => img.id)));
  };

  const deleteImage = async (imageId: string, path: string) => {
    setDeletingImageId(imageId);
    try {
      await cloud.storage.from("product-images").remove([path]);
      const { error } = await cloud.from("store_product_images").delete().eq("id", imageId);
      if (error) throw error;
      toast({ title: "Imagem removida" });
      await load();
    } catch (e: any) {
      toast({ title: "Erro", description: e?.message || "Falha ao remover imagem", variant: "destructive" });
    } finally { setDeletingImageId(null); }
  };

  const bulkDelete = async () => {
    if (!detailProduct || selectedImages.size === 0) return;
    setBulkDeleting(true);
    try {
      const toDelete = detailProduct.images.filter((img) => selectedImages.has(img.id));
      await cloud.storage.from("product-images").remove(toDelete.map((img) => img.path));
      const { error } = await cloud.from("store_product_images").delete().in("id", toDelete.map((img) => img.id));
      if (error) throw error;
      toast({ title: `${toDelete.length} imagem(ns) removida(s)` });
      setSelectedImages(new Set());
      setSelectionMode(false);
      await load();
    } catch (e: any) {
      toast({ title: "Erro", description: e?.message || "Falha ao remover imagens", variant: "destructive" });
    } finally { setBulkDeleting(false); }
  };

  /* ─── Cache-aware image search with retry ─── */
  const searchWithCache = async (
    query: string,
    extraQueries?: string[],
  ): Promise<{ images: GoogleImageResult[]; fromCache: boolean }> => {
    const cacheKey = query.toLowerCase().trim();
    const cached = imageCacheRef.current.get(cacheKey);
    if (cached && cached.length > 0) return { images: cached, fromCache: true };

    // Similarity cache check
    const baseKey = extractBaseKeyword(query);
    if (baseKey.length >= 3) {
      const similarKey = `${baseKey} produto construção`.toLowerCase().trim();
      const similarCached = imageCacheRef.current.get(similarKey);
      if (similarCached && similarCached.length > 0) {
        imageCacheRef.current.set(cacheKey, similarCached);
        return { images: similarCached, fromCache: true };
      }
    }

    const queriesToTry = [...(extraQueries ?? []), query];

    for (const q of queriesToTry) {
      if (abortRef.current) break;
      for (const source of SOURCES_FALLBACK) {
        if (abortRef.current) break;
        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
          if (abortRef.current) break;
          try {
            const { images } = await searchGoogleProductImages({ query: q, start: 1, source });
            if (images.length > 0) {
              imageCacheRef.current.set(cacheKey, images);
              if (baseKey.length >= 3) {
                const bkc = `${baseKey} produto construção`.toLowerCase().trim();
                if (!imageCacheRef.current.has(bkc)) imageCacheRef.current.set(bkc, images);
              }
              return { images, fromCache: false };
            }
            break; // no results from this source, try next
          } catch (e: any) {
            const msg = e?.message || "";
            const is429 = msg.includes("429") || msg.includes("limit") || msg.includes("Limite");
            if (is429 && attempt < MAX_RETRIES - 1) {
              await sleep(RETRY_DELAY_429);
              continue;
            }
            if (!is429 && attempt < MAX_RETRIES - 1) {
              await sleep(3000);
              continue;
            }
            break;
          }
        }
      }
    }
    return { images: [], fromCache: false };
  };

  /* ─── Update helpers (batched state updates) ─── */
  const updateJob = (idx: number, patch: Partial<JobEntry>) => {
    jobsRef.current = jobsRef.current.map((j, i) => i === idx ? { ...j, ...patch } : j);
    setJobs([...jobsRef.current]);
  };

  const updateStats = (patch: Partial<PipelineStats>) => {
    statsRef.current = statsRef.current ? { ...statsRef.current, ...patch } : null;
    if (statsRef.current) setStats({ ...statsRef.current });
  };

  /* ─── Process a single product (worker task) ─── */
  const processProduct = async (jobIdx: number, workerId: number): Promise<void> => {
    const job = jobsRef.current[jobIdx];
    if (!job || abortRef.current) return;

    const startTime = Date.now();
    updateJob(jobIdx, { status: "processing", workerId, step: "🧠 Interpretando com IA..." });
    updateStats({ activeWorkers: (statsRef.current?.activeWorkers ?? 0) + 1, processing: (statsRef.current?.processing ?? 0) + 1, pending: (statsRef.current?.pending ?? 0) - 1 });

    try {
      // STEP 1: AI Enrichment with layered queries (concurrency limited)
      let aiSearchQueries: string[] = [];
      let layeredQueries: { manufacturer?: string[]; marketplace?: string[]; general?: string[] } = {};
      let imageRejectionTerms: string[] = [];
      let imageAcceptanceTerms: string[] = [];
      let aiImagePrompt = "";
      const product = products.find((p) => p.id === job.productId);
      const needsDescription = !product?.description || (product.description?.trim().length ?? 0) < 20;
      const neededImages = MAX_IMAGES_PER_PRODUCT - (product?.imageCount ?? 0);

      if (needsDescription || neededImages > 0) {
        updateJob(jobIdx, { step: "🧠 Aguardando slot IA..." });
        await aiSemRef.current.acquire();
        try {
          updateJob(jobIdx, { step: "🧠 IA interpretando..." });
          for (let aiAttempt = 0; aiAttempt < MAX_RETRIES; aiAttempt++) {
            try {
              const { data, error } = await cloud.functions.invoke("enrich-products", {
                body: { action: "enrich", productId: job.productId, productName: job.productName },
              });
              if (!error && data?.success) {
                aiSearchQueries = data.searchQueries ?? [];
                layeredQueries = data.searchQueriesLayered ?? {};
                imageRejectionTerms = data.imageRejectionTerms ?? [];
                imageAcceptanceTerms = data.imageAcceptanceTerms ?? [];
                aiImagePrompt = data.aiImagePrompt ?? "";
                updateJob(jobIdx, { descriptionGenerated: true, techSheetGenerated: true });
                updateStats({ descriptionsGenerated: (statsRef.current?.descriptionsGenerated ?? 0) + 1 });
              } else if (data && !data.success) {
                // Partial failure from server - use whatever data returned
                aiSearchQueries = data.searchQueries ?? [];
                layeredQueries = data.searchQueriesLayered ?? {};
                imageRejectionTerms = data.imageRejectionTerms ?? [];
                imageAcceptanceTerms = data.imageAcceptanceTerms ?? [];
                aiImagePrompt = data.aiImagePrompt ?? "";
              }
              break; // success or partial, stop retrying
            } catch (aiErr: any) {
              const msg = aiErr?.message || "";
              const is429 = msg.includes("429") || msg.includes("rate") || msg.includes("limit");
              if (is429 && aiAttempt < MAX_RETRIES - 1) {
                updateJob(jobIdx, { step: `🧠 Rate limit, retry ${aiAttempt + 1}...` });
                await sleep(RETRY_DELAYS_AI[aiAttempt] ?? 20_000);
                continue;
              }
              console.error("AI enrichment error:", msg);
              break; // give up on AI, continue pipeline
            }
          }
        } finally {
          aiSemRef.current.release();
        }
      }

      // STEP 2: Layered Image Search
      if (neededImages > 0 && !abortRef.current) {
        let allFoundImages: GoogleImageResult[] = [];

        // Layer 1: Manufacturer queries
        if (layeredQueries.manufacturer && layeredQueries.manufacturer.length > 0 && !abortRef.current) {
          updateJob(jobIdx, { step: "🏭 Buscando no fabricante..." });
          for (const q of layeredQueries.manufacturer) {
            if (abortRef.current || allFoundImages.length >= MAX_IMAGES_PER_PRODUCT) break;
            const { images } = await searchWithCache(q);
            // Filter using AI-provided terms
            const filtered = images.filter((img) => {
              const title = (img.title || "").toLowerCase();
              const hasRejection = imageRejectionTerms.some((t) => title.includes(t.toLowerCase()));
              const hasAcceptance = imageAcceptanceTerms.some((t) => title.includes(t.toLowerCase()));
              if (hasRejection && !hasAcceptance) return false;
              return true;
            });
            allFoundImages.push(...filtered);
          }
        }

        // Layer 2: Marketplace queries
        if (allFoundImages.length < neededImages && layeredQueries.marketplace && !abortRef.current) {
          updateJob(jobIdx, { step: "🛒 Buscando em marketplaces..." });
          for (const q of layeredQueries.marketplace) {
            if (abortRef.current || allFoundImages.length >= MAX_IMAGES_PER_PRODUCT) break;
            const { images } = await searchWithCache(q);
            const filtered = images.filter((img) => {
              const title = (img.title || "").toLowerCase();
              const hasRejection = imageRejectionTerms.some((t) => title.includes(t.toLowerCase()));
              const hasAcceptance = imageAcceptanceTerms.some((t) => title.includes(t.toLowerCase()));
              if (hasRejection && !hasAcceptance) return false;
              return true;
            });
            allFoundImages.push(...filtered);
          }
        }

        // Layer 3: General queries
        if (allFoundImages.length < neededImages && layeredQueries.general && !abortRef.current) {
          updateJob(jobIdx, { step: "🔍 Busca geral..." });
          for (const q of layeredQueries.general) {
            if (abortRef.current || allFoundImages.length >= MAX_IMAGES_PER_PRODUCT) break;
            const { images } = await searchWithCache(q);
            const filtered = images.filter((img) => {
              const title = (img.title || "").toLowerCase();
              const hasRejection = imageRejectionTerms.some((t) => title.includes(t.toLowerCase()));
              const hasAcceptance = imageAcceptanceTerms.some((t) => title.includes(t.toLowerCase()));
              if (hasRejection && !hasAcceptance) return false;
              return true;
            });
            allFoundImages.push(...filtered);
          }
        }

        // Fallback: original query if no layered queries
        if (allFoundImages.length === 0 && aiSearchQueries.length === 0 && !abortRef.current) {
          updateJob(jobIdx, { step: "🔍 Buscando imagens..." });
          const defaultQuery = `${job.productName} produto construção`;
          const { images } = await searchWithCache(defaultQuery);
          allFoundImages.push(...images);
        }

        // Deduplicate by URL
        const seen = new Set<string>();
        const uniqueImages = allFoundImages.filter((img) => {
          if (seen.has(img.imageUrl)) return false;
          seen.add(img.imageUrl);
          return true;
        });

        updateJob(jobIdx, { imagesFound: uniqueImages.length });

        // STEP 3: Import images
        if (uniqueImages.length > 0 && !abortRef.current) {
          updateJob(jobIdx, { step: "💾 Salvando imagens..." });
          const toImport = uniqueImages.slice(0, Math.min(neededImages, MAX_IMAGES_PER_PRODUCT));
          try {
            const result = await importGoogleProductImages({ productId: job.productId, images: toImport });
            updateJob(jobIdx, { imagesSaved: result.imported.length });
            updateStats({ imagesApproved: (statsRef.current?.imagesApproved ?? 0) + result.imported.length });
          } catch { /* partial failure */ }
        }

        // STEP 4: AI Image Generation Fallback (concurrency limited)
        const currentSaved = jobsRef.current[jobIdx]?.imagesSaved ?? 0;
        if (currentSaved === 0 && aiImagePrompt && !abortRef.current) {
          updateJob(jobIdx, { step: "🎨 Aguardando slot IA..." });
          await aiSemRef.current.acquire();
          try {
            updateJob(jobIdx, { step: "🎨 Gerando imagem com IA..." });
            for (let genAttempt = 0; genAttempt < MAX_RETRIES; genAttempt++) {
              try {
                const { data, error } = await cloud.functions.invoke("enrich-products", {
                  body: {
                    action: "generate-image",
                    productId: job.productId,
                    prompt: aiImagePrompt,
                  },
                });
                if (!error && data?.success) {
                  updateJob(jobIdx, { imagesSaved: 1, imagesFound: 1 });
                  updateStats({ imagesApproved: (statsRef.current?.imagesApproved ?? 0) + 1 });
                }
                break;
              } catch (genErr: any) {
                const msg = genErr?.message || "";
                const is429 = msg.includes("429") || msg.includes("rate") || msg.includes("limit");
                if (is429 && genAttempt < MAX_RETRIES - 1) {
                  updateJob(jobIdx, { step: `🎨 Rate limit, retry ${genAttempt + 1}...` });
                  await sleep(RETRY_DELAYS_AI[genAttempt] ?? 20_000);
                  continue;
                }
                break;
              }
            }
          } finally {
            aiSemRef.current.release();
          }
        }
      }

      const elapsed = Date.now() - startTime;
      updateJob(jobIdx, { status: "completed", time: elapsed, step: "✅ Concluído" });
      updateStats({
        completed: (statsRef.current?.completed ?? 0) + 1,
        processing: Math.max(0, (statsRef.current?.processing ?? 0) - 1),
        activeWorkers: Math.max(0, (statsRef.current?.activeWorkers ?? 0) - 1),
      });

    } catch (e: any) {
      const elapsed = Date.now() - startTime;
      const retryCount = job.retryCount + 1;

      if (retryCount < MAX_RETRIES) {
        updateJob(jobIdx, { status: "retry", retryCount, error: e?.message, time: elapsed, step: `🔄 Retry ${retryCount}/${MAX_RETRIES}` });
        updateStats({
          retries: (statsRef.current?.retries ?? 0) + 1,
          processing: Math.max(0, (statsRef.current?.processing ?? 0) - 1),
          activeWorkers: Math.max(0, (statsRef.current?.activeWorkers ?? 0) - 1),
          pending: (statsRef.current?.pending ?? 0) + 1,
        });
        // Re-enqueue for retry after delay
        await sleep(5000);
        if (!abortRef.current) await processProduct(jobIdx, workerId);
      } else {
        updateJob(jobIdx, { status: "error", error: e?.message, time: elapsed, step: "❌ Erro" });
        updateStats({
          errors: (statsRef.current?.errors ?? 0) + 1,
          processing: Math.max(0, (statsRef.current?.processing ?? 0) - 1),
          activeWorkers: Math.max(0, (statsRef.current?.activeWorkers ?? 0) - 1),
        });
      }
    }

    // Save log to DB (fire and forget)
    const finalJob = jobsRef.current[jobIdx];
    try {
      await cloud.from("image_import_logs").insert({
        product_id: finalJob.productId,
        images_found: finalJob.imagesFound,
        images_saved: finalJob.imagesSaved,
        status: finalJob.status,
        processing_time: finalJob.time,
        error_message: finalJob.error || null,
      } as any);
    } catch { /* ignore */ }

    // Update throughput
    if (statsRef.current) {
      const elapsedSec = (Date.now() - statsRef.current.startTime) / 1000;
      const completedCount = statsRef.current.completed;
      const avgTime = completedCount > 0 ? jobsRef.current.filter(j => j.status === "completed").reduce((s, j) => s + j.time, 0) / completedCount : 0;
      const throughput = elapsedSec > 0 ? (completedCount / elapsedSec) * 60 : 0;
      updateStats({ avgTimePerProduct: avgTime, throughput });
    }
  };

  /* ─── Run Pipeline with Parallel Workers ─── */
  const runPipeline = async (eligibleProducts: ProductRow[]) => {
    if (eligibleProducts.length === 0) {
      toast({ title: "Nada a processar", description: "Todos os produtos já estão completos." });
      return;
    }

    abortRef.current = false;
    setPipelineRunning(true);

    const initialJobs: JobEntry[] = eligibleProducts.map((p) => ({
      productId: p.id,
      productName: p.name,
      status: "pending" as JobStatus,
      imagesFound: 0,
      imagesSaved: 0,
      descriptionGenerated: false,
      techSheetGenerated: false,
      time: 0,
      retryCount: 0,
      step: "⏳ Na fila",
      workerId: -1,
    }));

    jobsRef.current = initialJobs;
    setJobs([...initialJobs]);

    const initialStats: PipelineStats = {
      total: eligibleProducts.length,
      pending: eligibleProducts.length,
      processing: 0,
      completed: 0,
      errors: 0,
      retries: 0,
      imagesApproved: 0,
      descriptionsGenerated: 0,
      activeWorkers: 0,
      startTime: Date.now(),
      avgTimePerProduct: 0,
      throughput: 0,
    };
    statsRef.current = initialStats;
    setStats({ ...initialStats });

    // Semaphore-based parallel execution
    const sem = new Semaphore(workerCount);
    const promises: Promise<void>[] = [];

    for (let i = 0; i < initialJobs.length; i++) {
      if (abortRef.current) break;

      await sem.acquire();
      if (abortRef.current) { sem.release(); break; }

      // Stagger worker launches
      if (i > 0) await sleep(INTER_WORKER_DELAY);

      const workerIdx = (i % workerCount) + 1;
      const promise = processProduct(i, workerIdx).finally(() => sem.release());
      promises.push(promise);
    }

    await Promise.allSettled(promises);

    setPipelineRunning(false);

    // Final stats
    const finalJobs = jobsRef.current;
    const completedCount = finalJobs.filter(j => j.status === "completed").length;
    const errCount = finalJobs.filter(j => j.status === "error").length;
    const totalTime = Date.now() - initialStats.startTime;
    const avgTime = completedCount > 0 ? finalJobs.filter(j => j.status === "completed").reduce((s, j) => s + j.time, 0) / completedCount : 0;

    // Save to run history
    setRunHistory((prev) => [
      {
        date: new Date().toLocaleString("pt-BR"),
        total: finalJobs.length,
        completed: completedCount,
        errors: errCount,
        avgTime,
        duration: totalTime,
      },
      ...prev.slice(0, 9),
    ]);

    await load();
    toast({
      title: "Pipeline concluído",
      description: `${completedCount} de ${finalJobs.length} produtos enriquecidos em ${(totalTime / 1000).toFixed(0)}s.`,
    });
  };

  const startPipeline = () => {
    const base = getFilteredProducts();
    const eligible = base.filter(
      (p) => p.imageCount < MAX_IMAGES_PER_PRODUCT || !p.description || (p.description?.trim().length ?? 0) < 20
    );
    runPipeline(eligible);
  };

  const reprocessErrors = () => {
    const errorIds = new Set(jobs.filter((l) => l.status === "error" || l.status === "retry").map((l) => l.productId));
    const eligible = products.filter((p) => errorIds.has(p.id));
    if (eligible.length === 0) {
      toast({ title: "Sem erros", description: "Nenhum produto com erro para reprocessar." });
      return;
    }
    runPipeline(eligible);
  };

  const stopPipeline = () => { abortRef.current = true; };

  // ─── DETAIL VIEW ───
  if (detailProduct) {
    return (
      <div className="space-y-4 px-1 sm:px-0">
        <div className="flex items-start gap-2">
          <Button variant="ghost" size="icon" className="shrink-0 mt-0.5 h-8 w-8" onClick={() => setDetailProduct(null)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-bold tracking-tight leading-tight truncate">{detailProduct.name}</h1>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <Badge variant={detailProduct.active ? "outline" : "secondary"} className="text-[10px] sm:text-xs">
                {detailProduct.active ? "Ativo" : "Inativo"}
              </Badge>
              <Badge variant={detailProduct.imageCount > 0 ? "default" : "secondary"} className="text-[10px] sm:text-xs">
                {detailProduct.imageCount} imagem(ns)
              </Badge>
              {detailProduct.description && detailProduct.description.trim().length >= 20 && (
                <Badge variant="outline" className="text-[10px] sm:text-xs border-green-500/50 text-green-600">
                  <FileText className="w-2.5 h-2.5 mr-0.5" /> Com descrição
                </Badge>
              )}
            </div>
          </div>
        </div>

        <Card className="rounded-xl sm:rounded-2xl">
          <CardHeader className="pb-3 space-y-2 sm:space-y-0 sm:flex sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base sm:text-lg">Imagens do produto</CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              {detailProduct.images.length > 0 && (
                <Button size="sm" variant={selectionMode ? "default" : "outline"} className="h-8 text-xs sm:text-sm" onClick={() => { setSelectionMode(!selectionMode); setSelectedImages(new Set()); }}>
                  <CheckSquare className="w-3.5 h-3.5 mr-1" />
                  {selectionMode ? "Cancelar" : "Selecionar"}
                </Button>
              )}
              {selectionMode && selectedImages.size > 0 && (
                <Button size="sm" variant="destructive" className="h-8 text-xs sm:text-sm" onClick={bulkDelete} disabled={bulkDeleting}>
                  <Trash2 className="w-3.5 h-3.5 mr-1" /> Excluir {selectedImages.size}
                </Button>
              )}
              <Button size="sm" className="h-8 text-xs sm:text-sm" onClick={() => openSearch(detailProduct)}>
                <Search className="w-3.5 h-3.5 mr-1" /> Buscar imagens
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {selectionMode && detailProduct.images.length > 0 && (
              <div className="mb-3">
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={selectAllImages}>
                  {selectedImages.size === detailProduct.images.length ? "Desmarcar todos" : "Selecionar todos"}
                </Button>
              </div>
            )}
            {detailProduct.images.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <ImageIcon className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">Nenhuma imagem cadastrada.</p>
                <p className="text-xs mt-1">Clique em "Buscar imagens" para adicionar.</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-3">
                {detailProduct.images.map((img, idx) => {
                  const isSelected = selectedImages.has(img.id);
                  return (
                    <div
                      key={img.id}
                      className={`relative group rounded-lg sm:rounded-xl border-2 overflow-hidden bg-muted/20 transition-all ${selectionMode && isSelected ? "border-primary ring-2 ring-primary/30" : "border-border"}`}
                      onClick={() => { if (selectionMode) toggleImageSelection(img.id); else setPreviewUrl(getPublicUrl(img.path)); }}
                    >
                      {selectionMode && (
                        <div className="absolute top-1.5 left-1.5 z-10">
                          <Checkbox checked={isSelected} onCheckedChange={() => toggleImageSelection(img.id)} className="bg-background/80 h-4 w-4" />
                        </div>
                      )}
                      <img src={getPublicUrl(img.path)} alt={`Imagem ${idx + 1}`} className="w-full aspect-square object-cover cursor-pointer" loading="lazy" />
                      {!selectionMode && (
                        <div className="absolute top-1 left-1 bg-background/80 backdrop-blur-sm text-[10px] font-medium px-1 py-0.5 rounded">#{idx + 1}</div>
                      )}
                      {!selectionMode && (
                        <button type="button" className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 sm:transition-opacity bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/90" disabled={deletingImageId === img.id} onClick={(e) => { e.stopPropagation(); deleteImage(img.id, img.path); }}>
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {detailProduct.description && detailProduct.description.trim().length > 0 && (
          <Card className="rounded-xl sm:rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <FileText className="w-4 h-4" /> Descrição gerada
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none text-muted-foreground whitespace-pre-wrap text-xs sm:text-sm leading-relaxed">
                {detailProduct.description}
              </div>
            </CardContent>
          </Card>
        )}

        {selectedProduct && (
          <ProductImageSearchModal open={searchOpen} onOpenChange={setSearchOpen} productId={selectedProduct.id} initialQuery={selectedProduct.name} onImported={load} />
        )}

        {previewUrl && (
          <div className="fixed inset-0 z-[100] bg-background/90 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4" onClick={() => setPreviewUrl(null)}>
            <button className="absolute top-3 right-3 sm:top-4 sm:right-4 text-foreground/90 hover:text-foreground z-10" onClick={() => setPreviewUrl(null)}>
              <X className="w-6 h-6 sm:w-8 sm:h-8" />
            </button>
            <img src={previewUrl} alt="Preview" className="max-w-full max-h-[90vh] object-contain rounded-lg border border-border" onClick={(e) => e.stopPropagation()} />
          </div>
        )}
      </div>
    );
  }

  // ─── LIST VIEW ───
  const progressPercent = stats ? Math.round((stats.completed / Math.max(1, stats.total)) * 100) : 0;
  const errorCount = jobs.filter((l) => l.status === "error").length;
  const eligibleCount = getFilteredProducts().filter(
    (p) => p.imageCount < MAX_IMAGES_PER_PRODUCT || !p.description || (p.description?.trim().length ?? 0) < 20
  ).length;
  const filterLabel = filter === "no-images" ? "sem imagens" : filter === "incomplete" ? "incompletos" : "todos";

  return (
    <div className="space-y-4 px-1 sm:px-0">
      {/* Header */}
      <div className="flex items-start gap-2">
        <Button variant="ghost" size="icon" className="shrink-0 mt-0.5 h-8 w-8" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg sm:text-2xl font-bold tracking-tight flex items-center gap-2">
            <Wand2 className="w-5 h-5 sm:w-6 sm:h-6 shrink-0 text-primary" /> Gerador de Imagens & Conteúdo IA
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Pipeline paralelo com {workerCount} workers — IA interpreta → busca em camadas (fabricante → marketplace → geral) → filtro anti-ambiente → fallback IA.
          </p>
        </div>
        <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8" onClick={() => load()} disabled={loading || pipelineRunning}>
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2 sm:gap-3">
        {[
          { value: products.length, label: "Total", icon: BarChart3, color: "" },
          { value: noImagesCount, label: "Sem imagens", icon: ImageIcon, color: "text-destructive" },
          { value: noDescriptionCount, label: "Sem descrição", icon: FileText, color: "text-orange-500" },
          { value: incompleteCount, label: "Incompletos", icon: AlertTriangle, color: "text-amber-500" },
          { value: `${products.length > 0 ? Math.round(((products.length - noImagesCount) / products.length) * 100) : 0}%`, label: "Cobertura", icon: Activity, color: "text-primary" },
          { value: stats?.throughput ? `${stats.throughput.toFixed(1)}/min` : "—", label: "Velocidade", icon: Gauge, color: "text-green-600" },
        ].map((stat) => (
          <Card key={stat.label} className="rounded-xl">
            <CardContent className="p-3 sm:p-4 text-center">
              <div className={`text-lg sm:text-2xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-[10px] sm:text-xs text-muted-foreground flex items-center justify-center gap-1">
                <stat.icon className="w-3 h-3" /> {stat.label}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pipeline Control */}
      <Card className="rounded-xl sm:rounded-2xl border-primary/30 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            Pipeline de Enriquecimento Paralelo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!pipelineRunning && !stats && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs sm:text-sm text-muted-foreground">
                {[
                  { emoji: "🧠", title: "IA Interpreta", desc: "Extrai tipo, marca, cor, tamanho e gera queries em camadas" },
                  { emoji: "🏭", title: "Fabricante → 🛒 Marketplace → 🔍 Geral", desc: "Busca em 3 camadas com filtro anti-ambiente" },
                  { emoji: "🎨", title: "Fallback IA", desc: "Gera imagem realista se nenhuma foto encontrada" },
                  { emoji: "📝", title: "Gera Conteúdo", desc: "Descrição + ficha técnica completa" },
                ].map((step) => (
                  <div key={step.title} className="flex items-start gap-2 p-2 rounded-lg bg-background/50 border border-border">
                    <span className="text-base">{step.emoji}</span>
                    <div>
                      <span className="font-medium text-foreground">{step.title}</span>
                      <p className="text-[10px] sm:text-xs mt-0.5">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Worker count selector */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2 text-xs sm:text-sm">
                  <Users className="w-4 h-4 text-primary" />
                  <span className="font-medium">Workers paralelos:</span>
                  <div className="flex gap-1">
                    {[5, 10, 15, 20].map((n) => (
                      <Button
                        key={n}
                        size="sm"
                        variant={workerCount === n ? "default" : "outline"}
                        className="h-7 w-9 text-xs p-0"
                        onClick={() => setWorkerCount(n)}
                      >
                        {n}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              <Button
                onClick={startPipeline}
                disabled={loading || eligibleCount === 0}
                className="w-full sm:w-auto h-11 sm:h-12 text-sm sm:text-base font-semibold gap-2"
              >
                <Zap className="w-4 h-4 sm:w-5 sm:h-5" />
                IMPORTAR IMAGENS AUTOMATICAMENTE ({eligibleCount} produtos)
              </Button>
              {eligibleCount === 0 && (
                <p className="text-xs text-green-600 font-medium">✅ Todos os produtos já estão completos!</p>
              )}
            </div>
          )}

          {/* Progress */}
          {stats && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="font-medium flex items-center gap-2">
                    {pipelineRunning && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    {pipelineRunning ? "Processando..." : "Concluído"}
                  </span>
                  <span className="text-muted-foreground">
                    Cobertura: {progressPercent}%
                  </span>
                </div>
                <Progress value={progressPercent} className="h-3 sm:h-4" />
                <div className="text-center text-xs text-muted-foreground">
                  {stats.completed} / {stats.total} produtos
                </div>
              </div>

              {/* Live metrics */}
              <div className="grid grid-cols-3 sm:grid-cols-8 gap-2">
                {[
                  { value: stats.activeWorkers, label: "Workers ativos", color: "text-blue-600", icon: Users },
                  { value: stats.completed, label: "Processados", color: "text-primary", icon: CheckCircle2 },
                  { value: stats.pending, label: "Na fila", color: "text-muted-foreground", icon: Clock },
                  { value: stats.processing, label: "Em execução", color: "text-blue-500", icon: Activity },
                  { value: stats.imagesApproved, label: "Imagens", color: "text-green-600", icon: ImageIcon },
                  { value: stats.descriptionsGenerated, label: "Descrições", color: "text-indigo-600", icon: FileText },
                  { value: stats.errors, label: "Erros", color: "text-destructive", icon: XCircle },
                  { value: stats.avgTimePerProduct > 0 ? `${(stats.avgTimePerProduct / 1000).toFixed(1)}s` : "—", label: "Tempo médio", color: "text-amber-600", icon: Timer },
                ].map((s) => (
                  <div key={s.label} className="rounded-lg border border-border p-2 text-center">
                    <div className={`text-sm sm:text-base font-bold ${s.color}`}>{s.value}</div>
                    <div className="text-[9px] sm:text-[10px] text-muted-foreground flex items-center justify-center gap-0.5">
                      <s.icon className="w-2.5 h-2.5" /> {s.label}
                    </div>
                  </div>
                ))}
              </div>

              {/* Throughput indicator */}
              {stats.throughput > 0 && (
                <div className="flex items-center gap-2 text-xs sm:text-sm bg-green-500/10 border border-green-500/30 rounded-lg p-2">
                  <Gauge className="w-4 h-4 text-green-600" />
                  <span className="font-medium text-green-700">
                    Velocidade: {stats.throughput.toFixed(1)} produtos/min
                  </span>
                  {stats.total > stats.completed && (
                    <span className="text-green-600/70 text-[10px] sm:text-xs">
                      — ETA: {stats.throughput > 0 ? `${Math.ceil((stats.total - stats.completed) / stats.throughput)} min` : "calculando..."}
                    </span>
                  )}
                </div>
              )}

              <div className="flex gap-2 flex-wrap">
                {pipelineRunning ? (
                  <Button variant="destructive" size="sm" className="h-8 text-xs sm:text-sm" onClick={stopPipeline}>
                    <StopCircle className="w-3.5 h-3.5 mr-1" /> Parar
                  </Button>
                ) : (
                  <>
                    <Button size="sm" className="h-8 text-xs sm:text-sm" onClick={startPipeline}>
                      <Play className="w-3.5 h-3.5 mr-1" /> Executar novamente
                    </Button>
                    {errorCount > 0 && (
                      <Button size="sm" variant="outline" className="h-8 text-xs sm:text-sm border-orange-500/50 text-orange-600 hover:bg-orange-50" onClick={reprocessErrors}>
                        <RotateCcw className="w-3.5 h-3.5 mr-1" />
                        Reprocessar {errorCount} erro(s)
                      </Button>
                    )}
                    <Button variant="outline" size="sm" className="h-8 text-xs sm:text-sm" onClick={() => { setStats(null); setJobs([]); }}>
                      Limpar
                    </Button>
                  </>
                )}
              </div>

              {/* Job Log */}
              {jobs.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-xs sm:text-sm font-medium flex items-center gap-1.5">
                    <BarChart3 className="w-3.5 h-3.5" /> Log do pipeline ({jobs.filter(j => j.status !== "pending").length}/{jobs.length})
                  </h4>
                  <div className="max-h-[40vh] overflow-y-auto space-y-1 rounded-lg border border-border p-2 bg-muted/20">
                    {jobs.filter(j => j.status !== "pending").map((job, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-[10px] sm:text-xs py-1 border-b border-border/50 last:border-0">
                        {job.status === "completed" && <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0" />}
                        {job.status === "processing" && <RefreshCw className="w-3.5 h-3.5 text-blue-500 animate-spin shrink-0" />}
                        {job.status === "error" && <XCircle className="w-3.5 h-3.5 text-destructive shrink-0" />}
                        {job.status === "retry" && <RotateCcw className="w-3.5 h-3.5 text-orange-500 shrink-0" />}
                        {job.status === "pending" && <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                        <span className="text-[9px] text-muted-foreground shrink-0">W{job.workerId}</span>
                        <span className="truncate flex-1 font-medium">{job.productName}</span>
                        <span className="text-[9px] sm:text-[10px] text-muted-foreground shrink-0">{job.step}</span>
                        <div className="flex items-center gap-1 shrink-0">
                          {job.descriptionGenerated && <Badge variant="outline" className="text-[8px] px-1 py-0 border-blue-500/50 text-blue-600">📝</Badge>}
                          {job.techSheetGenerated && <Badge variant="outline" className="text-[8px] px-1 py-0 border-green-500/50 text-green-600">📋</Badge>}
                        </div>
                        {job.error && <span className="text-destructive/70 truncate max-w-[80px] sm:max-w-[150px]" title={job.error}>{job.error}</span>}
                        <span className="text-muted-foreground shrink-0">{job.imagesSaved}/{job.imagesFound}</span>
                        {job.time > 0 && (
                          <span className="text-muted-foreground shrink-0 flex items-center gap-0.5">
                            <Clock className="w-2.5 h-2.5" />
                            {(job.time / 1000).toFixed(1)}s
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Run History */}
      {runHistory.length > 0 && (
        <Card className="rounded-xl sm:rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <Timer className="w-4 h-4" /> Histórico de execuções
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {runHistory.map((run, idx) => (
                <div key={idx} className="flex items-center gap-3 text-[10px] sm:text-xs py-1.5 border-b border-border/50 last:border-0">
                  <span className="text-muted-foreground shrink-0">{run.date}</span>
                  <span className="font-medium">{run.completed}/{run.total} produtos</span>
                  {run.errors > 0 && <span className="text-destructive">{run.errors} erros</span>}
                  <span className="text-muted-foreground">Média: {(run.avgTime / 1000).toFixed(1)}s</span>
                  <span className="text-muted-foreground">Duração: {(run.duration / 1000).toFixed(0)}s</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter */}
      <div className="flex gap-1.5 sm:gap-2 flex-wrap">
        <Button variant={filter === "no-images" ? "default" : "outline"} size="sm" className="h-8 text-xs sm:text-sm" onClick={() => setFilter("no-images")}>
          Sem imagens ({noImagesCount})
        </Button>
        <Button variant={filter === "incomplete" ? "default" : "outline"} size="sm" className="h-8 text-xs sm:text-sm" onClick={() => setFilter("incomplete")}>
          Incompletos ({incompleteCount + noImagesCount})
        </Button>
        <Button variant={filter === "all" ? "default" : "outline"} size="sm" className="h-8 text-xs sm:text-sm" onClick={() => setFilter("all")}>
          Todos ({products.length})
        </Button>
      </div>

      {/* Products list */}
      <Card className="rounded-xl sm:rounded-2xl">
        <CardHeader className="pb-2 sm:pb-3">
          <CardTitle className="text-base sm:text-lg">
            {filter === "no-images" ? "Produtos sem imagens" : filter === "incomplete" ? "Produtos com menos de 8 imagens" : "Todos os produtos"}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {loading ? (
            <div className="text-sm text-muted-foreground py-6 text-center">Carregando...</div>
          ) : filtered.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">
              {filter === "no-images" ? "🎉 Todos os produtos já possuem imagens!" : "Nenhum produto encontrado."}
            </div>
          ) : (
            <div className="space-y-1.5 max-h-[60vh] overflow-y-auto pr-0.5 sm:pr-1">
              {filtered.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-2 sm:gap-3 rounded-lg sm:rounded-xl border border-border p-2.5 sm:p-3 hover:bg-muted/30 transition cursor-pointer active:bg-muted/50"
                  onClick={() => openDetail(p)}
                >
                  {p.imageCount > 0 && p.images[0] && (
                    <img src={getPublicUrl(p.images[0].path)} alt="" className="w-10 h-10 sm:w-12 sm:h-12 rounded-md object-cover shrink-0 border border-border" loading="lazy" />
                  )}
                  {p.imageCount === 0 && (
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-md bg-muted/40 flex items-center justify-center shrink-0 border border-border">
                      <ImageIcon className="w-4 h-4 text-muted-foreground/50" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-xs sm:text-sm truncate">{p.name}</div>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <Badge variant={p.imageCount >= MAX_IMAGES_PER_PRODUCT ? "default" : p.imageCount > 0 ? "outline" : "secondary"} className="text-[10px] sm:text-xs px-1.5 py-0">
                        {p.imageCount} img
                      </Badge>
                      {p.description && p.description.trim().length >= 20 ? (
                        <Badge variant="outline" className="text-[10px] sm:text-xs px-1.5 py-0 border-green-500/50 text-green-600">📝</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px] sm:text-xs px-1.5 py-0">Sem desc</Badge>
                      )}
                    </div>
                  </div>
                  <Button size="sm" variant="outline" className="shrink-0 h-7 sm:h-8 text-[10px] sm:text-xs px-2 sm:px-3" onClick={(e) => { e.stopPropagation(); openSearch(p); }}>
                    <Search className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-0.5 sm:mr-1" />
                    <span className="hidden xs:inline">Buscar</span>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedProduct && (
        <ProductImageSearchModal open={searchOpen} onOpenChange={setSearchOpen} productId={selectedProduct.id} initialQuery={selectedProduct.name} onImported={load} />
      )}
    </div>
  );
}
