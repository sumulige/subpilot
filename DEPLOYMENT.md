# 🚀 部署文档

> 本文档介绍如何将 SubPilot 部署到各种环境。

---

## 本地运行

### 开发模式
```bash
npm install
npm run dev
```
访问 http://localhost:3000

### 生产模式
```bash
npm run build   # 构建生产版本
npm start       # 启动生产服务器
```

---

## Vercel 部署（推荐）

Vercel 是 Next.js 官方推荐的托管平台。

### 1. 安装 Vercel CLI

```bash
npm install -g vercel
vercel login
```

### 2. 关联项目

```bash
cd /path/to/subpilot
vercel link
```

交互式问答：
```
? Set up "~/Documents/subpilot"? yes
? Which scope? <your-username>'s projects
? Link to existing project? no
? Project name? subpilot
? Code directory? ./
? Want to modify settings? N
? Change additional settings? N
✅ Linked (created .vercel)
? Connect repository? Y
```

### 3. 获取配置信息

```bash
cat .vercel/project.json
```

输出：
```json
{
  "orgId": "team_xxxxxxxxxx",
  "projectId": "prj_yyyyyyyyyy"
}
```

### 4. 配置 GitHub Secrets

在 **Settings → Secrets → Actions** 添加：

| Secret | 获取方式 |
|---|---|
| `VERCEL_ORG_ID` | `.vercel/project.json` 的 `orgId` |
| `VERCEL_PROJECT_ID` | `.vercel/project.json` 的 `projectId` |
| `VERCEL_TOKEN` | [Vercel Tokens](https://vercel.com/account/tokens) |

### 5. 配置自定义域名

**Vercel 控制台：** Settings → Domains → 添加 `subpilot.your-domain.com`

**域名服务商 DNS：**

| 类型 | 主机记录 | 记录值 |
|---|---|---|
| CNAME | subpilot | cname.vercel-dns.com |

### 6. 部署

```bash
# 命令行部署
vercel --prod

# 或推送到 GitHub 自动部署
git push origin main
```
---

## Docker 部署

### Dockerfile
在项目根目录创建 `Dockerfile`：

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
```

### 修改 `next.config.ts`
```typescript
const nextConfig = {
    output: 'standalone', // 启用独立输出模式
};
export default nextConfig;
```

### 构建 & 运行
```bash
docker build -t subpilot .
docker run -p 3000:3000 subpilot
```

---

## 自托管服务器 (VPS)

### 使用 PM2 进程管理器

```bash
# 安装 PM2
npm install -g pm2

# 构建项目
npm run build

# 使用 PM2 启动
pm2 start npm --name "subpilot" -- start

# 设置开机自启
pm2 startup
pm2 save
```

### Nginx 反向代理配置

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 常见问题

### Q: 部署后 API 请求失败？
**A:** 检查以下几点：
1. 确保服务器可以访问外网（豆包、OpenAI 等 API 地址）
2. 如果在国内服务器，可能需要配置代理访问 OpenAI

### Q: 静态资源 404？
**A:** 确保 `npm run build` 成功完成，`.next` 目录存在。

### Q: 内存占用过高？
**A:** Next.js 默认使用较多内存，可以在启动时限制：
```bash
NODE_OPTIONS="--max-old-space-size=512" npm start
```

---

## 推荐配置

| 部署方式 | 适用场景 | 难度 |
|---|---|---|
| Vercel | 个人使用、快速上线 | ⭐ 简单 |
| Docker | 企业内网、私有云 | ⭐⭐ 中等 |
| VPS + PM2 | 完全自主控制 | ⭐⭐⭐ 进阶 |
