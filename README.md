# Trying On｜试装（正在进行时）

Trying On 是一个 Windows 桌面版服装电商出图工具，面向淘宝、天猫、京东、拼多多、抖音、小红书等平台的商品图生成流程。

它的目标是让服装商家用尽量简单的方式完成出图：上传商品图，选择平台和模板，确认生成，然后检查并下载成品。

## 推荐下载：解压后直接运行

如果你想下载后直接双击 exe，请下载 Release 包：

<https://github.com/kira987654321/trying-on/releases/download/v0.1.0/trying-on-0.1.0-win-x64.zip>

下载后：

1. 解压 `trying-on-0.1.0-win-x64.zip`
2. 进入 `时装ing-win-x64`
3. 双击运行 `时装ing.exe`

这是最简单的使用方式，不需要恢复脚本。

## 为什么 Code -> Download ZIP 不能直接双击 exe？

GitHub 右上角绿色 `Code` 里的 `Download ZIP` 下载的是“仓库源码压缩包”，不是专门的软件安装包。

这个源码压缩包有一个限制：GitHub 普通仓库不适合直接存放超过 100MB 的单个文件，而本项目的启动程序 `时装ing.exe` 大约 210MB。

所以仓库里的 `Code -> Download ZIP` 版本采用了分包方式：

- `exe-parts/TryingOn.exe.part001`
- `exe-parts/TryingOn.exe.part002`
- `exe-parts/TryingOn.exe.part003`
- `restore-exe.bat`

`restore-exe.bat` 不是另一个软件，它只是一个恢复脚本，用来把三个分包重新合成真正的启动程序 `TryingOn.exe`。

## 如果你一定要点 Code -> Download ZIP

也可以使用红圈里的 `Code -> Download ZIP`，但下载后要多一步：

1. 点击绿色 `Code`
2. 点击 `Download ZIP`
3. 解压下载到的仓库 ZIP
4. 进入 `时装ing-win-x64`
5. 双击 `restore-exe.bat`
6. 等它生成 `TryingOn.exe`
7. 双击 `TryingOn.exe` 运行

恢复脚本已经本地验证过，生成的 `TryingOn.exe` 和原始 `时装ing.exe` 文件内容一致。

## 主要能力

- 支持服装商品图上传和素材复用
- 支持多平台模板方向
- 支持男装、女装模板体系
- 支持批量生成任务
- 支持本地结果历史
- 支持单张下载和批量导出
- 支持 Windows 桌面端运行

## 文件说明

- `时装ing-win-x64/`：Windows x64 桌面版程序文件夹
- `时装ing-win-x64/restore-exe.bat`：仅用于 `Code -> Download ZIP` 方式下载后的 exe 恢复
- `时装ing-win-x64/exe-parts/`：启动程序分包
- `时装ing-win-x64/TryingOn.exe`：运行恢复脚本后生成的启动程序

## 推荐给用户的下载方式

普通用户建议始终下载 Release 包：

<https://github.com/kira987654321/trying-on/releases/tag/v0.1.0>

这样可以解压后直接运行，不需要理解 GitHub 仓库源码 ZIP 的限制。
