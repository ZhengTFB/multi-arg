# 设计参考

唯一视觉基准：**Natural Organic（自然有机风）**，来自 StyleKit。
线上原页：https://www.stylekit.top/styles/natural-organic/showcase

## 先读源码，不要看着截图猜

```
natural-organic/
  source/
    page.html                 渲染后的完整 DOM（716 个元素），颜色和圆角写在行内 style，版式写在 Tailwind 类
    section-components.html   COMPONENTS 区单独一份，7.5 KB，最常抄的就是它
    recipes.md                从 page.html 统计出来的真实取值 + 可直接复制的元素片段
    classes.tsv               所有出现过的 Tailwind 类，按次数排序
    variables.css             页面里定义的 CSS 自定义属性
    css-*.css                 页面实际加载的样式表
  showcase-full.png           整页全截图，1440×6796
  showcase-top.png            首屏
  slice-01..08.png            首屏往下按 900px 切的八张
  computed.json               浏览器算出来的最终样式
natural-organic-style-pack/   StyleKit 官方导出的风格包（SKILL.md / tokens / tailwind preset）
scripts/capture-reference.mjs 重新抓 source 的脚本
scripts/analyze-reference.mjs 重新生成 recipes.md 的脚本
```

**顺序是：`recipes.md` → `section-components.html` → `page.html` → 截图。**
截图只用来看整体节奏和留白，具体数值一律从源码里抄。

## 这个页面的写法要知道的两件事

- 颜色、圆角、边框、阴影写在**行内 `style`** 上，不在 class 里。
- class 里只有版式：`flex` / `gap-3` / `px-5` / `py-2.5` / `text-sm` / `font-medium` / `transition-all` / `duration-500` / `ease-in-out` / `hover:translate-y-0.5` / `active:scale-95`。

所以抄的时候两边都要看：版式照 class，视觉照 `style`。

## 只读

这个文件夹不进构建、不挂路由、不拷进 `public/`，`vite.config.ts` 的 `build.rollupOptions` 里排除掉。改它等于改基准。
