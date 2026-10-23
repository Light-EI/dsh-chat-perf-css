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
> 安装器会把它记成 `github:Light-EI/dsh-chat-perf-css`，也就是 `main` 的最新代码。**本仓库的分支模型
> 保证 `main` 的代码永远等于最新正式版**（开发都在 `dev` 上做，发版时才合并进 `main`），
> 所以这条路装到的就是最新版。需要锁定某个版本，见[安装](#安装)里的两种写法。

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

DSH 的「添加插件」接受三种输入：包名、GitHub 仓库地址、本地目录。粘贴仓库地址即可：

```
https://github.com/Light-EI/dsh-chat-perf-css
```

安装器把它识别成 **git 依赖**（不是压缩包），装的是 `main` 分支的最新提交，并记成
`github:Light-EI/dsh-chat-perf-css`。本仓库的分支模型是：**开发在 `dev` 上进行，只有发版时才把 `dev`
合并进 `main` 并打 tag**。因此 `main` 的代码始终等于最新正式版；`main` 上可能比最新 Release 多几个
纯文档提交，不影响行为。

要锁定版本时（排查问题、或在脚本里固定），在同一个地址后面加 `#` 片段即可：

| 写法 | 装到 |
|---|---|
| `https://github.com/Light-EI/dsh-chat-perf-css#semver:^1` | 所有 1.x tag 里最新的那个（现在解析到 `v1.0.3`），每次安装/升级重新选 |
| `https://github.com/Light-EI/dsh-chat-perf-css#v1.0.3` | 那个确切版本，不随发版移动 |

`github:Light-EI/dsh-chat-perf-css#…` 是等价的短写，命令行里两种都可以（`<profile>` 一般是 `desktop` 或 `web`）：

```
dsh plugin --profile <profile> add https://github.com/Light-EI/dsh-chat-perf-css
```

**装完即生效**，不需要再改任何配置 —— 安装器的动作单位是 bundle，会把 `dependencies` 与
`dsh.profile.bundles` 一起写好。

- 这种装法要求本机有 **`git`**（pnpm 靠它把 tag / commit 解析出来）。没有 git、或网络拉不动 git 时，
  用 [Release](https://github.com/Light-EI/dsh-chat-perf-css/releases) 里的 zip 走下面的手动安装。
- DSH **0.2.1-rc.2** 上实测通过。插件只注入 CSS、不调用插件 API，版本差异通常只影响
  「命中的类名还在不在」（见 [兼容性](#兼容性)）。

### 装完怎么确认

在 DSH 窗口的开发者工具里执行（用的是插件那条完整选择器，不要只看第一个匹配元素）：

```js
const els = document.querySelectorAll('[class*="_markdown_"]:not([class*="_icon_"]):not(svg)');
`匹配 ${els.length} 个，生效 ${[...els].filter(e => getComputedStyle(e).contentVisibility === 'auto').length} 个`
```

- 「生效」数大于 0 即正常；
- 「匹配」是 0，说明前端类名变了、规则没命中，页面只是没优化 —— 见 [兼容性](#兼容性)；
- 不要用 `document.querySelector('[class*="_markdown_"]')` 只看第一个：第一个可能恰好是被规则排除的附件图标（`<svg>` 那个 `.md` 图标也带 `_markdown_` 类），会返回 `"visible"` 让你误以为没生效。

<details>
<summary>手动安装（离线、没有仓库权限，或不走插件管理器时用）</summary>

1. 解压 Release 里的 `dsh-chat-perf-css-v<版本>.zip`（例如 `…-v1.0.3.zip`），把 `dsh-chat-perf-css` 目录放进
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
`dsh plugin --profile <profile> update dsh-chat-perf-css`）——前者拿到 `main` 最新提交（只在发版时前进，
所以等于最新正式版），后者重新解析当时最新的 1.x tag。

用 `#v1.0.3` 这类锁定写法装的，不会自己动 —— 要把安装地址里的 tag 换成新的再装一次。

手动安装的，重新解压覆盖 `plugins\dsh-chat-perf-css\` 目录即可。任何方式升级后重开窗口生效。
升级只替换插件文件，`dsh.profile.bundles` 里的登记不变。

## 卸载

在插件管理器里卸载即可。手动装的按反方向来：从 `dsh.profile.bundles` 去掉这项、从 `dependencies`
去掉这条，跑 `pnpm install`，再删掉 `plugins\dsh-chat-perf-css\` 目录。页面样式即时消失。

> 如果 DSH 官方已经提供虚拟滚动，本插件就该退场：在已经虚拟滚动的列表上再叠一层
> `contain-intrinsic-size` 占位，只会让滚动条长度更不准。

## 它不会做什么

- 宿主半边是空的：`export function apply() {}`，不注册服务、不注入依赖、不改配置。
- 不碰 KaTeX 输出：不改 `output` 选项，不动 MathML，只是给 `.katex-display` 加一条 CSS。
- 不碰模型 / 工具 / 凭据 / 系统提示词 / 会话日志 / 压缩逻辑。
- 无网络请求、无 localStorage、无事件监听、无定时器、无 MutationObserver。
- 零依赖：`dependencies` / `peerDependencies` 都不声明；CSS 在运行时由插件自己拼出来，Cordis 由 DSH 自身提供。

## 已知副作用（纯外观，滚动即自愈）

| 现象 | 说明 |
|---|---|
| 滚动条长度是估算值 | 屏外部分用固定占位高度估计（消息体 320px、块级公式 90px），渲染过之后会记住真实高度。短消息会偏长、长代码块会偏短，滚过一遍即收敛 |
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
| DSH 版本 | 在 DSH **0.2.1-rc.2** 上实测通过。`package.json` 里 `engines.dsh` 声明为 `>=0.2.1-rc.2`，低于此版本的安装器会直接拒绝安装/激活——省得出现「装上了但页面没变化」。插件只注入 CSS、不调用插件 API，一般不受版本影响 |
| 会静默失效的地方 | 命中依赖前端 CSS-module 类名 `_markdown_<hash>_<line>`。DSH 前端一旦改名或改结构，规则会**静默失效**：页面一切正常，只是没有优化。用上面「装完怎么确认」那条命令可以分清是「没生效」还是「没效果」 |
| 浏览器 | 需要 Chromium 85+（`content-visibility`）。Electron 与新版 Chrome/Edge 均满足 |
| Firefox / Safari | Firefox 支持较晚，Safari 17.4+ 起支持。老版本浏览器会忽略这两条规则 —— 退化为「没有优化」，不会出错 |

## 反馈

用着不对、或者某处没生效，直接开 [Issue](https://github.com/Light-EI/dsh-chat-perf-css/issues) 就行。报「没生效」时请一并给出：DSH 版本，以及「装完怎么确认」那条命令的输出（匹配数 / 生效数）。

## 许可

MIT，见 [LICENSE](LICENSE)。
