import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { ALL_FORMATS, BufferSource, Input } from "mediabunny";
import { musicFixtures } from "./fixtures";

async function upload(page: Page) {
  await page.goto("/");
  await page.getByLabel("导入 MIDI 和音频").setInputFiles(musicFixtures());
  await expect(
    page.getByRole("button", { name: "播放", exact: true }),
  ).toBeEnabled();
}

async function verifyMp4(
  page: Page,
  start: string,
  end: string,
  width: number,
  height: number,
  savePath?: string,
) {
  await page.getByLabel("导出起点").fill(start);
  await page.getByLabel("导出终点").fill(end);
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出 MP4" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.mp4$/);
  const filePath = await download.path();
  const bytes = await readFile(filePath!);
  if (savePath) await download.saveAs(savePath);
  expect(bytes.length).toBeGreaterThan(1000);
  const input = new Input({
    source: new BufferSource(bytes),
    formats: ALL_FORMATS,
  });
  try {
    const video = await input.getPrimaryVideoTrack();
    const audio = await input.getPrimaryAudioTrack();
    expect(video?.codec).toBe("avc");
    expect(audio?.codec).toBe("aac");
    expect(await video?.getDisplayWidth()).toBe(width);
    expect(await video?.getDisplayHeight()).toBe(height);
    expect(await video?.computeDuration()).toBeCloseTo(
      Number(end) - Number(start),
      1,
    );
    expect(await audio?.computeDuration()).toBeGreaterThan(
      Number(end) - Number(start) - 0.1,
    );
    expect(await audio?.computeDuration()).toBeLessThan(
      Number(end) - Number(start) + 0.15,
    );
  } finally {
    input.dispose();
  }
  await expect(page.getByText("视频已生成", { exact: true })).toBeVisible();
}

test("imports WAV + MIDI, plays, seeks, changes visuals, and exports real MP4", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await upload(page);
  await expect(page.getByText("Test Piano", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "播放", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "暂停", exact: true }),
  ).toBeVisible();
  await expect
    .poll(async () => Number(await page.getByLabel("播放进度").inputValue()))
    .toBeGreaterThan(0.2);
  await page.getByRole("button", { name: "暂停", exact: true }).click();
  await page.getByLabel("播放进度").fill("1.5");
  await page.getByRole("button", { name: "薄荷", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "薄荷", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "隐藏音轨 Test Piano" }).click();
  await expect(
    page.getByRole("button", { name: "显示音轨 Test Piano" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "显示音轨 Test Piano" }).click();
  await verifyMp4(page, "0.5", "1.7", 1280, 720);
  expect(errors).toEqual([]);
});

test("exports portrait video at 60fps and handles invalid imports without losing assets", async ({
  page,
}) => {
  await upload(page);
  await page.getByLabel("导入 MIDI 和音频").setInputFiles({
    name: "bad.mid",
    mimeType: "audio/midi",
    buffer: Buffer.from("not a midi"),
  });
  await expect(
    page.getByRole("alert").filter({ hasText: "无效" }),
  ).toBeVisible();
  await expect(page.getByText("Test Piano", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "9:16", exact: true }).click();
  await page.getByLabel("帧率", { exact: true }).selectOption("60");
  await verifyMp4(page, "0", "0.5", 720, 1280);
});

test("cancels export and resets the workspace", async ({ page }) => {
  await upload(page);
  await page.getByRole("button", { name: "导出 MP4" }).click();
  await page.getByRole("button", { name: "取消导出" }).click();
  await expect(
    page.getByText("导出已取消，可调整设置后重新开始。"),
  ).toBeVisible();
  await page.getByRole("button", { name: "播放", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "暂停", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "清空素材" }).click();
  await expect(
    page.getByRole("button", { name: "播放", exact: true }),
  ).toBeDisabled();
  await expect(page.getByText("让音乐，有迹可循。")).toBeVisible();
  await page.getByLabel("导入 MIDI 和音频").setInputFiles(musicFixtures());
  await expect(
    page.getByRole("button", { name: "播放", exact: true }),
  ).toBeEnabled();
  expect(Number(await page.getByLabel("播放进度").inputValue())).toBe(0);
});

test("uses o-ui tokens, switches theme, and fits a narrow viewport", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".studio-app")).toHaveCSS(
    "background-color",
    "rgb(250, 250, 250)",
  );
  await page.getByRole("button", { name: "切换深色模式" }).click();
  await expect(page.locator(".studio-app")).toHaveCSS(
    "background-color",
    "rgb(24, 24, 27)",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await expect(
    page.getByRole("button", { name: "把音乐放在这里", exact: false }),
  ).toBeVisible();
});

test("loads supplied hour-long examples with byte ranges and exports an MP3 excerpt", async ({
  page,
  request,
}) => {
  test.skip(
    !existsSync("all-songs-taiki.mp3"),
    "Local user sample is optional",
  );
  const range = await request.get("/api/example?kind=audio", {
    headers: { Range: "bytes=0-4095" },
  });
  expect(range.status()).toBe(206);
  expect((await range.body()).length).toBe(4096);
  const invalid = await request.get("/api/example?kind=audio", {
    headers: { Range: "bytes=9999999999-" },
  });
  expect(invalid.status()).toBe(416);
  await page.goto("/");
  await page.getByRole("button", { name: "载入你的示例文件" }).click();
  await expect(
    page.getByRole("button", { name: "播放", exact: true }),
  ).toBeEnabled();
  await expect(
    page.getByText("MIDI 与音频时长不同", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("播放进度").fill("1000");
  await page.screenshot({
    path: "test-results/studio-example.png",
    fullPage: true,
  });
  await verifyMp4(
    page,
    "100",
    "101.2",
    1280,
    720,
    "test-results/example-preview.mp4",
  );
});

test("streams encoded MP4 chunks into the selected disk target", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const state = { bytes: 0, closed: false, aborted: false };
    Object.defineProperty(window, "__testDisk", { value: state });
    Object.defineProperty(window, "showSaveFilePicker", {
      value: async () => ({
        createWritable: async () => ({
          seek: async () => {},
          write: async (data: Uint8Array) => {
            state.bytes += data.byteLength;
          },
          close: async () => {
            state.closed = true;
          },
          abort: async () => {
            state.aborted = true;
          },
        }),
      }),
    });
  });
  await upload(page);
  await page.getByRole("switch", { name: "直接写入磁盘" }).check();
  await page.getByLabel("导出终点").fill("0.5");
  await page.getByRole("button", { name: "导出 MP4" }).click();
  await expect(page.getByText("已保存到所选位置")).toBeVisible();
  const state = await page.evaluate(
    () =>
      (
        window as unknown as Window & {
          __testDisk: { bytes: number; closed: boolean; aborted: boolean };
        }
      ).__testDisk,
  );
  expect(state.bytes).toBeGreaterThan(1000);
  expect(state.closed).toBe(true);
  expect(state.aborted).toBe(false);
});
