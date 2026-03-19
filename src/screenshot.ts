import puppeteer from "puppeteer";
import pLimit from "p-limit";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { log } from "./logger";

export async function takeScreenshots(items: any[], outputDir: string, options: any) {
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const browser = await puppeteer.launch({ args: ["--no-sandbox"] });
  const limit = pLimit(options.concurrency);

  await Promise.all(
    items.map((item) =>
      limit(() => process(item, browser, outputDir, options))
    )
  );

  await browser.close();
}

async function process(item: any, browser: any, outputDir: string, options: any) {
  for (let i = 0; i <= options.retries; i++) {
    try {
      const page = await browser.newPage();

      await page.goto(item.url, { timeout: options.timeoutMs });

      const name = item.name || hash(item.url);
      const file = path.join(outputDir, `${name}.png`);

      const buffer = await page.screenshot({ fullPage: true });

      fs.writeFileSync(file, buffer);

      await page.close();
      return;
    } catch (e) {
      log.warn(`Retry ${i} failed for ${item.url}`);
    }
  }
}

function hash(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}
