export type SourceKind = "csv" | "sheet";

export interface DatasetRow {
  id: string;
  values: Record<string, string>;
}

export interface Dataset {
  id: string;
  name: string;
  sourceKind: SourceKind;
  sourceRef: string;
  columns: string[];
  mapping: {
    nameColumn: string;
    imageColumn: string;
  };
  rows: DatasetRow[];
  createdAt: number;
  updatedAt: number;
}

export type FontKey = "sans" | "serif" | "mono";
export type TextAlign = "left" | "center" | "right";

export interface PhotoLayer {
  /** Normalized 0–1 coordinates relative to the template canvas. */
  x: number;
  y: number;
  width: number;
  height: number;
  /** Corner radius in template pixels. */
  radius: number;
  /** Border width in template pixels. */
  borderWidth: number;
  borderColor: string;
}

export interface TextLayer {
  id: string;
  name: string;
  /** Supports {{column}} tokens and hard line breaks. */
  content: string;
  x: number;
  y: number;
  width: number;
  font: FontKey;
  size: number;
  weight: number;
  letterSpacing: number;
  lineHeight: number;
  align: TextAlign;
  color: string;
  uppercase: boolean;
  opacity: number;
}

export interface Template {
  id: string;
  name: string;
  width: number;
  height: number;
  backgroundColor: string;
  /** Data URL of the master artwork. */
  backgroundImage: string | null;
  photo: PhotoLayer;
  texts: TextLayer[];
  createdAt: number;
  updatedAt: number;
}

export interface CurvePoint {
  x: number;
  y: number;
}

export interface ToneSettings {
  channelWeights: { r: number; g: number; b: number };
  curve: CurvePoint[];
  /** −50 → 0.5× contrast, 0 → 1×, +50 → 2×. */
  contrast: number;
  /** −50 → −0.25 exposure, +50 → +0.25. */
  brightness: number;
}

export interface GrainSettings {
  /** 0–100 composite strength. */
  amount: number;
  /** Noise cell size in output pixels, 0.5–4. */
  size: number;
  seed: number;
}

export interface CropSettings {
  detectFaces: boolean;
  /** Desired face height as a percentage of the photo frame height. */
  faceScale: number;
  /** Horizontal face position inside the frame, 0–100. */
  faceX: number;
  /** Vertical face position inside the frame, 0–100. */
  faceY: number;
}

export interface OutputSettings {
  scale: number;
  format: "png" | "jpeg";
  jpegQuality: number;
  filenamePattern: string;
  concurrency: number;
}

export interface ProcessingSettings {
  crop: CropSettings;
  tone: ToneSettings;
  grain: GrainSettings;
  output: OutputSettings;
}

export interface CropOverride {
  faceScale?: number;
  faceX?: number;
  faceY?: number;
}

export interface FaceBox {
  /** Normalized center + size relative to the source image. */
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
}

export type DetectionStatus = "detected" | "not-detected" | "disabled" | "error" | "pending";

export interface CropRect {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

export type RenderStatus = "rendered" | "failed" | "skipped";

export interface RenderItem {
  id: string;
  runId: string;
  rowId: string;
  label: string;
  filename: string;
  sourceUrl: string;
  status: RenderStatus;
  error?: string;
  warning?: string;
  thumbnail?: string;
  blob?: Blob;
  bytes?: number;
  width?: number;
  height?: number;
  createdAt: number;
}

export interface RunSummary {
  id: string;
  name: string;
  datasetId: string;
  datasetName: string;
  templateId: string;
  templateName: string;
  settings: ProcessingSettings;
  status: "completed" | "partial" | "cancelled" | "running";
  total: number;
  succeeded: number;
  failed: number;
  skipped: number;
  createdAt: number;
  finishedAt?: number;
}

export interface ZipManifestRow {
  filename: string;
  label: string;
  status: RenderStatus;
  error: string;
  sourceUrl: string;
}
