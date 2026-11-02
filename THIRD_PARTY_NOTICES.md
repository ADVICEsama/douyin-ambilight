# 参考项目、致谢与第三方声明

本项目为抖音网页版的独立轻量实现，参考下列开源项目的环境光思路、功能分类与交互组织；并非 YouTube/Bilibili 原版引擎的完整移植，不代表上游作者或抖音官方。请同时尊重上游项目各自的许可证。

## 原作：Ambient light for YouTube

- 作者：Wessel Kroos（GitHub：WesselKroos）。
- 项目：https://github.com/WesselKroos/youtube-ambilight
- 参考提交：https://github.com/WesselKroos/youtube-ambilight/tree/18d17188e5562e5ee913f005192d30c9a60be078
- 许可证：MIT。感谢其环境光功能、设置分类和使用体验所提供的参考。
- 以下保留所参考版本的 MIT 版权与许可声明，作为明确署名与授权记录；不表示本项目拥有原作商标或官方关联。

```text
MIT License

Copyright (c) 2017 Wessel Kroos

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Bilibili 适配参考：bilibili-ambilight

- 作者：iceorange-dev（Bilibili port）；上游原作作者 Wessel Kroos。
- 项目：https://github.com/iceorange-dev/bilibili-ambilight
- 参考提交：https://github.com/iceorange-dev/bilibili-ambilight/tree/41e122c1741f9e2caf3eeedf9a1fae991bc8aacc
- 许可证：MIT。感谢其中文分类组织与视频站点适配示例。

```text
MIT License

Copyright (c) 2017 Wessel Kroos
Copyright (c) 2026 iceorange-dev (Bilibili port)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## 播放器标记参考

- ByteDance xgplayer：https://github.com/bytedance/xgplayer
- DynamicBg 插件：https://github.com/bytedance/xgplayer/tree/main/packages/xgplayer/src/plugins/dynamicBg
- 上游许可证：https://github.com/bytedance/xgplayer/blob/main/LICENSE
- 仅参考播放器原生背景层标记与结构，不将 xgplayer 引擎作为本插件的打包运行时依赖。

## 开发依赖

fflate、pngjs 用于本地构建/图标，Playwright 和 web-ext 用于测试与检查。它们的版本记录在 package-lock.json，许可证仍以各依赖包自带声明为准。扩展和用户脚本不打包 node_modules，也不加载这些开发工具到抖音页面。

本项目自身的授权见 [LICENSE](LICENSE)。未来若直接引入第三方代码或素材，应保留对应版权与许可，并在此说明来源及使用位置。
