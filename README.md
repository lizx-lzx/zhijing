# 知径

“知径”是一个个性化学习平台原型：用户先完成一次简短学习适配，系统生成可查看、可调整的个人学习 Skill；之后粘贴文章链接并选择学习配方，获得与个人吸收习惯相匹配的学习内容。

当前版本完成了前端完整流程，并把知乎文章《窗口期可能只剩五年》做成了一件可直接体验的个性化学习案例。案例内容来自对原文的人工拆解；知乎链接自动解析、模型实时生成、账号和云端学习记录仍是后续能力，界面不会把案例冒充成实时生成结果。

## 项目文档

- [对话思路与产品决策](docs/01-对话思路与产品决策.md)：记录产品方向怎样从聊天中逐步形成，以及关键纠偏。
- [开发思路、最终方案与源码导航](docs/02-开发思路、最终方案与源码导航.md)：说明目标架构、当前实现、开发工具、源码入口、部署方式和下一阶段。
- [研究结论与下一阶段落地方案](docs/03-研究结论与下一阶段落地方案.md)：给出学习依据、个人 Skill、内容模型、学习配方、知乎接入、4 核 8G 架构和有效性验证方案。

## 本地运行

要求 Node.js `>=22.13.0`。

```bash
npm install
npm run dev
npm run build
```

## 常用命令

- `npm run dev`：启动本地开发环境
- `npm run build`：生成生产构建
- `NEXT_PUBLIC_BASE_PATH=/zhijing npm run build`：生成服务器子路径版本
- `npm run lint`：检查代码

## 服务器部署

生产环境使用独立 systemd 服务监听 `127.0.0.1:4329`，由 Nginx 暴露在 `https://app.chainvalley.top/zhijing/`。配置模板在 `deploy/`。

## ReactBits

首页动效组件位于 `components/react-bits/`，来源于用户已授权的 ReactBits Starter 私有源码仓库，并已按“知径”的颜色、节奏和响应式布局完成适配。`components.json` 保留 CollectUI registry 配置，授权 Key 只允许放在被 Git 忽略的 `.env.local`。
