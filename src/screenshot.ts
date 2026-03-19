import puppeteer from "puppeteer";
import * as crypto from "crypto";
import * as path from "path";
import * as fs from "fs";
import pLimit from "p-limit";
import { log } from "./logger";

interface Options {
  concurrency: number;
  timeoutMs: number;
  retries: number;
}

export async function takeScreenshots(
  items: { url: string; name?: string }[],
  outputDir: string,
  options: Options
) {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const limit = pLimit(options.concurrency);

  const tasks = items.map((item) =>
    limit(() =>
      processWithRetry(item, browser, outputDir, options)
    )
  );

  await Promise.all(tasks);

  await browser.close();
}

async function processWithRetry(
  item: { url: string; name?: string },
  browser: any,
  outputDir: string,
  options: Options
) {
  for (let attempt = 1; attempt <= options.retries + 1; attempt++) {
    try {
      log.info(`Processing ${item.url} (attempt ${attempt})`);

      await takeSingleScreenshot(
        item,
        browser,
        outputDir,
        options.timeoutMs
      );

      log.success(`Done ${item.url}`);
      return;
    } catch (err) {
      log.warn(`Failed ${item.url} (attempt ${attempt})`);

      if (attempt > options.retries) {
        log.error(`Giving up ${item.url}`);
        return;
      }
    }
  }
}

async function takeSingleScreenshot(
  item: { url: string; name?: string },
  browser: any,
  outputDir: string,
  timeoutMs: number
) {
  const page = await browser.newPage();

  await page.setViewport({ width: 1280, height: 800 });

  await page.goto(item.url, {
    waitUntil: "networkidle2",
    timeout: timeoutMs,
  });

  const fileName = item.name || hash(item.url);
  const filePath = path.join(outputDir, `${fileName}.png`);

  await page.screenshot({
    path: filePath,
    fullPage: true,
  });

  await page.close();
}

function hash(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}
