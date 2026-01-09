# Vercel 部署完整流程

> 本文档记录了将 SubPilot 项目部署到 Vercel 的完整步骤。

---

## 1. 安装 Vercel CLI

```bash
npm install -g vercel
```

## 2. 登录 Vercel

```bash
vercel login
```

## 3. 关联项目

```bash
cd /path/to/subpilot
vercel link
```

### 交互式问答

```
? Set up "~/Documents/Antigravity/subpilot"? yes
? Which scope should contain your project? <your-username>'s projects
? Link to existing project? no
? What's your project's name? subpilot
? In which directory is your code located? ./
Auto-detected Project Settings (Next.js):
- Build Command: next build
- Development Command: next dev --port $PORT
- Install Command: `yarn install`, `pnpm install`, `npm install`, or `bun install`
- Output Directory: Next.js default
? Want to modify these settings? N
? Do you want to change additional project settings? N
✅ Linked to <your-username>s-projects/subpilot (created .vercel)
? Detected a repository. Connect it to this project? Y
```

## 4. 获取配置信息

关联完成后，查看 `.vercel/project.json`：

```bash
cat .vercel/project.json
```

输出示例：
```json
{
  "orgId": "team_xxxxxxxxxx",
  "projectId": "prj_yyyyyyyyyy"
}
```

## 5. 配置 GitHub Secrets

在 GitHub 仓库的 **Settings → Secrets and variables → Actions** 中添加：

| Secret Name | Value | 获取方式 |
|---|---|---|
| `VERCEL_ORG_ID` | `.vercel/project.json` 中的 `orgId` | 步骤 4 |
| `VERCEL_PROJECT_ID` | `.vercel/project.json` 中的 `projectId` | 步骤 4 |
| `VERCEL_TOKEN` | Vercel API Token | [Vercel Tokens](https://vercel.com/account/tokens) |

## 6. 配置自定义域名

### 在 Vercel 控制台

1. 进入项目 → **Settings** → **Domains**
2. 添加域名：`subpilot.your-domain.com`
3. Environment: **Production**
4. Redirect: **No Redirect**
5. 点击 **Save**

### 在域名服务商

添加 DNS 记录：

| 类型 | 主机记录 | 记录值 |
|---|---|---|
| CNAME | subpilot | cname.vercel-dns.com |

## 7. 部署

### 方式一：命令行部署
```bash
vercel --prod
```

### 方式二：Git 推送自动部署
```bash
git push origin main
```

---

## 结果

域名配置成功后会显示：

```
subpilot.your-domain.com
Production

Your domain is properly configured, but you don't have a production deployment.
To deploy to production, push to main, or run vercel --prod with our command-line interface.
```

执行部署命令后，即可通过 `https://subpilot.your-domain.com` 访问应用。

或者手动出发点部署：

```bash
vercel --prod
```
