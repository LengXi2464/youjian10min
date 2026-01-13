# GitHub 到 Cloudflare Pages 快速部署指南

## 步骤 1：推送到 GitHub

### 1.1 初始化 Git 仓库

在项目文件夹打开命令行（在文件夹空白处按住 Shift + 右键，选择"在此处打开 PowerShell 窗口"），然后执行：

```bash
git init
git add .
git commit -m "Initial commit: 临时邮箱服务"
```

### 1.2 创建 GitHub 仓库

1. 访问 https://github.com/new
2. 填写仓库名称，例如：`temp-email-service`
3. 选择 **Public**（公开）
4. **不要**勾选任何初始化选项（不要添加 README、.gitignore 等）
5. 点击 **Create repository**

### 1.3 推送代码到 GitHub

复制 GitHub 显示的命令，或者使用以下命令（替换为您的 GitHub 用户名）：

```bash
git remote add origin https://github.com/YOUR_USERNAME/temp-email-service.git
git branch -M main
git push -u origin main
```

**注意**：如果第一次使用 Git，可能需要配置：

```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

---

## 步骤 2：连接 Cloudflare Pages

### 2.1 登录 Cloudflare

1. 访问 https://dash.cloudflare.com/
2. 登录您的 Cloudflare 账户（没有的话免费注册一个）

### 2.2 创建 Pages 项目

1. 点击左侧菜单的 **Workers & Pages**
2. 点击 **Create application** 按钮
3. 选择 **Pages** 标签
4. 点击 **Connect to Git**

### 2.3 授权 GitHub

1. 点击 **Connect GitHub** 或 **Connect to GitHub**
2. 授权 Cloudflare 访问您的 GitHub 账户
3. 选择访问权限：
   - 可以选择 **All repositories**（所有仓库）
   - 或选择 **Only select repositories**，然后选择 `temp-email-service`

### 2.4 配置项目

选择刚才创建的 `temp-email-service` 仓库，然后配置：

| 配置项       | 值                   |
| ------------ | -------------------- |
| 项目名称     | `temp-email-service` |
| 生产分支     | `main`               |
| 框架预设     | None                 |
| 构建命令     | _留空_               |
| 构建输出目录 | `/`                  |
| 根目录       | `/`                  |

点击 **Save and Deploy**

### 2.5 等待部署

- 首次部署需要 1-2 分钟
- 部署完成后会显示绿色的 **Success**
- 您会得到一个网址，例如：`https://temp-email-service.pages.dev`

---

## 步骤 3：访问您的网站

🎉 部署完成！访问 Cloudflare 提供的网址即可使用您的临时邮箱服务。

例如：`https://temp-email-service.pages.dev`

---

## 自动部署

现在，每次您向 GitHub 推送代码，Cloudflare Pages 会自动重新部署：

```bash
# 修改代码后
git add .
git commit -m "更新说明"
git push
```

几秒钟后，Cloudflare 会自动检测到更新并重新部署。

---

## 后续步骤（可选）

### 添加自定义域名

1. 在 Cloudflare Pages 项目中，进入 **Custom domains**
2. 点击 **Set up a custom domain**
3. 输入您的域名（例如 `mail.yourdomain.com`）
4. Cloudflare 会自动添加 DNS 记录

### 配置 Workers 后端

如果您想启用真实的邮件接收功能，需要：

1. 部署 Workers（参见 `DEPLOYMENT.md` 详细说明）
2. 配置 Email Routing
3. 更新 `app.js` 中的 API 地址

---

## 常见问题

### Q: 推送到 GitHub 时要求输入密码？

**A**: GitHub 已不支持密码验证，需要使用 Personal Access Token：

1. 访问 https://github.com/settings/tokens
2. 点击 **Generate new token** → **Generate new token (classic)**
3. 勾选 `repo` 权限
4. 复制生成的 token
5. 在推送时，用户名填 GitHub 用户名，密码填这个 token

### Q: Cloudflare Pages 部署失败？

**A**: 检查：

- GitHub 仓库是否为 Public
- 是否有语法错误（检查浏览器控制台）
- 文件路径是否正确

### Q: 网站可以访问，但功能不工作？

**A**: 前端可以正常访问，但邮件接收需要配置后端：

- 当前是"离线模式"，显示模拟数据
- 要启用真实邮件，需要按照 `DEPLOYMENT.md` 配置 Workers

---

## 总结

✅ **只需前端**：推送到 GitHub → 连接 Cloudflare Pages → 完成  
✅ **自动部署**：每次推送代码，自动更新网站  
✅ **完全免费**：Cloudflare Pages 免费版足够使用

如有问题，请查看 `DEPLOYMENT.md` 获取更详细的说明。
