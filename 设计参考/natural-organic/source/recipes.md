# Natural Organic · 源码配方

全部来自 https://www.stylekit.top/styles/natural-organic/showcase 渲染后的真实 DOM。
颜色和圆角写在行内 `style`，版式写在 Tailwind 类。按这里的值写，不要看截图重新配。

## 颜色（行内声明，按出现次数）
```
 21×  #5c4033
 20×  #8b9d77
 18×  #e9e0d4
 18×  #fff
 13×  #faf6f1
 12×  #8b9d7718
  9×  #d4a373
  8×  #b07050
  6×  transparent
  4×  #5c403318
  3×  #d4a37322
  2×  #d4a37318
---
 80×  #5c4033
 69×  #7a6658
 33×  #8b9d77
 19×  #d4a373
 13×  #5a6e48
  9×  #faf6f1
  2×  #8b5a3a
  1×  rgb(92, 64, 51)
  1×  rgb(122, 102, 88)
  1×  #8a6030
  1×  #4a5e38
  1×  #c4b5a5
---
 17×  1px solid #e9e0d4
 11×  none
  3×  1.5px solid #c4b5a5
  3×  1px solid transparent
  1×  1px solid #c4d4b0
  1×  1px solid #e8c4b4
  1×  1px solid #c4b5a5
```

## 圆角（这个风格的签名，成对的不等角）
```
 27×  50% 40% 50% 40% / 40% 50% 40% 50%
 18×  60% 40% 50% 50% / 40% 60% 50% 60%
  9×  8px
  7×  40px 50px 40px 50px / 50px 40px 50px 40px
  6×  10px
  5×  12px 14px 12px 10px / 10px 12px 14px 12px
  5×  22px 26px 20px 24px / 20px 22px 26px 22px
  5×  50px 40px 50px 40px / 40px 50px 40px 50px
  5×  20px 24px 18px 22px / 22px 18px 24px 20px
  5×  12px
  5×  16px 18px 14px 16px / 14px 16px 18px 16px
  5×  6px
  5×  50%
  4×  40% 60% 50% 50% / 50% 40% 60% 50%
```

## 阴影
```
  1×  0 4px 16px #5c403344
  1×  0 4px 16px #faf6f144
  1×  0 4px 16px #8b9d7744
  1×  0 4px 16px #d4a37344
  1×  0 4px 16px #e9e0d444
  1×  0 6px 16px rgba(92,64,51,0.3)
```

## 版式类名（Tailwind，按出现次数）
```
118×  flex
 99×  ease-in-out
 89×  items-center
 86×  transition-all
 85×  text-xs
 71×  text-sm
 55×  duration-700
 44×  font-medium
 44×  duration-500
 37×  gap-3
 36×  gap-2
 36×  flex-shrink-0
 35×  font-semibold
 33×  justify-center
 33×  hover:translate-y-0.5
 33×  mt-1.5
 31×  w-5
 31×  h-5
 26×  leading-relaxed
 26×  h-2
 26×  items-start
 25×  transition-colors
 25×  w-2
 22×  cursor-default
 21×  text-center
 21×  font-serif
 20×  flex-col
 19×  font-mono
 19×  text-[10px]
 17×  w-4
 17×  h-4
 16×  absolute
 15×  px-5
 15×  px-3
 15×  pointer-events-none
 14×  uppercase
 14×  mb-1
 14×  py-0.5
 14×  text-white
 13×  mb-6
 13×  active:scale-95
 12×  px-4
 12×  py-2.5
 12×  mx-auto
 12×  cursor-pointer
 12×  mb-4
 12×  p-8
 12×  group
 12×  h-full
 11×  inline-flex
 11×  text-lg
 11×  gap-4
 10×  inline-block
  9×  hidden
  9×  w-8
  9×  h-8
  9×  mb-2
  9×  px-2
  8×  max-w-6xl
  8×  md:px-10
```

## 可直接复制的元素

