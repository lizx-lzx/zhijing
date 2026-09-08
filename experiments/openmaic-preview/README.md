# OpenMAIC 单篇讲解试作

后续已加入[知乎文章《窗口期可能只剩五年》的完整学习作品](lessons/window-five-years/README.md)。两个版本共用播放器、媒体制作与场景校验，通过 `ZH_LESSON` 选择；下文记录的是最初的数学试作。

沿用知径「问卷 → 个人学习 Skill → 内容 → 学习作品」的产品逻辑，只验证作品呈现环节。问卷、私人学习库、正式生成接口、服务配置均未替换。本目录依赖独立安装，不增加主站运行依赖。

## 实际产物

基于知径已有的平均数与中位数原创示例，使用一份虚构偏好（先故事、视频为主、均衡节奏、不中途提问），生成四段讲解、真实配音、带字幕的 MP4，以及可逐页观看的 OpenMAIC 图解。不是用户此前提供的知乎文章，也不是实际用户画像。

- 15 段配音，164.8 秒，1280 × 720，H.264 / AAC。
- 可以播放、按章节跳转、切到图解、上一页/下一页、听配音、展开讲稿和原文。
- 页面无模型密钥、无用户数据、无生成接口；只发布这个预生成样本。
- 不代表已经完成任意文章的自动转化，也不证明学习效率提高。

## 实际技术分工

1. 知径现有 `designProfile` 和 `skillMarkdown`：把虚构问卷翻译成学习规则。
2. `@openmaic/generation@0.3.6`：实际调用模型生成章节大纲和带元素指向的讲解动作，组装标准 Scene。
3. `statistics.mjs`：根据结构化数据计算图形。五个数据为 1、2、2、3、22；总量 30、均值 6、中位数 2。
4. `@openmaic/renderer@0.1.6` 的 `SlideCanvas`：实际绘制画布、聚光和高亮；不是复制它的页面外观。
5. 知径现有配音适配器：生成真实音频；按每段实际音频长度对齐章节。
6. Playwright + FFmpeg：录制同一个画布，合成视频。未安装 OpenMAIC 完整课堂或其 render-service。

OpenMAIC 首轮自由绘图出现比例不一致、遗漏重复数值、元素越界等问题，未用于发布。试作改为「AI 组织与讲解，程序计算数值图形」。独立模型复核也不能替代数值断言和人工检查。最终另人工确认小林对应 2 本，并把一处口播中的“五本数”改为“五个数”；记录在 `lesson.json` 的 provenance。

## 文件

- `generate.mjs`：真实模型生成与验证；重新运行产生费用，产物需要重新审核。
- `lesson.json`：本次冻结样本、原文、规则、来源说明与模型复核。
- `statistics.mjs` / `contract.mjs`：数据图形、画布/动作安全边界、时间轴。
- `media.mjs` / `timing.json`：配音、真实时间轴、视频渲染。
- `main.jsx` / `style.css`：隔离的作品页面。
- `preview.test.mjs` / `acceptance.mjs`：统计与边界测试、真实浏览器播放验收。
- `notices.mjs` / `public/THIRD-PARTY-NOTICES.txt`：上游许可说明。
- `prepare-preview.mjs`：仅用于配音前的静音预览；不要对已完成样本运行，会覆盖实际时间轴。

## 本地复现

从本目录执行，要求主项目已安装依赖，并已配置原有模型、配音、Chromium 和 FFmpeg。不要把私有环境文件复制到此目录或 public。

```sh
npm ci --ignore-scripts
npm test
npm run dev
# 另一终端，按需要执行；现有冻结样本无需重新生成
npm run generate
ZH_DATA_DIR=/Users/li/Documents/gpt/个性化学习平台/data node media.mjs voice
ZH_DATA_DIR=/Users/li/Documents/gpt/个性化学习平台/data node media.mjs video
ZH_DATA_DIR=/Users/li/Documents/gpt/个性化学习平台/data node acceptance.mjs
npm run build
```

本地配音连接超时，本次借用已有服务器配音适配器和私有配置完成 15 段配音，再回本地录制画面。未调整权限、模型配置或线上服务。代码允许通过 `ZH_RUNTIME_ROOT` 指定已有运行目录。

构建输出是项目根目录 `public/demo/openmaic-20260908/`，媒体与中间缓存不进 Git。内嵌字幕按句子长度近似分配时间，不是逐字识别对齐。数值模板只覆盖此次统计例子所需的几类视图，不能当成通用知识表达引擎。

## 发布边界

仅将完整构建目录新增到自有服务器的 `current/public/demo/openmaic-20260908/`，利用已有 Nginx `/zhijing/demo/` 静态映射。无需修改 Nginx、重启服务、切换 current 或迁移数据。

入口：https://app.chainvalley.top/zhijing/demo/openmaic-20260908/

2026-09-08 已发布并在上述公网入口完成真实浏览器验收：视频和音频均可播放，章节跳转、上一页/下一页、模式切换后保留位置均通过；1440 × 1050 与 390 × 844 无页面错误，手机无横向溢出。首页 HTTP 200，视频 Range 请求 HTTP 206，主站 `/zhijing/api/health` 保持健康。远端 MP4 与本地 SHA-256 一致：`787564f66cfc8b648df4b1c6bf17222754863ac6dcbee1176357efda526e89b4`。

本次验证：试作 8 项测试、主站 19 项单元/HTTP 测试、类型检查、Lint、生产构建和 1 项生产页面测试全部通过；视频完整解码无错误；试作生产依赖审计为 0 个已知漏洞。构建包尺寸提示仍存在。原样保留的上游许可文件含部分空白行格式，不修改其授权文字。

主站发布时应额外保留这份静态目录；它不在现有发布包源码中。撤下试作只需把这个精确子目录移出静态映射，不影响正式产品。

上游：https://github.com/THU-MAIC/OpenMAIC 。依赖锁定见 package-lock.json。构建包体积存在非阻断的分块提示；为单篇试作暂未扩展性能工程。

## 页面品牌

2026-09-08 按用户要求移除页面上的联名标识，两份演示页都只显示「知径」。技术来源记录与 `THIRD-PARTY-NOTICES.txt` 原许可保留，不作为产品联名。实现提交 `f457b48`。

两份公网页面均已验证：可见文字无 OpenMAIC、开源说明可下载且原版权声明仍在、视频元数据正常（408.8 / 164.8 秒）、390px 无横向溢出、无页面错误。记录位于主项目 `test-results/branding-f457b48/report.json`。只更新静态页面及其源码，不重启服务或重制媒体；旧入口备份在服务器 `/home/ubuntu/zhijing-ui-history/branding-f457b48/`，旧哈希资源保留。
