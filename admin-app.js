// 管理后台 JavaScript

// ==================== 配置 ====================
const ADMIN_CONFIG = {
    API_URL: '/admin', // Worker API 地址
    STORAGE_KEY_API: 'admin_api_key',
};

// ==================== 状态管理 ====================
const adminState = {
    apiKey: null,
    domains: [],
    isLoggedIn: false,
};

// ==================== 认证函数 ====================

// 检查登录状态
function checkAuth() {
    const savedKey = localStorage.getItem(ADMIN_CONFIG.STORAGE_KEY_API);
    if (savedKey) {
        adminState.apiKey = savedKey;
        adminState.isLoggedIn = true;
        showAdminPanel();
        loadDomains();
    } else {
        showLoginPage();
    }
}

// 登录
async function login(apiKey) {
    try {
        // 尝试使用API Key获取域名列表来验证
        const response = await fetch(`${ADMIN_CONFIG.API_URL}/domains`, {
            headers: {
                'Authorization': `Bearer ${apiKey}`
            }
        });
        
        if (response.ok) {
            adminState.apiKey = apiKey;
            adminState.isLoggedIn = true;
            localStorage.setItem(ADMIN_CONFIG.STORAGE_KEY_API, apiKey);
            showAdminPanel();
            loadDomains();
            showNotification('登录成功', 'success');
        } else {
            showNotification('API Key 无效', 'error');
        }
    } catch (error) {
        console.error('登录失败:', error);
        showNotification('登录失败，请检查网络连接', 'error');
    }
}

// 退出登录
function logout() {
    adminState.apiKey = null;
    adminState.isLoggedIn = false;
    adminState.domains = [];
    localStorage.removeItem(ADMIN_CONFIG.STORAGE_KEY_API);
    showLoginPage();
    showNotification('已退出登录', 'info');
}

// ==================== 页面切换 ====================

function showLoginPage() {
    document.getElementById('loginContainer').classList.remove('hidden');
    document.getElementById('adminContainer').classList.add('hidden');
}

function showAdminPanel() {
    document.getElementById('loginContainer').classList.add('hidden');
    document.getElementById('adminContainer').classList.remove('hidden');
}

// ==================== API 请求函数 ====================

// 通用API请求
async function apiRequest(url, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminState.apiKey}`,
        ...options.headers,
    };
    
    const response = await fetch(url, {
        ...options,
        headers,
    });
    
    if (response.status === 401) {
        showNotification('认证失败，请重新登录', 'error');
        logout();
        throw new Error('Unauthorized');
    }
    
    return response;
}

// 加载所有域名
async function loadDomains() {
    try {
        const response = await apiRequest(`${ADMIN_CONFIG.API_URL}/domains`);
        
        if (response.ok) {
            const data = await response.json();
            adminState.domains = data.domains || [];
            renderDomainsTable();
            updateStatistics();
        } else {
            showNotification('加载域名失败', 'error');
        }
    } catch (error) {
        console.error('加载域名失败:', error);
    }
}

// 添加域名
async function addDomain(domain, enabled) {
    try {
        const response = await apiRequest(`${ADMIN_CONFIG.API_URL}/domains`, {
            method: 'POST',
            body: JSON.stringify({ domain, enabled }),
        });
        
        if (response.ok) {
            showNotification('域名添加成功', 'success');
            await loadDomains();
            closeModal('addDomainModal');
            document.getElementById('addDomainForm').reset();
        } else {
            const data = await response.json();
            showNotification(data.error || '添加域名失败', 'error');
        }
    } catch (error) {
        console.error('添加域名失败:', error);
        showNotification('添加域名失败', 'error');
    }
}

// 更新域名状态
async function toggleDomainStatus(domain, currentStatus) {
    try {
        const response = await apiRequest(
            `${ADMIN_CONFIG.API_URL}/domains/${encodeURIComponent(domain)}`,
            {
                method: 'PATCH',
                body: JSON.stringify({ enabled: !currentStatus }),
            }
        );
        
        if (response.ok) {
            showNotification('域名状态更新成功', 'success');
            await loadDomains();
        } else {
            showNotification('更新域名状态失败', 'error');
        }
    } catch (error) {
        console.error('更新域名状态失败:', error);
        showNotification('更新域名状态失败', 'error');
    }
}

// 删除域名
async function deleteDomain(domain) {
    try {
        const response = await apiRequest(
            `${ADMIN_CONFIG.API_URL}/domains/${encodeURIComponent(domain)}`,
            {
                method: 'DELETE',
            }
        );
        
        if (response.ok) {
            showNotification('域名删除成功', 'success');
            await loadDomains();
            closeModal('deleteConfirmModal');
        } else {
            showNotification('删除域名失败', 'error');
        }
    } catch (error) {
        console.error('删除域名失败:', error);
        showNotification('删除域名失败', 'error');
    }
}

// ==================== UI 渲染函数 ====================

// 更新统计数据
function updateStatistics() {
    const total = adminState.domains.length;
    const enabled = adminState.domains.filter(d => d.enabled).length;
    const disabled = total - enabled;
    
    document.getElementById('totalDomains').textContent = total;
    document.getElementById('enabledDomains').textContent = enabled;
    document.getElementById('disabledDomains').textContent = disabled;
}

// 渲染域名表格
function renderDomainsTable() {
    const tbody = document.getElementById('domainsTableBody');
    
    if (adminState.domains.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="loading-row">暂无域名数据</td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = adminState.domains.map(domain => `
        <tr>
            <td>
                <span class="domain-name">${escapeHtml(domain.domain)}</span>
            </td>
            <td>
                <span class="status-badge ${domain.enabled ? 'enabled' : 'disabled'}">
                    <span class="status-dot"></span>
                    ${domain.enabled ? '已启用' : '已禁用'}
                </span>
            </td>
            <td>
                <span class="time-text">${formatDateTime(domain.createdAt)}</span>
            </td>
            <td>
                <span class="time-text">${formatDateTime(domain.updatedAt)}</span>
            </td>
            <td>
                <div class="action-buttons-cell">
                    <button 
                        class="btn-icon btn-toggle" 
                        onclick="toggleDomainStatus('${escapeAttr(domain.domain)}', ${domain.enabled})"
                        title="${domain.enabled ? '禁用' : '启用'}">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            ${domain.enabled ? 
                                '<line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>' :
                                '<polyline points="20 6 9 17 4 12"></polyline>'
                            }
                        </svg>
                    </button>
                    <button 
                        class="btn-icon btn-delete" 
                        onclick="confirmDelete('${escapeAttr(domain.domain)}')"
                        title="删除">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// ==================== 工具函数 ====================

