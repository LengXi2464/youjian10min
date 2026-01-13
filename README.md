# 临时邮箱服务

一个功能完整的临时邮箱服务，类似于 temp-mail.io，支持自动生成临时邮箱、接收邮件和域名后缀管理。

## ✨ 功能特性

### 用户功能

- 🎲 **自动生成临时邮箱** - 访问即可获得一个随机的临时邮箱地址
- ✏️ **自定义邮箱** - 可自定义邮箱前缀和选择域名后缀
- 📬 **实时接收邮件** - 自动刷新，实时显示收到的邮件
- ⏰ **自动过期** - 邮件 10 分钟后自动删除，保护隐私
- 📋 **一键复制** - 快速复制邮箱地址到剪贴板
- 🎨 **现代化 UI** - 渐变色、动画效果、响应式设计

### 管理功能

- 🔧 **域名后缀管理** - 添加、删除、启用/禁用邮箱域名后缀
- 🔐 **API Key 认证** - 基于密钥的安全认证系统
- 📊 **管理后台** - 直观的管理界面，实时统计数据
- ⚡ **实时更新** - 域名配置即时生效

## 🛠 技术栈

- **前端**: HTML5 + CSS3 + Vanilla JavaScript
- **后端**: Cloudflare Workers
- **存储**: Cloudflare KV
- **邮件**: Cloudflare Email Routing
- **部署**: Cloudflare Pages + GitHub Actions

## 📁 项目结构

```
邮箱服务器/
├── temp-mail-index.html    # 主页面
├── styles.css               # 主样式文件
├── app-main.js              # 前端逻辑
├── admin.html               # 管理后台页面
├── admin-styles.css         # 管理后台样式
├── admin-app.js             # 管理后台逻辑
├── workers/
│   ├── email-receiver.js    # 邮件接收Worker
│   ├── email-api.js         # 邮件查询API
│   ├── domain-admin-api.js  # 域名管理API
│   └── wrangler.toml        # Workers配置
└── .github/
    └── workflows/
        └── deploy.yml       # 自动部署配置
```

## 🚀 快速开始

### 前置要求

1. 一个 Cloudflare 账号
2. 一个域名并添加到 Cloudflare
3. GitHub 账号

### 步骤 1: 克隆仓库

```bash
git clone https://github.com/your-username/temp-mail-service.git
cd temp-mail-service
```

### 步骤 2: 配置 Cloudflare KV

在 Cloudflare Dashboard 中创建两个 KV 命名空间：

1. `temp-mail-emails` - 用于存储邮件
2. `temp-mail-domains` - 用于存储域名配置

记录下它们的 Namespace ID。

### 步骤 3: 配置 Workers

编辑 `workers/wrangler.toml`，填入您的 KV Namespace ID 和 API Key：

```toml
[[kv_namespaces]]
binding = "EMAILS_KV"
id = "your-emails-kv-namespace-id"  # 替换为实际ID

[[kv_namespaces]]
binding = "DOMAINS_KV"
id = "your-domains-kv-namespace-id"  # 替换为实际ID

[vars]
ADMIN_API_KEY = "your-secret-api-key-change-this"  # 设置强密码
```

### 步骤 4: 部署 Workers

```bash
# 安装 Wrangler
npm install -g wrangler

# 登录 Cloudflare
wrangler login

# 部署 Workers
wrangler deploy workers/email-api.js --name email-api
wrangler deploy workers/domain-admin-api.js --name domain-admin-api
wrangler deploy workers/email-receiver.js --name email-receiver
```

### 步骤 5: 配置 Email Routing

1. 在 Cloudflare Dashboard 进入您的域名
2. 转到 **Email** > **Email Routing**
3. 启用 Email Routing
4. 添加路由规则：
   - 捕获所有邮件：`*@yourdomain.com`
   - 发送到 Worker：选择 `email-receiver`

### 步骤 6: 部署到 Cloudflare Pages

#### 手动部署

1. 在 Cloudflare Dashboard 创建 Pages 项目
2. 连接您的 GitHub 仓库
3. 设置构建配置（无需构建命令，直接部署）
4. 点击部署

#### 自动部署（推荐）

1. 在 GitHub 仓库设置中添加 Secrets：
   - `CLOUDFLARE_API_TOKEN` - Cloudflare API Token
   - `CLOUDFLARE_ACCOUNT_ID` - Cloudflare Account ID
2. 推送代码到 main 分支即可自动部署

### 步骤 7: 添加域名后缀

1. 访问管理后台：`https://your-domain.com/admin.html`
2. 使用 API Key 登录（在 wrangler.toml 中设置的）
3. 添加您的域名后缀（必须是 Cloudflare Email Routing 支持的域名）

## 📖 使用说明

### 用户使用

1. 访问网站首页
2. 系统自动生成一个临时邮箱地址
3. 复制邮箱地址用于注册或接收邮件
4. 邮件会自动显示在页面上
5. 邮件 10 分钟后自动过期删除

### 管理员使用

详见 [ADMIN_GUIDE.md](./ADMIN_GUIDE.md)

## ⚙️ 配置说明

### API URL 配置

在 `app-main.js` 和 `admin-app.js` 中修改 API URL：

```javascript
const CONFIG = {
  API_URL: "/api", // 修改为您的 Worker URL
};
```

### 自动刷新间隔

在 `app-main.js` 中修改：

```javascript
const CONFIG = {
  AUTO_REFRESH_INTERVAL: 5000, // 5秒，单位：毫秒
};
```

## 🔒 安全建议

1. **更改默认 API Key**: 在 `wrangler.toml` 中设置强密码
2. **限制管理后台访问**: 使用 Cloudflare Access 保护 admin.html
3. **定期轮换密钥**: 定期更新 API Key
4. **监控日志**: 定期检查 Worker 日志

## 📝 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📧 联系方式

如有问题，请提交 Issue 或联系维护者。
