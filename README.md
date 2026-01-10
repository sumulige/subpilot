# SubPilot | AI Subtitle Translator

![Badge](https://img.shields.io/badge/Powered%20by-Vercel%20AI%20SDK-000000)
![Badge](https://img.shields.io/badge/Built%20with-Next.js%2016-black)
![Badge](https://img.shields.io/badge/i18n-EN%20%7C%20中文-blue)

[English](#english) | [中文](#chinese)

---

<a name="english"></a>
## 🇬🇧 English

**SubPilot** is a next-generation AI-powered subtitle translation tool built for speed, accuracy, and professional workflows.

### ✨ Features

#### 🎯 Core Translation
- Multi-format parsing (SRT, VTT, ASS, LRC)
- Batch multi-file translation
- Bilingual / Target-only mode
- Real-time preview with virtual scrolling
- Translation quality evaluation

#### ⚡ Performance
- Concurrent batch translation (20+ parallel)
- Rate limiting & auto-retry
- CORS proxy for browser requests
- Virtual scrolling (50,000+ lines)

#### 🔌 Providers
- NVIDIA NIM
- OpenAI / DeepSeek / DeepInfra
- Doubao (VolcEngine) / Tongyi (Dashscope)
- OpenRouter / DeepL / Google Translate
- Custom OpenAI-compatible endpoints

#### 🎛️ Configuration
- Dynamic model list (auto-fetch from API)
- Fuzzy search model selector
- Custom System Prompt
- Context Caching (TACTIC-Lite)
- Glossary support
- Local persistence (API keys stored in browser)

#### 💾 Session Management
- Translation progress persistence
- Session recovery on page reload
- Multi-file progress tracking

#### 🌍 i18n
- Chinese / English UI toggle
- Language preference persistence

---

### 🚀 Quick Start

```bash
git clone https://github.com/sumulige/subpilot.git
cd subpilot
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

### ⚙️ Provider Setup

#### Doubao (VolcEngine)
1. Go to **VolcEngine Console** → **Ark** → **Model Inference Endpoints**
2. Copy your **Endpoint ID** (e.g., `ep-202409...`)
3. Paste into **Endpoint / Model ID** field
4. Set Base URL: `https://ark.cn-beijing.volces.com/api/v3`

#### NVIDIA NIM
1. Get API Key from [build.nvidia.com](https://build.nvidia.com)
2. Select NVIDIA NIM provider
3. Models load automatically after entering API Key

---

<a name="chinese"></a>
## 🇨🇳 中文

**SubPilot** 是一款专为速度和准确性打造的下一代 AI 字幕翻译工具。

### ✨ 功能清单

#### 🎯 核心翻译
- 多格式解析 (SRT, VTT, ASS, LRC)
- 多文件批量翻译（最大20文件/50000行）
- 双语/纯译文模式
- 实时预览 (虚拟滚动)并支持编辑保存
- 翻译质量评估

#### ⚡ 性能优化
- 高并发批量翻译 (20+ 并发)
- 速率限制与自动重试 3 次
- CORS 代理
- 虚拟滚动 (MAX 50000+ 行)

#### 🔌 服务商支持
- NVIDIA NIM
- OpenAI / DeepSeek / DeepInfra
- 豆包 (火山引擎) / 通义千问
- OpenRouter / DeepL / Google Translate
- 自定义 OpenAI 兼容接口

#### 🎛️ 配置功能
- 动态模型列表 (API 自动获取)
- 模糊搜索模型选择器
- 自定义 System Prompt
- Context Caching (TACTIC-Lite)
- 术语表支持
- 本地持久化 (API Key 仅存浏览器)

#### 💾 会话管理
- 翻译进度断点续传
- 会话恢复
- 多文件进度追踪

#### 🌍 国际化
- 中/英文界面切换
- 语言偏好持久化

---

### 🚀 快速开始

```bash
git clone https://github.com/sumulige/subpilot.git
cd subpilot
npm install
npm run dev
```

在浏览器打开 [http://localhost:3000](http://localhost:3000)。

---

### ⚙️ 服务商配置

#### 豆包 (VolcEngine)
1. 前往 **火山引擎控制台** → **火山方舟** → **在线推理接入点**
2. 复制 **接入点 ID** (格式如 `ep-202409...`)
3. 粘贴到 **Endpoint / Model ID** 字段
4. 设置 Base URL: `https://ark.cn-beijing.volces.com/api/v3`

#### NVIDIA NIM
1. 从 [build.nvidia.com](https://build.nvidia.com) 获取 API Key
2. 选择 NVIDIA NIM 服务商
3. 输入 API Key 后模型列表自动加载

---

### ❓ FAQ

| 问题 | 解决方案 |
|------|----------|
| 500 错误 | 降低并发或使用付费 Endpoint |
| 翻译卡住 | 检查网络或 API 配额 |
| 模型列表为空 | 确认 API Key 正确 |

---

## License

MIT © [sumulige](https://github.com/sumulige)
