# 临时邮箱服务

一个现代化的临时邮箱服务，基于 Cloudflare Pages + Workers + Email Routing 构建，支持自定义邮箱后缀管理。

![临时邮箱服务](https://img.shields.io/badge/Cloudflare-Workers-orange?style=flat-square) ![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)

## ✨ 功能特性

- 📧 **即时创建临时邮箱** - 无需注册，快速生成临时邮箱地址
- 🎲 **随机生成** - 一键生成随机邮箱名
- 🔧 **自定义域名后缀** - 添加和管理自己的邮箱域名后缀
- 📬 **实时接收邮件** - 基于 Cloudflare Email Routing 实时接收邮件
- 💾 **自动存储** - 邮件自动存储在 Workers KV 中
- 🎨 **现代化 UI** - 紫色渐变设计，响应式布局
- 🌐 **离线支持** - 提供离线模式，即使 API 不可用也能使用基础功能
- 🚀 **无服务器架构** - 完全基于 Cloudflare 免费服务

## 🏗️ 技术架构

### 前端

- **HTML5 + CSS3 + JavaScript** - 原生技术，无需构建工具
- **Cloudflare Pages** - 静态网站托管
- **响应式设计** - 兼容桌面和移动设备

### 后端

- **Cloudflare Workers** - 无服务器 API
- **Cloudflare Email Routing** - 邮件接收服务
- **Workers KV** - 键值存储数据库

### 部署

- **GitHub** - 代码托管和版本控制
- **自动部署** - GitHub 推送后自动部署到 Cloudflare Pages

## 📁 项目结构

```
邮箱服务器/
├── index.html          # 主页面
├── style.css           # 样式表
├── app.js              # 前端逻辑
├── _headers            # Cloudflare Pages 响应头配置
├── _redirects          # 重定向规则
├── .gitignore         # Git 忽略文件
├── workers/           # Cloudflare Workers
│   ├── email-worker.js    # 邮件接收处理器
│   ├── api-worker.js      # REST API 服务
│   └── wrangler.toml      # Workers 配置
├── README.md          # 项目说明（本文件）
└── DEPLOYMENT.md      # 详细部署指南
```

## 🚀 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/your-username/temp-email-service.git
cd temp-email-service
```

### 2. 本地预览

直接在浏览器中打开 `index.html` 文件即可预览前端界面（离线模式）。

### 3. 部署到 Cloudflare

详细部署步骤请查看 [DEPLOYMENT.md](DEPLOYMENT.md)

## ⚙️ 配置说明

### 前端配置

编辑 `app.js` 文件中的配置：

```javascript
const CONFIG = {
  API_BASE_URL: "https://api.your-domain.com", // 替换为您的 Workers API 地址
  REFRESH_INTERVAL: 10000, // 邮件刷新间隔（毫秒）
};
```

### Workers 配置

编辑 `workers/wrangler.toml` 文件：

```toml
# 替换为您的 KV 命名空间 ID
[[kv_namespaces]]
binding = "EMAIL_STORAGE"
id = "YOUR_KV_NAMESPACE_ID"

# 替换为您的 API 域名
[[routes]]
pattern = "api.your-domain.com/*"
zone_name = "your-domain.com"
```

## 📖 使用方法

### 创建临时邮箱

1. 输入自定义的邮箱用户名，或点击"随机"按钮生成
2. 从下拉菜单选择邮箱后缀
3. 点击"创建"按钮

### 管理邮箱后缀

1. 点击"管理邮箱后缀"按钮
2. 在弹出的对话框中输入新的域名
3. 点击"添加"按钮
4. 可以删除不需要的域名（至少保留一个）

**注意**：添加的域名必须在 Cloudflare 上配置了 Email Routing 才能接收邮件。

### 查看邮件

1. 邮件列表会自动刷新（默认 10 秒）
2. 点击邮件项查看详情
3. 可以删除不需要的邮件

## 🔧 API 接口

### 获取域名列表

```
GET /api/domains
```

### 添加域名

```
POST /api/domains
Content-Type: application/json

{
  "domain": "example.com"
}
```

### 删除域名

```
DELETE /api/domains/{domain}
```

### 获取邮件列表

```
GET /api/emails/{mailbox}
```

### 获取邮件详情

```
GET /api/emails/{mailbox}/{emailId}
```

### 删除邮件

```
DELETE /api/emails/{mailbox}/{emailId}
```

## 🔒 安全性

- ✅ CORS 配置确保 API 安全访问
- ✅ 邮件自动过期（24 小时）
- ✅ 输入验证防止注入攻击
- ✅ CSP 和安全响应头
- ✅ HTML 转义防止 XSS

## 📱 浏览器兼容性

- ✅ Chrome/Edge 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ 移动浏览器

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

## 🙏 致谢

- [Cloudflare Workers](https://workers.cloudflare.com/)
- [Cloudflare Pages](https://pages.cloudflare.com/)
- [Cloudflare Email Routing](https://developers.cloudflare.com/email-routing/)

## 📞 支持

如有问题，请提交 [Issue](https://github.com/your-username/temp-email-service/issues)

---

**提示**：首次部署后需要在 Cloudflare Dashboard 中配置 Email Routing 和 Workers 绑定，详见 [DEPLOYMENT.md](DEPLOYMENT.md)
