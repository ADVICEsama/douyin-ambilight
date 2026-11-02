# 抖音环境光 · Douyin Ambilight

为 **抖音网页版** 视频添加随画面变化的柔和环境光，让视频、评论区、导航和顶栏的背景自然衔接。

**MIT 开源 · 本地渲染 · 非官方 · 当前测试版 0.5.4**

> 灵感与功能分类参考 **Wessel Kroos** 的 [youtube-ambilight](https://github.com/WesselKroos/youtube-ambilight)，站点适配参考 **iceorange-dev** 的 [bilibili-ambilight](https://github.com/iceorange-dev/bilibili-ambilight)。感谢两位作者及上游贡献者。本项目是面向抖音的独立轻量实现，**不是原版完整引擎移植，也不代表上游作者或抖音官方**。详见[参考与致谢](#参考与致谢)和[功能对照](功能对照.md)。

[下载](#下载) · [安装与更新](#安装与更新) · [设置](#设置) · [已知限制](#已知限制) · [开发](#开发与测试) · [反馈问题](#反馈问题)

## 功能

- **动态环境光**：三层背景投影、扩散与柔化、四向发光、色彩滤镜和帧混合。
- **视频阴影**：近边接触阴影 + 外围柔影，按实际画面边界定位，横屏与竖屏分别适配。
- **页面融合**：处理识别到的网页底板、左导航、顶栏/搜索、评论面板、标签栏、控制条和输入区背景；保留原有布局、文字、头像、按钮及选中项。
- **原生背景处理**：可隐藏识别到的抖音原生模糊背景及其黑色承托层，避免两套光效叠加。
- **黑边处理**：区分 CSS 播放器留白与视频编码黑边；支持自动/手动四边裁剪、均匀彩色边检测及可选放大填满。
- **性能与控制**：Canvas2D / WebGL2 取样、12/24/30/60 FPS、四套预设、11 类设置、快捷键、本地保存及 JSON 导入/导出。
- **隐私**：不录制、不上传画面，不包含统计或错误上报 SDK。参见[隐私说明](PRIVACY.md)。

### 效果预览

下图是用本地生成视频和模拟 DOM 布局制作的回归预览，**不是抖音实拍，也不是对真实用户截图进行编辑**。

![评论区、顶栏、输入区与视频共享环境光；本地模拟预览](docs/assets/comments-local.png)

[搜索弹层预览](docs/assets/search-modal-local.png) · [更多区域预览](docs/assets/regions-local.png) · [独立底板与阴影预览](docs/assets/occlusion-local.png)

## 0.5.4：搜索视频弹层隔离

搜索结果页打开视频时，结果卡片仍挂载在底下。旧版把视频弹层的祖先背景清空，却把环境光留在页面最底层，导致旧搜索卡片、缩略图和文字透出来。

- 视频弹层使用**独立的不透明底板和局部投影层**；当前视频、评论、阴影和控制条在同一层级合成，不把搜索结果当背景。
- 页面融合限制在当前视频弹层里；不改底层搜索页、导航、搜索框及其他对话框。普通搜索预览不启动全页透明化。
- 处理弹层打开/关闭、重新挂载、原生 dialog、常见平移/缩放及窗口尺寸变化；关闭插件时恢复网站样式。
- 修复 GitHub Actions 中错误使用 job-level `runner.temp` 的配置。此前推送产生的是工作流校验失败通知，**不是浏览器商店审核邮件，也不是已执行测试失败**。工作流仍只配置手动触发；没有替用户修改账号通知设置或删除失败记录。
- 搜索弹层已完成本地复现、新旧包像素对照和回归；独立未登录的真实搜索页面遇到验证码，**尚未完成该真实路由验收**，未操作个人浏览器/鼠标键盘。

## 0.5.3：超宽黑边

横画面嵌在高画布里时，上下编码黑边可能各占 35% 以上。旧版默认只扫描单边 25%，界面最高 35%；达到上限后又返回 0，导致误报“未检测到”。

- 默认单边上限扩至 **45%**，手动四边也支持各 45%，始终至少保留 10% 的宽/高。
- 达到上限、暗场、边缘亮字/水印干扰和不对称拒绝分开提示；不会把“范围不足”当作“没有黑边”。
- 新诊断同时显示视频源尺寸、取样画布、配置上限与 CSS 几何留白，便于区分播放器留白和编码黑边。
- 第一次升级会在本地备份旧设置；仅旧默认 25% 自动迁移到 45%，其他自定义上限保持不变。已经手动选过较低上限时，请按诊断自行调整。
- 已在独立未登录会话对公开详情页的视频源 `1080×2114` 验证：上下编码黑边各约 **35.5%**，新包检测并应用裁剪；不等于在用户个人 Zen 重新安装或验证全部视频。

移除黑边不等于自动放大主体；如需要，可手动开启“放大填满裁边后的空间”，注意可能裁掉两侧内容。字幕出现在黑边内时仍采用保守边界，不保证自动移除所有含字黑边。

## 下载

从 [v0.5.4 Release](https://github.com/ADVICEsama/douyin-ambilight/releases/tag/v0.5.4) 下载。**0.5.4 修复搜索弹层背景穿透，并修正 Actions 配置**，包含 0.5.3 的超宽黑边修复，保留 0.5.1 的评论区融合修复与 0.5.2 的开源署名/文档；目前不在扩展商店发布。

| 使用方式 | 文件 |
|---|---|
| Chrome / Edge | [Chrome ZIP](https://github.com/ADVICEsama/douyin-ambilight/releases/download/v0.5.4/douyin-ambilight-0.5.4-chrome.zip) |
| Firefox / Zen 开发测试 | [未签名 XPI](https://github.com/ADVICEsama/douyin-ambilight/releases/download/v0.5.4/douyin-ambilight-0.5.4-firefox-unsigned.xpi) |
| 脚本管理器 | [用户脚本 .user.js](https://github.com/ADVICEsama/douyin-ambilight/releases/download/v0.5.4/douyin-ambilight-0.5.4.user.js) |
| 源码 | [源码 ZIP](https://github.com/ADVICEsama/douyin-ambilight/releases/download/v0.5.4/douyin-ambilight-0.5.4-source.zip) |
| 完整性核对 | [SHA256](https://github.com/ADVICEsama/douyin-ambilight/releases/download/v0.5.4/SHA256-0.5.4.txt) |

源码、许可证及发布包公开可读；使用插件本身不需要 GitHub 登录。项目没有配置自动更新地址，需要手动更新。

## 安装与更新

**扩展版和脚本版二选一，不要同时启用两份。更新后刷新抖音，避免旧页面保留上一版注入的图层。**

### Chrome / Edge

1. 下载并解压 Chrome ZIP 到固定目录。
2. 打开 `chrome://extensions` 或 `edge://extensions`，启用开发者模式。
3. 选择“加载已解压的扩展”，选中包含 `manifest.json` 的目录。
4. 打开或刷新抖音，点击右下角“环境光”进入设置。

更新时替换原目录中的文件，在扩展页点“重新加载”，再刷新抖音。不要删除已加载的目录。

### Firefox / Zen

发布的 XPI **未经过 Mozilla 签名，仅供开发测试**。Firefox 正式版和 Beta 安装扩展需要 Mozilla 签名；不要把这里的 XPI 当成已签名商店版。参见 [Mozilla 官方签名说明](https://extensionworkshop.com/documentation/publish/signing-and-distribution-overview/)。

- 临时测试：打开 `about:debugging#/runtime/this-firefox` → “临时载入附加组件”，选择 XPI 或解压后的清单。临时加载在浏览器重启后失效。
- Zen 是否允许从文件安装，取决于其发行版及现有签名策略；若浏览器允许，可在附加组件管理器的齿轮菜单选择“从文件安装附加组件”。被拒绝时使用脚本版或等待签名版，**本项目不要求关闭签名保护**。
- 更新已有扩展时尽量保持原扩展 ID 和配置；不要先删除扩展，以免丢失本地设置。

本项目没有自动修改浏览器安全、签名或隐私窗口设置；也不保证任何发行版都能持久安装此未签名包。

### 用户脚本

1. 从官方扩展商店安装 Tampermonkey / Violentmonkey。
2. 在脚本管理器中新建脚本，用下载的 `.user.js` **全部内容**替换模板并保存。
3. 刷新抖音，确认管理器中只启用一份“抖音环境光”。

更新时编辑原脚本、全选替换并保存，不要另建第二份。设置保存在脚本管理器自己的本地存储中，和扩展版不自动互通。脚本管理器的权限与更新行为由它独立管理。

## 设置

默认快捷键：`Alt + Shift + A` 开关环境光，`Alt + Shift + L` 打开设置。在输入框中输入时不会触发这些快捷键；可在“基本设置”修改。

菜单含 **11 类、86 个持久用户设置及预设**，另有布局与检测两个内部迁移字段。四套预设为均衡、影院、鲜艳、省电。

| 分类 | 主要选项 |
|---|---|
| 设置 | 总开关、隐藏原生背景、预设、FPS/帧间隔/取样分辨率/黑边统计 |
| 质量与性能 | Canvas2D / WebGL2、取样分辨率、帧率上限、排程方式、优先页面载入 |
| 顶栏 | 阴影、图片透明度、背景不透明度 |
| 页面内容 | 文字/区块阴影、图片/背景不透明度、页面底色、周围压暗、滚动条 |
| 视频 | 普通/网页全屏/浏览器全屏缩放、视频阴影 |
| 移除黑边与彩色边 | 几何留白、上下/左右检测、阈值、稳定样本、手动四边、裁剪原画、可选填满 |
| 滤镜 | 亮度、对比度、饱和度、色相，以及作用于环境光/原画/两者 |
| 环境光 | 强度、模糊、扩散、延展、淡出、静态抖动、淡入、闪烁抑制、帧混合、混合方式、四向开关 |
| 沉浸 | 网页底板、导航、顶栏/搜索、评论/信息、播放器控制条、输入区融合 |
| 显示模式 | 普通、网页全屏、浏览器全屏分别启用；暂停时保留或隐藏 |
| 基本设置 | 面板主题、悬浮按钮、快捷键、恢复默认、设置 JSON 导入/导出 |

关闭插件会恢复本实例修改的样式，不修改系统字体，也不覆盖视频原有 `transform`。首次迁移 0.1/0.2 旧设置时，会在本地保留迁移前副本；详情见[隐私说明](PRIVACY.md)。

## 已知限制

- **站点范围**：仅 `https://www.douyin.com/*`、`https://douyin.com/*`。不支持抖音 App、客户端、TikTok、独立直播子域、跨域 iframe、图集、DRM 或自绘 canvas/WebCodecs 播放器。
- **适配不是全站保证**：抖音布局可能变化。设置底部显示区域计数与背景处理层数；计数为 0 代表尚未识别，计数大于 0 也不能替代视觉确认。浏览器自己的标签侧栏、书签栏和标题栏不属于网页，不会被本插件修改。
- **两类“黑边”不同**：CSS `object-fit: contain` 的留白通过几何处理；编码进视频的黑边需要读取像素。跨域像素受限时自动检测会停止并明确提示，手动裁边仍可使用。不会更改 crossOrigin、重请求视频或绕过 DRM。
- **裁剪有风险**：字幕或画面可能被裁掉；默认不自动放大填满。彩色边检测只识别连续均匀边框，不是 AI 主体识别。
- **渲染边界**：WebGL2 受跨域或显卡限制时明确回退 Canvas2D；不保证更省电。大模糊和高帧率可能增加 GPU 负载；亮场过亮时可降低光线强度/亮度或增加文字阴影。
- **全屏与画中画**：支持包含视频的容器全屏；原生 video 元素全屏与系统画中画窗口无法注入环境光。
- **与原作的差异**：不包含原作完整投影/视频覆盖同步引擎、HDR 专用处理、VR、多语言和驱动问题修复。详见[功能对照](功能对照.md)。

## 隐私与权限

扩展仅使用 `storage` 和上述两个抖音域名的内容脚本匹配，不声明 Cookie、历史、录屏或全站权限。画面、像素和 WebGL 纹理仅在本机内存/图形上下文使用；不录制、不导出、不上传，也不包含分析 SDK。仅当主动导出设置时才生成 JSON 文件。

[完整隐私说明](PRIVACY.md) · [MIT 许可证](LICENSE) · [第三方声明](THIRD_PARTY_NOTICES.md)

## 开发与测试

需要 Node.js 22+。以下操作只使用项目测试 profile，不读取个人浏览器配置。

```sh
git clone https://github.com/ADVICEsama/douyin-ambilight.git
cd douyin-ambilight
npm ci --ignore-scripts
npx playwright install chromium
npm test
npm run build
```

浏览器测试先设置 `DA_CHROMIUM`。PowerShell：

```powershell
$env:DA_CHROMIUM = node -e "process.stdout.write(require('playwright').chromium.executablePath())"
```

Bash / Linux / macOS：

```sh
export DA_CHROMIUM="$(node -e "process.stdout.write(require('playwright').chromium.executablePath())")"
```

然后运行：

```sh
npm run test:browser
npm run test:advanced
npm run test:reference
npm run test:spatial
npm run test:regions
npm run test:occlusion
npm run test:comments
npm run test:wide-bars
npm run test:search
node scripts/verify.mjs
npx web-ext lint --source-dir ../../outputs/douyin-ambilight/firefox
```

默认输出到仓库的 `../../outputs`；可用 `DA_OUTPUT` 覆盖，验证和测试沿用同一变量。手动 CI 见 [.github/workflows/check.yml](.github/workflows/check.yml)，仅配置 `workflow_dispatch`；有效配置不会因普通推送跑测试，但无效配置仍可能在推送时产生校验失败通知。提交工作流不等于远程运行通过。

本地通过 **24 项单元测试 + 94 项浏览器检查**（81 项原回归、12 项搜索弹层检查、1 项有旧包时执行的像素对照；干净构建为 93 项浏览器检查）。0.5.1 曾在一套 Zen 环境更新 XPI、刷新并打开真实评论区，确认面板、标签栏和输入区融合；这不等于所有路线、真实横竖屏切换、浏览器重启、GM 管理器或显卡组合都经过实测。0.5.3 另在独立未登录会话验证超宽编码黑边；验证范围及已知测试波动见[验证报告](验证报告.md)。

## 反馈问题

欢迎提交 [Issue](https://github.com/ADVICEsama/douyin-ambilight/issues) 或 Pull Request。请附上：插件/浏览器版本、抖音页面类型、最小复现步骤、相关设置，以及设置面板底部诊断。截图请先遮盖昵称、头像、搜索内容等个人信息；**不要提交 Cookie、Token、账号资料或私信**。

源码位于 `src/`，构建位于 `scripts/`，回归位于 `tests/`。修改后请运行相关检查，不要只提交压缩产物；遇到无法读取像素或未支持的布局，请明确降级，不要把“检测不到”报告为成功。

## 参考与致谢

| 项目 | 作者 | 本项目参考范围 | 上游许可 |
|---|---|---|---|
| [Ambient light for YouTube](https://github.com/WesselKroos/youtube-ambilight) | **Wessel Kroos** | 环境光思路、设置分类与体验；[参考提交](https://github.com/WesselKroos/youtube-ambilight/tree/18d17188e5562e5ee913f005192d30c9a60be078) | [MIT](https://github.com/WesselKroos/youtube-ambilight/blob/18d17188e5562e5ee913f005192d30c9a60be078/LICENSE) |
| [Bilibili Ambilight](https://github.com/iceorange-dev/bilibili-ambilight) | **iceorange-dev**、上游 Wessel Kroos | 中文功能分类与视频站点适配参考；[参考提交](https://github.com/iceorange-dev/bilibili-ambilight/tree/41e122c1741f9e2caf3eeedf9a1fae991bc8aacc) | [MIT](https://github.com/iceorange-dev/bilibili-ambilight/blob/41e122c1741f9e2caf3eeedf9a1fae991bc8aacc/LICENSE) |
| [xgplayer DynamicBg](https://github.com/bytedance/xgplayer/tree/main/packages/xgplayer/src/plugins/dynamicBg) | ByteDance / xgplayer contributors | 原生播放器背景标记与结构 | [上游许可证](https://github.com/bytedance/xgplayer/blob/main/LICENSE) |

上游版权与许可声明保留于 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。本项目维护者为 [ADVICEsama](https://github.com/ADVICEsama)，本项目代码采用 **MIT License**，见 [LICENSE](LICENSE)。
