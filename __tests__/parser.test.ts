import { loadItems } from "../src/parser";
import * as fs from "fs";

test("parses JSON", () => {
  fs.writeFileSync("test.json", JSON.stringify([{ url: "example.com" }]));
  const items = loadItems("test.json");
  expect(items[0].url).toBe("https://example.com");
});