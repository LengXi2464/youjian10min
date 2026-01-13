// Email Receiver Worker - 处理Cloudflare Email Routing收到的邮件
// 部署到 Cloudflare Workers

export default {
    async email(message, env, ctx) {
        try {
            await handleEmail(message, env);
        } catch (error) {
            console.error('处理邮件失败:', error);
            message.setReject('处理邮件时发生错误');
        }
    }
};

async function handleEmail(message, env) {
    // 获取收件地址
    const to = message.to;
    const from = message.from;
    const subject = message.headers.get('subject') || '(无主题)';
    
    // 解析邮件内容
    const reader = message.raw.getReader();
    const chunks = [];
    
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
    }
    
    const rawEmail = new TextDecoder().decode(
        new Uint8Array(chunks.reduce((acc, chunk) => [...acc, ...chunk], []))
    );
    
    // 简单解析邮件正文
    const bodyMatch = rawEmail.match(/\r?\n\r?\n([\s\S]+)/);
    const body = bodyMatch ? bodyMatch[1].substring(0, 500) : '';
    
    // 检查是否是HTML邮件
    const htmlMatch = rawEmail.match(/Content-Type: text\/html[\s\S]*?\r?\n\r?\n([\s\S]+?)(?=\r?\n--|\r?\n\r?\n|$)/i);
    const html = htmlMatch ? htmlMatch[1] : null;
    
    // 创建邮件对象
    const emailData = {
        id: generateId(),
        from: from,
        to: to,
        subject: subject,
        body: body.trim(),
        html: html,
        preview: body.substring(0, 100).trim(),
        receivedAt: new Date().toISOString(),
    };
    
    // 存储到KV（10分钟过期）
    const key = `email:${to}:${Date.now()}`;
    await env.EMAILS_KV.put(
        key,
        JSON.stringify(emailData),
        { expirationTtl: 600 } // 10分钟过期
    );
    
    console.log(`邮件已存储: ${key}`);
}

// 生成唯一ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}
