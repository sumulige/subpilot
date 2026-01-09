# SubPilot | AI 字幕翻译器

![Badge](https://img.shields.io/badge/Powered%20by-Vercel%20AI%20SDK-000000)
![Badge](https://img.shields.io/badge/Built%20with-Next.js%2016-black)

[English](#english) | [中文](#chinese)

---

<a name="english"></a>
## 🇬🇧 English

**SubPilot** is a next-generation subtitle translation tool designed for professional speed and context preservation.

### ✨ Key Features
- **🚀 Ultra-Fast**: Concurrent batch translation (supports 20+ parallel requests), translating 5000+ lines in minutes.
- **🧠 Context-Aware**: Maintains context between batches to ensure character names and dialogue flow are consistent.
- **🔌 Multi-Provider**: Support for **Doubao (VolcEngine)**, DeepSeek, OpenAI, DeepL, and more.
- **📂 Wide Support**: Compatible with `.srt`, `.vtt`, `.ass`, and `.lrc` formats.
- **💾 Local First**: All API keys and preferences are stored locally in your browser/indexedDB.

### 🚀 Quick Start
1.  **Clone the repo**
    ```bash
    git clone https://github.com/sumulige/subpilot.git
    cd subpilot
    ```
2.  **Install dependencies**
    ```bash
    npm install
    ```
3.  **Run development server**
    ```bash
    npm run dev
    ```
    Open [http://localhost:3000](http://localhost:3000) with your browser.

### ⚙️ Configuration Guide

#### 🇨🇳 Doubao (VolcEngine) Setup
Doubao requires an **Endpoint ID** (`ep-...`) for high performance.
1.  Go to **VolcEngine Console** -> **Ark** -> **Model Inference Endpoints**.
2.  Copy your **Endpoint ID** (e.g., `ep-202409...`).
    *   *Do NOT use the model name (e.g., `doubao-pro-32k`).*
3.  In the app settings, paste it into the **Endpoint / Model ID** field.
4.  Paste your Base URL (e.g., `https://ark.cn-beijing.volces.com/api/v3`).

### ❓ Troubleshooting
-   **500 Error**: Likely due to high concurrency on a "free/seed" model. Decrease concurrency to 1, or switch to a paid "Endpoint ID".
-   **Translation Hangs**: Check network connection or API quota.

---

<a name="chinese"></a>
## 🇨🇳 中文

** SubPilot | AI** 是一款专为速度和准确性打造的下一代字幕翻译工具。

### ✨以此版本的新特性
-   **🚀 极速翻译**：支持高并发批量翻译（可达 20+ 并发），几分钟内搞定 5000+ 行字幕。
-   **🧠 上下文感知**：智能切分批次并保留上下文，确保名字、术语和对话流畅一致。
-   **🔌 多模型支持**：完美支持 **豆包 (火山引擎)**、DeepSeek、OpenAI、DeepL 等主流模型。
-   **📂 全格式支持**：兼容 `.srt`, `.vtt`, `.ass`, `.lrc` 等常见格式。
-   **💾 本地优先**：所有 API Key 和配置均仅保存在本地浏览器中，安全无忧。

### 🚀 快速开始
1.  **克隆项目**
    ```bash
    git clone https://github.com/sumulige/subpilot.git
    cd subpilot
    ```
2.  **安装依赖**
    ```bash
    npm install
    ```
3.  **启动开发服务器**
    ```bash
    npm run dev
    ```
    在浏览器打开 [http://localhost:3000](http://localhost:3000)。

### ⚙️ 配置指南

#### 🇨🇳 豆包 (VolcEngine) 配置
豆包模型需要使用 **接入点 ID (Endpoint ID)** (`ep-...`) 才能获得最佳性能。
1.  前往 **火山引擎控制台** -> **火山方舟** -> **在线推理接入点**。
2.  复制您的 **接入点 ID** (格式如 `ep-202409...`)。
    *   *请勿使用模型名称 (如 `doubao-pro-32k`)*。
3.  在 Web 应用设置中，将其粘贴到 **Endpoint / Model ID** 字段。
4.  粘贴 Base URL (例如 `https://ark.cn-beijing.volces.com/api/v3`)。

### ❓ 常见问题
-   **500 错误**：通常是因为使用了 "Seed/免费" 模型的限制，或者并发设置过高。请尝试将并发数降低到 1，或者使用付费的 "Endpoint ID"。
-   **翻译卡住**：请检查网络连接或 API 配额是否耗尽。

---

## 🤖 AI 维护指南

本项目配置了 **Claude Code Skills**，让 AI 能够"理解"项目结构，方便后续自动维护。

### AI 如何使用 Skills？

AI（如 Claude Code、Cursor、Copilot）会在**每次对话开始时**自动读取：
1. **`CLAUDE.md`** - 项目记忆（必读）
2. **`.claude/skills/`** - 领域知识（按需加载）

### AI 会自动更新 Skills 吗？

**默认情况下不会。** Skills 是静态文档，AI 会读取但不会主动修改。

| 场景 | 需要更新的文件 |
|---|---|
| 添加了新 Provider | `.claude/skills/provider-system/SKILL.md` |
| 修改了核心引擎逻辑 | `.claude/skills/translation-engine/SKILL.md` |
| 重构了项目结构 | `CLAUDE.md` |

### 如何让 AI 更新？

使用命令：
```
/update-skills
```

或显式要求：
> "我刚添加了新功能，请帮我更新 Skills 文档"

### 最佳实践
1. **定期维护** - 每次大改动后，让 AI 同步更新 Skills
2. **使用命令** - `/update-skills` 一键同步
3. **Code Review 时检查** - 涉及核心逻辑变更时顺便更新 Skills
