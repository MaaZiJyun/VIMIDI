import { expect, test } from "@playwright/test";
import { existsSync } from "node:fs";

test("shows the file's native tempo curve and follows it without Auto BPM", async ({
  page,
}) => {
  test.skip(
    !existsSync("all-songs-taiki.mp3"),
    "The local example is optional",
  );
  await page.goto("/");
  await page.getByRole("button", { name: "载入你的示例文件" }).click();
  await expect(
    page.getByRole("button", { name: "播放", exact: true }),
  ).toBeEnabled();
  await expect(
    page.getByRole("switch", { name: "Auto BPM", exact: true }),
  ).not.toBeChecked();
  const panel = page.getByRole("region", {
    name: "MIDI 原生速度曲线",
    exact: true,
  });
  await expect(panel).toContainText("20,924 条 Tempo 事件");
  await expect(panel).toContainText("60.000–124.000 BPM");
  await expect(panel).toContainText("原生速度使用中");
  await expect(page.getByTestId("native-midi-bpm")).toContainText("64.000");
  await page.getByLabel("播放进度").fill("300");
  await expect(page.getByTestId("native-midi-bpm")).toContainText("90.000");
  await page.getByLabel("播放进度").fill("600");
  await expect(page.getByTestId("native-midi-bpm")).toContainText("84.984");
  await page.screenshot({
    path: "test-results/native-midi-tempo.png",
    fullPage: true,
  });
});
