import { useCallback, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ImageIcon, Loader2, Sparkles, Trash2, Upload, Video, X } from "lucide-react";
import { cloud } from "@/lib/cloud";
import { useStore } from "@/contexts/StoreContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";

type UploadFile = {
  id: string;
  file: File;
  preview: string;
  type: "image" | "video";
  status: "pending" | "uploading" | "queued" | "completed" | "failed";
  progress: number;
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// Extrai 5 frames de um vídeo (10%, 30%, 50%, 70%, 90%) via canvas
async function extractVideoFrames(file: File, count = 5): Promise<Blob[]> {
  const url = URL.createObjectURL(file);
  try {
    return await new Promise<Blob[]>((resolve, reject) => {
      const video = document.createElement("video");
      video.src = url;
      video.crossOrigin = "anonymous";
      video.muted = true;
      video.playsInline = true;
      video.preload = "metadata";

      video.onerror = () => reject(new Error("Falha ao ler vídeo"));
      video.onloadedmetadata = async () => {
        try {
          const duration = video.duration || 1;
          const canvas = document.createElement("canvas");
          canvas.width = 800;
          canvas.height = Math.round((video.videoHeight / Math.max(video.videoWidth, 1)) * 800) || 600;
          const ctx = canvas.getContext("2d")!;
          const positions = Array.from({ length: count }, (_, i) => ((i + 1) / (count + 1)));
          const frames: Blob[] = [];
          for (const pos of positions) {
            await new Promise<void>((r) => {
              video.onseeked = () => r();
              video.currentTime = duration * pos;
            });
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const blob = await new Promise<Blob>((res, rej) =>
              canvas.toBlob((b) => (b ? res(b) : rej(new Error("toBlob falhou"))), "image/jpeg", 0.85),
            );
            frames.push(blob);
          }
          resolve(frames);
        } catch (err) {
          reject(err);
        }
      };
      video.load();
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function AdminProductsMediaImport() {
  const nav = useNavigate();
  const { activeStoreId, routes } = useStore();
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const batchIdRef = useRef<string>(crypto.randomUUID());
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const addFiles = useCallback((incoming: File[]) => {
    const newFiles: UploadFile[] = incoming.map((file) => ({
      id: crypto.randomUUID(),
      file,
      preview: URL.createObjectURL(file),
      type: file.type.startsWith("video/") ? "video" : "image",
      status: "pending",
      progress: 0,
    }));
    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    addFiles(Array.from(e.dataTransfer.files));
  };

  const updateFile = (id: string, patch: Partial<UploadFile>) => {
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  };

  const removeFile = (id: string) => {
    setFiles((prev) => {
      const f = prev.find((x) => x.id === id);
      if (f) URL.revokeObjectURL(f.preview);
      return prev.filter((x) => x.id !== id);
    });
  };

  const startUpload = async () => {
    if (!activeStoreId) {
      toast({ title: "Selecione uma loja", variant: "destructive" });
      return;
    }
    if (files.length === 0) return;

    setIsUploading(true);
    const batchId = batchIdRef.current;

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      try {
        updateFile(f.id, { status: "uploading", progress: 5 });

        const safeName = f.file.name.replace(/[^\w.\-]+/g, "_");
        const basePath = `imports/${activeStoreId}/${batchId}/${f.id}`;
        const filePath = `${basePath}_${safeName}`;

        const { error: upErr } = await cloud.storage
          .from("product-media")
          .upload(filePath, f.file, { contentType: f.file.type, cacheControl: "3600" });
        if (upErr) throw new Error(upErr.message);

        const { data: pub } = cloud.storage.from("product-media").getPublicUrl(filePath);
        const fileUrl: string = pub.publicUrl;

        let frameUrls: string[] = [];
        if (f.type === "video") {
          updateFile(f.id, { progress: 35 });
          const frames = await extractVideoFrames(f.file, 5);
          for (let k = 0; k < frames.length; k++) {
            const framePath = `${basePath}_frame_${k}.jpg`;
            const { error: frameErr } = await cloud.storage
              .from("product-media")
              .upload(framePath, frames[k], { contentType: "image/jpeg", cacheControl: "3600" });
            if (frameErr) throw new Error(frameErr.message);
            const { data: fpub } = cloud.storage.from("product-media").getPublicUrl(framePath);
            frameUrls.push(fpub.publicUrl);
          }
        }

        updateFile(f.id, { progress: 70 });

        const { error: jobErr } = await cloud.from("media_import_jobs").insert({
          store_id: activeStoreId,
          media_type: f.type,
          file_url: fileUrl,
          file_name: f.file.name,
          file_size: f.file.size,
          frame_urls: frameUrls,
          batch_id: batchId,
          batch_position: i,
          status: "queued",
        });
        if (jobErr) throw new Error(jobErr.message);

        updateFile(f.id, { status: "queued", progress: 100 });
      } catch (err) {
        console.error("[BulkMediaUploader] item failed", err);
        updateFile(f.id, { status: "failed", progress: 0 });
      }
    }

    // Dispara processamento
    try {
      const { error: invErr } = await cloud.functions.invoke("process-media-import", {
        body: { batch_id: batchId, store_id: activeStoreId },
      });
      if (invErr) throw invErr;
      toast({
        title: "Importação iniciada",
        description: "A IA está criando os produtos. Atualize a lista de produtos em instantes.",
      });
    } catch (err: any) {
      toast({ title: "Erro ao iniciar processamento", description: err?.message, variant: "destructive" });
    }

    setIsUploading(false);
    batchIdRef.current = crypto.randomUUID();
  };

  const completed = files.filter((f) => f.status === "queued" || f.status === "completed").length;
  const globalProgress = files.length > 0 ? Math.round((completed / files.length) * 100) : 0;

  return (
    <div className="space-y-4 p-4 sm:p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => nav(routes.adminPath("/produtos"))}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Importar por Fotos e Vídeos (IA)</h1>
          <p className="text-sm text-muted-foreground">
            Envie fotos ou vídeos dos produtos. A IA identifica, nomeia e cria cada um como rascunho.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" />
            Upload em massa
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            onDrop={onDrop}
            onDragOver={(e) => e.preventDefault()}
            className="border-2 border-dashed border-primary/30 rounded-xl p-8 text-center hover:border-primary/60 hover:bg-primary/5 transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="flex flex-col items-center gap-3">
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                <Upload className="h-7 w-7 text-primary" />
              </div>
              <div>
                <p className="font-semibold">Arraste fotos e vídeos aqui</p>
                <p className="text-xs text-muted-foreground">JPG, PNG, WEBP, MP4, MOV — sem limite de quantidade</p>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*"
              className="hidden"
              onChange={(e) => addFiles(Array.from(e.target.files ?? []))}
            />
          </div>

          {files.length > 0 && (
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="secondary">
                <ImageIcon className="h-3 w-3 mr-1" />
                {files.filter((f) => f.type === "image").length} fotos
              </Badge>
              <Badge variant="secondary">
                <Video className="h-3 w-3 mr-1" />
                {files.filter((f) => f.type === "video").length} vídeos
              </Badge>
              <Badge>{files.length} total</Badge>
              <Badge variant="outline">{formatBytes(files.reduce((s, f) => s + f.file.size, 0))}</Badge>
            </div>
          )}

          {files.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 gap-3">
              {files.map((file) => (
                <div key={file.id} className="relative group aspect-square rounded-lg overflow-hidden border bg-muted">
                  {file.type === "image" ? (
                    <img src={file.preview} alt={file.file.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-black/80 flex items-center justify-center text-white">
                      <Video className="h-8 w-8" />
                    </div>
                  )}
                  {file.status === "uploading" && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <Loader2 className="h-6 w-6 text-white animate-spin" />
                    </div>
                  )}
                  {file.status === "queued" && (
                    <div className="absolute inset-0 bg-emerald-500/40 flex items-center justify-center text-white text-[10px] font-semibold">
                      ENFILEIRADO
                    </div>
                  )}
                  {file.status === "failed" && (
                    <div className="absolute inset-0 bg-destructive/60 flex items-center justify-center text-white text-[10px] font-semibold">
                      FALHOU
                    </div>
                  )}
                  {file.status === "pending" && !isUploading && (
                    <button
                      onClick={() => removeFile(file.id)}
                      className="absolute top-1 right-1 h-6 w-6 rounded-full bg-destructive text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label="Remover"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {isUploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Processando {completed}/{files.length}</span>
                <span>{globalProgress}%</span>
              </div>
              <Progress value={globalProgress} />
            </div>
          )}

          {files.length > 0 && !isUploading && (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => { files.forEach((f) => URL.revokeObjectURL(f.preview)); setFiles([]); }}>
                <Trash2 className="h-4 w-4 mr-2" />
                Limpar tudo
              </Button>
              <Button onClick={startUpload} className="gap-2">
                <Sparkles className="h-4 w-4" />
                Enviar e processar com IA ({files.length})
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
