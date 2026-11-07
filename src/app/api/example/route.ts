import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { parseByteRange } from "@/features/studio/server/byte-range";

const FILES = {
  midi: {
    name: "All Tracks in FATE OF THE TREE (Original Mix)2.0.mid",
    type: "audio/midi",
  },
  audio: { name: "all-songs-taiki.mp3", type: "audio/mpeg" },
} as const;

async function serveExample(
  request: Request,
  headOnly: boolean,
): Promise<Response> {
  const kind = new URL(request.url).searchParams.get("kind");
  if (kind !== "midi" && kind !== "audio")
    return new Response("Not found", { status: 404 });
  // Only the two explicitly supplied examples are accessible. No arbitrary paths.
  const file = FILES[kind];
  // Local examples are optional and must not be copied into deployment bundles.
  const filePath = path.join(
    /* turbopackIgnore: true */ process.cwd(),
    file.name,
  );
  let size: number;
  try {
    size = (await stat(filePath)).size;
  } catch {
    return Response.json(
      { error: "本地示例文件不存在，请手动导入 MIDI 和音频。" },
      { status: 404 },
    );
  }
  let range: ReturnType<typeof parseByteRange>;
  try {
    range = parseByteRange(request.headers.get("range"), size);
  } catch {
    return new Response(null, {
      status: 416,
      headers: { "Content-Range": `bytes */${size}` },
    });
  }
  const start = range?.start ?? 0;
  const end = range?.end ?? size - 1;
  const headers: Record<string, string> = {
    "Content-Type": file.type,
    "Content-Length": String(end - start + 1),
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, no-store",
    "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(file.name)}`,
  };
  if (range) headers["Content-Range"] = `bytes ${start}-${end}/${size}`;
  const stream = headOnly
    ? null
    : (Readable.toWeb(
        createReadStream(filePath, { start, end }),
      ) as ReadableStream<Uint8Array>);
  return new Response(stream, { status: range ? 206 : 200, headers });
}

export function GET(request: Request) {
  return serveExample(request, false);
}
export function HEAD(request: Request) {
  return serveExample(request, true);
}
