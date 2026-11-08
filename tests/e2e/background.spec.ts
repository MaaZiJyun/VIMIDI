import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { musicFixtures } from "./fixtures";
import { visualFixtures } from "./feature-fixtures";
import { lightenColor } from "../../src/features/studio/render/note-style";

async function imageFile(page: Page, color: string | string[], name: string) {
  const data = await page.evaluate((fill) => {
    const canvas = document.createElement("canvas");
    canvas.width = 80;
    canvas.height = 60;
    const context = canvas.getContext("2d")!;
    const colors = typeof fill === "string" ? [fill] : fill;
    colors.forEach((shade, index) => {
      context.fillStyle = shade;
      context.fillRect((index * 80) / colors.length, 0, 80 / colors.length, 60);
    });
    return canvas.toDataURL("image/png").split(",")[1];
  }, color);
  return { name, mimeType: "image/png", buffer: Buffer.from(data, "base64") };
}

async function pixel(page: Page) {
  return page.getByLabel("MIDI 音符可视化预览").evaluate((element) => {
    const context = (element as HTMLCanvasElement).getContext("2d")!;
    return Array.from(context.getImageData(4, 4, 1, 1).data);
  });
}

test("uploads, replaces, dims and removes local backgrounds", async ({
  page,
}) => {
  await page.goto("/");
  const input = page.getByLabel("上传背景图片", { exact: true });
  const autoColor = page.getByRole("switch", {
    name: "从背景提取音符颜色",
    exact: true,
  });
  await expect(autoColor).toBeChecked();
  await input.setInputFiles(await imageFile(page, "#ff0000", "red.png"));
  await expect(page.getByText("red.png", { exact: true })).toBeVisible();
  await expect(page.getByLabel("全局音符颜色")).toHaveValue("#ff3d3d");
  await page
    .getByLabel("全局音符颜色")
    .evaluate((element: HTMLInputElement) => {
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )!.set!.call(element, "#336699");
      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
    });
  await expect(page.getByLabel("全局音符颜色")).toHaveValue("#336699");
  await autoColor.uncheck();
  await page.getByRole("slider", { name: "背景压暗" }).fill("0");
  await expect.poll(() => pixel(page)).toEqual([255, 0, 0, 255]);
  await page.getByRole("slider", { name: "背景压暗" }).fill("0.5");
  await expect.poll(async () => (await pixel(page))[0]).toBeCloseTo(127, -1);
  await input.setInputFiles(await imageFile(page, "#00ff00", "green.png"));
  await expect(page.getByText("green.png", { exact: true })).toBeVisible();
  await expect(page.getByLabel("全局音符颜色")).toHaveValue("#336699");
  await autoColor.check();
  await expect(page.getByLabel("全局音符颜色")).toHaveValue("#3dff3d");
  await page.getByRole("slider", { name: "背景压暗" }).fill("0");
  await expect.poll(() => pixel(page)).toEqual([0, 255, 0, 255]);
  await input.setInputFiles({
    name: "broken.png",
    mimeType: "image/png",
    buffer: Buffer.from("broken"),
  });
  await expect(
    page.getByRole("alert").filter({ hasText: "无法读取背景图片" }),
  ).toBeVisible();
  await expect(page.getByLabel("全局音符颜色")).toHaveValue("#3dff3d");
  await expect.poll(() => pixel(page)).toEqual([0, 255, 0, 255]);
  await page.getByRole("button", { name: "恢复默认背景" }).click();
  await expect(page.getByRole("slider", { name: "背景压暗" })).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "让音乐，有迹可循。" }),
  ).toBeVisible();
});

