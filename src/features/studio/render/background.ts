import type { BackgroundImageAsset, VisualSettings } from "../model/types";

export async function loadBackgroundImage(
  file: File,
): Promise<BackgroundImageAsset> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error("请选择 JPG、PNG 或 WebP 图片。");
  if (file.size > 20 * 1024 * 1024)
    throw new Error("背景图片不能超过 20 MB，请压缩后重试。");
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    if (!image.naturalWidth || !image.naturalHeight)
      throw new Error("图片尺寸无效。");
    return { name: file.name, image };
  } catch {
    throw new Error("无法读取背景图片，请换一张 JPG、PNG 或 WebP 图片。");
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function drawBackground(
  context: CanvasRenderingContext2D,
  settings: Pick<VisualSettings, "backgroundImage" | "backgroundDim">,
  width: number,
  height: number,
): void {
  context.save();
  context.fillStyle = "#101014";
  context.fillRect(0, 0, width, height);
  if (settings.backgroundImage) {
    const { image } = settings.backgroundImage;
    const scale = Math.max(
      width / image.naturalWidth,
      height / image.naturalHeight,
    );
    const imageWidth = image.naturalWidth * scale;
    const imageHeight = image.naturalHeight * scale;
    context.drawImage(
      image,
      (width - imageWidth) / 2,
      (height - imageHeight) / 2,
      imageWidth,
      imageHeight,
    );
    context.fillStyle = `rgba(0, 0, 0, ${settings.backgroundDim})`;
    context.fillRect(0, 0, width, height);
  }
  context.restore();
}
