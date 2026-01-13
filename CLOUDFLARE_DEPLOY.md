# Cloudflare Pages 部署指南

本指南详细说明如何将临时邮箱服务部署到 Cloudflare Pages 并配置相关服务。

## 📋 前置要求

- ✅ Cloudflare 账号
- ✅ 一个已添加到 Cloudflare 的域名
- ✅ GitHub 账号
- ✅ 已创建的 GitHub 仓库

## 🚀 部署步骤

### 第一步：创建 KV 命名空间

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 在左侧菜单选择 **Workers & Pages**
3. 点击 **KV**
4. 创建两个命名空间：
   - `temp-mail-emails` - 用于存储邮件
   - `temp-mail-domains` - 用于存储域名配置
5. 记录下两个命名空间的 **Namespace ID**

### 第二步：配置 Workers

编辑 `workers/wrangler.toml` 文件：

```toml
[[kv_namespaces]]
binding = "EMAILS_KV"
id = "abc123..."  # 替换为 temp-mail-emails 的 ID

[[kv_namespaces]]
binding = "DOMAINS_KV"
id = "def456..."  # 替换为 temp-mail-domains 的 ID

[vars]
ADMIN_API_KEY = "your-super-secret-key-here"  # 设置强密码
```

### 第三步：部署 Cloudflare Workers

#### 安装 Wrangler CLI

```bash
npm install -g wrangler
```

#### 登录 Cloudflare

```bash
wrangler login
```

这会打开浏览器进行授权。

#### 部署三个 Workers

```bash
# 邮件 API Worker
wrangler deploy workers/email-api.js --name email-api

# 域名管理 API Worker
wrangler deploy workers/domain-admin-api.js --name domain-admin-api

# 邮件接收 Worker
wrangler deploy workers/email-receiver.js --name email-receiver
```

部署成功后会显示 Worker 的 URL。

### 第四步：配置 Email Routing

1. 在 Cloudflare Dashboard 选择您的域名
2. 转到 **Email** 标签
3. 点击 **Email Routing**
4. 点击 **Enable Email Routing**
5. 添加路由规则：
   - **Match type**: All addresses（捕获所有邮件）
   - **Destination**: Worker
   - **Worker**: 选择 `email-receiver`
6. 点击 **Save**

### 第五步：部署到 Cloudflare Pages

#### 方法 A：使用 Cloudflare Dashboard（推荐）

1. 在 Cloudflare Dashboard 中选择 **Workers & Pages**
2. 点击 **Create application**
3. 选择 **Pages** 标签
4. 点击 **Connect to Git**
5. 选择您的 GitHub 仓库
6. 配置构建设置：
   - **构建命令**: 留空
   - **构建输出目录**: `/`
   - **根目录**: `/`
7. 点击 **Save and Deploy**

#### 方法 B：使用 GitHub Actions 自动部署

1. 获取 Cloudflare API Token：

   - Dashboard → My Profile → API Tokens
   - Create Token → Edit Cloudflare Workers
   - 复制生成的 Token

2. 获取 Account ID：

   - Dashboard → Workers & Pages → Overview
   - 右侧显示 Account ID

3. 在 GitHub 仓库中添加 Secrets：

   - Settings → Secrets and variables → Actions
   - 添加以下 secrets：
     - `CLOUDFLARE_API_TOKEN`: 粘贴 API Token
     - `CLOUDFLARE_ACCOUNT_ID`: 粘贴 Account ID

4. 推送代码到 main 分支即可自动部署：
   ```bash
   git add .
   git commit -m "Deploy to Cloudflare"
   git push origin main
   ```

### 第六步：配置自定义域名

1. 在 Cloudflare Pages 项目设置中
2. 转到 **Custom domains**
3. 点击 **Set up a custom domain**
4. 输入您的域名（如 `mail.example.com`）
5. Cloudflare 会自动配置 DNS

### 第七步：添加初始域名后缀

1. 访问管理后台：`https://your-domain.com/admin.html`
2. 使用在 `wrangler.toml` 中设置的 API Key 登录
3. 添加您配置了 Email Routing 的域名

## 🔧 配置 Worker 路由

### 在 Cloudflare Pages 中绑定 Workers

1. 在 Pages 项目设置中，转到 **Functions**
2. 添加 KV 命名空间绑定：
   - `EMAILS_KV` → temp-mail-emails
   - `DOMAINS_KV` → temp-mail-domains
3. 添加环境变量：
   - `ADMIN_API_KEY` → your-secret-key

### 配置 \_routes.json（可选）

在项目根目录创建 `_routes.json`：

```json
{
  "version": 1,
  "include": ["/api/*", "/admin/*"],
  "exclude": []
}
```

