# Trying On 0.1.2｜模板候选审计与发布流程整理

更新日期：2026-06-15

这是 `Trying On / 时装ing` 的 v0.1.2 更新。本次发布不覆盖 v0.1.1，重点是把后续新增模板前的候选审计流程补齐，并修正 Windows 打包版本号跟随项目版本的问题。

## 下载方式

普通用户请下载本 Release 里的：

`trying-on-0.1.2-win-x64.zip`

不要下载仓库首页绿色 `Code -> Download ZIP`，那个是源码包，不是可直接运行的软件。

解压后进入 `时装ing-win-x64`，双击 `时装ing.exe` 即可打开。请保留整个解压后的文件夹，不要只拷贝单独 exe。

## 本次更新重点

- 新增模板候选 intake 审计流程，后续找到新模板图后可以先进入候选审计，而不是直接混入正式模板库。
- 候选模板审计会生成 JSON manifest、Markdown 报告和 HTML contact sheet，方便快速检查图片数量、重复图片、来源记录和完整度。
- 正式老板模式模板数量仍然保持为两个模板组，每组固定 5 张，共 10 张正式模板。
- 模板 QA 的模板组匹配改为一次性索引，减少重复扫描，让静态检查更稳。
- Windows 本地打包脚本不再写死版本号，发布 zip 和运行时 package 版本会跟随项目版本。
- 补充了模板候选审计的自动化测试，覆盖完整 5 张候选组和不完整候选组。

## 模板扩展说明

本版本不会把不完整模板直接加入正式库。后续新增模板建议按这个流程处理：

1. 收集候选模板图。
2. 放入 `reference-assets/template-intake/<批次>/`。
3. 运行候选审计，先看 contact sheet 和报告。
4. 只把完整、质量稳定、能组成 5 张一组的模板转入正式模板组。
5. 正式入库前继续通过模板 QA，确保仍然是 `2 组 x 5 张` 或新的完整 `5 张模板组`。

## API 配置说明

本版本暂不固定服务商 URL。用户仍然在软件 `设置` 中自行填写：

- `Base URL`
- `API Key`
- 模型名

API Key 不会上传到 GitHub，也不会写入公开仓库。配置保存在用户本机。

## 验证情况

- `npm test` 已通过：11 files，39 tests passed
- `npm run qa:templates` 已通过：templates=10，errors=0，warnings=0
- `npm run build` 已通过
- `npm run desktop:build` 已通过
- Release zip 已检查包含 `时装ing.exe`、`resources/` 和 Electron 运行依赖
