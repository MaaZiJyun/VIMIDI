import { expect, test } from "@playwright/test";
import { existsSync } from "node:fs";

test("cancels then fully analyzes the supplied long MP3 using bounded tempo windows", async ({
  page,
}) => {
  test.setTimeout(180000);
  test.skip(
    !existsSync("all-songs-taiki.mp3"),
    "The local example is optional",
  );
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.getByRole("button", { name: "载入你的示例文件" }).click();
  await expect(
    page.getByRole("button", { name: "播放", exact: true }),
  ).toBeEnabled();
  const toggle = page.getByRole("switch", { name: "Auto BPM", exact: true });
  await toggle.check();
  await expect
    .poll(
      async () =>
        page
          .getByLabel("BPM 分析进度")
          .evaluate((element: HTMLProgressElement) => element.value),
      { timeout: 30000 },
    )
    .toBeGreaterThan(0);
  await toggle.uncheck();
  await expect(page.getByTestId("auto-bpm-status")).not.toBeVisible();
  await expect(page.getByRole("button", { name: "导出 MP4" })).toBeEnabled();
  await toggle.check();
  await expect(page.getByTestId("auto-bpm-status")).toContainText(
    "动态 BPM 已应用",
    { timeout: 150000 },
  );
  await expect(page.getByTestId("auto-bpm-status")).toContainText(
    "/295 段检测到节拍",
  );
  await page.getByLabel("播放进度").fill("1000");
  await page.screenshot({
    path: "test-results/auto-bpm-long-example.png",
    fullPage: true,
  });
  await toggle.uncheck();
  await expect(page.locator(".project-stats")).toContainText("MIDI 当前速度");
  expect(errors).toEqual([]);
});
