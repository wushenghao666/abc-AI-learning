# Neural Notes · AI 学习日志

这是一个纯前端、无服务器的 Markdown 博客，适合直接部署到 GitHub Pages。Logo 放在 `assets/logo.jpg`，文章放在 `posts/`。

## 本地预览

需要 Python 3。第一次运行或新增文章后，先生成文章索引，再启动静态服务器：

```bash
python build.py
python -m http.server 8000
```

打开 <http://localhost:8000>。不要直接双击 `index.html`，因为浏览器会阻止本地页面读取 Markdown 文件。

## 写一篇新文章

在 `posts/` 新建文件，例如 `2026-09-24-cnn.md`，并复制下面的头部信息：

```markdown
---
title: "我的 CNN 第一个实验"
date: "2026-09-24"
tags: [深度学习, CNN]
excerpt: "一句话说明这篇文章解决了什么问题，以及我得到了什么结果。"
---

# 我的 CNN 第一个实验

正文写在这里。支持标题、列表、代码块、引用和图片。
```

## 发布到 GitHub Pages

1. 在 GitHub 新建一个空仓库，不勾选自动创建 README。
2. 在项目目录执行下面的命令，把地址替换成你自己的仓库地址：

```bash
git add .
git commit -m "建立 AI 学习博客"
git branch -M main
git remote add origin https://github.com/你的用户名/你的仓库名.git
git push -u origin main
```

3. 进入 GitHub 仓库的 **Settings → Pages**，将 Source 设为 **GitHub Actions**。
4. 以后每次写完文章，运行：

```bash
python build.py
git add .
git commit -m "新增学习记录"
git push
```

推送后，`.github/workflows/deploy.yml` 会自动扫描 `posts/`、生成 `posts.json` 并部署。打开仓库的 **Actions** 可以查看部署进度，首次部署完成后 GitHub Pages 会显示网站地址。

## 文件作用

- `index.html`：页面结构与站点文案。
- `styles.css`：响应式视觉样式，支持深色/浅色主题。
- `app.js`：筛选、搜索、文章弹窗、主题切换和 URL 分享。
- `build.py`：把 Markdown 头部信息生成浏览器需要的 `posts.json`。
