# dsh-chat-perf-css

DSH 长会话渲染减负插件。**它只做一件事：往页面里注入一条 CSS。**

## 定位（先读这段）

| 项 | 说明 |
|---|---|
| ✅ 它做 | **滚动 / 重绘减负** —— 让视口外的消息子树跳过 style / layout / paint |
| ❌ 它不做 | **不解决流式生成时公式反复重算**。生成过程中，可见区域的公式仍会随每个增量重新排版；那是渲染逻辑本身的事，与「屏外跳过」是两回事，本插件对此无能为力 |
| ⚠️ 何时该卸载 | DSH 官方一旦加入**虚拟滚动**（只把视口附近的消息节点挂进 DOM），本插件的收益基本归零，届时**请卸载它** |

一句话：它治的是「消息越堆越多、滚动变卡」，不是「生成时公式抖动」。

## 它解决什么

DSH 的 ChatView 会把每一条消息节点全量挂进 DOM，长会话里既没有虚拟滚动，也没有
`content-visibility`。几千条消息之后，滚动和重绘就开始卡。

本插件不去改渲染逻辑（那是上游的事），只是让**视口外**的消息正文与块级公式跳过
style / layout / paint，由浏览器自己决定什么时候真正渲染。

## 注入的两条规则

```css
[class*="_markdown_"]:not([class*="_icon_"]):not(svg){content-visibility:auto;contain-intrinsic-size:auto 320px}
.katex-display{content-visibility:auto;contain-intrinsic-size:auto 90px}
```

- 命中消息正文容器（前端用 CSS-module 类名 `_markdown_<hash>_<line>`，所以只匹配稳定的
  key 部分，不匹配 hash）。
- `:not([class*="_icon_"]):not(svg)` 两个排除项：文件类型图标组件也带
  `_markdown_<hash>_<line>` 类（`.md` 图标，与 `_icon_<hash>_1` 同挂在 `<svg>` 上），
  不排除的话屏外附件图标会占一个 320px 的坑。
- `contain-intrinsic-size: auto <size>` 给屏外子树一个占位高度；一旦某子树被渲染过，
  浏览器会记住它的真实高度。

## 安装

**先决条件**：DSH **0.2.1-rc.2** 上实测通过。插件只注入 CSS、不调用插件 API，版本差异通常只影响
「命中的类名还在不在」（见 [兼容性](#兼容性)）。

### 方式 A（推荐）：交给插件管理器

在 DSH 的插件管理器里安装，安装规格填：

```
github:Light-EI/dsh-chat-perf-css#v1.0.0
```

管理器会把它写进 profile 的 `dependencies` 和 `dsh.profile.bundles`，并自己跑 `pnpm install`，
不需要手改任何 JSON。

> 本仓库目前是**私有**仓库，只有被邀请的账号能这样装。其他人请用 Release 里的 zip 走方式 B。

### 方式 B（手动，离线可用）

1. 解压 Release 里的 zip，把 `dsh-chat-perf-css` 目录放进 `<profile>\plugins\dsh-chat-perf-css\`。
2. 在该 profile 的 `package.json` 里：
   - `dependencies` 增加 `"dsh-chat-perf-css": "link:./plugins/dsh-chat-perf-css"`
   - `dsh.profile.bundles` 数组增加 `"dsh-chat-perf-css"`
3. 在 profile 目录跑一次 `pnpm install`（建立 `node_modules` 链接并更新 lockfile）。
4. 重开 DSH 窗口。

桌面端与浏览器端是同一个窗口生效，不需要第二种界面。

### 装完怎么确认

在 DSH 窗口的开发者工具里执行：

```js
getComputedStyle(document.querySelector('[class*="_markdown_"]')).contentVisibility
```

返回 `"auto"` 即生效；返回 `"visible"` 说明规则没命中，多半是 DSH 前端改了类名 —— 见 [兼容性](#兼容性)。

## 卸载

从 `dsh.profile.bundles` 去掉这项、从 `dependencies` 去掉这条，跑 `pnpm install`，
再删掉 `plugins\dsh-chat-perf-css\` 目录即可。页面样式即时消失。

> 如果 DSH 官方已经提供虚拟滚动，本插件就该退场：在已经虚拟滚动的列表上再叠一层
> `contain-intrinsic-size` 占位，只会让滚动条长度更不准。

## 它不会做什么

- 宿主半边是空的：`export function apply() {}`，不注册服务、不注入依赖、不改配置。
- 不碰 KaTeX 输出：不改 `output` 选项，不动 MathML，只是给 `.katex-display` 加一条 CSS。
- 不碰模型 / 工具 / 凭据 / 系统提示词 / 会话日志 / 压缩逻辑。
- 无网络请求、无 localStorage、无事件监听、无定时器、无 MutationObserver。
- 零运行时依赖（只有 `peerDependencies: @deepseek-ai/cordis`）。

## 已知副作用（纯外观，滚动即自愈）

| 现象 | 说明 |
|---|---|
| 滚动条长度是估算值 | 屏外部分用占位高度，渲染过之后会记住真实高度 |
| 滚到未渲染区可能轻微跳动 | 该区域首次进入视口才真正渲染 |
| 打印长会话可能漏掉屏外正文 | `content-visibility` 的固有行为 |
| toast 位置可能轻微偏移 | toast 用锚元素 `getBoundingClientRect()` 定位，锚点在屏外时取到占位矩形 |
| 浏览器 Ctrl+F 可能搜不到被跳过的内容 | 桌面端无影响，DSH 桌面版没有页内查找功能 |

浮层不会被裁剪：消息正文容器没有 `position:absolute/fixed/sticky`，菜单、tooltip、
图片查看器都 portal 到 `document.body`。

## 兼容性

| 维度 | 说明 |
|---|---|
| DSH 版本 | 在 DSH **0.2.1-rc.2** 上实测通过。插件只注入 CSS、不调用插件 API，一般不受版本影响 |
| 会静默失效的地方 | 命中依赖前端 CSS-module 类名 `_markdown_<hash>_<line>`。DSH 前端一旦改名或改结构，规则会**静默失效**：页面一切正常，只是没有优化。用上面「装完怎么确认」那条命令可以分清是「没生效」还是「没效果」 |
| 浏览器 | 需要 Chromium 85+（`content-visibility`）。Electron 与新版 Chrome/Edge 均满足 |
| Firefox / Safari | Firefox 支持较晚，Safari 17.4+ 起支持。老版本浏览器会忽略这两条规则 —— 退化为「没有优化」，不会出错 |

## 许可

MIT，见 [LICENSE](LICENSE)。
