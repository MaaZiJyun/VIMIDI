# VIMIDI

基于 Next.js App Router 的项目，使用 TypeScript、Tailwind CSS 和 Heroicons。

## 本地开发

需要 Node.js 20.9 或更高版本及 npm。

```bash
npm install
npm run dev
```

打开 <http://localhost:3000>。编辑 `src/app/page.tsx` 即可修改首页。

## 常用命令

```bash
npm run dev        # 启动开发服务器
npm run lint       # ESLint 检查
npm run typecheck  # TypeScript 类型检查
npm run build     # 构建生产版本
npm start         # 启动生产服务器（先执行 build）
```

## 目录

```text
src/app/
  layout.tsx    # 根布局与页面元数据
  page.tsx      # 首页
  globals.css   # 全局样式与 Tailwind 主题
public/         # 静态资源
```

使用 `@/*` 引用 `src/` 下的模块。TypeScript 已启用严格模式。

## 图标

```tsx
import { MusicalNoteIcon } from "@heroicons/react/24/outline";

<MusicalNoteIcon aria-hidden="true" className="size-6 text-teal-300" />;
```

图标支持 `24/outline`、`24/solid`、`20/solid` 和 `16/solid`。图标按钮应提供可访问名称，例如 `aria-label="播放"`。

参考文档：[Next.js](https://nextjs.org/docs)、[Tailwind CSS](https://tailwindcss.com/docs)、[Heroicons](https://heroicons.com)。
