// Domain Admin API Worker - 域名后缀管理API
// 部署到 Cloudflare Workers

export default {
    async fetch(request, env) {
        return handleRequest(request, env);
    }
};

// 主请求处理函数
async function handleRequest(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    
    // CORS 处理
    if (request.method === 'OPTIONS') {
        return handleCORS();
    }
    
    // 路由分发
    try {
        // 公开API - 获取启用的域名列表
        if (path === '/api/domains/active' && request.method === 'GET') {
            return await getActiveDomains(env);
        }
        
        // 以下是管理员API，需要验证
        const isAuthorized = await verifyAuth(request, env);
        if (!isAuthorized) {
            return jsonResponse({ error: '未授权访问' }, 401);
        }
        
        // 管理员API路由
        if (path === '/admin/domains') {
            if (request.method === 'GET') {
                return await getAllDomains(env);
            } else if (request.method === 'POST') {
                return await addDomain(request, env);
            }
        }
        
        if (path.startsWith('/admin/domains/')) {
            const domain = decodeURIComponent(path.split('/').pop());
            
            if (request.method === 'DELETE') {
                return await deleteDomain(domain, env);
            } else if (request.method === 'PATCH') {
                return await updateDomain(domain, request, env);
            }
        }
        
        return jsonResponse({ error: '未找到路由' }, 404);
        
    } catch (error) {
        console.error('请求处理错误:', error);
        return jsonResponse({ error: '服务器错误', message: error.message }, 500);
    }
}

// ==================== 认证函数 ====================

async function verifyAuth(request, env) {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) return false;
    
    const token = authHeader.replace('Bearer ', '');
    const validToken = env.ADMIN_API_KEY || 'your-secret-api-key-here';
    
    return token === validToken;
}

// ==================== 域名管理函数 ====================

// 获取所有启用的域名（公开API）
async function getActiveDomains(env) {
    try {
        const domainsListJson = await env.DOMAINS_KV.get('domains:list');
        const domainsList = domainsListJson ? JSON.parse(domainsListJson) : [];
        
        // 过滤出启用的域名
        const activeDomains = [];
        for (const domainName of domainsList) {
            const domainJson = await env.DOMAINS_KV.get(`domain:${domainName}`);
            if (domainJson) {
                const domain = JSON.parse(domainJson);
                if (domain.enabled) {
                    activeDomains.push(domainName);
                }
            }
        }
        
        return jsonResponse({ 
            success: true,
            domains: activeDomains,
            count: activeDomains.length
        });
        
    } catch (error) {
        console.error('获取启用域名失败:', error);
        return jsonResponse({ error: '获取域名失败' }, 500);
    }
}

// 获取所有域名（管理员API）
async function getAllDomains(env) {
    try {
        const domainsListJson = await env.DOMAINS_KV.get('domains:list');
        const domainsList = domainsListJson ? JSON.parse(domainsListJson) : [];
        
        const domains = [];
        for (const domainName of domainsList) {
            const domainJson = await env.DOMAINS_KV.get(`domain:${domainName}`);
            if (domainJson) {
                domains.push(JSON.parse(domainJson));
            }
        }
        
        return jsonResponse({
            success: true,
            domains: domains,
            count: domains.length
        });
        
    } catch (error) {
        console.error('获取所有域名失败:', error);
        return jsonResponse({ error: '获取域名失败' }, 500);
    }
}

// 添加新域名
async function addDomain(request, env) {
    try {
        const data = await request.json();
        const { domain, enabled = true } = data;
        
        if (!domain || !isValidDomain(domain)) {
            return jsonResponse({ error: '无效的域名格式' }, 400);
        }
        
        // 检查域名是否已存在
        const existing = await env.DOMAINS_KV.get(`domain:${domain}`);
        if (existing) {
            return jsonResponse({ error: '域名已存在' }, 409);
        }
        
        // 创建域名对象
        const domainObj = {
            domain: domain,
            enabled: enabled,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        // 保存域名
        await env.DOMAINS_KV.put(`domain:${domain}`, JSON.stringify(domainObj));
        
        // 更新域名列表
        const domainsListJson = await env.DOMAINS_KV.get('domains:list');
        const domainsList = domainsListJson ? JSON.parse(domainsListJson) : [];
        if (!domainsList.includes(domain)) {
            domainsList.push(domain);
            await env.DOMAINS_KV.put('domains:list', JSON.stringify(domainsList));
        }
        
        return jsonResponse({
            success: true,
            message: '域名添加成功',
            domain: domainObj
        }, 201);
        
    } catch (error) {
        console.error('添加域名失败:', error);
        return jsonResponse({ error: '添加域名失败', message: error.message }, 500);
    }
}

// 删除域名
async function deleteDomain(domain, env) {
    try {
        // 检查域名是否存在
        const existing = await env.DOMAINS_KV.get(`domain:${domain}`);
        if (!existing) {
            return jsonResponse({ error: '域名不存在' }, 404);
        }
        
        // 删除域名
        await env.DOMAINS_KV.delete(`domain:${domain}`);
        
        // 从列表中移除
        const domainsListJson = await env.DOMAINS_KV.get('domains:list');
        const domainsList = domainsListJson ? JSON.parse(domainsListJson) : [];
        const newList = domainsList.filter(d => d !== domain);
        await env.DOMAINS_KV.put('domains:list', JSON.stringify(newList));
        
        return jsonResponse({
            success: true,
            message: '域名删除成功'
        });
        
    } catch (error) {
        console.error('删除域名失败:', error);
        return jsonResponse({ error: '删除域名失败' }, 500);
    }
}

// 更新域名状态
async function updateDomain(domain, request, env) {
    try {
        const data = await request.json();
        const { enabled } = data;
        
        if (typeof enabled !== 'boolean') {
            return jsonResponse({ error: '无效的enabled值' }, 400);
        }
        
        // 获取现有域名
        const existingJson = await env.DOMAINS_KV.get(`domain:${domain}`);
        if (!existingJson) {
            return jsonResponse({ error: '域名不存在' }, 404);
        }
        
        const domainObj = JSON.parse(existingJson);
        domainObj.enabled = enabled;
        domainObj.updatedAt = new Date().toISOString();
        
        // 保存更新
        await env.DOMAINS_KV.put(`domain:${domain}`, JSON.stringify(domainObj));
        
        return jsonResponse({
            success: true,
            message: '域名状态更新成功',
            domain: domainObj
        });
        
    } catch (error) {
        console.error('更新域名失败:', error);
        return jsonResponse({ error: '更新域名失败' }, 500);
    }
}

// ==================== 工具函数 ====================

// 验证域名格式
function isValidDomain(domain) {
    const domainRegex = /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
    return domainRegex.test(domain);
}

// JSON响应
function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status: status,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
    });
}

// CORS预检处理
function handleCORS() {
    return new Response(null, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Max-Age': '86400',
        }
    });
}
