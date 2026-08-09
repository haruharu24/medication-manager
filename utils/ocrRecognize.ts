import { createWorker } from 'tesseract.js';

// Self-hosted under public/tesseract/ instead of Tesseract's default CDN fetch,
// for the same reason Tailwind moved off its CDN (see CLAUDE.md): a runtime CDN
// dependency breaks in this project's network-restricted sandbox/CI. corePath
// points at one specific core file (not a directory) to skip Tesseract's
// SIMD/relaxed-SIMD feature-detection entirely, since that resolves to whichever
// of six ~4MB core variants the current device supports and only one is
// self-hosted here.
const WORKER_PATH = '/tesseract/worker.min.js';
// LSTM engine/core, matching jpn.traineddata sourced from tesseract-ocr/tessdata_fast
// (LSTM-capable). OEM.LSTM_ONLY (1) — using the legacy engine (0) here would fail
// the same way the mismatched legacy data once failed against this core:
// data/engine LSTM-support must match or recognition errors out entirely.
const CORE_PATH = '/tesseract/core/tesseract-core-simd-lstm.wasm.js';
const LANG_PATH = '/tesseract/lang/';

let workerPromise: ReturnType<typeof createWorker> | null = null;

const getWorker = () => {
  if (!workerPromise) {
    workerPromise = createWorker('jpn', 1, {
      workerPath: WORKER_PATH,
      corePath: CORE_PATH,
      langPath: LANG_PATH,
      gzip: false, // jpn.traineddata is stored uncompressed (not .gz)
    });
  }
  return workerPromise;
};

// Recognizes each image in order (Tesseract's worker processes one job at a
// time regardless, so sequential is not slower than parallel here) and reports
// progress after each completed image via onProgress.
export const recognizeImages = async (
  base64Images: string[],
  onProgress?: (done: number, total: number) => void
): Promise<string[]> => {
  const worker = await getWorker();
  const texts: string[] = [];
  for (let i = 0; i < base64Images.length; i++) {
    const { data } = await worker.recognize(`data:image/jpeg;base64,${base64Images[i]}`);
    texts.push(data.text);
    onProgress?.(i + 1, base64Images.length);
  }
  return texts;
};
