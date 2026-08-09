import { createWorker } from 'tesseract.js';

// Self-hosted under public/tesseract/ instead of Tesseract's default CDN fetch,
// for the same reason Tailwind moved off its CDN (see CLAUDE.md): a runtime CDN
// dependency breaks in this project's network-restricted sandbox/CI. corePath
// points at one specific core file (not a directory) to skip Tesseract's
// SIMD/relaxed-SIMD feature-detection entirely, since that resolves to whichever
// of six ~4MB core variants the current device supports and only one is
// self-hosted here.
const WORKER_PATH = '/tesseract/worker.min.js';
// Legacy (non-LSTM) core/engine: the self-hosted jpn.traineddata (sourced from
// the @tessdata/jpn npm package, an older Tesseract 3.x/4.0-era build) has no
// LSTM model, so OEM.LSTM_ONLY (1) fails with "LSTM requested, but not
// present!!" — OEM.TESSERACT_ONLY (0) matches the legacy-only data actually
// available here.
const CORE_PATH = '/tesseract/core/tesseract-core-simd.wasm.js';
const LANG_PATH = '/tesseract/lang/';

let workerPromise: ReturnType<typeof createWorker> | null = null;

const getWorker = () => {
  if (!workerPromise) {
    workerPromise = createWorker('jpn', 0, {
      workerPath: WORKER_PATH,
      corePath: CORE_PATH,
      langPath: LANG_PATH,
      gzip: true, // jpn.traineddata is stored as jpn.traineddata.gz
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
