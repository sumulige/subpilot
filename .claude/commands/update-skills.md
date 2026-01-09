# Update Skills Command

扫描项目变更，自动更新 Claude Code Skills 文档。

## 执行范围

检查以下核心文件的变更，并同步更新对应的 Skills：

| 源文件 | 对应 Skill |
|---|---|
| `src/lib/engine/batcher.ts` | `.claude/skills/translation-engine/SKILL.md` |
| `src/lib/providers/*.ts` | `.claude/skills/provider-system/SKILL.md` |
| `src/lib/parsers/*.ts` | `.claude/skills/testing-patterns/SKILL.md` |
| 项目结构变更 | `CLAUDE.md` |

## 更新步骤

1. **分析变更**
   - 检查最近的代码改动（可通过 git diff 或直接读取文件）
   - 识别涉及的模块（引擎、Provider、解析器等）

2. **更新 Skills**
   - 更新核心概念描述
   - 更新关键函数列表
   - 更新常见修改场景
   - 更新注意事项

3. **更新 CLAUDE.md**
   - 如有新增文件或目录，更新项目结构
   - 如有新增功能，更新常用任务列表

4. **验证**
   - 确保 Skill 文档与实际代码一致
   - 确保示例代码可用

## 示例

用户：我刚添加了一个新的 AI Provider "Gemini"

AI 执行：
1. 读取 `src/lib/providers/gemini.ts`
2. 更新 `.claude/skills/provider-system/SKILL.md`，添加 Gemini 相关说明
3. 更新 `CLAUDE.md` 的 Provider 列表
