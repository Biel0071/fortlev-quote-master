/**
 * Client-side banner image processor.
 * Resizes / crops images to fit the target banner dimensions before upload.
 */

export type BannerDimensions = {
  width: number;
  height: number;
};

/** Desktop banner: 1200×420 (aspect ~2.86:1) */
export const BANNER_DESKTOP_DIMS: BannerDimensions = { width: 1200, height: 420 };

/** Mobile banner: 390×433 (aspect 9:10) */
export const BANNER_MOBILE_DIMS: BannerDimensions = { width: 390, height: 433 };

/**
 * Loads an image File into an HTMLImageElement.
 */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Falha ao carregar imagem"));
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Resizes and crops the image to cover the target dimensions (center crop).
 * Returns a new File with JPEG quality 0.92.
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

  // "cover" crop – scale to fill, then center-crop
  const srcRatio = img.naturalWidth / img.naturalHeight;
  const tgtRatio = target.width / target.height;

  let sx = 0;
  let sy = 0;
  let sw = img.naturalWidth;
  let sh = img.naturalHeight;

  if (srcRatio > tgtRatio) {
    // source is wider → crop sides
    sw = Math.round(img.naturalHeight * tgtRatio);
    sx = Math.round((img.naturalWidth - sw) / 2);
  } else {
    // source is taller → crop top/bottom
    sh = Math.round(img.naturalWidth / tgtRatio);
    sy = Math.round((img.naturalHeight - sh) / 2);
  }

  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, target.width, target.height);

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
