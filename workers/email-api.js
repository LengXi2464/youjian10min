// Email API Worker - 提供邮件查询API
// 部署到 Cloudflare Workers

export default {
    async fetch(request, env) {
        return handleRequest(request, env);
    }
};

async function handleRequest(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    
    // CORS 处理
    if (request.method === 'OPTIONS') {
        return handleCORS();
    }
    
    try {
        // 获取指定邮箱的所有邮件
        if (path.match(/^\/api\/emails\/[^/]+$/) && request.method === 'GET') {
            const email = decodeURIComponent(path.split('/').pop());
            return await getEmails(email, env);
        }
        
        // 获取单封邮件详情
        if (path.match(/^\/api\/email\/[^/]+$/) && request.method === 'GET') {
            const emailId = decodeURIComponent(path.split('/').pop());
            return await getEmailById(emailId, env);
        }
        
        // 删除邮箱及其所有邮件
        if (path.match(/^\/api\/emails\/[^/]+$/) && request.method === 'DELETE') {
            const email = decodeURIComponent(path.split('/').pop());
            return await deleteEmails(email, env);
        }
        
        return jsonResponse({ error: '未找到路由' }, 404);
        
    } catch (error) {
        console.error('请求处理错误:', error);
        return jsonResponse({ error: '服务器错误' }, 500);
    }
}

// 获取邮箱的所有邮件
async function getEmails(emailAddress, env) {
    try {
        const messages = [];
        const prefix = `email:${emailAddress}:`;
        
        // 列出所有匹配的key
        const list = await env.EMAILS_KV.list({ prefix: prefix });
        
        // 获取所有邮件内容
        for (const key of list.keys) {
            const msgJson = await env.EMAILS_KV.get(key.name);
            if (msgJson) {
                messages.push(JSON.parse(msgJson));
            }
        }
        
        // 按时间倒序排列
        messages.sort((a, b) => 
            new Date(b.receivedAt) - new Date(a.receivedAt)
        );
        
        return jsonResponse({
            success: true,
            messages: messages,
            count: messages.length
        });
        
    } catch (error) {
        console.error('获取邮件失败:', error);
        return jsonResponse({ error: '获取邮件失败' }, 500);
    }
}

// 根据ID获取邮件
async function getEmailById(emailId, env) {
    try {
        // 这里需要遍历所有邮件来查找ID
        // 在实际生产环境中，应该维护一个ID到key的映射
        const list = await env.EMAILS_KV.list({ prefix: 'email:' });
        
        for (const key of list.keys) {
            const msgJson = await env.EMAILS_KV.get(key.name);
            if (msgJson) {
                const msg = JSON.parse(msgJson);
                if (msg.id === emailId) {
                    return jsonResponse({
                        success: true,
                        message: msg
                    });
                }
            }
        }
        
        return jsonResponse({ error: '邮件不存在' }, 404);
        
    } catch (error) {
        console.error('获取邮件失败:', error);
        return jsonResponse({ error: '获取邮件失败' }, 500);
    }
}

// 删除邮箱的所有邮件
async function deleteEmails(emailAddress, env) {
    try {
        const prefix = `email:${emailAddress}:`;
        const list = await env.EMAILS_KV.list({ prefix: prefix });
        
        // 删除所有匹配的key
        const deletePromises = list.keys.map(key => 
            env.EMAILS_KV.delete(key.name)
        );
        
        await Promise.all(deletePromises);
        
        return jsonResponse({
            success: true,
            message: '邮箱已删除',
            deleted: list.keys.length
        });
        
    } catch (error) {
        console.error('删除邮件失败:', error);
        return jsonResponse({ error: '删除邮件失败' }, 500);
    }
}

// JSON响应
function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status: status,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        }
    });
}

// CORS预检处理
function handleCORS() {
    return new Response(null, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Max-Age': '86400',
        }
    });
}
