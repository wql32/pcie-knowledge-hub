# PCIe Knowledge Hub

钱龙的技术知识网站，基于 VitePress 构建。

## 🚀 快速开始

```bash
npm install
npm run dev     # 开发模式 (localhost:3000)
npm run build   # 构建静态文件
npm run preview # 预览构建结果
```

## 📁 内容结构

```
docs/
├── index.md          # 首页
├── pcie/             # PCIe 学习笔记
├── verilog/          # Verilog 模块库
├── resume/           # 简历
└── tools/            # 工具
```

## ☁️ 部署

部署到 GitHub Pages:

```bash
# 1. 在 GitHub 创建仓库，例如：wql32/pcie-knowledge-hub
# 2. 添加 CNAME（可选，自定义域名）
# 3. 设置 GitHub Actions 或手动 push dist/ 到 gh-pages 分支
```

## 🔄 内容更新

内容来自 workspace 原始笔记，更新后重新运行 `npm run build` 即可。

## 🌐 在线访问

网站构建产物在 `docs/.vitepress/dist/`，可部署到任意静态托管服务。
