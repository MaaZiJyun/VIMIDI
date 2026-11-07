# VIMIDI Studio

本地 MIDI 音乐可视化工作台。导入 `.mid` / `.midi` 和对应的 `.mp3` / `.wav`，同步预览钢琴瀑布，并导出带原始音频的 MP4 视频。

## 开始使用

需要 Node.js 20.19+ 和 npm。视频编码需要浏览器支持 WebCodecs H.264 与 AAC，建议使用最新版桌面 Chrome / Edge。远程部署需 HTTPS，本地 `localhost` 可直接使用。

```bash
npm install
npm run dev
```

打开 <http://localhost:3000>。

1. 拖入一个 MIDI 和一个音频文件，也可以分两次选择。
2. 播放、暂停或拖动时间轴。空格键可切换播放状态，编辑表单时不触发快捷键。
3. 选择音符配色、时间窗、辉光、粒子、键盘和标题；按音轨控制音符显隐。
4. 如音符起点与录音不一致，调整 MIDI 时间偏移。正值表示音符延后。
5. 选择画幅、分辨率、帧率和导出区间，点击「导出 MP4」。默认导出前 30 秒以便检查效果，可切换完整音频。

文件在浏览器本地处理。预览音量仅影响监听；导出保留源音频音量。隐藏音轨只改变画面，因为混音 MP3 / WAV 无法按 MIDI 音轨静音。

## 你的本地示例

仓库根目录存在以下两个文件时，点击「载入你的示例文件」即可使用：

```text
All Tracks in FATE OF THE TREE (Original Mix)2.0.mid
all-songs-taiki.mp3
```

MIDI 约 61:18，包含 36 个有效音轨和 39,406 个有效音符；音频约 58:52，大小约 135 MB。两者长度不同，应用会显示提示。偏移只能对齐整体起点，不能自动修复速度差异、不同剪辑或局部错位。导出区间以音频时长为准。

示例端点仅允许访问这两个固定文件，支持 HTTP 字节范围读取，不接受任意路径。源媒体文件已加入 `.gitignore`，不会作为应用静态资源打包；部署后若没有这些文件，可继续手动导入素材。

## 长视频与导出

- 浏览器原生音频元素播放压缩音频；导出通过 Mediabunny 按段解码，不一次性展开整段录音。
- 预览和导出共用 `drawFrame()`，导出使用确定性的时间戳逐帧渲染，不依赖屏幕录制或实时播放速度。
- 输出为 MP4，H.264 视频与 AAC 音频，支持 720p / 1080p、30 / 60 fps、16:9 / 9:16 / 1:1。
- 支持 File System Access API 时可启用「直接写入磁盘」，持续写入分片 MP4。取消导出会中止未完成的文件写入。
- 内存下载模式限制为 10 分钟以内；长视频请选择直接写盘或分段导出。完整长片的耗时取决于分辨率、帧率和硬件编码性能。
- 导出期间可以取消，相关文件导入和视觉控件锁定，防止中途修改。编码失败会显示可操作的错误。
- WebCodecs / 编码器不可用时会明确提示，不会将其他容器改名成 `.mp4`。不支持直接写盘的浏览器仍可下载短段视频。

## 代码结构

应用与测试逻辑使用 TypeScript / TSX，严格模式；样式使用 CSS 和 Tailwind。业务模块通过类型与显式参数通信，不依赖全局单例。

```text
src/app/
  page.tsx                    页面入口
  api/example/route.ts        固定本地示例的流式读取
  o-ui-tokens.css              o-ui 原始设计变量
  styles/                     按界面职责拆分的样式
src/features/studio/
  model/                      类型、默认设置、时间与尺寸规则
  midi/                       MIDI 解析和音符时间索引
  audio/                      音频元数据、资源释放
  render/                     纯 Canvas 渲染、钢琴几何布局
  export/                     MP4 编码、音频裁切、输出目标
  hooks/                      导入、播放、导出生命周期
  components/                 表单与预览组件
  server/                     HTTP 字节范围校验
  studio.tsx                  工作台编排
tests/
  unit/                       解析、长音符查询、区间、几何、Range
  e2e/                        文件导入、播放、导出与响应式验证
```

每个源码文件不超过 500 行，ESLint 对 TypeScript 文件执行 `max-lines` 检查。音符按起点排序，配合单调最大结束时间索引查询可见窗口，持续长音不会因后续短音结束而消失。

## 检查与测试

```bash
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run format:check
npm run build
```

端到端测试默认使用系统 Chrome；可复用已运行的 3000 端口服务，否则自动启动开发服务。测试会生成 MIDI / WAV，实际下载 MP4 并检查 H.264 / AAC 轨道、尺寸与时长。本地示例测试仅在媒体文件存在时运行。浏览器测试产物位于忽略的 `test-results/`。

## 设计参考与依赖

界面参考 [o-ui](https://github.com/MaaZiJyun/o-ui)，沿用其 zinc 表面、单色主操作、紧凑控件、圆角和水果色板，支持明暗主题。设计变量来自其 `src/tokens.css`，MIT 许可保留在 `public/o-ui-LICENSE.txt`。

- [Next.js](https://nextjs.org/docs)、React、TypeScript
- [Tailwind CSS](https://tailwindcss.com/docs)、[Heroicons](https://heroicons.com)
- [@tonejs/midi](https://github.com/Tonejs/Midi)：标准 MIDI 解析
- [Mediabunny](https://mediabunny.dev/guide/writing-media-files)：音频读取、WebCodecs 编码与 MP4 封装
