# DECISIONS

格式：`YYYY-MM-DD 选了 X，因为 Y。影响面 Z。`

2026-10-31 视觉基准定为 Natural Organic（StyleKit），`05-视觉与文案.md` 第 1 节的占位令牌由它覆盖，第 3.3 节兜底不启用。参考页的展示站是英文营销页，只搬材质与数值，版式仍按 `01-页面与布局.md`。影响面：全站颜色、圆角、字体、缓动。

2026-10-31 视觉参考以源码为准，截图只作气氛对照。参考页把颜色和圆角写在行内 `style`、把版式写在 Tailwind 类，照截图重新配会走样，所以抓了渲染后的 DOM 落到 `设计参考/natural-organic/source/`，并生成 `recipes.md` 供直接抄。影响面：写 UI 前先读 `recipes.md`。

2026-10-31 标题字体用系统衬线栈（Songti SC / Noto Serif SC / Georgia）替代参考页的 Kalnia，正文用系统无衬线替代 Commissioner。理由是硬约束禁止引入 Google Fonts，国内首屏会明显变慢。影响面：字重取 600-700，字距 -0.01em。

2026-10-31 圆角采用参考页的不等角档位（`22px 26px 20px 24px / 20px 22px 26px 22px` 等），不统一成 `rounded-xl`。等角会让界面立刻掉回工具后台的样子，不等角是这个风格的签名。影响面：按钮、卡片、标签各有一档，写进 `tokens.css`。

2026-10-31 截图与参考抓取用 `chromium.launch({ channel: 'msedge' })`。本机 Playwright 1.64 需要 chromium-1248，实际只装了 chromium-1243，用系统 Edge 免下载。影响面：`scripts/shots.mjs` 与 `scripts/capture-reference.mjs` 都按这个写法；换机器可改回默认 chromium。
