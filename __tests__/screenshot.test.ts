import * as fs from "fs";
import puppeteer from "puppeteer";
import { takeScreenshots } from "../src/screenshot";

// ── mock fs ──────────────────────────────────────────────────────────────────
jest.mock("fs", () => ({
  ...jest.requireActual("fs"),
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
}));

// ── mock puppeteer ────────────────────────────────────────────────────────────
const mockClose     = jest.fn();
const mockScreenshot = jest.fn().mockResolvedValue(Buffer.from("png-data"));
const mockGoto      = jest.fn();
const mockSetViewport = jest.fn();
const mockPageClose = jest.fn();
const mockNewPage   = jest.fn().mockResolvedValue({
  setViewport: mockSetViewport,
  goto: mockGoto,
  screenshot: mockScreenshot,
  close: mockPageClose,
});

jest.mock("puppeteer", () => ({
  launch: jest.fn().mockResolvedValue({
    newPage: mockNewPage,
    close: mockClose,
  }),
}));

// ── shared base options ───────────────────────────────────────────────────────
const baseOptions = {
  concurrency: 1,
  timeoutMs: 5000,
  retries: 1,
  waitUntil: "load" as const,
  square: false,
  viewportWidth: 1280,
};

beforeEach(() => jest.clearAllMocks());

// ── tests ─────────────────────────────────────────────────────────────────────

test("captures a screenshot with default options", async () => {
  await takeScreenshots([{ url: "https://example.com", name: "homepage" }], "./out", baseOptions);

  expect(mockSetViewport).toHaveBeenCalledWith({ width: 1280, height: 720 });
  expect(mockGoto).toHaveBeenCalledWith("https://example.com", {
    timeout: 5000,
    waitUntil: "load",
  });
  expect(mockScreenshot).toHaveBeenCalledWith({ fullPage: true });
  expect(fs.writeFileSync).toHaveBeenCalledWith("out/homepage.png", expect.any(Buffer));
  expect(mockPageClose).toHaveBeenCalled();
  expect(mockClose).toHaveBeenCalled();
});

test("sets square viewport and clip when square is true", async () => {
  await takeScreenshots(
    [{ url: "https://example.com", name: "square-shot" }],
    "./out",
    { ...baseOptions, square: true, viewportWidth: 1280 }
  );

  expect(mockSetViewport).toHaveBeenCalledWith({ width: 1280, height: 1280 });
  expect(mockScreenshot).toHaveBeenCalledWith({
    fullPage: false,
    clip: { x: 0, y: 0, width: 1280, height: 1280 },
  });
});

test("passes waitUntil to page.goto", async () => {
  await takeScreenshots(
    [{ url: "https://example.com", name: "idle" }],
    "./out",
    { ...baseOptions, waitUntil: "networkidle0" }
  );

  expect(mockGoto).toHaveBeenCalledWith("https://example.com", {
    timeout: 5000,
    waitUntil: "networkidle0",
  });
});

test("respects custom viewport width", async () => {
  await takeScreenshots(
    [{ url: "https://example.com", name: "wide" }],
    "./out",
    { ...baseOptions, viewportWidth: 1920 }
  );

  expect(mockSetViewport).toHaveBeenCalledWith({ width: 1920, height: 1080 });
});

test("runs multiple screenshots with concurrency", async () => {
  const items = [
    { url: "https://example.com", name: "page-one" },
    { url: "https://example.org", name: "page-two" },
    { url: "https://example.net", name: "page-three" },
  ];

  await takeScreenshots(items, "./out", { ...baseOptions, concurrency: 2 });

  expect(mockNewPage).toHaveBeenCalledTimes(3);
  expect(mockScreenshot).toHaveBeenCalledTimes(3);
  expect(fs.writeFileSync).toHaveBeenCalledTimes(3);
});

test("retries on failure and succeeds on second attempt", async () => {
  mockScreenshot
    .mockRejectedValueOnce(new Error("network error"))
    .mockResolvedValueOnce(Buffer.from("png-data"));

  await takeScreenshots(
    [{ url: "https://example.com", name: "flaky" }],
    "./out",
    { ...baseOptions, retries: 2 }
  );

  expect(mockScreenshot).toHaveBeenCalledTimes(2);
  expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
});

test("uses hashed filename when name is missing", async () => {
  await takeScreenshots([{ url: "https://example.com" }], "./out", baseOptions);

  const [[filePath]] = (fs.writeFileSync as jest.Mock).mock.calls;
  expect(filePath).toMatch(/^out\/[a-f0-9]{64}\.png$/);
});

test("creates output directory if it does not exist", async () => {
  (fs.existsSync as jest.Mock).mockReturnValueOnce(false);

  await takeScreenshots(
    [{ url: "https://example.com", name: "homepage" }],
    "./out",
    baseOptions
  );

  expect(fs.mkdirSync).toHaveBeenCalledWith("./out", { recursive: true });
});
