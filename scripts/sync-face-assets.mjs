import { cp, mkdir, access } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";

const root = process.cwd();
const sourceWasm = path.join(root, "node_modules", "@mediapipe", "tasks-vision", "wasm");
const targetWasm = path.join(root, "public", "mediapipe", "wasm");
const model = path.join(root, "public", "models", "blaze_face_short_range.tflite");

async function main() {
  try {
    await access(path.join(sourceWasm, "vision_wasm_internal.wasm"), constants.R_OK);
  } catch {
    console.warn(
      "[desrow] MediaPipe wasm assets not found. Run `npm install` before `npm run dev` or `npm run build`.",
    );
    return;
  }

  await mkdir(targetWasm, { recursive: true });
  await cp(sourceWasm, targetWasm, { recursive: true });
  console.log(`[desrow] Face-detection wasm synced to public/mediapipe/wasm`);

  try {
    await access(model, constants.R_OK);
  } catch {
    console.warn(
      "[desrow] Face model missing at public/models/blaze_face_short_range.tflite — face detection will be unavailable.",
    );
  }
}

await main();
