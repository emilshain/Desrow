import type { Template } from "./types";

export interface ArtworkFile {
  dataUrl: string;
  width: number;
  height: number;
  name: string;
}

const MAX_BYTES = 8 * 1024 * 1024;
const ACCEPTED = ["image/png", "image/jpeg", "image/webp"];

export async function readArtworkFile(file: File): Promise<ArtworkFile> {
  if (!ACCEPTED.includes(file.type)) {
    throw new Error("Use a PNG, JPEG or WebP image.");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("Keep master artwork under 8 MB.");
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("That file could not be read."));
    reader.readAsDataURL(file);
  });

  const dimensions = await new Promise<{ width: number; height: number }>(
    (resolve, reject) => {
      const image = new Image();
      image.onload = () =>
        resolve({ width: image.naturalWidth, height: image.naturalHeight });
      image.onerror = () => reject(new Error("That image could not be measured."));
      image.src = dataUrl;
    },
  );

  if (!dimensions.width || !dimensions.height) {
    throw new Error("That image has no readable dimensions.");
  }
  if (dimensions.width > 8000 || dimensions.height > 8000) {
    throw new Error("Master artwork must be 8,000 px or smaller on each side.");
  }

  return { dataUrl, ...dimensions, name: file.name };
}

/**
 * Uploaded artwork is the master background and its native pixel size becomes
 * the output canvas. Pixel-based layer values scale with the width so the
 * visual composition is preserved when replacing artwork.
 */
export function adoptArtwork(
  template: Template,
  artwork: ArtworkFile,
): Partial<Template> {
  const widthRatio = artwork.width / Math.max(1, template.width);
  const scaleLayer = widthRatio > 0 && Number.isFinite(widthRatio) ? widthRatio : 1;

  return {
    backgroundImage: artwork.dataUrl,
    width: artwork.width,
    height: artwork.height,
    photo: {
      ...template.photo,
      radius: Math.round(template.photo.radius * scaleLayer),
      borderWidth: Math.round(template.photo.borderWidth * scaleLayer * 10) / 10,
    },
    texts: template.texts.map((layer) => ({
      ...layer,
      size: Math.max(4, Math.round(layer.size * scaleLayer)),
      letterSpacing: Math.round(layer.letterSpacing * scaleLayer * 10) / 10,
    })),
  };
}
