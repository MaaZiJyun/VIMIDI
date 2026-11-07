import { BufferTarget, StreamTarget } from "mediabunny";

interface SaveHandle {
  createWritable(): Promise<FileSystemWritableFileStream>;
}

type PickerWindow = Window & {
  showSaveFilePicker?: (options: {
    suggestedName: string;
    types: { description: string; accept: Record<string, string[]> }[];
  }) => Promise<SaveHandle>;
};

export function supportsDirectSave(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof (window as PickerWindow).showSaveFilePicker === "function"
  );
}

export async function createOutputTarget(name: string, direct: boolean) {
  const picker = (window as PickerWindow).showSaveFilePicker;
  if (direct && !picker)
    throw new Error(
      "当前浏览器不支持直接写盘，请使用 Chrome / Edge，或关闭此选项导出短段视频。",
    );
  if (direct && picker) {
    // Invoke before awaiting encoders so the browser retains the user's activation.
    const handle = await picker.call(window, {
      suggestedName: `${name}.mp4`,
      types: [{ description: "MP4 视频", accept: { "video/mp4": [".mp4"] } }],
    });
    const file = await handle.createWritable();
    const target = new StreamTarget(
      new WritableStream({
        async write(chunk) {
          await file.seek(chunk.position);
          await file.write(chunk.data);
        },
      }),
      { chunked: true, chunkSize: 4 * 1024 * 1024 },
    );
    return {
      target,
      finish: async () => {
        await file.close();
        return null;
      },
      abort: async () => {
        await file.abort();
      },
    };
  }
  const target = new BufferTarget();
  return {
    target,
    finish: async () => {
      if (!target.buffer) throw new Error("视频生成失败，未得到有效数据。");
      return new Blob([target.buffer], { type: "video/mp4" });
    },
    abort: async () => {},
  };
}

export function downloadVideo(url: string, name: string) {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${name}.mp4`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
}