test("extracts a multi-color palette and uses it across tracks and export", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const capture = { fills: [] as string[] };
    Object.defineProperty(window, "__paletteCapture", { value: capture });
    const original = CanvasRenderingContext2D.prototype.fill;
    CanvasRenderingContext2D.prototype.fill = function () {
      Reflect.apply(original, this, arguments);
      if (
        this.canvas instanceof HTMLCanvasElement &&
        this.canvas.getAttribute("aria-hidden") === "true" &&
        typeof this.fillStyle === "string" &&
        !capture.fills.includes(this.fillStyle)
      )
        capture.fills.push(this.fillStyle);
    };
  });
  await page.goto("/");
  await page.getByLabel("导入 MIDI 和音频").setInputFiles(visualFixtures());
  await expect(
    page.getByRole("button", { name: "播放", exact: true }),
  ).toBeEnabled();
  await page
    .getByLabel("上传背景图片", { exact: true })
    .setInputFiles(
      await imageFile(
        page,
        ["#ff0000", "#00ff00", "#0000ff", "#ffffff"],
        "palette.png",
      ),
    );
  const palette = page.getByRole("button", {
    name: "使用背景配色",
    exact: true,
  });
  await expect(palette).toHaveAttribute("aria-pressed", "true");
  await expect(palette.locator("i")).toHaveCount(3);
  await expect(palette).toContainText("3 色");
  await expect(page.locator(".track-row i").first()).toHaveCSS(
    "background-color",
    "rgb(255, 61, 61)",
  );
  await expect(page.locator(".track-row i").last()).toHaveCSS(
    "background-color",
    "rgb(61, 255, 61)",
  );
  await page
    .getByLabel("全局音符颜色")
    .evaluate((element: HTMLInputElement) => {
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )!.set!.call(element, "#336699");
      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
    });
  await expect(page.locator(".track-row i").last()).toHaveCSS(
    "background-color",
    "rgb(51, 102, 153)",
  );
  await expect(palette).toHaveAttribute("aria-pressed", "false");
  await page.getByRole("button", { name: "恢复分轨", exact: true }).click();
  await expect(palette).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "薄荷", exact: true }).click();
  await expect(palette).toHaveAttribute("aria-pressed", "false");
  await palette.click();
  await expect(page.locator(".track-row i").last()).toHaveCSS(
    "background-color",
    "rgb(61, 255, 61)",
  );
  await page.getByLabel("导出终点").fill("0.5");
  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出 MP4" }).click();
  await downloading;
  const fills = await page.evaluate(
    () =>
      (window as unknown as { __paletteCapture: { fills: string[] } })
        .__paletteCapture.fills,
  );
  expect(fills).toContain(lightenColor("#ff3d3d", 0.32));
  expect(fills).toContain(lightenColor("#3dff3d", 0.32));
});

test("keeps the selected background in preview and exported MP4", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("导入 MIDI 和音频").setInputFiles(musicFixtures());
  await expect(
    page.getByRole("button", { name: "播放", exact: true }),
  ).toBeEnabled();
  await page
    .getByLabel("上传背景图片", { exact: true })
    .setInputFiles(await imageFile(page, "#ff0000", "export.png"));
  await expect(page.getByText("export.png", { exact: true })).toBeVisible();
  await expect(page.getByLabel("全局音符颜色")).toHaveValue("#ff3d3d");
  await expect(page.locator(".track-row i").first()).toHaveCSS(
    "background-color",
    "rgb(255, 61, 61)",
  );
  await page.getByRole("slider", { name: "背景压暗" }).fill("0");
  await expect.poll(async () => (await pixel(page))[0]).toBeGreaterThan(240);
  await page.getByLabel("导出终点").fill("0.5");
  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出 MP4" }).click();
  const download = await downloading;
  const bytes = await readFile((await download.path())!);
  const exportedPixel = await page.evaluate(async (data) => {
    const bytes = Uint8Array.from(atob(data), (character) =>
      character.charCodeAt(0),
    );
    const url = URL.createObjectURL(new Blob([bytes], { type: "video/mp4" }));
    const video = document.createElement("video");
    video.muted = true;
    document.body.append(video);
    try {
      await new Promise<void>((resolve, reject) => {
        video.onloadeddata = () => resolve();
        video.onerror = () => reject(new Error("无法读取导出视频"));
        video.src = url;
      });
      await new Promise<void>((resolve) => {
        video.onseeked = () => resolve();
        video.currentTime = 0.1;
      });
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext("2d")!;
      context.drawImage(video, 0, 0);
      return Array.from(context.getImageData(4, 4, 1, 1).data);
    } finally {
      video.removeAttribute("src");
      video.load();
      video.remove();
      URL.revokeObjectURL(url);
    }
  }, bytes.toString("base64"));
  expect(exportedPixel[0]).toBeGreaterThan(220);
  expect(exportedPixel[1]).toBeLessThan(25);
  expect(exportedPixel[2]).toBeLessThan(25);
});
