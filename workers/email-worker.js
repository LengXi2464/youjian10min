/**
 * Cloudflare Email Worker - 邮件接收处理器
 *
 * 此 Worker 接收来自 Cloudflare Email Routing 的邮件
 * 解析邮件内容并存储到 Workers KV
 */

export default {
  async email(message, env, ctx) {
    try {
      // 解析收件人地址
      const to = message.to;
      const from = message.from;
      const mailbox = to.split("@")[0]; // 获取邮箱用户名部分
      const domain = to.split("@")[1]; // 获取域名部分

      // 生成邮件 ID
      const emailId = crypto.randomUUID();
      const timestamp = Date.now();

      // 读取邮件内容
      const rawEmail = await new Response(message.raw).text();

      // 解析邮件头和正文
      const headers = {};
      const lines = rawEmail.split("\n");
      let i = 0;

      // 解析邮件头
      while (i < lines.length && lines[i].trim() !== "") {
        const line = lines[i];
        if (line.includes(":")) {
          const [key, ...valueParts] = line.split(":");
          headers[key.trim().toLowerCase()] = valueParts.join(":").trim();
        }
        i++;
      }

      // 获取邮件正文
      const body = lines.slice(i + 1).join("\n");

      // 构建邮件对象
      const email = {
        id: emailId,
        to,
        from,
        subject: headers["subject"] || "(无主题)",
        timestamp,
        body,
        headers,
        read: false,
      };

      // 存储邮件到 KV
      // 键格式: email:{mailbox}@{domain}:{emailId}
      const emailKey = `email:${mailbox}@${domain}:${emailId}`;
      await env.EMAIL_STORAGE.put(emailKey, JSON.stringify(email), {
        expirationTtl: 86400, // 24小时后自动删除
      });

      // 更新邮箱的邮件列表
      const listKey = `list:${mailbox}@${domain}`;
      let emailList = [];

      const existingList = await env.EMAIL_STORAGE.get(listKey);
      if (existingList) {
        emailList = JSON.parse(existingList);
      }

      // 添加新邮件到列表开头
      emailList.unshift({
        id: emailId,
        from,
        subject: email.subject,
        timestamp,
        read: false,
      });

      // 限制列表大小（最多保存100封邮件）
      if (emailList.length > 100) {
        const removedEmail = emailList.pop();
        // 删除超出的邮件
        await env.EMAIL_STORAGE.delete(
          `email:${mailbox}@${domain}:${removedEmail.id}`
        );
      }

      // 保存更新的邮件列表
      await env.EMAIL_STORAGE.put(listKey, JSON.stringify(emailList), {
        expirationTtl: 86400,
      });

      console.log(`邮件已接收并存储: ${emailId} for ${to}`);
    } catch (error) {
      console.error("邮件处理错误:", error);
      // 即使出错也要接收邮件，避免退回
    }
  },
};
