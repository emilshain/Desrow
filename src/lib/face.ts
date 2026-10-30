import type { FaceBox } from "./types";

type MediaPipeFaceDetector = import("@mediapipe/tasks-vision").FaceDetector;

const MODEL_PATH = "/models/blaze_face_short_range.tflite";
const WASM_PATH = "/mediapipe/wasm";

let detectorPromise: Promise<MediaPipeFaceDetector> | null = null;
let detectionQueue: Promise<unknown> = Promise.resolve();

async function createDetector(): Promise<MediaPipeFaceDetector> {
  const { FaceDetector, FilesetResolver } = await import("@mediapipe/tasks-vision");
  const fileset = await FilesetResolver.forVisionTasks(WASM_PATH);

  const build = (delegate: "GPU" | "CPU") =>
    FaceDetector.createFromOptions(fileset, {
      baseOptions: {
        modelAssetPath: MODEL_PATH,
        delegate,
      },
      runningMode: "IMAGE",
      minDetectionConfidence: 0.5,
    });

  try {
    return await build("GPU");
  } catch {
    return await build("CPU");
  }
}

export function getFaceDetector(): Promise<MediaPipeFaceDetector> {
  if (!detectorPromise) {
    detectorPromise = createDetector().catch((error) => {
      detectorPromise = null;
      throw error;
    });
  }
  return detectorPromise;
}

/**
 * MediaPipe keeps internal state; calls are serialized so a batch can render
 * concurrently without corrupting the detector.
 */
export function detectFace(image: HTMLImageElement): Promise<FaceBox | null> {
  const task = detectionQueue.then(async () => {
    const detector = await getFaceDetector();
    const result = detector.detect(image);
    const detections = [...(result.detections ?? [])];

    if (!detections.length) return null;

    const best = detections.sort((a, b) => {
      const areaA = (a.boundingBox?.width ?? 0) * (a.boundingBox?.height ?? 0);
      const areaB = (b.boundingBox?.width ?? 0) * (b.boundingBox?.height ?? 0);
      return areaB - areaA;
    })[0];

    const box = best.boundingBox;
    if (!box || !image.naturalWidth || !image.naturalHeight) return null;

    return {
      x: (box.originX + box.width / 2) / image.naturalWidth,
      y: (box.originY + box.height / 2) / image.naturalHeight,
      width: box.width / image.naturalWidth,
      height: box.height / image.naturalHeight,
      confidence: best.categories?.[0]?.score ?? 0,
    };
  });

  detectionQueue = task.catch(() => undefined);
  return task;
}

export async function warmUpFaceDetector(): Promise<boolean> {
  try {
    await getFaceDetector();
    return true;
  } catch {
    return false;
  }
}
