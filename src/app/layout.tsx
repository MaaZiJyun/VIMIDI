import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "VIMIDI Studio · MIDI 音乐可视化",
  description:
    "导入 MIDI 和音频，同步预览音符可视化，并在本地导出 MP4 音乐视频。",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
