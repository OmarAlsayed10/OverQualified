import { existsSync } from "node:fs";
import puppeteer, { Browser } from "puppeteer-core";

export interface CvPrintPayload {
  formData: unknown;
  sectionOrder?: string[];
  template?: string;
  fontScale?: number;
  sectionGap?: number;
}

// Each render holds a Chrome tab worth 50-150MB. Without a ceiling, a burst of downloads
// takes the whole process out of memory, not just the exports. Extra requests wait for a slot.
const MAX_CONCURRENT_RENDERS = Math.max(1, Number(process.env.PDF_MAX_CONCURRENCY ?? 3));
let activeRenders = 0;
const waitingForSlot: Array<() => void> = [];

const acquireSlot = () =>
  new Promise<void>((resolve) => {
    if (activeRenders < MAX_CONCURRENT_RENDERS) {
      activeRenders += 1;
      resolve();
      return;
    }
    waitingForSlot.push(resolve);
  });

// The slot passes straight to the next waiter, so the count can never drift above the cap.
const releaseSlot = () => {
  const next = waitingForSlot.shift();
  if (next) next();
  else activeRenders -= 1;
};

// A real Chrome is preferred wherever one exists; @sparticuz/chromium is the Linux-only
// fallback that fits a serverless bundle. Picking it on Windows is what produced
// "spawn ...\\Temp\\chromium ENOENT" — that binary only exists on Linux.
const LOCAL_CHROME_PATHS = [
  process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].filter(Boolean) as string[];

const launch = async (): Promise<Browser> => {
  const localChrome = LOCAL_CHROME_PATHS.find((path) => existsSync(path));
  if (localChrome) {
    return puppeteer.launch({
      executablePath: localChrome,
      headless: true,
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
    });
  }

  if (process.platform !== "linux") {
    throw new Error(
      "No Chrome found for PDF export. Install Google Chrome or set CHROME_PATH to its executable.",
    );
  }

  const chromium = (await import("@sparticuz/chromium")).default;
  return puppeteer.launch({
    executablePath: await chromium.executablePath(),
    args: chromium.args,
    headless: true,
  });
};

// One browser for the whole process, relaunched only if it dies. Spawning Chromium per
// request costs ~1s and a few hundred MB.
let browserPromise: Promise<Browser> | null = null;

export const getBrowser = async (): Promise<Browser> => {
  if (!browserPromise) browserPromise = launch();
  try {
    const browser = await browserPromise;
    if (browser.connected) return browser;
  } catch (error) {
    browserPromise = null;
    throw error;
  }
  browserPromise = launch();
  return browserPromise;
};

// Chrome is a separate OS process: without this it survives every restart and deploy,
// holding its memory until the box fills up with dead browsers.
export const closeBrowser = async () => {
  if (!browserPromise) return;
  const browser = await browserPromise.catch(() => null);
  browserPromise = null;
  await browser?.close().catch(() => undefined);
};

export interface RenderedCv {
  pdf: Buffer;
  pageCount: number;
}

export const renderCvPdf = async (payload: CvPrintPayload): Promise<RenderedCv> => {
  const printUrl = `${(process.env.CLIENT_URL ?? "").replace(/\/+$/, "")}/print`;

  await acquireSlot();
  let page;
  try {
    const browser = await getBrowser();
    page = await browser.newPage();
    // The print page measures its own page breaks on screen, before printing re-lays the document
    // out at the paper width. A tab the same size as the sheet keeps those two layouts identical.
    await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 1 });

    await page.evaluateOnNewDocument((data) => {
      (window as any).__CV_DATA__ = data;
    }, payload as any);

    await page.goto(printUrl, { waitUntil: "networkidle0", timeout: 30_000 });
    // Fonts settle after first paint; printing before that yields fallback metrics.
    await page.waitForFunction("window.__CV_PRINT_READY__ === true", { timeout: 15_000 });

    const pdf = Buffer.from(
      await page.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true }),
    );

    return { pdf, pageCount: await countPdfPages(pdf) };
  } finally {
    await page?.close().catch(() => undefined);
    releaseSlot();
  }
};

// The preview can only estimate where pages break; this is the real count, read back from
// the printed file so the builder can correct itself.
const countPdfPages = async (pdf: Buffer): Promise<number> => {
  try {
    const { getDocumentProxy } = await import("unpdf");
    const document = await getDocumentProxy(new Uint8Array(pdf));
    return document.numPages;
  } catch {
    return 1;
  }
};
