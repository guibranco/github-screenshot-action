jest.mock("puppeteer", () => ({
  launch: jest.fn().mockResolvedValue({
    newPage: jest.fn().mockResolvedValue({
      goto: jest.fn(),
      screenshot: jest.fn(),
      close: jest.fn(),
    }),
    close: jest.fn(),
  }),
}));

import { takeScreenshots } from "../src/screenshot";

test("takes screenshots without crashing", async () => {
  await takeScreenshots(
    [{ url: "https://example.com" }],
    "./out"
  );
});
