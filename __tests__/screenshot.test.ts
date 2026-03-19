import * as fs from "fs";
import puppeteer from "puppeteer";
import { takeScreenshots } from "../src/screenshot";

// ── mock fs ───────────────────────────────────────────────────────────────────
jest.mock("fs", () => ({
  ...jest.requireActual("fs"),
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
}));

// ── mock puppeteer (all fns defined inside factory to avoid hoisting issues) ──
jest.mock("puppeteer", () => {
  const mockPageClose  = jest.fn();
  const mockScreenshot = jest.fn().mockResolvedValue(Buffer.from("png-data"));
  const mockGoto       = jest.fn();
  const mockSetViewport = jest.fn();
  const mockNewPage    = jest.fn().mockResolvedValue({
    setViewport: mockSetViewport,
    goto: mockGoto,
    screenshot: mockScreenshot,
    close: mockPageClose,
  });
  const mockBrowserClose = jest.fn();

  return {
    launch: jest.fn().mockResolvedValue({
      newPage: mockNewPage,
      close: mockBrowserClose,
    }),
  };
});

// ── helpers to access mocks after hoisting ────────────────────────────────────
const getMocks = async () => {
  const browser = await (puppeteer.launch as jest.Mock)();
  const page    = await browser.newPage();
  return {
    launch:      puppeteer.launch as jest.Mock,
    browserClose: browser.close as jest.Mock,
    newPage:     browser.newPage as jest.Mock,
    setViewport: page.setViewport as jest.Mock,
    goto:        page.goto as jest.Mock,
    screenshot:  page.screenshot as jest.Mock,
    pageClose:   page.close as jest.Mock,
  };
};

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
  const { setViewport, goto, screenshot } = await getMocks();

  await takeScreenshots([{ url: "https://example.com", name: "homepage" }], "./out", baseOptions);

  expect(setViewport).toHaveBeenCalledWith({ width: 1280, height: 720 });
  expect(goto).toHaveBeenCalledWith("https://example.com", {
    timeout: 5000,
    waitUntil: "load",
  });
  expect(screenshot).toHaveBeenCalledWith({ fullPage: true });
  expect(fs.writeFileSync).toHaveBeenCalledWith("out/homepage.png", expect.any(Buffer));
});

test("sets square viewport and clip when square is true", async () => {
  const { setViewport, screenshot } = await getMocks();

  await takeScreenshots(
    [{ url: "https://example.com", name: "square-shot" }],
    "./out",
    { ...baseOptions, square: true, viewportWidth: 1280 }
  );

  expect(setViewport).toHaveBeenCalledWith({ width: 1280, height: 1280 });
  expect(screenshot).toHaveBeenCalledWith({
    fullPage: false,
    clip: { x: 0, y: 0, width: 1280, height: 1280 },
  });
});

test("passes waitUntil to page.goto", async () => {
  const { goto } = await getMocks();

  await takeScreenshots(
    [{ url: "https://example.com", name: "idle" }],
    "./out",
    { ...baseOptions, waitUntil: "networkidle0" }
  );

  expect(goto).toHaveBeenCalledWith("https://example.com", {
    timeout: 5000,
    waitUntil: "networkidle0",
  });
});

test("respects custom viewport width", async () => {
  const { setViewport } = await getMocks();

  await takeScreenshots(
    [{ url: "https://example.com", name: "wide" }],
    "./out",
    { ...baseOptions, viewportWidth: 1920 }
  );

  expect(setViewport).toHaveBeenCalledWith({ width: 1920, height: 1080 });
});

test("runs multiple screenshots with concurrency", async () => {
  const { newPage } = await getMocks();
  const items = [
    { url: "https://example.com", name: "page-one" },
    { url: "https://example.org", name: "page-two" },
    { url: "https://example.net", name: "page-three" },
  ];

  await takeScreenshots(items, "./out", { ...baseOptions, concurrency: 2 });

  // +1 because getMocks() itself calls newPage once
  expect(newPage).toHaveBeenCalledTimes(items.length + 1);
  expect(fs.writeFileSync).toHaveBeenCalledTimes(items.length);
});

test("retries on failure and succeeds on second attempt", async () => {
  const { screenshot } = await getMocks();
  screenshot
    .mockRejectedValueOnce(new Error("network error"))
    .mockResolvedValueOnce(Buffer.from("png-data"));

  await takeScreenshots(
    [{ url: "https://example.com", name: "flaky" }],
    "./out",
    { ...baseOptions, retries: 2 }
  );

  // +1 for the getMocks() call, then 2 real attempts
  expect(screenshot).toHaveBeenCalledTimes(3);
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
