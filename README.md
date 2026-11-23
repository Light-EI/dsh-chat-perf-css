# dsh-chat-perf-css

DSH 长会话渲染减负插件。**它只做一件事：往页面里注入一条 CSS。**

> **装它**
>
> 在 DSH 的「添加插件」里直接粘贴仓库地址：
>
> ```
> https://github.com/Light-EI/dsh-chat-perf-css
> ```
>
> 安装器会把它记成 `github:Light-EI/dsh-chat-perf-css`，也就是 `main` 的最新代码。**本仓库只在发版时
> 改动插件代码**（平时在 `dev` 上开发，发版时合并进 `main` 并打 tag），所以这条路装到的插件行为与最新
> 正式版一致；`main` 上可能夹着还没发版的文档改动。需要锁定某个版本，见[安装](#安装)里的两种写法。

## 定位（先读这段）

| 项 | 说明 |
|---|---|
| ✅ 它做 | **滚动 / 重绘减负** —— 让视口外的消息子树跳过 style / layout / paint |
| ❌ 它不做 | **不解决流式生成时公式反复重算**（那是渲染逻辑本身的事）；也**不给「同一条超长消息内部」的滚动减负** —— 一条消息就是一个整体，要么整条渲染，要么整条跳过 |
| ⚠️ 何时该卸载 | DSH 官方一旦加入**虚拟滚动**（只把视口附近的消息节点挂进 DOM），本插件的收益基本归零，届时**请卸载它** |

一句话：它治的是「消息越堆越多、滚动变卡」，不是「生成时公式抖动」。

## 它解决什么

DSH 打开会话时只取**尾页**（最近至少 2 个 turn / 50 条消息，上限 500 条），往上翻或跳转时
再逐页把更早的历史**前插**进窗口——已加载的页不会卸载（0.2.3 起离开会话时会收回到一页，但当前会话里翻过的历史仍会一直留在 DOM 里）；而窗口内的
渲染仍是 `entries.map` 全量挂载，既没有虚拟滚动，也没有 `content-visibility`。

所以「刚打开」不至于一上来挂几千条，但只要往下翻、或者把会话开着聊到很长，DOM 还是会一路涨上去；
消息体越重（公式、代码、工具输出多），滚动和重绘就越卡。

本插件不去改渲染逻辑（那是上游的事），只是让**视口外**的消息正文跳过
style / layout / paint，由浏览器自己决定什么时候真正渲染。

## 注入的规则

```css
[data-chat-flow] :is([class*="_markdown_"], [class$="_markdown"], [class*="_markdown "]):not([class*="_icon"]):not(svg){content-visibility:auto;contain-intrinsic-size:auto 320px}
```

- 只作用在**聊天列**（`[data-chat-flow]`）里。v1.0.11 及更早是全局匹配，连右侧文档预览、
  工具详情、对话框和轨迹表都会中招——那些是内滚区域，320px 占位会让滚动条把自己的长度算成估算值。
  聊天列是唯一会无限变长的界面，所以只留它。
- 命中消息正文容器。前端 CSS-module 的类名有两种形态，插件两种都认：
  - `_<local>_<hash>_<line>`，例如 `_markdown_13jw0_5`（**0.2.2 及更早**，由 Vite 生成哈希）；
  - `<hash>_<local>`，例如 `vD2sAq_markdown`（**0.2.3 起**，`ui-primitives` 的样式改由 module 元数据
    在挂载时安装，哈希改由 lightningcss 的 `[hash]_[local]` 生成，本地名 `markdown` 从前面挪到了后面）。

  所以选择器里是 `:is([class*="_markdown_"], [class$="_markdown"], [class*="_markdown "])` 三段：
  第一段认旧形态，后两段认新形态（单个类名结束 / 后面还跟着别的类名）。

  0.2.3-alpha.2 的官方前端产物里实测：整个包里只有两个 `*_markdown` 类名 —— `vD2sAq_markdown`
  （`MarkdownText` 的 `.markdown`）与 `b6TLMa_markdown`（`FileTypeIcon` 的 `.markdown`），
  正好是这条规则要命中的那一个、和要排除的那一个。
- `:not([class*="_icon"]):not(svg)` 两个排除项：文件类型图标组件也带 `markdown` 类
  （`.md` 图标在 0.2.2 里是 `_markdown_1wejo_28` + `_icon_1wejo_1`，在 0.2.3 里是
  `b6TLMa_markdown` + `b6TLMa_icon`，都挂在 `<svg>` 上），不排除的话屏外附件图标
  会占一个 320px 的坑。
- `contain-intrinsic-size: auto <size>` 给屏外子树一个占位高度；一旦某子树被渲染过，
  浏览器会记住它的真实高度。
- **就这一条。** v1.0.4 及更早还额外给每个块级公式（`.katex-display`，占位 90px）单独开了一层：
  公式的真实高度远大于占位，滚动时每次露出都会改动文档总高度，滚动锚定再把这些改动串成连锁反应，
  结果一拖动就卡死几十秒。v1.0.5 删掉了它。

## 安装

DSH 的「添加插件」接受三种输入：包名、GitHub 仓库地址、本地目录。粘贴仓库地址即可：

```
https://github.com/Light-EI/dsh-chat-perf-css
```

安装器把它识别成 **git 依赖**（不是压缩包），装的是 `main` 分支的最新提交，并记成
`github:Light-EI/dsh-chat-perf-css`。本仓库的规矩是：**插件代码只在发版时改动**——平时在 `dev` 上
开发，发版时把 `dev` 合并进 `main` 并打 tag。所以这条路装到的插件行为与最新正式版一致；`main` 上可能
夹着还没发版的文档改动（README、CI 之类），不影响插件行为。

要锁定版本时（排查问题、或在脚本里固定），在同一个地址后面加 `#` 片段即可：

| 写法 | 装到 |
|---|---|
| `https://github.com/Light-EI/dsh-chat-perf-css#semver:^1` | 所有 1.x tag 里最新的那个（现在解析到 `v1.0.12`），每次安装/升级重新选 |
| `https://github.com/Light-EI/dsh-chat-perf-css#v1.0.12` | 那个确切版本，不随发版移动 |

**不想装 `git`？** 用 Release 附带的预构建包，同样是"填进去就能装"，但走的是 HTTPS 下载而不是 git：

```
https://github.com/Light-EI/dsh-chat-perf-css/releases/latest/download/dsh-chat-perf-css.tgz
```

这个地址永远指向最新正式版（资产名固定，不随版本号变），也可以离线下载后用
`dsh plugin --profile <profile> add <本地路径>/dsh-chat-perf-css.tgz` 安装。

`github:Light-EI/dsh-chat-perf-css#…` 是等价的短写，命令行里两种都可以（`<profile>` 一般是 `desktop` 或 `web`）：

```
dsh plugin --profile <profile> add https://github.com/Light-EI/dsh-chat-perf-css
```

**装完即生效**，不需要再改任何配置 —— 安装器的动作单位是 bundle，会把 `dependencies` 与
`dsh.profile.bundles` 一起写好。

- 这种装法要求本机有 **`git`**（pnpm 靠它把 tag / commit 解析出来）。没有 git、或网络拉不动 git 时，
  用上面的预构建 `.tgz`，或 [Release](https://github.com/Light-EI/dsh-chat-perf-css/releases) 里的 zip
  走手动安装。
- DSH **0.2.1-rc.2 起各版本实测或核对通过**（最新为 0.2.3-alpha.2），见[兼容性](#兼容性)。插件只注入 CSS、不调用插件 API，版本差异通常只影响
  「命中的类名还在不在」。

### 装完怎么确认

在 DSH 窗口的开发者工具里执行（用的是插件那条完整选择器，不要只看第一个匹配元素）：

```js
const els = document.querySelectorAll('[data-chat-flow] :is([class*="_markdown_"], [class$="_markdown"], [class*="_markdown "]):not([class*="_icon"]):not(svg)');
`匹配 ${els.length} 个，生效 ${[...els].filter(e => getComputedStyle(e).contentVisibility === 'auto').length} 个`
```

- 「生效」数大于 0 即正常；
- 「匹配」是 0，说明前端类名又变了、规则没命中，页面只是没优化 —— 见 [兼容性](#兼容性)；
- 不要只看第一个匹配元素：第一个可能恰好是被规则排除的附件图标（`<svg>` 那个 `.md` 图标也带 `markdown` 类），会返回 `"visible"` 让你误以为没生效。

<details>
<summary>手动安装（离线、没有仓库权限，或不走插件管理器时用）</summary>

1. 解压 Release 里的 `dsh-chat-perf-css-v<版本>.zip`（例如 `…-v1.0.12.zip`），把 `dsh-chat-perf-css` 目录放进
   `<profile>\plugins\dsh-chat-perf-css\`。
2. 在该 profile 的 `package.json` 里：
   - `dependencies` 增加 `"dsh-chat-perf-css": "link:./plugins/dsh-chat-perf-css"`
   - `dsh.profile.bundles` 数组增加 `"dsh-chat-perf-css"`
3. 在 profile 目录跑一次 `pnpm install`（建立 `node_modules` 链接并更新 lockfile）。
4. 重开 DSH 窗口。

桌面端与浏览器端是同一个窗口生效，不需要第二种界面。

> 绕开安装器时这两步**必须都做**：只写 `dependencies` 会把包装上但不会被加载，页面没有任何变化。

</details>

## 升级

用仓库地址（不带 `#`）或 `#semver:^1` 装的：在插件管理器里对它执行一次更新就行（命令行等价：
`dsh plugin --profile <profile> update dsh-chat-perf-css`）——前者拿到 `main` 最新提交（插件代码与最新
正式版一致），后者重新解析当时最新的 1.x tag。

用 `#v1.0.12` 这类锁定写法装的，不会自己动 —— 要把安装地址里的 tag 换成新的再装一次。

手动安装的，重新解压覆盖 `plugins\dsh-chat-perf-css\` 目录即可。任何方式升级后重开窗口生效。
升级只替换插件文件，`dsh.profile.bundles` 里的登记不变。

## 卸载

在插件管理器里卸载即可。手动装的按反方向来：从 `dsh.profile.bundles` 去掉这项、从 `dependencies`
去掉这条，跑 `pnpm install`，再删掉 `plugins\dsh-chat-perf-css\` 目录。页面样式即时消失。

> 如果 DSH 官方已经提供虚拟滚动，本插件就该退场：在已经虚拟滚动的列表上再叠一层
> `contain-intrinsic-size` 占位，只会让滚动条长度更不准。

## 它不会做什么

- 宿主半边是空的：`export function apply() {}`，不注册服务、不注入依赖、不改配置。
- 不碰 KaTeX 输出：不改 `output` 选项，不动 MathML，也不给公式加任何 CSS 规则。
- 不碰模型 / 工具 / 凭据 / 系统提示词 / 会话日志 / 压缩逻辑。
- 无网络请求、无 localStorage、无事件监听、无定时器、无 MutationObserver。
- 零依赖：`dependencies` / `peerDependencies` 都不声明；CSS 在运行时由插件自己拼出来，Cordis 由 DSH 自身提供。

## 已知副作用（纯外观，滚动即自愈）

| 现象 | 说明 |
|---|---|
| 滚动条长度是估算值 | 屏外部分用固定占位高度估计（消息体 320px），渲染过之后会记住真实高度。短消息会偏长、长代码块会偏短，滚过一遍即收敛 |
| 滚到未渲染区可能轻微跳动 | 该区域首次进入视口才真正渲染 |
| 会话内搜索跳转先落到估算位置 | 「跳到某条消息」依赖 `scrollIntoView`，命中占位高度，渲染后位置会被校正 |
| 把整页渲染成图或 PDF 的工具可能漏掉屏外内容 | 打印 / 长截图 / 导出类工具沿用视口判断。CSSWG 2024-06 已裁定「打印时按可见处理」，但各引擎跟进时间不一 |
| toast 位置可能轻微偏移 | toast 用锚元素 `getBoundingClientRect()` 定位，锚点在屏外时取到占位矩形 |
| 浏览器 Ctrl+F 能搜到，但首次搜索可能卡一下 | 命中后会被强制渲染，定位可能需要再滚动校正一次。DSH 桌面版没有页内查找，不受影响 |

浮层不会被裁剪：消息正文容器没有 `position:absolute/fixed/sticky`，菜单、tooltip、
图片查看器都 portal 到 `document.body`。

## 兼容性

| 维度 | 说明 |
|---|---|
| DSH 版本 | **0.2.1-rc.2 / rc.3 / rc.5** 实测通过（2026-10-22 / 10-24 / 11-01）；**0.2.2-rc.1、rc.2、rc.3、rc.4、rc.5 已适配**（2026-11-05 / 11-11 / 11-13 / 11-17 / 11-18，接口核对）；**0.2.3-alpha.1 已适配**（2026-11-22，源码级核对；v1.0.11 的适配判断有误，v1.0.12 修正）；**0.2.3-alpha.2 已适配**（2026-11-23，产物级核对，只改了 Node 版本要求）。rc.1 的 Go 高亮卡死修复与「折叠后只保留最后一条回答」开关、rc.2 的 markdown fence 包裹层与「向上加载更早消息」、rc.3 新增的「DeepSeek 会话导入」实验插件，都不与本插件冲突。rc.4 是纯修复版：源码只动了 `experimental/liveshare` 的桌面端分享、`llm` 与 `llm-deepseek` 的异常响应处理三个文件。rc.5 只动搜索链路：8 个源码文件全在 `web`、`web-search-deepseek`、`tool-web` 与「网络搜索」设置卡里，作用是让 DeepSeek 模型改用服务端搜索（不按次计费）。**0.2.3-alpha.1 是跨小版本升级**：Cordis 同步到 4.0.0-rc.12、会话状态迁到新包、大量插件 API 有迁移要求。对本插件有两处真实影响：① **CSS-module 类名换了形态**——`ui-primitives` 的样式从 Web 外壳的 CSS 文件搬到 module 元数据、改由 renderer 在挂载时安装，哈希也从 Vite 换成了 lightningcss 的 `[hash]_[local]`，类名由 `_<local>_<hash>` 变成 `<hash>_<local>`（官方升级指南 `client-module-metadata` 明确写了这件事，并建议插件不要匹配生成类名）；v1.0.12 起两种形态都匹配。② **模块系统不再清扫 `style[data-plugin]` 标签**（`removeOwnedStyles` 已移除，框架只安装模块自带元数据声明的样式、且从不扫描 DOM），所以插件自己管好标签：带自己的身份标记、`apply` 时先清旧副本。其余照旧：`MarkdownText` 的 `clsx(css.markdown, …)`、`ChatFlow` 的 `entries.map`、`window.__ModuleLoader__.load({id, factory})`、`ctx.effect` 都在；`content-visibility`/`contain-intrinsic` 全仓仍为 0 处、`useVirtualizer` 位置不变、消息列表仍无虚拟化。**0.2.3-alpha.2 只改了 Node 版本下限**（`engines.node` 变为 `^24.22.3 \|\| >=26.13.1`，内置 undici 的安全修复版本）：与 alpha.1 相比，10 个契约文件逐字节相同，全仓代码文件只有 11 个变化，落在 `packages/` 里的 3 个还都是注释——没有客户端 DOM/CSS 契约变化，插件不需要改；这条要求只影响用源码或 npm 跑 Host 的人，插件的 Host 半边是空函数、不碰 Node API。`package.json` 里 `engines.dsh` 声明为 `>=0.2.1-rc.2`：DSH 用 `semver.satisfies(…, { includePrerelease: true })` 校验，所以预发布版（含 `0.2.3-alpha.2`）都满足；用默认 semver 语义的第三方工具会认为不满足，这是 DSH 自己的放宽规则。`immediately: true` 让这个包在启动第一批发包里预取——它只有几 KB，但换来样式在首屏渲染前就位，避免长会话先按原高度排版再回流。 |
| 会静默失效的地方 | 命中依赖前端 CSS-module 类名（消息正文容器的本地名 `markdown`）。DSH 前端一旦改名、改结构、或再换一次构建管线，规则就会**静默失效**：页面一切正常，只是没有优化。0.2.3 就换过一次形态，v1.0.11 因此完全没命中。前端的根节点上没有可长期依赖的稳定属性（`data-markdown-variant` 只在紧凑变体上出现），所以只能匹配类名。用上面「装完怎么确认」那条命令可以分清是「没生效」还是「没效果」 |
| 浏览器 | 需要 Chromium 85+（`content-visibility`）。Electron 与新版 Chrome/Edge 均满足 |
| Firefox / Safari | Firefox 125+、Safari 18+ 起支持（Safari 17.6 及更早不支持）。老版本浏览器会忽略这条规则 —— 退化为「没有优化」，不会出错 |

## 反馈

用着不对、或者某处没生效，直接开 [Issue](https://github.com/Light-EI/dsh-chat-perf-css/issues) 就行。报「没生效」时请一并给出：DSH 版本，以及「装完怎么确认」那条命令的输出（匹配数 / 生效数）。

## 许可

MIT，见 [LICENSE](LICENSE)。
