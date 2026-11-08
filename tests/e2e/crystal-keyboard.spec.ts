import { expect, test, type Page } from "@playwright/test";
import { musicFixtures } from "./fixtures";
import { pianoLayout } from "../../src/features/studio/render/piano-layout";

const keys = pianoLayout(21, 108, 1280 * 0.76);
const samplePoints = [
  [64, 630, 0.5],
  [61, 590, 0.7],
  [60, 630, 0.5],
].map(([pitch, top, fraction]) => {
  const key = keys.find((candidate) => candidate.pitch === pitch)!;
  return [Math.round(1280 * 0.12 + key.x + key.width * fraction), top];
});

async function sampleKeys(page: Page) {
  return page.getByLabel("MIDI 音符可视化预览").evaluate((element, points) => {
    const context = (element as HTMLCanvasElement).getContext("2d")!;
    return points.map(([left, top]) =>
      Array.from(context.getImageData(left, top, 1, 1).data),
    );
  }, samplePoints);
}

async function setBackground(page: Page, color: string) {
  const data = await page.evaluate((fill) => {
    const canvas = document.createElement("canvas");
    canvas.width = 80;
    canvas.height = 60;
    const context = canvas.getContext("2d")!;
    context.fillStyle = fill;
    context.fillRect(0, 0, 80, 60);
    return canvas.toDataURL().split(",")[1];
  }, color);
  await page.getByLabel("上传背景图片", { exact: true }).setInputFiles({
    name: `${color}.png`,
    mimeType: "image/png",
    buffer: Buffer.from(data, "base64"),
  });
  await expect(page.getByText(`${color}.png`, { exact: true })).toBeVisible();
  await page.getByRole("slider", { name: "背景压暗" }).fill("0");
  await expect
    .poll(() =>
      page
        .getByLabel("MIDI 音符可视化预览")
        .evaluate((element) =>
          Array.from(
            (element as HTMLCanvasElement)
              .getContext("2d")!
              .getImageData(4, 4, 1, 1).data,
          ),
        ),
    )
    .toEqual(color === "#ff0000" ? [255, 0, 0, 255] : [0, 0, 255, 255]);
}

test("slender translucent keys transmit the background and match the exported frame", async ({
  page,
}) => {
  await page.addInitScript((points) => {
    const capture = { pixels: null as number[][] | null };
    Object.defineProperty(window, "__crystalCapture", { value: capture });
    const original = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (
      text,
      left,
      top,
      maxWidth,
    ) {
      if (maxWidth === undefined) original.call(this, text, left, top);
      else original.call(this, text, left, top, maxWidth);
      if (
        !capture.pixels &&
        this.canvas instanceof HTMLCanvasElement &&
        this.canvas.getAttribute("aria-hidden") === "true" &&
        text.includes("MUSIC IN MOTION")
      ) {
        capture.pixels = points.map(([sampleLeft, sampleTop]) =>
          Array.from(this.getImageData(sampleLeft, sampleTop, 1, 1).data),
        );
      }
    };
  }, samplePoints);
  await page.goto("/");
  await page
    .getByRole("switch", { name: "从背景提取音符颜色", exact: true })
    .uncheck();
  await page.getByLabel("导入 MIDI 和音频").setInputFiles(musicFixtures());
  await expect(
    page.getByRole("button", { name: "播放", exact: true }),
  ).toBeEnabled();
  await page.getByRole("slider", { name: "辉光强度" }).fill("0");
  await page.getByRole("switch", { name: "音符粒子", exact: true }).uncheck();
  await setBackground(page, "#ff0000");
  await expect
    .poll(async () => (await sampleKeys(page))[0][0])
    .toBeGreaterThan(180);
  const red = await sampleKeys(page);
  await setBackground(page, "#0000ff");
  await expect
    .poll(async () => (await sampleKeys(page))[0][2])
    .toBeGreaterThan(180);
  const blue = await sampleKeys(page);
  for (let index = 0; index < blue.length; index++) {
    expect(red[index][0] - blue[index][0]).toBeGreaterThan(80);
    expect(blue[index][2] - red[index][2]).toBeGreaterThan(80);
  }
  expect(blue[2][0]).toBeGreaterThan(blue[0][0] + 10);
  const belowKeyboard = await page
    .getByLabel("MIDI 音符可视化预览")
    .evaluate((element) =>
      Array.from(
        (element as HTMLCanvasElement)
          .getContext("2d")!
          .getImageData(327, 660, 1, 1).data,
      ),
    );
  expect(belowKeyboard[0]).toBeLessThan(10);
  expect(belowKeyboard[2]).toBeGreaterThan(245);
  await page.getByLabel("导出终点").fill("0.5");
  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出 MP4" }).click();
  await downloading;
  const exported = await page.evaluate(
    () =>
      (window as unknown as { __crystalCapture: { pixels: number[][] | null } })
        .__crystalCapture.pixels,
  );
  expect(exported).not.toBeNull();
  for (let index = 0; index < blue.length; index++)
    for (let channel = 0; channel < 4; channel++)
      expect(
        Math.abs(exported![index][channel] - blue[index][channel]),
      ).toBeLessThanOrEqual(2);
  await page.getByRole("button", { name: "恢复默认背景" }).click();
  await page
    .getByLabel("MIDI 音符可视化预览")
    .screenshot({ path: test.info().outputPath("crystal-keyboard.png") });
});
