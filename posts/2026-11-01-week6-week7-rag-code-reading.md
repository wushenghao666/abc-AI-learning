---
title: 第六、七周：读懂最小 RAG 的每一段代码
date: 2026-11-01
tags: [RAG, LangChain, Python, 代码审查, 学习总结]
excerpt: 把马克的技术工作坊的 AI 视频和 LangChain 前 27 集过一遍，再按模块把最小链路读一遍：105 个片段的索引、关键词重合排序、编号引用、Pages 与 Render 部署，以及简化后暴露出的三个问题。
---

第六周和第七周共同完成一个个人学习资料问答项目：把前五周的博客和 README 做成能检索的资料库，接一个兼容 Chat Completions 的模型，再发布到 GitHub Pages 和 Render。

## 学习部分

### 理论学习

第六周，我主要学习了[马克的技术工作坊](https://space.bilibili.com/1815948385)的视频。包括：

- [从 LLM 到 Agent Skill，一期视频带你打通底层逻辑！](https://www.bilibili.com/video/BV1E7wtzaEdq/?spm_id_from=333.1387.homepage.video_card.click)
- [Token 到底是什么？—— 揭秘大模型背后的“文字压缩术”](https://www.bilibili.com/video/BV1S5miBvEsu/?spm_id_from=333.1387.upload.video_card.click)
- [Temperature & Top-p：掌控大模型的创造力开关](https://www.bilibili.com/video/BV1taSFBNEG4/?spm_id_from=333.1387.upload.video_card.click)
- [RAG 工作机制详解——一个高质量知识库背后的技术全流程](https://www.bilibili.com/video/BV1JLN2z4EZQ)
- [Context Engineering：概念与技术实现深度解析](https://www.bilibili.com/video/BV11zbPzVEUe/?spm_id_from=333.1387.upload.video_card.click)
- [Agent Skill 从使用到原理，一次讲清](https://www.bilibili.com/video/BV1cGigBQE6n/?spm_id_from=333.1387.upload.video_card.click)
- [为什么越来越多的人抛弃 MCP，转向 CLI？](https://www.bilibili.com/video/BV16zDfBtECQ/?spm_id_from=333.1387.upload.video_card.click)
- [如何审核 AI 写的代码？从写代码到上线，一套保证产品质量的全流程](https://www.bilibili.com/video/BV1PznU6YEZE/?spm_id_from=333.1387.upload.video_card.click)

### 实践-LangChain

LangChain 是一个开源的 **AI 智能体（Agent）开发框架**，主要用于简化基于大语言模型（LLM）的应用程序构建。它通过提供标准化的接口和工具，帮助开发者将模型、外部数据源和计算逻辑连接起来，从而构建更复杂的智能应用。我学习了[黑马程序员 2026 最新版 LangChain](https://www.bilibili.com/video/BV178w1z7EHQ)的前 27 集，这有助于我快速构建agent。

# RAG项目部分

### 项目实现

当前部署的问答页是一条用 Python 标准库就能跑通的短链：`src/web.py` 收到请求后调用 `simple_rag.py` 里的函数完成检索，必要时再请求模型。一条请求可以拆成下面几段：

- **资料与切分**：`build_index()` 读取 `data/raw/` 下 `week*-*.md` 的十份快照，也就是前五周的 5 篇博客和 5 份 README。`split_markdown()` 先按 Markdown 标题把文章拆成章节，再把每章按 700 字符窗口切开，一共生成 105 个片段。当前切分不重叠，也没有跳过 front matter，`title`、`date`、`tags`、`excerpt` 这些元数据会被当成正文一起切进片段，这是下一步要修的地方。

- **检索**：`words()` 先把文本统一成小写，拆成英文、数字、下划线组成的词，再把中文按连续双字切开；`retrieve()` 用问题和片段之间词集合的重合数量打分，按分数排序取前 k 段，默认 4 段、上限 8 段。命中的每段会带上编号、来源文件和章节，作为后面引用的依据。

- **组织上下文与生成**：`prompt()` 把命中的片段拼成 `[1]`、`[2]` 这样带编号的资料块，并在开头写入“只依据资料回答、资料不足就明说、把事实和建议分开”的约束。`answer()` 读取 `.env` 里的 `OPENAI_API_KEY` 等配置，向兼容 Chat Completions 的接口发请求，temperature 固定为 0，默认模型是 GLM-4.5-Flash。没有配置密钥、或者页面勾选了“只检索”，就跳过这一步，直接返回检索片段，不会伪造回答。

- **网页与服务**：`src/web.py` 用标准库的 `ThreadingHTTPServer` 提供两个接口——`GET /api/health` 返回当前片段数，`POST /api/ask` 接收问题、片段数和是否只检索。前端 `web/index.html` 和 `web/app.js` 把这三个选项提交给后端，再把状态、回答和检索片段显示出来；`web/examples.json` 提供六个示例问题，每个都带着预期结果。服务启动时 `build_index()` 会重建索引，所以免费实例重启后不需要手动建索引。

### 项目部署

前端和后端是分开的，链路很短：

- GitHub Pages 发布 `web/` 目录，就是那个 `index.html`、`app.js`、`styles.css` 和三行 `config.js`；
- 前端把问题 POST 到 `config.js` 里配置的 `RAG_API_BASE`，默认指向 Render 上的后端；
- Render 用 `render.yaml` 启动 `python -m src.web --host 0.0.0.0 --port $PORT`，健康检查走 `/api/health`，`RAG_ALLOWED_ORIGIN` 限制为 `https://wushenghao666.github.io`；
- 密钥只放在 Render 的环境变量里，前端代码和页面里没有任何密钥。

服务启动时会重建索引，所以免费实例重启后不需要额外步骤，代价是冷启动要等一会儿。这次访问后端得到的是 503，正是免费实例休眠后的状态，等它被唤醒才恢复；页面本身是静态的，一直能打开，但这时点“开始”只会看到请求失败。这个体验值得在页面上写一句提示。

在线地址：[最小 RAG 问答页](https://wushenghao666.github.io/ai-learning-week6-rag-langchain/)，后端是 [Render 服务](https://ai-learning-week6-rag-langchain.onrender.com)，代码在[项目仓库](https://github.com/wushenghao666/ai-learning-week6-rag-langchain)。

### 下一步

1. 先让测试回到绿：把 HTTP 测试对齐到简版入口，保留与 HTTP 无关的用例，重新记录真实通过数；
2. 切分跳过 front matter，把周次和标题拼回索引文本，再跑同一组 24 题，看“第四周”那道题的第一名是否回到第四周博客；
3. 只换一层：用 LangChain 的 Retriever 或 OutputParser 替换 `retrieve()`、`answer()` 里的一处，其余保持手写，对照排序和引用结果；
4. 更新 README，删掉不存在的接口和白盒说明，把部署链接补上。

这两周用 24 道固定题（21 道有答案、3 道没有）跑过一轮完整评估，最终 21/24 语义正确、17/20 引文支持全部事实，三题没有答案的全部正确拒答；初轮分别是 15/24 和 12/15。这次没有再重跑真实模型，那些数字只作为对照。这次的收获也不是新功能，而是一个判断：简化掉的不只是行数，还有周次、标题、重叠窗口、引用校验和测试。150 行的链路能跑通，但要说明它在什么情况下会答错，测试、评估和文档得一起跟上。