## ✅ 验证部署

### 测试前端

1. 访问主页：`https://your-domain.com/temp-mail-index.html`
2. 检查是否自动生成邮箱地址
3. 点击"复制"按钮测试复制功能
4. 点击"随机"按钮生成新邮箱

### 测试邮件接收

1. 复制生成的邮箱地址
2. 从其他邮箱发送测试邮件到该地址
3. 等待几秒钟，点击"刷新"按钮
4. 检查邮件是否显示在列表中

### 测试管理后台

1. 访问：`https://your-domain.com/admin.html`
2. 使用 API Key 登录
3. 测试添加域名
4. 测试启用/禁用域名
5. 测试删除域名

## 🔍 故障排除

### 邮件无法接收

**检查项**：

1. Email Routing 是否已启用
2. 路由规则是否正确配置
3. email-receiver Worker 是否正确部署
4. KV 命名空间绑定是否正确

**解决方案**：

```bash
# 查看 Worker 日志
wrangler tail email-receiver

# 测试邮件路由
# 发送邮件后查看日志输出
```

### API 请求失败

**检查项**：

1. Worker URL 是否正确
2. CORS 配置是否正确
3. KV 绑定是否正确

**解决方案**：

- 在浏览器 Console 查看具体错误
- 检查 Network 面板的请求详情
- 验证 `app-main.js` 中的 API_URL 配置

### 管理后台无法登录

**检查项**：

1. API Key 是否正确
2. domain-admin-api Worker 是否部署
3. 环境变量是否设置

**解决方案**：

```bash
# 重新部署 domain-admin-api
wrangler deploy workers/domain-admin-api.js --name domain-admin-api

# 检查环境变量
wrangler secret list
```

## 📊 监控和日志

### 查看 Worker 日志

```bash
# 实时查看日志
wrangler tail email-api
wrangler tail domain-admin-api
wrangler tail email-receiver
```

### 查看 Pages 部署日志

1. Cloudflare Dashboard → Workers & Pages
2. 选择您的 Pages 项目
3. 查看 **Deployments** 标签

### 监控邮件接收

1. Dashboard → Email → Email Routing
2. 查看 **Email workers** 部分
3. 检查处理的邮件数量和状态

## 🔐 安全加固

### 1. 启用 Cloudflare Access

保护管理后台：

```bash
# 在 Cloudflare Dashboard
Zero Trust → Access → Applications
→ Add an application
→ 设置只允许特定邮箱访问 admin.html
```

### 2. 限制 Worker 调用频率

在 Worker 中添加速率限制：

```javascript
// 使用 Cloudflare KV 实现简单的速率限制
const rateLimit = async (key, limit, window) => {
  const now = Date.now();
  const windowStart = now - window * 1000;

  const requests = await env.RATE_LIMIT_KV.get(key);
  const count = requests ? parseInt(requests) : 0;

  if (count >= limit) {
    return false; // 超过限制
  }

  await env.RATE_LIMIT_KV.put(key, (count + 1).toString(), {
    expirationTtl: window,
  });

  return true; // 允许请求
};
```

### 3. 添加 CAPTCHA（可选）

使用 Cloudflare Turnstile 保护表单：

1. Dashboard → Turnstile
2. 创建新站点
3. 在前端添加 Turnstile 组件
4. 在 Worker 中验证令牌

## 📈 性能优化

1. **启用缓存**：在 Pages 设置中配置缓存规则
2. **压缩资源**：启用 Brotli 压缩
3. **CDN 加速**：Cloudflare 自动提供全球 CDN
4. **Worker 优化**：减少 KV 读写次数

## 🔄 更新部署

### 更新前端代码

```bash
git add .
git commit -m "Update frontend"
git push origin main
# GitHub Actions 会自动部署
```

### 更新 Workers

```bash
wrangler deploy workers/email-api.js --name email-api
wrangler deploy workers/domain-admin-api.js --name domain-admin-api
wrangler deploy workers/email-receiver.js --name email-receiver
```

## 💰 成本估算

Cloudflare 免费套餐限制：

- **Workers**: 100,000 请求/天
- **KV**: 100,000 读/天，1,000 写/天
- **Email Routing**: 免费（有合理使用限制）
- **Pages**: 无限请求

对于个人使用或小型项目，免费套餐已经足够。

## 📞 获取帮助

- [Cloudflare Workers 文档](https://developers.cloudflare.com/workers/)
- [Cloudflare Pages 文档](https://developers.cloudflare.com/pages/)
- [Email Routing 文档](https://developers.cloudflare.com/email-routing/)
- [GitHub Issues](https://github.com/your-repo/issues)