### 主按钮（深土褐，不等角）
```html
<button class="px-5 py-2.5 text-sm font-medium capitalize transition-all duration-500 ease-in-out hover:translate-y-0.5 active:scale-95" style="background-color:#5c4033;color:#faf6f1;border-radius:22px 26px 20px 24px / 20px 22px 26px 22px">buttons</button>
```
```html
<button class="font-medium transition-all duration-500 ease-in-out hover:translate-y-0.5 active:scale-95 text-white px-7 py-3 text-sm" style="background-color:#5c4033;border-radius:24px 30px 24px 18px / 20px 24px 28px 24px">Medium</button>
```
```html
<button class="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-medium border transition-all duration-500 ease-in-out hover:translate-y-0.5" style="background-color:#5c403318;color:#5c4033;border-color:#5c403344;border-radius:20px 24px 18px 22px / 22px 18px 24px 20px"><svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 22V12m0 0C12 7 7 4 3 6c0 4 4 7 9 6zm0 0c0-5 5-8 9-6-1 4-5 7-9 6z"></path></svg>Seedling</button>
```

### 次按钮（亚麻底）
```html
<button class="px-5 py-2.5 text-sm font-medium capitalize transition-all duration-500 ease-in-out hover:translate-y-0.5 active:scale-95" style="background-color:#e9e0d4;color:#5c4033;border-radius:22px 26px 20px 24px / 20px 22px 26px 22px">cards</button>
```
```html
<button class="px-5 py-2.5 text-sm font-medium capitalize transition-all duration-500 ease-in-out hover:translate-y-0.5 active:scale-95" style="background-color:#e9e0d4;color:#5c4033;border-radius:22px 26px 20px 24px / 20px 22px 26px 22px">inputs</button>
```
```html
<button class="px-5 py-2.5 text-sm font-medium capitalize transition-all duration-500 ease-in-out hover:translate-y-0.5 active:scale-95" style="background-color:#e9e0d4;color:#5c4033;border-radius:22px 26px 20px 24px / 20px 22px 26px 22px">badges</button>
```

### 鼠尾草按钮
```html
<button class="px-6 py-3 text-sm font-medium text-white transition-all duration-500 ease-in-out hover:translate-y-0.5 active:scale-95" style="background-color:#8b9d77;border-radius:26px">Subscribe</button>
```
```html
<button class="font-medium transition-all duration-500 ease-in-out hover:translate-y-0.5 active:scale-95 text-white px-10 py-4 text-base" style="background-color:#8b9d77;border-radius:24px 30px 24px 18px / 20px 24px 28px 24px">Large</button>
```
```html
<button class="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-medium border transition-all duration-500 ease-in-out hover:translate-y-0.5" style="background-color:#8b9d7718;color:#8b9d77;border-color:#8b9d7744;border-radius:20px 24px 18px 22px / 22px 18px 24px 20px"><svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0L12 2.69z"></path></svg>Water</button>
```

### 白卡容器
```html
<div class="p-5 text-center transition-all duration-700 ease-in-out hover:translate-y-0.5 cursor-default" style="background-color:#fff;border:1px solid #e9e0d4;border-radius:40% 60% 50% 50% / 50% 40% 60% 50%;transition-delay:0s">
```
```html
<div class="p-5 text-center transition-all duration-700 ease-in-out hover:translate-y-0.5 cursor-default" style="background-color:#fff;border:1px solid #e9e0d4;border-radius:40% 60% 50% 50% / 50% 40% 60% 50%;transition-delay:0.06s">
```
```html
<div class="p-5 text-center transition-all duration-700 ease-in-out hover:translate-y-0.5 cursor-default" style="background-color:#fff;border:1px solid #e9e0d4;border-radius:40% 60% 50% 50% / 50% 40% 60% 50%;transition-delay:0.12s">
```

### 小徽章 / 圆点
```html
<span class="px-3 py-1 text-xs font-semibold" style="background-color:#8b9d7722;color:#5a6e48;border-radius:12px">
```
```html
<span class="px-3 py-1 text-xs font-semibold" style="background-color:#d4a37322;color:#8a6030;border-radius:12px">
```
```html
<span class="px-3 py-1 text-xs font-semibold" style="background-color:#8b9d7730;color:#4a5e38;border-radius:12px">
```
