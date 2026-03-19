import { loadItems } from "../src/parser";
import * as fs from "fs";

test("loads valid JSON", () => {
  const mock = [
    { url: "example.com" },
    { url: "https://google.com", name: "google" }
  ];

  fs.writeFileSync("test.json", JSON.stringify(mock));

  const result = loadItems("test.json");

  expect(result.length).toBe(2);
  expect(result[0].url).toBe("https://example.com");
});
