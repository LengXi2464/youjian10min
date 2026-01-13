# Cloudflare 部署详细指南

本指南将指导您一步步将临时邮箱服务部署到 Cloudflare。

## 📋 前置要求

- ✅ Cloudflare 账户（[免费注册](https://dash.cloudflare.com/sign-up)）
- ✅ GitHub 账户
- ✅ 至少一个域名（用于邮件接收）
- ✅ 域名已添加到 Cloudflare

## 📦 第一步：准备 GitHub 仓库

### 1.1 创建 GitHub 仓库

1. 访问 [GitHub](https://github.com/new)
2. 创建新仓库，例如 `temp-email-service`
3. 设置为 Public（公开）

### 1.2 推送代码

```bash
cd 邮箱服务器
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/your-username/temp-email-service.git
git push -u origin main
```

## 🗄️ 第二步：创建 Workers KV 命名空间

### 2.1 安装 Wrangler CLI

```bash
npm install -g wrangler
```

### 2.2 登录 Cloudflare

```bash
wrangler login
```

### 2.3 创建 KV 命名空间

```bash
wrangler kv:namespace create "EMAIL_STORAGE"
```

记下返回的命名空间 ID，例如：

```
id = "abcdef1234567890"
```

### 2.4 更新 Workers 配置

编辑 `workers/wrangler.toml`，将 `YOUR_KV_NAMESPACE_ID` 替换为实际的 ID：

```toml
[[kv_namespaces]]
binding = "EMAIL_STORAGE"
id = "abcdef1234567890"  # 替换为您的 KV ID
```

## 📧 第三步：配置 Cloudflare Email Routing

### 3.1 启用 Email Routing

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 选择您的域名（例如 `yourdomain.com`）
3. 进入 **Email** → **Email Routing**
4. 点击 **Enable Email Routing**

### 3.2 配置 DNS 记录

Cloudflare 会自动添加以下 MX 记录：

```
MX  @  route1.mx.cloudflare.net  (优先级: 90)
MX  @  route2.mx.cloudflare.net  (优先级: 17)
MX  @  route3.mx.cloudflare.net  (优先级: 36)
```

确认这些记录已添加，通常会自动完成。

### 3.3 配置 Catch-all 地址

1. 在 Email Routing 页面，找到 **Catch-all address** 部分
2. 选择 **Send to a Worker**
3. 暂时保持为空，稍后绑定 Worker

## 🔧 第四步：部署 Workers

### 4.1 部署 API Worker

```bash
cd workers
wrangler deploy api-worker.js --name temp-email-api
```

记下 Workers 的 URL，例如：

```
https://temp-email-api.your-subdomain.workers.dev
```

### 4.2 部署 Email Worker

```bash
wrangler deploy email-worker.js --name temp-email-receiver
```

### 4.3 绑定 Email Worker 到 Email Routing

1. 返回 Cloudflare Dashboard 的 **Email Routing** 页面
2. 在 **Catch-all address** 中选择 **Send to a Worker**
3. 选择 `temp-email-receiver`
4. 点击保存

现在所有发送到 `*@yourdomain.com` 的邮件都会被 Worker 接收。

## 🌐 第五步：部署前端到 Cloudflare Pages

### 5.1 更新前端配置

编辑 `app.js`，将 API 地址改为实际的 Workers URL：

```javascript
const CONFIG = {
  API_BASE_URL: "https://temp-email-api.your-subdomain.workers.dev",
  REFRESH_INTERVAL: 10000,
};
```

提交更改：

```bash
git add app.js
git commit -m "Update API URL"
git push
```

### 5.2 连接 GitHub 到 Cloudflare Pages

1. 访问 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入 **Workers & Pages**
3. 点击 **Create application**
4. 选择 **Pages** 标签
5. 点击 **Connect to Git**
6. 授权 GitHub 访问
7. 选择 `temp-email-service` 仓库

### 5.3 配置构建设置

- **项目名称**: `temp-email-service`
- **生产分支**: `main`
- **构建命令**: 留空（静态网站无需构建）
- **构建输出目录**: `/`
- **根目录**: `/`

点击 **Save and Deploy**

### 5.4 等待部署完成

首次部署通常需要 1-2 分钟。完成后会得到一个 URL，例如：

```
https://temp-email-service.pages.dev
```

## 🔗 第六步：配置自定义域名（可选）

### 6.1 为 Pages 添加自定义域名

1. 在 Pages 项目设置中，进入 **Custom domains**
2. 点击 **Set up a custom domain**
3. 输入域名，例如 `mail.yourdomain.com`
4. Cloudflare 会自动添加 CNAME 记录

### 6.2 为 API Worker 添加自定义域名

1. 进入 **Workers & Pages**
2. 选择 `temp-email-api` Worker
3. 进入 **Settings** → **Triggers**
4. 在 **Custom Domains** 部分添加，例如 `api.yourdomain.com`

### 6.3 更新前端配置

编辑 `app.js`：

```javascript
const CONFIG = {
  API_BASE_URL: "https://api.yourdomain.com",
  REFRESH_INTERVAL: 10000,
};
```

提交并推送更改，Cloudflare Pages 会自动重新部署。

## ✅ 第七步：测试

### 7.1 创建邮箱

1. 访问您的 Pages 网站（例如 `https://mail.yourdomain.com`）
2. 输入邮箱名，选择域名后缀
3. 点击"创建"

### 7.2 发送测试邮件

从任意邮箱（如 Gmail）发送邮件到创建的临时邮箱，例如：

```
test123@yourdomain.com
```

### 7.3 查看邮件

在网站上点击"刷新邮件"，应该能看到刚才发送的邮件。

## 🎯 第八步：添加更多域名后缀

### 8.1 在 Cloudflare 添加域名

确保您要添加的域名已在 Cloudflare 上设置了 Email Routing。

### 8.2 在应用中添加域名

1. 访问您的临时邮箱网站
2. 点击"管理邮箱后缀"
3. 输入新域名，例如 `anotherdomain.com`
4. 点击"添加"

## 🔄 自动部署

现在，每次推送代码到 GitHub，Cloudflare Pages 会自动重新部署前端。

对于 Workers 的更新，需要手动运行：

```bash
cd workers
wrangler deploy api-worker.js --name temp-email-api
# 或
wrangler deploy email-worker.js --name temp-email-receiver
```

## 🐛 常见问题

### 问题 1：邮件无法接收

**检查**：

- Email Routing 是否已启用
- MX 记录是否正确配置
- Email Worker 是否正确绑定到 Catch-all
- 发送方域名是否被标记为垃圾邮件

### 问题 2：API 请求失败

**检查**：

- `app.js` 中的 `API_BASE_URL` 是否正确
- Workers 是否成功部署
- KV 命名空间是否正确绑定
- CORS 配置是否正确（检查 `_headers` 文件）

### 问题 3：域名后缀添加失败

**检查**：

- 域名格式是否正确
- 网络连接是否正常
- Workers KV 是否有写入权限

### 问题 4：Pages 部署失败

**检查**：

- GitHub 仓库是否公开
- 文件路径是否正确
- 是否有语法错误

## 📊 监控和日志

### 查看 Workers 日志

```bash
wrangler tail temp-email-api
# 或
wrangler tail temp-email-receiver
```

### 在 Dashboard 查看

1. 进入 **Workers & Pages**
2. 选择对应的 Worker
3. 点击 **Logs** 标签

## 💰 费用说明

Cloudflare 免费计划包括：

- ✅ Workers: 100,000 请求/天
- ✅ Pages: 无限请求
- ✅ Email Routing: 无限邮件
- ✅ Workers KV: 100,000 读取/天，1,000 写入/天

对于个人使用，完全免费！

## 🎉 完成！

恭喜！您现在已经成功部署了一个完整的临时邮箱服务！

访问您的网站开始使用吧！🚀

---

如有问题，请查看 [Cloudflare 文档](https://developers.cloudflare.com/) 或提交 Issue。
