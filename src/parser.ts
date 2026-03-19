import * as fs from "fs";

export function loadItems(path: string) {
  const raw = fs.readFileSync(path, "utf-8");
  const data = JSON.parse(raw);

  return data.map((item: any) => ({
    url: item.url.startsWith("http") ? item.url : `https://${item.url}`,
    name: item.name,
  }));
}
