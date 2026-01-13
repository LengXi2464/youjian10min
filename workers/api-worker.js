/**
 * Cloudflare API Worker - REST API 服务
 * 
 * 提供邮箱后缀管理、邮件查询等 API 接口
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // CORS 处理
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // 处理 OPTIONS 预检请求
    if (method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // 路由处理
      if (path === '/api/domains' && method === 'GET') {
        return await getDomains(env, corsHeaders);
      }
      
      if (path === '/api/domains' && method === 'POST') {
        return await addDomain(request, env, corsHeaders);
      }
      
      if (path.startsWith('/api/domains/') && method === 'DELETE') {
        const domain = path.split('/api/domains/')[1];
        return await deleteDomain(domain, env, corsHeaders);
      }
      
      if (path.match(/^\/api\/emails\/[^\/]+$/) && method === 'GET') {
        const mailbox = path.split('/api/emails/')[1];
        return await getEmailList(mailbox, env, corsHeaders);
      }
      
      if (path.match(/^\/api\/emails\/[^\/]+\/[^\/]+$/) && method === 'GET') {
        const parts = path.split('/api/emails/')[1].split('/');
        const mailbox = parts[0];
        const emailId = parts[1];
        return await getEmailDetail(mailbox, emailId, env, corsHeaders);
      }
      
      if (path.match(/^\/api\/emails\/[^\/]+\/[^\/]+$/) && method === 'DELETE') {
        const parts = path.split('/api/emails/')[1].split('/');
        const mailbox = parts[0];
        const emailId = parts[1];
        return await deleteEmail(mailbox, emailId, env, corsHeaders);
      }

      return new Response('Not Found', { status: 404, headers: corsHeaders });
    } catch (error) {
      console.error('API Error:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};

/**
 * 获取可用的邮箱域名列表
 */
async function getDomains(env, corsHeaders) {
  const domainsKey = 'config:domains';
  let domains = [];
  
  const storedDomains = await env.EMAIL_STORAGE.get(domainsKey);
  if (storedDomains) {
    domains = JSON.parse(storedDomains);
  } else {
    // 默认域名（首次使用时）
    domains = ['example.com'];
    await env.EMAIL_STORAGE.put(domainsKey, JSON.stringify(domains));
  }
  
  return new Response(JSON.stringify({ domains }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

/**
 * 添加新的邮箱域名
 */
async function addDomain(request, env, corsHeaders) {
  const { domain } = await request.json();
  
  if (!domain || !domain.includes('.')) {
    return new Response(JSON.stringify({ error: '无效的域名格式' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  
  const domainsKey = 'config:domains';
  let domains = [];
  
  const storedDomains = await env.EMAIL_STORAGE.get(domainsKey);
  if (storedDomains) {
    domains = JSON.parse(storedDomains);
  }
  
  // 检查是否已存在
  if (domains.includes(domain)) {
    return new Response(JSON.stringify({ error: '域名已存在' }), {
      status: 409,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  
  domains.push(domain);
  await env.EMAIL_STORAGE.put(domainsKey, JSON.stringify(domains));
  
  return new Response(JSON.stringify({ success: true, domains }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

/**
 * 删除邮箱域名
 */
async function deleteDomain(domain, env, corsHeaders) {
  const domainsKey = 'config:domains';
  let domains = [];
  
  const storedDomains = await env.EMAIL_STORAGE.get(domainsKey);
  if (storedDomains) {
    domains = JSON.parse(storedDomains);
  }
  
  domains = domains.filter(d => d !== domain);
  await env.EMAIL_STORAGE.put(domainsKey, JSON.stringify(domains));
  
  return new Response(JSON.stringify({ success: true, domains }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

/**
 * 获取邮箱的邮件列表
 */
async function getEmailList(mailbox, env, corsHeaders) {
  const listKey = `list:${mailbox}`;
  let emailList = [];
  
  const storedList = await env.EMAIL_STORAGE.get(listKey);
  if (storedList) {
    emailList = JSON.parse(storedList);
  }
  
  return new Response(JSON.stringify({ emails: emailList }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

/**
 * 获取邮件详情
 */
async function getEmailDetail(mailbox, emailId, env, corsHeaders) {
  const emailKey = `email:${mailbox}:${emailId}`;
  
  const emailData = await env.EMAIL_STORAGE.get(emailKey);
  if (!emailData) {
    return new Response(JSON.stringify({ error: '邮件不存在' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  
  const email = JSON.parse(emailData);
  
  // 标记为已读
  email.read = true;
  await env.EMAIL_STORAGE.put(emailKey, JSON.stringify(email), {
    expirationTtl: 86400
  });
  
  // 更新列表中的已读状态
  const listKey = `list:${mailbox}`;
  const storedList = await env.EMAIL_STORAGE.get(listKey);
  if (storedList) {
    const emailList = JSON.parse(storedList);
    const emailItem = emailList.find(e => e.id === emailId);
    if (emailItem) {
      emailItem.read = true;
      await env.EMAIL_STORAGE.put(listKey, JSON.stringify(emailList), {
        expirationTtl: 86400
      });
    }
  }
  
  return new Response(JSON.stringify({ email }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

/**
 * 删除邮件
 */
async function deleteEmail(mailbox, emailId, env, corsHeaders) {
  const emailKey = `email:${mailbox}:${emailId}`;
  
  // 删除邮件数据
  await env.EMAIL_STORAGE.delete(emailKey);
  
  // 从列表中移除
  const listKey = `list:${mailbox}`;
  const storedList = await env.EMAIL_STORAGE.get(listKey);
  if (storedList) {
    let emailList = JSON.parse(storedList);
    emailList = emailList.filter(e => e.id !== emailId);
    await env.EMAIL_STORAGE.put(listKey, JSON.stringify(emailList), {
      expirationTtl: 86400
    });
  }
  
  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}
