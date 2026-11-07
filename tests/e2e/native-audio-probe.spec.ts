import { expect, test } from "@playwright/test";
import { build } from "vite";
import path from "node:path";
import { existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import type { probeNativeSeek } from "./helpers/seek-probe";

test("compares native MP3 seeking with decoded audio timestamps", async ({
  page,
}) => {
  test.setTimeout(120000);
  test.skip(!existsSync("all-songs-taiki.mp3"), "Local example required");
  const result = await build({
    configFile: false,
    logLevel: "error",
    build: {
      write: false,
      lib: {
        entry: path.resolve("tests/e2e/helpers/seek-probe.ts"),
        name: "SeekProbe",
        formats: ["iife"],
      },
      target: "es2022",
      minify: false,
    },
  });
  const outputs = Array.isArray(result) ? result : [result];
  const bundle = outputs
    .flatMap((output) => ("output" in output ? output.output : []))
    .find((output) => output.type === "chunk");
  if (!bundle || bundle.type !== "chunk")
    throw new Error("Probe did not compile");
  await page.route("**/seek-probe.js", (route) =>
    route.fulfill({ contentType: "application/javascript", body: bundle.code }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "载入你的示例文件" }).click();
  await page.addScriptTag({ url: "/seek-probe.js" });
  const results = [];
  for (const target of [300, 1000, 1800]) {
    const measured = await page.evaluate(
      async (time) =>
        (
          window as unknown as {
            SeekProbe: { probeNativeSeek: typeof probeNativeSeek };
          }
        ).SeekProbe.probeNativeSeek("/api/example?kind=audio", time),
      target,
    );
    results.push(measured);
  }
  await test.info().attach("native-seek-measurements", {
    body: JSON.stringify(results, null, 2),
    contentType: "application/json",
  });
  console.log("Native seek PCM measurements:", JSON.stringify(results));
  await writeFile(
    "test-results/native-seek-measurements.json",
    JSON.stringify(results, null, 2),
  );
  expect(results, JSON.stringify(results)).toEqual(
    expect.arrayContaining([expect.objectContaining({ target: 300 })]),
  );
  for (const measured of results) {
    expect(measured.score, JSON.stringify(measured)).toBeGreaterThan(0.7);
    expect(Math.abs(measured.error), JSON.stringify(measured)).toBeLessThan(
      0.2,
    );
  }
});
