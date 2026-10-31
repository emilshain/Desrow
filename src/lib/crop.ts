import type { CropOverride, CropRect, CropSettings, FaceBox } from "./types";

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export function effectiveCropSettings(
  settings: CropSettings,
  override?: CropOverride,
): CropSettings {
  return {
    ...settings,
    fitToFrame: override?.fitToFrame ?? settings.fitToFrame,
    faceScale: clamp(override?.faceScale ?? settings.faceScale, 8, 100),
    faceX: clamp(override?.faceX ?? settings.faceX, 0, 100),
    faceY: clamp(override?.faceY ?? settings.faceY, 0, 100),
  };
}

export interface CropInput {
  imageWidth: number;
  imageHeight: number;
  frameWidth: number;
  frameHeight: number;
  box: FaceBox | null;
  settings: CropSettings;
  override?: CropOverride;
}

interface CropPlan {
  crop: CropRect;
  /** The requested face scale needs more source than the image contains. */
  constrained: boolean;
}

/**
 * The crop is derived from the face box, not the raw image, so subjects keep a
 * consistent head size across records. Manual controls move the face within
 * the frame rather than moving an opaque crop rectangle.
 */
function planCrop(input: CropInput): CropPlan {
  const { imageWidth, imageHeight, frameWidth, frameHeight } = input;
  const settings = effectiveCropSettings(input.settings, input.override);

  const box = input.box ?? {
    x: 0.5,
    y: 0.43,
    width: 0.26,
    height: 0.32,
    confidence: 0,
  };

  const faceHeight = Math.max(box.height * imageHeight, 8);
  const frameAspect = frameWidth / Math.max(1, frameHeight);

  let cropHeight = faceHeight / (settings.faceScale / 100);
  let cropWidth = cropHeight * frameAspect;
  const constrained = cropWidth > imageWidth || cropHeight > imageHeight;

  const fit = Math.min(1, imageWidth / cropWidth, imageHeight / cropHeight);
  cropWidth *= fit;
  cropHeight *= fit;

  const desiredX = box.x * imageWidth - (settings.faceX / 100) * cropWidth;
  const desiredY = box.y * imageHeight - (settings.faceY / 100) * cropHeight;

  return {
    crop: {
      sx: clamp(desiredX, 0, Math.max(0, imageWidth - cropWidth)),
      sy: clamp(desiredY, 0, Math.max(0, imageHeight - cropHeight)),
      sw: Math.max(1, cropWidth),
      sh: Math.max(1, cropHeight),
    },
    constrained,
  };
}

export function computeCrop(input: CropInput): CropRect {
  return planCrop(input).crop;
}

/**
 * Explicit fit flag from a record override or the batch mode. Null means the
 * automatic rule is allowed to decide.
 */
export function forcedFitToFrame(
  settings: CropSettings,
  override?: CropOverride,
): boolean | null {
  if (typeof override?.fitToFrame === "boolean") return override.fitToFrame;
  if (settings.fitToFrame) return true;
  if (settings.autoFit) return null;
  return false;
}

export interface ResolvedCrop {
  settings: CropSettings;
  crop: CropRect;
  fitToFrame: boolean;
  /** True when the system chose fit because the crop exceeded the source. */
  auto: boolean;
  constrained: boolean;
}

/**
 * Resolves forced placement and the automatic fit rule for one record.
 * Auto fits when the requested face-relative crop would need more source than
 * the image contains, which is the narrow-image / oversized-face case.
 */
export function resolveCrop(input: CropInput): ResolvedCrop {
  const settings = effectiveCropSettings(input.settings, input.override);
  const forced = forcedFitToFrame(input.settings, input.override);

  if (forced === true) {
    return {
      settings,
      crop: fullImageCrop(input.imageWidth, input.imageHeight),
      fitToFrame: true,
      auto: false,
      constrained: false,
    };
  }

  const plan = planCrop(input);
  const auto = forced === null && settings.autoFit && plan.constrained;

  return {
    settings,
    crop: auto ? fullImageCrop(input.imageWidth, input.imageHeight) : plan.crop,
    fitToFrame: auto,
    auto,
    constrained: plan.constrained,
  };
}

export function fullImageCrop(width: number, height: number): CropRect {
  return { sx: 0, sy: 0, sw: width, sh: height };
}

export interface FitPlacement {
  /** Destination rectangle inside the photo frame, in frame pixels. */
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
}

/**
 * Fit mode scales the whole portrait to sit inside the frame without cropping.
 * Horizontal alignment is always centred; the vertical setting places the
 * fitted image between the top and bottom of the frame.
 */
export function computeFitPlacement(
  imageWidth: number,
  imageHeight: number,
  frameWidth: number,
  frameHeight: number,
  vertical = 50,
): FitPlacement {
  const sourceWidth = Math.max(1, imageWidth);
  const sourceHeight = Math.max(1, imageHeight);
  const scale = Math.min(
    frameWidth / sourceWidth,
    frameHeight / sourceHeight,
  );
  const width = sourceWidth * scale;
  const height = sourceHeight * scale;

  return {
    x: (frameWidth - width) / 2,
    y: (frameHeight - height) * (clamp(vertical, 0, 100) / 100),
    width,
    height,
    scale,
  };
}
