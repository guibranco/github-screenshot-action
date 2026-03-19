import * as fs from "fs";

export interface ScreenshotItem {
  url: string;
  name?: string;
}

export function loadItems(path: string): ScreenshotItem[] {
  const raw = fs.readFileSync(path, "utf-8");
  const data = JSON.parse(raw);

  if (!Array.isArray(data)) {
    throw new Error("JSON must be an array");
  }

  return data.map((item) => {
    if (!item.url) {
      throw new Error("Missing url field");
    }

    return {
      url: normalizeUrl(item.url),
      name: item.name,
    };
  });
}

function normalizeUrl(url: string): string {
  if (!url.startsWith("http")) {
    return `https://${url}`;
  }
  return url;
}
