import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_VISUALS } from "../../src/features/studio/model/settings";
import {
  drawBackground,
  loadBackgroundImage,
} from "../../src/features/studio/render/background";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("background image loading", () => {
  function setupImage(fail = false) {
    const decode = fail
      ? vi.fn().mockRejectedValue(new Error("decode"))
      : vi.fn().mockResolvedValue(undefined);
    const image = { naturalWidth: 800, naturalHeight: 600, decode, src: "" };
    vi.stubGlobal(
      "Image",
      class {
        constructor() {
          return image;
        }
      },
    );
    const create = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:background");
    const revoke = vi
      .spyOn(URL, "revokeObjectURL")
      .mockImplementation(() => {});
    return { image, create, revoke };
  }

  it("decodes once and releases the temporary object URL", async () => {
    const { image, revoke } = setupImage();
    const asset = await loadBackgroundImage(
      new File(["image"], "photo.png", { type: "image/png" }),
    );
    expect(asset).toEqual({ name: "photo.png", image });
    expect(image.decode).toHaveBeenCalledOnce();
    expect(revoke).toHaveBeenCalledWith("blob:background");
  });

  it("releases the URL on decoding failure", async () => {
    const { revoke } = setupImage(true);
    await expect(
      loadBackgroundImage(
        new File(["bad"], "broken.png", { type: "image/png" }),
      ),
    ).rejects.toThrow("无法读取背景图片");
    expect(revoke).toHaveBeenCalledWith("blob:background");
  });

  it("rejects unsupported and oversized files before decoding", async () => {
    const { create } = setupImage();
    await expect(
      loadBackgroundImage(
        new File(["svg"], "picture.svg", { type: "image/svg+xml" }),
      ),
    ).rejects.toThrow("JPG、PNG 或 WebP");
    const oversized = new File(["image"], "large.png", { type: "image/png" });
    Object.defineProperty(oversized, "size", { value: 20 * 1024 * 1024 + 1 });
    await expect(loadBackgroundImage(oversized)).rejects.toThrow("20 MB");
    expect(create).not.toHaveBeenCalled();
  });
});

describe("background rendering", () => {
  function contextMock() {
    return {
      save: vi.fn(),
      restore: vi.fn(),
      fillStyle: "",
      fillRect: vi.fn(),
      drawImage: vi.fn(),
    };
  }

  it("preserves the default solid background", () => {
    const context = contextMock();
    drawBackground(
      context as unknown as CanvasRenderingContext2D,
      DEFAULT_VISUALS,
      1280,
      720,
    );
    expect(context.fillStyle).toBe("#101014");
    expect(context.fillRect).toHaveBeenCalledExactlyOnceWith(0, 0, 1280, 720);
    expect(context.drawImage).not.toHaveBeenCalled();
    expect(context.restore).toHaveBeenCalledOnce();
  });

  it.each([
    [1600, 900, 720, 1280, -7000 / 9, 0, 20480 / 9, 1280],
    [900, 1600, 1280, 720, 0, -7000 / 9, 1280, 20480 / 9],
    [800, 800, 720, 720, 0, 0, 720, 720],
  ])(
    "covers a %sx%s image in a %sx%s frame without stretching",
    (
      imageWidth,
      imageHeight,
      width,
      height,
      left,
      top,
      drawnWidth,
      drawnHeight,
    ) => {
      const context = contextMock();
      const image = {
        naturalWidth: imageWidth,
        naturalHeight: imageHeight,
      } as HTMLImageElement;
      drawBackground(
        context as unknown as CanvasRenderingContext2D,
        { backgroundImage: { name: "photo.png", image }, backgroundDim: 0.35 },
        width,
        height,
      );
      const [source, actualLeft, actualTop, actualWidth, actualHeight] =
        context.drawImage.mock.calls[0];
      expect(source).toBe(image);
      expect(actualLeft).toBeCloseTo(left);
      expect(actualTop).toBeCloseTo(top);
      expect(actualWidth).toBeCloseTo(drawnWidth);
      expect(actualHeight).toBeCloseTo(drawnHeight);
      expect(context.fillStyle).toBe("rgba(0, 0, 0, 0.35)");
      expect(context.fillRect).toHaveBeenLastCalledWith(0, 0, width, height);
      expect(context.restore).toHaveBeenCalledOnce();
    },
  );
});
