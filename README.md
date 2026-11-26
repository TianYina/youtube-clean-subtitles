# YouTube 清爽版：去广告 + 原生字幕美化

一个独立的 Tampermonkey 用户脚本：移除 YouTube 页面和视频广告，并直接修改 YouTube **原生 CC 字幕**的样式。

> 这个项目只处理网页内的原生字幕，不包含桌面置顶字幕或桌面歌词功能。

## 功能

### 去广告

- 隐藏首页、搜索页、播放页的信息流广告和横幅广告。
- 自动处理播放器广告：静音、点击跳过、推进广告进度。
- 关闭 Premium 推广弹窗和反广告拦截遮罩。
- 广告结束后恢复原来的静音状态。

### 原生字幕美化

直接修改 YouTube 自己的字幕元素，不额外创建覆盖层：

- 去掉字幕的黑色半透明背景、边框和阴影。
- 使用微软雅黑粗体。
- 白色文字配八方向黑色描边，亮色画面也能看清。
- 保留 YouTube 自己的字幕时间轴、换行、位置和全屏行为。
- 样式设置自动保存在浏览器中。

## 安装

1. 在浏览器安装 [Tampermonkey](https://www.tampermonkey.net/)。
2. 打开脚本文件：
   [youtube-clean-subtitles.user.js](https://raw.githubusercontent.com/TianYina/youtube-clean-subtitles/main/youtube-clean-subtitles.user.js)
3. Tampermonkey 识别到 `.user.js` 后会打开安装页，点击“安装”。
4. 如果浏览器只显示源码，就新建一个 Tampermonkey 脚本，把源码完整粘贴进去并保存。
5. 刷新 YouTube 页面。

## 使用方法

### 字幕

1. 打开任意 YouTube 视频。
2. 点击播放器里的 **CC** 按钮，开启原生字幕。
3. 字幕会自动使用透明描边样式。

脚本不会生成字幕，视频本身必须提供 CC 字幕或自动字幕。

### 快捷键

| 快捷键 | 功能 |
| --- | --- |
| `Alt + C` | 循环切换字幕颜色 |
| `Alt + [` | 减小字幕字号 |
| `Alt + ]` | 增大字幕字号 |
| `Alt + 0` | 恢复默认白色和 42px 字号 |

### 去广告

安装并启用脚本后自动生效，不需要额外操作。如果页面已经打开，刷新一次 YouTube。

## 注意事项

- 只支持 YouTube 网页版，不能修改其他播放器或本地视频。
- YouTube 更新页面结构后，去广告选择器可能需要维护。
- 去广告功能可能影响视频播放；遇到异常时，可先在 Tampermonkey 中临时关闭脚本并刷新页面。
- 本项目不绕过账号、付费或地区限制。

## 文件说明

- `youtube-clean-subtitles.user.js`：可直接安装的 Tampermonkey 脚本。
- `LICENSE`：MIT 许可证及原作者归属。

## 来源与许可

去广告部分的思路和选择器基于：

- [iamfugui/youtube-adb](https://github.com/iamfugui/youtube-adb)（MIT License，作者 iamfugui）

本项目对其进行了重写、整理，并加入原生字幕样式功能。原作者的 MIT 许可和版权归属保留在源码及 `LICENSE` 中。

修改与维护：TianYina，2026。
