import {
  ArrowUpRightIcon,
  CodeBracketIcon,
  SparklesIcon,
  SwatchIcon,
} from "@heroicons/react/24/outline";

const features = [
  {
    name: "TypeScript",
    description: "使用严格类型检查，让代码更清晰、可靠。",
    icon: CodeBracketIcon,
  },
  {
    name: "Tailwind CSS",
    description: "使用实用类快速构建响应式界面。",
    icon: SwatchIcon,
  },
  {
    name: "Heroicons",
    description: "通过 React 组件使用简洁、一致的 SVG 图标。",
    icon: SparklesIcon,
  },
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-20 sm:px-10">
      <div className="mb-8 flex items-center gap-3 text-sm font-medium tracking-widest text-teal-300">
        <SparklesIcon aria-hidden="true" className="size-5" />
        VIMIDI
      </div>
      <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-6xl">
        从这里，开始构建。
      </h1>
      <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-400">
        Next.js 项目已就绪。编辑
        <code className="mx-2 rounded bg-white/5 px-2 py-1 font-mono text-sm text-zinc-200">
          src/app/page.tsx
        </code>
        开始创建你的应用。
      </p>
      <div className="mt-12 grid gap-4 sm:grid-cols-3">
        {features.map(({ name, description, icon: Icon }) => (
          <section
            key={name}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-6"
          >
            <Icon aria-hidden="true" className="mb-5 size-7 text-teal-300" />
            <h2 className="font-semibold text-zinc-100">{name}</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              {description}
            </p>
          </section>
        ))}
      </div>
      <a
        href="https://nextjs.org/docs"
        className="mt-10 inline-flex w-fit items-center gap-2 rounded-lg bg-teal-300 px-5 py-3 text-sm font-semibold text-zinc-950 transition-colors hover:bg-teal-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-300"
      >
        阅读 Next.js 文档
        <ArrowUpRightIcon aria-hidden="true" className="size-4" />
      </a>
    </main>
  );
}
