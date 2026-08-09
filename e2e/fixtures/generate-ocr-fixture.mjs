// One-off generator for e2e/fixtures/ocr-sample.png, used by e2e/scan-review.spec.ts
// and e2e/accessibility.spec.ts to exercise the real Tesseract.js OCR pipeline
// against a deterministic, high-contrast printed-text image (no camera hardware
// needed, no external network dependency). Not part of `npm test`/`test:e2e` —
// run manually (`node e2e/fixtures/generate-ocr-fixture.mjs`) whenever the
// fixture needs regenerating.
import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SANDBOX_CHROMIUM_PATH = '/opt/pw-browsers/chromium';
const executablePath = fs.existsSync(SANDBOX_CHROMIUM_PATH) ? SANDBOX_CHROMIUM_PATH : undefined;

const browser = await chromium.launch({ executablePath });
const page = await browser.newPage({ viewport: { width: 600, height: 240 } });

await page.setContent(`
  <!DOCTYPE html>
  <html><body style="margin:0;padding:20px;background:white;">
    <div id="content" style="font-family: sans-serif; font-size: 60px; line-height: 1.3; color: black; font-weight: bold;">
      テスト薬<br>1回2錠<br>朝食後
    </div>
  </body></html>
`);

const element = await page.$('#content');
await element.screenshot({ path: path.join(__dirname, 'ocr-sample.png') });

await browser.close();
console.log('Wrote e2e/fixtures/ocr-sample.png');
