jest.mock("puppeteer", () => ({
  launch: jest.fn().mockResolvedValue({
    newPage: jest.fn().mockResolvedValue({
      goto: jest.fn(),
      screenshot: jest.fn().mockResolvedValue(Buffer.from("")),
      close: jest.fn(),
    }),
    close: jest.fn(),
  }),
}));

import { takeScreenshots } from "../src/screenshot";

test("runs screenshots", async () => {
  await takeScreenshots([{ url: "https://example.com" }], "./out", {
    concurrency: 1,
    timeoutMs: 1000,
    retries: 1,
  });
});