// HTML转义
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 属性转义
function escapeAttr(text) {
    return text.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// 格式化日期时间
function formatDateTime(isoString) {
    if (!isoString) return '-';
    const date = new Date(isoString);
    return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
}

// 显示通知
function showNotification(message, type = 'info') {
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
        animation: slideInAdmin 0.3s ease-out;
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutAdmin 0.3s ease-out';
        setTimeout(() => document.body.removeChild(notification), 300);
    }, 3000);
}

// ==================== 模态框管理 ====================

function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// 确认删除
let domainToDelete = null;

function confirmDelete(domain) {
    domainToDelete = domain;
    document.getElementById('deleteDomainName').textContent = domain;
    openModal('deleteConfirmModal');
}

function executeDelete() {
    if (domainToDelete) {
        deleteDomain(domainToDelete);
        domainToDelete = null;
    }
}

// ==================== 事件监听器 ====================

document.addEventListener('DOMContentLoaded', () => {
    // 检查认证状态
    checkAuth();
    
    // 登录表单
    document.getElementById('loginForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const apiKey = document.getElementById('apiKey').value.trim();
        if (apiKey) {
            login(apiKey);
        }
    });
    
    // 退出登录
    document.getElementById('logoutBtn').addEventListener('click', logout);
    
    // 添加域名按钮
    document.getElementById('addDomainBtn').addEventListener('click', () => {
        openModal('addDomainModal');
    });
    
    // 添加域名表单
    document.getElementById('addDomainForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const domain = document.getElementById('newDomain').value.trim().toLowerCase();
        const enabled = document.getElementById('newDomainEnabled').checked;
        
        if (domain) {
            addDomain(domain, enabled);
        }
    });
    
    // 关闭模态框
    document.getElementById('closeAddModal').addEventListener('click', () => {
        closeModal('addDomainModal');
    });
    
    document.getElementById('closeDeleteModal').addEventListener('click', () => {
        closeModal('deleteConfirmModal');
    });
    
    document.getElementById('cancelDelete').addEventListener('click', () => {
        closeModal('deleteConfirmModal');
    });
    
    document.getElementById('confirmDelete').addEventListener('click', executeDelete);
    
    // 点击模态框外部关闭
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    });
});

// 添加CSS动画样式
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInAdmin {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutAdmin {
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
