/**
 * Client-side banner image processor.
 * Smart resize/fit – "entende o tamanho da imagem e ajusta".
 */

export type BannerDimensions = {
  width: number;
  height: number;
};

/** Desktop banner: 1200×420 (aspect ~2.86:1) */
export const BANNER_DESKTOP_DIMS: BannerDimensions = { width: 1200, height: 420 };

/** Mobile banner: 390×433 (aspect 9:10) */
export const BANNER_MOBILE_DIMS: BannerDimensions = { width: 390, height: 433 };

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Falha ao carregar imagem"));
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Resize inteligente:
 *  - Se a proporção da imagem ≈ proporção do alvo (≤15% diff) → "cover" com center-crop.
 *  - Senão → "contain" centralizado sobre um fundo da própria imagem ampliada e
 *    desfocada, preservando todo o conteúdo do banner sem deformar.
 */
export async function processBannerImage(
  file: File,
  target: BannerDimensions,
): Promise<File> {
  const img = await loadImage(file);

  const canvas = document.createElement("canvas");
  canvas.width = target.width;
  canvas.height = target.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas não suportado");

  const srcRatio = img.naturalWidth / img.naturalHeight;
  const tgtRatio = target.width / target.height;
  const ratioDiff = Math.abs(srcRatio - tgtRatio) / tgtRatio;

  if (ratioDiff <= 0.15) {
    let sx = 0;
    let sy = 0;
    let sw = img.naturalWidth;
    let sh = img.naturalHeight;
    if (srcRatio > tgtRatio) {
      sw = Math.round(img.naturalHeight * tgtRatio);
      sx = Math.round((img.naturalWidth - sw) / 2);
    } else {
      sh = Math.round(img.naturalWidth / tgtRatio);
      sy = Math.round((img.naturalHeight - sh) / 2);
    }
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, target.width, target.height);
  } else {
    // Fundo borrado (cover) para preencher
    ctx.filter = "blur(24px) brightness(0.9)";
    let bgSx = 0;
    let bgSy = 0;
    let bgSw = img.naturalWidth;
    let bgSh = img.naturalHeight;
    if (srcRatio > tgtRatio) {
      bgSw = Math.round(img.naturalHeight * tgtRatio);
      bgSx = Math.round((img.naturalWidth - bgSw) / 2);
    } else {
      bgSh = Math.round(img.naturalWidth / tgtRatio);
      bgSy = Math.round((img.naturalHeight - bgSh) / 2);
    }
    ctx.drawImage(img, bgSx, bgSy, bgSw, bgSh, -20, -20, target.width + 40, target.height + 40);
    ctx.filter = "none";

    // Imagem inteira centralizada (contain), sem cortes
    let dw = target.width;
    let dh = target.height;
    if (srcRatio > tgtRatio) {
      dh = Math.round(target.width / srcRatio);
    } else {
      dw = Math.round(target.height * srcRatio);
    }
    const dx = Math.round((target.width - dw) / 2);
    const dy = Math.round((target.height - dh) / 2);
    ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight, dx, dy, dw, dh);
  }

  URL.revokeObjectURL(img.src);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) return reject(new Error("Falha ao gerar imagem processada"));
        const ext = file.name.replace(/.*\./, "") || "jpg";
        const name = file.name.replace(/\.[^.]+$/, "") + `-${target.width}x${target.height}.${ext}`;
        resolve(new File([blob], name, { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.92,
    );
  });
}
