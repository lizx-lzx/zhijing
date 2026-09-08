# 知径

一次了解学习偏好，以后把文章转换成个人化的图文、配音、网页动画和讲解视频。

系统级作品：完整图文、逐章图解、全文关系、独立听读、讲解视频、互动复习、网页讲解。七种入口共用同一份来源和知识编排，听读使用独立讲稿。默认尊重个人主形式，也可以一键生成全部形式，或在原作品中补充音视频。

## 产品流程

8 个问题分为 3 组 → AI 编写个人学习 Skill → 用户查看、修改并保存 → 知乎链接 / 正文 / TXT、Markdown → 来源可追溯的学习作品 → 私人学习库。

主形式与讲解入口分开选择；可以同时生成其他形式。“只调整这一次”只改变当前作品，不覆盖长期 Skill。练习不作为看完内容的门槛。年龄只影响表达与例子，不用于判断能力或给用户贴学习类型标签。

学习位置、视频/音频时间、笔记和可选练习进度保存在私有服务端。刷新作品链接可以续看；跨设备通过恢复码恢复自己的学习库。学习行为不会自动修改个人 Skill。旧版作品继续可用，需要新版时生成独立副本，不覆盖旧内容。

本版已接入真实模型、配音与 MP4 渲染，不再使用固定案例代替实时生成。旧样片仍留在 public/demo/，不作为新作品生成结果。

## 运行

要求 Node.js 24、FFmpeg / ffprobe；视频还需要 Playwright Chromium 和中文字体。业务数据在独立 Node API 的 SQLite 与私有媒体目录中，不使用旧模板的 Cloudflare D1。

```sh
npm ci
npx playwright install chromium
# 根据 server/env.example 配置 .env.zhijing；密钥不得提交
npm run api
# 另一个终端
npm run dev
```

开发网页为 http://localhost:3000/，API 仅监听 127.0.0.1:4330。

```sh
npm test                   # 单元 / HTTP、类型、规范、构建和生产页面测试
ZH_UI_URL=http://localhost:3000 node scripts/ui-acceptance.mjs  # 已启动网页；隔离 UI 测试，不调用模型
npm run test:acceptance     # 真实模型对照，会产生用量
ZH_TEST_VIDEO=1 npm run test:acceptance  # 包含真实视频
ZH_ACCEPTANCE_URL=https://app.chainvalley.top/zhijing/api node scripts/public-smoke.mjs
ZH_PUBLIC_UI_URL=https://app.chainvalley.top/zhijing/ node scripts/public-ui-smoke.mjs # 真实网页流程，仅生成一份图文，会产生模型用量
```

完整系统验收使用 `scripts/system-acceptance.mjs`，显式设置 `ZH_ACCEPTANCE_URL`、`ZH_ACCEPTANCE_ORIGIN`、`ZH_ACCEPTANCE_ARTICLE`、`ZH_ACCEPTANCE_STATE`、`ZH_ACCEPTANCE_REPORT`。其中 state 含验收账号会话，只能写入私有、非仓库、非公开目录；脚本可从这个检查点继续，不反复生成同一作品。`tests/study-render.test.mjs` 是组件服务端渲染测试，不代表浏览器交互验收。

真实测试报告写入被 Git 忽略的 test-results/；不输出会话、恢复码或供应商密钥。差异化测试控制同一原文、主形式、节奏，只改变讲解入口。测试通过不能证明学习效果提升。

## 部署

用户指定地址：[知径](https://app.chainvalley.top/zhijing/)，部署目标为自有 4 核 8G 服务器，不使用 Sites 托管。

- 网页：zhijing-learning.service，本机 4329。
- API 和串行视频队列：zhijing-api.service，本机 4330。
- Nginx 只转发 /zhijing/ 和 /zhijing/api/；现有其他服务不改动。
- 持久数据：/home/ubuntu/apps/zhijing/data，不在发布目录中。
- 私有配置及参考音频：/home/ubuntu/apps/zhijing/private，目录 700、文件 600。
- 版本目录保留上一版；切换 current 后重启本项目服务。部署文件见 deploy/。
- 系统发布使用 `deploy/activate-system.sh`：检查空队列、停 API 并做一致性数据库快照、切换版本并重启两个服务、验证公网与私有 API；失败恢复两个旧服务，不用旧快照覆盖新用户数据。不可将旧版首次迁移脚本 `activate.sh` 用于后续发布。

## 真实边界

知乎可能拒绝公开读取；遇到限制，网站会让用户粘贴正文，不绕过登录或反爬。只处理用户有权使用的材料，原文与偏好会交给配置的模型供应商，口播交给配音供应商。

访客不强制注册。内容按私有会话隔离；换设备需用户保存恢复码，持有码的人可访问对应学习库。清除 Cookie 且丢失恢复码时，当前没有人工账号找回功能。

默认每日全站 40 次生成、每 IP 12 次、每访客 8 次；视频串行、最多 15 分钟成片、渲染最多 30 分钟。失败保留原文与已生成图文，支持受限重试。视频字幕为句子级近似时间，听读字幕为章节级时间，都不是逐字对齐。工作台展示近期作品，学习库支持标题搜索与每页 24 份的分页，不因分页删除数据。当前未配置异地备份，也不是开放商业平台的无限容量或学习效果保证。

## 项目正本

- [对话思路与产品决策](docs/01-对话思路与产品决策.md)
- [开发思路与源码导航](docs/02-开发思路、最终方案与源码导航.md)
- [研究依据](docs/03-研究结论与下一阶段落地方案.md)
- [本版实施与验收](docs/05-完整产品实施与验收.md)
- [整个平台 UI 更新与验收](docs/06-整个平台UI更新与验收.md)
- [系统级多形式交付与验收](docs/07-系统级多形式交付.md)
- [OpenMAIC 单篇讲解试作：实现、边界与复现](experiments/openmaic-preview/README.md)
- [知乎文章《窗口期可能只剩五年》：完整学习作品](experiments/openmaic-preview/lessons/window-five-years/README.md)

原型阶段和旧候选保存在 Git。ReactBits 原组件与 CollectUI registry 沿用；授权 Key 不进入源码。
