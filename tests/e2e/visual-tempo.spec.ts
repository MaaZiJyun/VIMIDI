import { expect, test, type Page } from "@playwright/test";
import { visualFixtures, tempoFixtures } from "./feature-fixtures";
import { pianoLayout } from "../../src/features/studio/render/piano-layout";

async function ready(page: Page, files: ReturnType<typeof visualFixtures>) {
  await page.goto("/");
  await page.getByLabel("导入 MIDI 和音频").setInputFiles(files);
  await expect(
    page.getByRole("button", { name: "播放", exact: true }),
  ).toBeEnabled();
}

async function captureExport(page: Page) {
  await page.addInitScript(() => {
    const state = { texts: [] as string[], frame: "" };
    Object.defineProperty(window, "__exportCapture", { value: state });
    const original = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (
      text: string,
      x: number,
      y: number,
      maxWidth?: number,
    ) {
      if (maxWidth === undefined) original.call(this, text, x, y);
      else original.call(this, text, x, y, maxWidth);
      if (
        this.canvas instanceof HTMLCanvasElement &&
        !this.canvas.hasAttribute("aria-label")
      ) {
        state.texts.push(text);
        if (text === "00:28" && !state.frame)
          state.frame = this.canvas.toDataURL();
      }
    };
  });
}

test("uses solid notes, bright contact, global color, and customized exported captions", async ({
  page,
}) => {
  await captureExport(page);
  await ready(page, visualFixtures());
  await page
    .getByLabel("全局音符颜色")
    .evaluate((element: HTMLInputElement) => {
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )!.set!.call(element, "#ff5533");
      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
    });
  await expect(page.locator(".track-row i").first()).toHaveCSS(
    "background-color",
    "rgb(255, 85, 51)",
  );
  await expect(page.locator(".track-row i").last()).toHaveCSS(
    "background-color",
    "rgb(255, 85, 51)",
  );
  await page.getByRole("slider", { name: "辉光强度" }).fill("0");
  await page.getByRole("switch", { name: "音符粒子", exact: true }).uncheck();
  const canvas = page.getByLabel("MIDI 音符可视化预览");
  const sampledKey = pianoLayout(21, 108, 1280 * 0.76).find(
    (key) => key.pitch === 62,
  )!;
  const sampleLeft = Math.round(
    1280 * 0.12 + sampledKey.x + sampledKey.width / 2,
  );
  const inactive = await canvas.evaluate((element: HTMLCanvasElement, left) => {
    const ctx = element.getContext("2d")!;
    return [
      Array.from(ctx.getImageData(left, 493, 1, 1).data),
      Array.from(ctx.getImageData(left, 500, 1, 1).data),
    ];
  }, sampleLeft);
  for (let channel = 0; channel < 3; channel++)
    expect(
      Math.abs(inactive[0][channel] - inactive[1][channel]),
    ).toBeLessThanOrEqual(2);
  await page.getByLabel("播放进度").fill("0.5");
  await expect
    .poll(() =>
      canvas.evaluate((element: HTMLCanvasElement, left) => {
        const pixel = element
          .getContext("2d")!
          .getImageData(left, 549, 1, 1).data;
        return pixel[0] + pixel[1] + pixel[2];
      }, sampleLeft),
    )
    .toBeGreaterThan(inactive[0][0] + inactive[0][1] + inactive[0][2] + 100);
  await page.getByLabel("视频标题", { exact: true }).fill("My MIDI Video");
  await page.getByLabel("视频页脚", { exact: true }).fill("Music by domuki");
  await page.getByLabel("导出终点").fill("0.5");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出 MP4" }).click();
  await download;
  const texts = await page.evaluate(
    () =>
      (window as unknown as { __exportCapture: { texts: string[] } })
        .__exportCapture.texts,
  );
  expect(texts).toContain("My MIDI Video");
  expect(texts).toContain("Music by domuki");
  await page.getByRole("button", { name: "恢复分轨", exact: true }).click();
  await expect(page.locator(".track-row i").first()).not.toHaveCSS(
    "background-color",
    "rgb(255, 85, 51)",
  );
});

test("detects changing audio BPM in the worker and exports the exact retimed preview", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await captureExport(page);
  await ready(page, tempoFixtures());
  await page.getByLabel("播放进度").fill("28");
  const canvas = page.getByLabel("MIDI 音符可视化预览");
  const before = await canvas.evaluate((element: HTMLCanvasElement) =>
    element.toDataURL(),
  );
  await page.getByRole("switch", { name: "Auto BPM", exact: true }).check();
  await expect(page.getByTestId("auto-bpm-status")).toContainText(
    "动态 BPM 已应用",
    { timeout: 30000 },
  );
  await expect(page.locator(".project-stats")).toContainText("动态速度 · AUTO");
  await expect(page.locator(".project-stats")).toContainText("150");
  const after = await canvas.evaluate((element: HTMLCanvasElement) =>
    element.toDataURL(),
  );
  expect(after).not.toBe(before);
  await page.getByLabel("导出起点").fill("28");
  await page.getByLabel("导出终点").fill("28.5");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出 MP4" }).click();
  await download;
  const exportedFrame = await page.evaluate(
    () =>
      (window as unknown as { __exportCapture: { frame: string } })
        .__exportCapture.frame,
  );
  await test.info().attach("retimed-preview", {
    body: Buffer.from(after.split(",")[1], "base64"),
    contentType: "image/png",
  });
  await test.info().attach("retimed-export", {
    body: Buffer.from(exportedFrame.split(",")[1], "base64"),
    contentType: "image/png",
  });
  const difference = await page.evaluate(
    async ([expected, actual]) => {
      const read = async (url: string) => {
        const image = new Image();
        image.src = url;
        await image.decode();
        const canvas = document.createElement("canvas");
        canvas.width = image.width;
        canvas.height = image.height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(image, 0, 0);
        return ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      };
      const left = await read(expected);
      const right = await read(actual);
      let count = 0;
      let max = 0;
      let first = -1;
      for (let i = 0; i < left.length; i++) {
        const delta = Math.abs(left[i] - right[i]);
        if (delta) {
          count++;
          max = Math.max(max, delta);
          if (first < 0) first = i;
        }
      }
      return {
        count,
        max,
        first,
        expected: Array.from(left.slice(Math.max(0, first - 4), first + 8)),
        actual: Array.from(right.slice(Math.max(0, first - 4), first + 8)),
      };
    },
    [after, exportedFrame],
  );
  expect(difference).toMatchObject({ count: 0 });
  await page.getByRole("switch", { name: "Auto BPM", exact: true }).uncheck();
  expect(
    await canvas.evaluate((element: HTMLCanvasElement) => element.toDataURL()),
  ).toBe(before);
  expect(errors).toEqual([]);
});

test("reports unidentifiable BPM and allows the original MIDI timing after disabling", async ({
  page,
}) => {
  await ready(page, tempoFixtures(true));
  await page.getByRole("switch", { name: "Auto BPM", exact: true }).check();
  await expect(page.getByTestId("auto-bpm-status")).toContainText(
    "未识别到可靠节拍",
    { timeout: 30000 },
  );
  await expect(page.getByRole("button", { name: "导出 MP4" })).toBeDisabled();
  await page.getByRole("switch", { name: "Auto BPM", exact: true }).uncheck();
  await expect(page.getByRole("button", { name: "导出 MP4" })).toBeEnabled();
});
