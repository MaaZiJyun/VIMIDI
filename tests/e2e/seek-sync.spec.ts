import { expect, test } from "@playwright/test";
import { existsSync } from "node:fs";
import { musicFixtures } from "./fixtures";

test("keeps the latest target when seeking repeatedly during playback", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("导入 MIDI 和音频").setInputFiles(musicFixtures(12));
  await expect(
    page.getByRole("button", { name: "播放", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "播放", exact: true }).click();
  const slider = page.getByLabel("播放进度");
  for (const time of [8, 2, 10, 4]) await slider.fill(String(time));
  await expect(page.getByRole("status", { name: "音频定位状态" })).toBeHidden();
  await expect
    .poll(async () => Number(await slider.inputValue()))
    .toBeGreaterThanOrEqual(4);
  expect(Number(await slider.inputValue())).toBeLessThan(6);
  await expect(
    page.getByRole("button", { name: "暂停", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "暂停", exact: true }).click();
  await slider.fill("1");
  await expect(page.getByRole("status", { name: "音频定位状态" })).toBeHidden();
  await expect(
    page.getByRole("button", { name: "播放", exact: true }),
  ).toBeVisible();
  expect(Number(await slider.inputValue())).toBeCloseTo(1, 1);
});

test("exports short local synchronization diagnostics without changing the default timing", async ({
  page,
}) => {
  test.skip(
    !existsSync("all-songs-taiki.mp3"),
    "The supplied local example is optional",
  );
  await page.goto("/");
  await page.getByRole("button", { name: "载入你的示例文件" }).click();
  await expect(
    page.getByRole("button", { name: "播放", exact: true }),
  ).toBeEnabled();
  await expect(page.getByTestId("midi-total-duration")).toContainText("61:17");
  await page.getByLabel("导出起点").fill("2400");
  await page.getByLabel("导出终点").fill("2408");
  for (const [offset, name, title] of [
    [0, "sync-original.mp4", "Original: audio 40:00 / MIDI 40:00"],
    [-154.5, "sync-candidate.mp4", "Candidate: audio 40:00 / MIDI 42:34.5"],
  ] as const) {
    await page
      .getByLabel("MIDI 时间偏移", { exact: true })
      .fill(String(offset));
    await page.getByLabel("视频标题", { exact: true }).fill(title);
    await page
      .getByLabel("视频页脚", { exact: true })
      .fill(
        "Diagnostic excerpt; candidate offset is not a whole-song correction.",
      );
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "导出 MP4" }).click();
    const download = await downloadPromise;
    await download.saveAs(`test-results/${name}`);
    await expect(page.getByText("视频已生成", { exact: true })).toBeVisible();
  }
});
