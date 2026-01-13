# 管理员使用指南

## 🔐 登录管理后台

1. 访问管理后台页面：`https://your-domain.com/admin.html`
2. 输入 API Key（在 `workers/wrangler.toml` 中配置的 `ADMIN_API_KEY`）
3. 点击"登录"

> ⚠️ **重要**: 首次部署时，请立即修改 `wrangler.toml` 中的默认 API Key！

## 📊 管理后台功能

### 统计概览

登录后可以看到三个统计卡片：

- **总域名数** - 系统中配置的所有域名数量
- **已启用** - 当前可用于生成临时邮箱的域名数量
- **已禁用** - 暂时停用的域名数量

### 域名列表

管理后台显示所有域名后缀及其状态：

- **域名** - 域名后缀（如 example.com）
- **状态** - 启用或禁用
- **创建时间** - 域名添加时间
- **更新时间** - 最后修改时间
- **操作** - 启用/禁用、删除按钮

## ➕ 添加域名后缀

1. 点击右上角的 "添加域名" 按钮
2. 在弹出框中输入域名（如：`example.com`）
   - 必须是有效的域名格式
   - 不能包含 @ 符号
   - 只能包含字母、数字、点和连字符
3. 选择是否启用此域名
4. 点击"添加域名"

### 添加前的准备工作

在添加域名后缀之前，您必须：

1. **拥有该域名** - 域名必须已经添加到您的 Cloudflare 账户
2. **启用 Email Routing** - 在 Cloudflare Dashboard 中为该域名启用 Email Routing
3. **配置路由规则** - 设置捕获所有邮件到 email-receiver Worker

配置步骤：

```
Cloudflare Dashboard → 选择域名 → Email → Email Routing
→ 启用 Email Routing
→ 添加路由规则: *@yourdomain.com → Worker: email-receiver
```

## 🔄 启用/禁用域名

1. 在域名列表中找到目标域名
2. 点击操作列中的切换按钮（√ 或 ×）
3. 系统会自动更新状态

**注意**：

- 禁用的域名不会出现在用户的域名选择列表中
- 已生成的使用该域名的邮箱仍可接收邮件
- 禁用操作是可逆的，随时可以重新启用

## 🗑 删除域名

1. 在域名列表中找到目标域名
2. 点击操作列中的删除按钮（垃圾桶图标）
3. 在确认对话框中点击"删除"

**警告**：

- 删除操作无法撤销！
- 删除后使用该域名的临时邮箱将无法继续使用
- 建议先禁用域名测试影响，确认后再删除

## 🔑 API Key 管理

### 生成强密码 API Key

推荐使用高强度的随机字符串作为 API Key：

```bash
# 在 Linux/Mac 上生成
openssl rand -hex 32

# 或使用在线工具生成 64 位随机字符串
```

### 更新 API Key

1. 编辑 `workers/wrangler.toml` 文件
2. 修改 `ADMIN_API_KEY` 的值
3. 重新部署 Workers：
   ```bash
   wrangler deploy workers/domain-admin-api.js --name domain-admin-api
   ```
4. 使用新的 API Key 登录管理后台

### 密钥轮换建议

- 定期更换 API Key（建议每 3-6 个月）
- 如果怀疑密钥泄露，立即更换
- 不要在代码中硬编码 API Key
- 不要将 API Key 提交到公开的 Git 仓库

## 🛡 安全最佳实践

### 1. 使用 Cloudflare Access 保护管理后台

在 Cloudflare Dashboard 中配置 Access 策略：

```
Cloudflare Dashboard → Zero Trust → Access → Applications
→ Add an application
→ 选择 Self-hosted
→ Application domain: admin.your-domain.com
→ 设置允许访问的邮箱或 IP
```

### 2. 启用审计日志

在 Workers 中添加日志记录：

- 记录所有管理操作
- 记录登录尝试
- 定期检查异常活动

### 3. 限制 IP 访问

在 Worker 中添加 IP 白名单检查：

```javascript
const ALLOWED_IPS = ["your.ip.address"];

if (!ALLOWED_IPS.includes(request.headers.get("CF-Connecting-IP"))) {
  return new Response("Forbidden", { status: 403 });
}
```

### 4. 使用 HTTPS

确保：

- 始终通过 HTTPS 访问管理后台
- 启用 Cloudflare 的 SSL/TLS 设置
- 使用"完全（严格）"SSL 模式

## 🔧 故障排除

### 问题：无法登录管理后台

**解决方案**：

1. 确认 API Key 正确
2. 检查 Browser Console 是否有错误
3. 确认 domain-admin-api Worker 已正确部署
4. 检查 API URL 配置是否正确

### 问题：添加域名失败

**可能原因**：

- 域名格式不正确
- 域名已存在
- KV 命名空间配置错误

**解决方案**：

1. 检查域名格式（不含 @，只有域名部分）
2. 在列表中查看是否已存在
3. 验证 `wrangler.toml` 中的 KV 配置

### 问题：启用/禁用操作无响应

**解决方案**：

1. 刷新页面重试
2. 检查 Network 面板查看请求状态
3. 确认 Worker 正常运行

### 问题：删除域名后仍显示

**解决方案**：

1. 刷新页面
2. 清除浏览器缓存
3. 检查 KV 存储中是否真正删除

## 📝 常见任务清单

### 初始设置

- [ ] 更改默认 API Key
- [ ] 添加主域名后缀
- [ ] 测试邮件接收功能
- [ ] 配置 Cloudflare Access（可选）

### 日常维护

- [ ] 检查域名状态
- [ ] 监控邮件接收量
- [ ] 查看 Worker 日志
- [ ] 更新文档

### 定期任务

- [ ] 轮换 API Key（每 3-6 个月）
- [ ] 审查域名列表
- [ ] 备份配置
- [ ] 检查安全日志

## 💡 高级技巧

### 批量添加域名

如果您有多个域名要添加，可以使用 Cloudflare API：

```bash
curl -X POST "https://your-worker-url/admin/domains" \
  -H "Authorization: Bearer your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"domain": "example.com", "enabled": true}'
```

### 使用环境变量

在不同环境使用不同的 API Key：

```bash
# 开发环境
wrangler dev --var ADMIN_API_KEY:dev-key

# 生产环境
wrangler deploy --var ADMIN_API_KEY:prod-key
```

## 📞 获取帮助

如遇到问题：

1. 查看本指南的故障排除部分
2. 检查 [README.md](./README.md) 的常见问题
3. 查看 Cloudflare Workers 日志
4. 在 GitHub 仓库提交 Issue
