// ==================== 配置 ====================
const CONFIG = {
    API_URL: '/api', // Cloudflare Worker API 地址
    AUTO_REFRESH_INTERVAL: 5000, // 自动刷新间隔（毫秒）
    EMAIL_EXPIRY: 600000, // 邮件过期时间（10分钟）
};

// ==================== 状态管理 ====================
const state = {
    currentEmail: null,
    messages: [],
    domains: [],
    autoRefreshTimer: null,
};

// ==================== 工具函数 ====================

// 生成随机字符串
function generateRandomString(length = 12) {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// 复制到剪贴板
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showNotification('已复制到剪贴板！', 'success');
    } catch (err) {
        // 降级方案
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            showNotification('已复制到剪贴板！', 'success');
        } catch (e) {
            showNotification('复制失败，请手动复制', 'error');
        }
        document.body.removeChild(textarea);
    }
}

// 显示通知
function showNotification(message, type = 'info') {
    // 简单的通知实现
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
        color: white;
        border-radius: 0.5rem;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => document.body.removeChild(notification), 300);
    }, 3000);
}

// 格式化时间
function formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
    
    return date.toLocaleString('zh-CN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// ==================== API 函数 ====================

// 获取可用域名列表
async function fetchDomains() {
    try {
        const response = await fetch(`${CONFIG.API_URL}/domains/active`);
        if (response.ok) {
            const data = await response.json();
            state.domains = data.domains || [];
            updateDomainSelect();
        } else {
            // 如果API不可用，使用默认域名
            state.domains = ['temp-mail.io', '10minutemail.net', 'guerrillamail.com'];
            updateDomainSelect();
        }
    } catch (error) {
        console.error('获取域名失败:', error);
        // 使用默认域名
        state.domains = ['temp-mail.io', '10minutemail.net', 'guerrillamail.com'];
        updateDomainSelect();
    }
}

// 获取邮件列表
async function fetchMessages() {
    if (!state.currentEmail) return;
    
    try {
        const response = await fetch(`${CONFIG.API_URL}/emails/${encodeURIComponent(state.currentEmail)}`);
        if (response.ok) {
            const data = await response.json();
            state.messages = data.messages || [];
            renderMessages();
        }
    } catch (error) {
        console.error('获取邮件失败:', error);
    }
}

// 删除邮箱
async function deleteEmail() {
    if (!state.currentEmail) return;
    
    if (!confirm('确定要删除当前邮箱及所有邮件吗？')) return;
    
    try {
        const response = await fetch(`${CONFIG.API_URL}/emails/${encodeURIComponent(state.currentEmail)}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            showNotification('邮箱已删除', 'success');
            generateNewEmail();
        }
    } catch (error) {
        console.error('删除邮箱失败:', error);
        showNotification('删除失败', 'error');
    }
}

// ==================== UI 更新函数 ====================

// 更新域名选择下拉框
function updateDomainSelect() {
    const select = document.getElementById('emailDomain');
    select.innerHTML = state.domains.map(domain => 
        `<option value="${domain}">@${domain}</option>`
    ).join('');
}

// 渲染邮件列表
function renderMessages() {
    const messagesList = document.getElementById('messagesList');
    
    if (state.messages.length === 0) {
        messagesList.innerHTML = `
            <div class="empty-state">
                <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                    <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
                <p class="empty-text">没有新消息</p>
            </div>
        `;
        return;
    }
    
    messagesList.innerHTML = state.messages.map(msg => `
        <div class="message-item" onclick="showMessageDetail('${msg.id}')">
            <div class="message-header">
                <span class="message-from">${escapeHtml(msg.from)}</span>
                <span class="message-time">${formatTime(msg.receivedAt)}</span>
            </div>
            <div class="message-subject">${escapeHtml(msg.subject || '(无主题)')}</div>
            <div class="message-preview">${escapeHtml(msg.preview || msg.body || '')}</div>
        </div>
    `).join('');
}

// 显示邮件详情
function showMessageDetail(messageId) {
    const message = state.messages.find(m => m.id === messageId);
    if (!message) return;
    
    const detailsContainer = document.getElementById('messageDetails');
    detailsContainer.innerHTML = `
        <div style="margin-bottom: 1rem;">
            <div style="margin-bottom: 0.5rem;">
                <strong>发件人：</strong> ${escapeHtml(message.from)}
            </div>
            <div style="margin-bottom: 0.5rem;">
                <strong>主题：</strong> ${escapeHtml(message.subject || '(无主题)')}
            </div>
            <div style="margin-bottom: 0.5rem;">
                <strong>时间：</strong> ${new Date(message.receivedAt).toLocaleString('zh-CN')}
            </div>
        </div>
        <div style="padding: 1rem; background: #f9fafb; border-radius: 0.5rem; max-height: 400px; overflow-y: auto;">
            ${message.html || `<pre style="white-space: pre-wrap; font-family: inherit;">${escapeHtml(message.body)}</pre>`}
        </div>
    `;
    
    document.getElementById('messageModal').classList.add('active');
}

// HTML转义
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ==================== 邮箱管理 ====================

// 生成新邮箱
function generateNewEmail() {
    const prefix = generateRandomString(12);
    const domain = state.domains[0] || 'temp-mail.io';
    state.currentEmail = `${prefix}@${domain}`;
    
    document.getElementById('emailAddress').value = state.currentEmail;
    
    // 保存到本地存储
    localStorage.setItem('tempEmail', state.currentEmail);
    
    // 清空邮件列表
    state.messages = [];
    renderMessages();
    
    // 开始自动刷新
    startAutoRefresh();
}

// 自定义邮箱
function customEmail(prefix, domain) {
    state.currentEmail = `${prefix}@${domain}`;
    document.getElementById('emailAddress').value = state.currentEmail;
    
    localStorage.setItem('tempEmail', state.currentEmail);
    
    state.messages = [];
    renderMessages();
    
    startAutoRefresh();
    closeModal('changeEmailModal');
}

// ==================== 自动刷新 ====================

function startAutoRefresh() {
    stopAutoRefresh();
    state.autoRefreshTimer = setInterval(() => {
        fetchMessages();
    }, CONFIG.AUTO_REFRESH_INTERVAL);
}

function stopAutoRefresh() {
    if (state.autoRefreshTimer) {
        clearInterval(state.autoRefreshTimer);
        state.autoRefreshTimer = null;
    }
}

// 手动刷新
function manualRefresh() {
    const btn = document.getElementById('refreshBtn');
    btn.classList.add('spinning');
    
    fetchMessages().finally(() => {
        setTimeout(() => btn.classList.remove('spinning'), 500);
    });
}

// ==================== 模态框管理 ====================

function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// ==================== 事件监听器 ====================

document.addEventListener('DOMContentLoaded', async () => {
    // 获取域名列表
    await fetchDomains();
    
    // 检查是否有保存的邮箱
    const savedEmail = localStorage.getItem('tempEmail');
    if (savedEmail && state.domains.some(d => savedEmail.endsWith('@' + d))) {
        state.currentEmail = savedEmail;
        document.getElementById('emailAddress').value = savedEmail;
        fetchMessages();
        startAutoRefresh();
    } else {
        generateNewEmail();
    }
    
    // 复制按钮
    document.getElementById('copyBtn').addEventListener('click', () => {
        copyToClipboard(state.currentEmail);
    });
    
    document.getElementById('copyInline').addEventListener('click', () => {
        copyToClipboard(state.currentEmail);
    });
    
    // 随机生成新邮箱
    document.getElementById('randomBtn').addEventListener('click', generateNewEmail);
    
    // 自定义邮箱
    document.getElementById('changeBtn').addEventListener('click', () => {
        openModal('changeEmailModal');
    });
    
    // 删除邮箱
    document.getElementById('deleteBtn').addEventListener('click', deleteEmail);
    
    // 刷新邮件
    document.getElementById('refreshBtn').addEventListener('click', manualRefresh);
    
    // 自定义邮箱表单
    document.getElementById('customEmailForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const prefix = document.getElementById('emailPrefix').value.trim();
        const domain = document.getElementById('emailDomain').value;
        
        if (prefix && domain) {
            customEmail(prefix, domain);
        }
    });
    
    // 关闭模态框
    document.getElementById('closeModal').addEventListener('click', () => {
        closeModal('changeEmailModal');
    });
    
    document.getElementById('closeMessageModal').addEventListener('click', () => {
        closeModal('messageModal');
    });
    
    // 点击模态框外部关闭
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    });
    
    // Cookie 提示
    const cookieNotice = document.getElementById('cookieNotice');
    const cookieAccepted = localStorage.getItem('cookieAccepted');
    
    if (!cookieAccepted) {
        setTimeout(() => cookieNotice.classList.add('show'), 1000);
    }
    
    document.getElementById('acceptCookie').addEventListener('click', () => {
        localStorage.setItem('cookieAccepted', 'true');
        cookieNotice.classList.remove('show');
    });
});

// 页面卸载时清理
window.addEventListener('beforeunload', () => {
    stopAutoRefresh();
});

// 添加CSS动画样式
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
