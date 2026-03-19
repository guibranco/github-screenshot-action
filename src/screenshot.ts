import puppeteer from "puppeteer";
import pLimit from "p-limit";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { log } from "./logger";

interface ScreenshotOptions {
  concurrency: number;
  timeoutMs: number;
  retries: number;
  waitUntil: "load" | "domcontentloaded" | "networkidle0" | "networkidle2";
  square: boolean;
  viewportWidth: number;
}

export async function takeScreenshots(items: any[], outputDir: string, options: ScreenshotOptions) {
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const browser = await puppeteer.launch({ args: ["--no-sandbox"] });
  const limit = pLimit(options.concurrency);

  await Promise.all(
    items.map((item) => limit(() => capture(item, browser, outputDir, options)))
  );

  await browser.close();
}

async function capture(item: any, browser: any, outputDir: string, options: ScreenshotOptions) {
  for (let i = 0; i <= options.retries; i++) {
    try {
      const page = await browser.newPage();

      // Set viewport — square uses width x width, otherwise a standard 16:9 height
      const viewportHeight = options.square
        ? options.viewportWidth
        : Math.round(options.viewportWidth * (9 / 16));

      await page.setViewport({
        width: options.viewportWidth,
        height: viewportHeight,
      });

      await page.goto(item.url, {
        timeout: options.timeoutMs,
        waitUntil: options.waitUntil,
      });

      const name = (item.name || hash(item.url)).toLowerCase();
      const file = path.join(outputDir, `${name}.png`);

      const screenshotOptions: any = { fullPage: !options.square };

      if (options.square) {
        screenshotOptions.clip = {
          x: 0,
          y: 0,
          width: options.viewportWidth,
          height: options.viewportWidth,
        };
      }

      const buffer = await page.screenshot(screenshotOptions);
      fs.writeFileSync(file, buffer);

      await page.close();
      log.success(`Captured ${item.url} → ${file}`);
      return;
    } catch (e: any) {
      log.warn(`Retry ${i} failed for ${item.url}: ${e.message}`);
    }
  }

  log.error(`All retries exhausted for ${item.url}`);
}

function hash(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}
