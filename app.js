/**
 * 临时邮箱服务 - 前端应用逻辑
 * 连接后端 API，实现邮箱管理和邮件查看功能
 */

// 配置
const CONFIG = {
    API_BASE_URL: 'https://api.your-domain.com', // 需要替换为实际的 Workers API 地址
    REFRESH_INTERVAL: 10000, // 邮件刷新间隔（毫秒）
};

// 全局状态
const state = {
    currentMailbox: null,
    selectedDomain: null,
    domains: [],
    emails: [],
    refreshTimer: null,
};

// DOM 元素
const elements = {
    emailInput: document.getElementById('emailInput'),
    domainButton: document.getElementById('domainButton'),
    domainDropdown: document.getElementById('domainDropdown'),
    createBtn: document.getElementById('createBtn'),
    randomBtn: document.getElementById('randomBtn'),
    manageBtn: document.getElementById('manageBtn'),
    currentMailbox: document.getElementById('currentMailbox'),
    mailboxAddress: document.getElementById('mailboxAddress'),
    copyBtn: document.getElementById('copyBtn'),
    refreshBtn: document.getElementById('refreshBtn'),
    emailListSection: document.getElementById('emailListSection'),
    emailList: document.getElementById('emailList'),
    emailDetailModal: document.getElementById('emailDetailModal'),
    closeModalBtn: document.getElementById('closeModalBtn'),
    emailSubject: document.getElementById('emailSubject'),
    emailFrom: document.getElementById('emailFrom'),
    emailTime: document.getElementById('emailTime'),
    emailBody: document.getElementById('emailBody'),
    deleteEmailBtn: document.getElementById('deleteEmailBtn'),
    domainManagementModal: document.getElementById('domainManagementModal'),
    closeDomainModalBtn: document.getElementById('closeDomainModalBtn'),
    newDomainInput: document.getElementById('newDomainInput'),
    addDomainBtn: document.getElementById('addDomainBtn'),
    domainList: document.getElementById('domainList'),
    toast: document.getElementById('toast'),
};

// ========================================
// 初始化
// ========================================

async function init() {
    await loadDomains();
    setupEventListeners();
    checkExistingMailbox();
}

function setupEventListeners() {
    // 域名选择
    elements.domainButton.addEventListener('click', toggleDomainDropdown);
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.domain-selector')) {
            closeDomainDropdown();
        }
    });

    // 邮箱创建
    elements.createBtn.addEventListener('click', createMailbox);
    elements.randomBtn.addEventListener('click', generateRandom);
    elements.emailInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') createMailbox();
    });

    // 邮箱操作
    elements.copyBtn.addEventListener('click', copyMailboxAddress);
    elements.refreshBtn.addEventListener('click', refreshEmails);

    // 模态框
    elements.closeModalBtn.addEventListener('click', closeEmailDetail);
    elements.emailDetailModal.addEventListener('click', (e) => {
        if (e.target === elements.emailDetailModal) closeEmailDetail();
    });
    elements.deleteEmailBtn.addEventListener('click', deleteCurrentEmail);

    // 域名管理
    elements.manageBtn.addEventListener('click', openDomainManagement);
    elements.closeDomainModalBtn.addEventListener('click', closeDomainManagement);
    elements.domainManagementModal.addEventListener('click', (e) => {
        if (e.target === elements.domainManagementModal) closeDomainManagement();
    });
    elements.addDomainBtn.addEventListener('click', addDomain);
    elements.newDomainInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addDomain();
    });
}

// ========================================
// 域名管理
// ========================================

async function loadDomains() {
    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/api/domains`);
        const data = await response.json();
        state.domains = data.domains || [];
        
        if (state.domains.length > 0) {
            state.selectedDomain = state.domains[0];
        }
        
        updateDomainUI();
    } catch (error) {
        console.error('加载域名失败:', error);
        // 使用默认域名（离线模式）
        state.domains = ['example.com', 'tempmail.com'];
        state.selectedDomain = state.domains[0];
        updateDomainUI();
        showToast('无法连接到服务器，使用离线模式');
    }
}

function updateDomainUI() {
    // 更新按钮文本
    elements.domainButton.innerHTML = `
        @${state.selectedDomain}
        <svg class="dropdown-icon" width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
    `;

    // 更新下拉列表
    elements.domainDropdown.innerHTML = state.domains.map(domain => 
        `<li data-domain="${domain}">@${domain}</li>`
    ).join('');

    // 添加点击事件
    elements.domainDropdown.querySelectorAll('li').forEach(li => {
        li.addEventListener('click', () => {
            state.selectedDomain = li.dataset.domain;
            updateDomainUI();
            closeDomainDropdown();
        });
    });
}

function toggleDomainDropdown() {
    elements.domainButton.classList.toggle('active');
    elements.domainDropdown.classList.toggle('active');
}

function closeDomainDropdown() {
    elements.domainButton.classList.remove('active');
    elements.domainDropdown.classList.remove('active');
}

// ========================================
// 邮箱创建
// ========================================

function createMailbox() {
    const username = elements.emailInput.value.trim();
    
    if (!username) {
        showToast('请输入邮箱用户名');
        return;
    }

    if (!/^[a-zA-Z0-9._-]+$/.test(username)) {
        showToast('用户名只能包含字母、数字、点、下划线和连字符');
        return;
    }

    const mailbox = `${username}@${state.selectedDomain}`;
    setCurrentMailbox(mailbox);
    showToast(`已创建邮箱: ${mailbox}`);
}

function generateRandom() {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let username = '';
    for (let i = 0; i < 10; i++) {
        username += chars[Math.floor(Math.random() * chars.length)];
    }
    elements.emailInput.value = username;
}

function setCurrentMailbox(mailbox) {
    state.currentMailbox = mailbox;
    localStorage.setItem('currentMailbox', mailbox);
    
    elements.mailboxAddress.textContent = mailbox;
    elements.currentMailbox.style.display = 'flex';
    elements.emailListSection.style.display = 'block';
    
    // 清空输入框
    elements.emailInput.value = '';
    
    // 开始刷新邮件
    startEmailRefresh();
}

function checkExistingMailbox() {
    const savedMailbox = localStorage.getItem('currentMailbox');
    if (savedMailbox) {
        state.currentMailbox = savedMailbox;
        elements.mailboxAddress.textContent = savedMailbox;
        elements.currentMailbox.style.display = 'flex';
        elements.emailListSection.style.display = 'block';
        startEmailRefresh();
    }
}

function copyMailboxAddress() {
    navigator.clipboard.writeText(state.currentMailbox).then(() => {
        showToast('邮箱地址已复制');
    }).catch(err => {
        console.error('复制失败:', err);
        showToast('复制失败，请手动复制');
    });
}

// ========================================
// 邮件管理
// ========================================

async function refreshEmails() {
    if (!state.currentMailbox) return;

    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/api/emails/${encodeURIComponent(state.currentMailbox)}`);
        const data = await response.json();
        state.emails = data.emails || [];
        
        renderEmailList();
    } catch (error) {
        console.error('获取邮件失败:', error);
        // 使用模拟数据（离线模式）
        if (state.emails.length === 0) {
            state.emails = generateMockEmails();
            renderEmailList();
        }
    }
}

function renderEmailList() {
    if (state.emails.length === 0) {
        elements.emailList.innerHTML = `
            <div class="empty-state">
                <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                    <rect x="8" y="16" width="48" height="32" rx="2" stroke="currentColor" stroke-width="2"/>
                    <path d="M8 20L32 36L56 20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
                <p>暂无邮件</p>
            </div>
        `;
        return;
    }

    elements.emailList.innerHTML = state.emails.map(email => `
        <div class="email-item ${email.read ? '' : 'unread'}" data-email-id="${email.id}">
            <div class="email-header">
                <span class="email-from">${escapeHtml(email.from)}</span>
                <span class="email-time">${formatTime(email.timestamp)}</span>
            </div>
            <div class="email-subject">${escapeHtml(email.subject)}</div>
        </div>
    `).join('');

    // 添加点击事件
    elements.emailList.querySelectorAll('.email-item').forEach(item => {
        item.addEventListener('click', () => {
            openEmailDetail(item.dataset.emailId);
        });
    });
}

async function openEmailDetail(emailId) {
    if (!state.currentMailbox) return;

    try {
        const response = await fetch(
            `${CONFIG.API_BASE_URL}/api/emails/${encodeURIComponent(state.currentMailbox)}/${emailId}`
        );
        const data = await response.json();
        const email = data.email;

        elements.emailSubject.textContent = email.subject;
        elements.emailFrom.textContent = email.from;
        elements.emailTime.textContent = formatTime(email.timestamp);
        elements.emailBody.textContent = email.body;
        elements.deleteEmailBtn.dataset.emailId = emailId;

        elements.emailDetailModal.classList.add('active');
        
        // 更新列表（标记为已读）
        setTimeout(() => refreshEmails(), 500);
    } catch (error) {
        console.error('获取邮件详情失败:', error);
        
        // 离线模式 - 从本地邮件列表查找
        const email = state.emails.find(e => e.id === emailId);
        if (email) {
            elements.emailSubject.textContent = email.subject;
            elements.emailFrom.textContent = email.from;
            elements.emailTime.textContent = formatTime(email.timestamp);
            elements.emailBody.textContent = email.body || '邮件内容加载中...';
            elements.deleteEmailBtn.dataset.emailId = emailId;

            elements.emailDetailModal.classList.add('active');
            
            // 标记为已读
            email.read = true;
            renderEmailList();
        } else {
            showToast('无法加载邮件详情');
        }
    }
}

function closeEmailDetail() {
    elements.emailDetailModal.classList.remove('active');
}

async function deleteCurrentEmail() {
    const emailId = elements.deleteEmailBtn.dataset.emailId;
    if (!emailId || !state.currentMailbox) return;

    try {
        await fetch(
            `${CONFIG.API_BASE_URL}/api/emails/${encodeURIComponent(state.currentMailbox)}/${emailId}`,
            { method: 'DELETE' }
        );
        
        showToast('邮件已删除');
        closeEmailDetail();
        refreshEmails();
    } catch (error) {
        console.error('删除邮件失败:', error);
        showToast('删除失败');
    }
}

function startEmailRefresh() {
    if (state.refreshTimer) {
        clearInterval(state.refreshTimer);
    }
    
    refreshEmails();
    state.refreshTimer = setInterval(refreshEmails, CONFIG.REFRESH_INTERVAL);
}

// ========================================
// 域名管理模态框
// ========================================

function openDomainManagement() {
    renderDomainList();
    elements.domainManagementModal.classList.add('active');
}

function closeDomainManagement() {
    elements.domainManagementModal.classList.remove('active');
    elements.newDomainInput.value = '';
}

function renderDomainList() {
    elements.domainList.innerHTML = state.domains.map(domain => `
        <div class="domain-list-item">
            <span class="domain-name">@${domain}</span>
            <button class="delete-domain-btn" data-domain="${domain}">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M4 4L12 12M4 12L12 4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
            </button>
        </div>
    `).join('');

    // 添加删除事件
    elements.domainList.querySelectorAll('.delete-domain-btn').forEach(btn => {
        btn.addEventListener('click', () => deleteDomain(btn.dataset.domain));
    });
}

async function addDomain() {
    const domain = elements.newDomainInput.value.trim();
    
    if (!domain) {
        showToast('请输入域名');
        return;
    }

    if (!/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(domain)) {
        showToast('无效的域名格式');
        return;
    }

    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/api/domains`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ domain }),
        });

        const data = await response.json();
        
        if (response.ok) {
            state.domains = data.domains;
            updateDomainUI();
            renderDomainList();
            elements.newDomainInput.value = '';
            showToast(`已添加域名: @${domain}`);
        } else {
            showToast(data.error || '添加失败');
        }
    } catch (error) {
        console.error('添加域名失败:', error);
        // 离线模式 - 本地添加
        if (!state.domains.includes(domain)) {
            state.domains.push(domain);
            updateDomainUI();
            renderDomainList();
            elements.newDomainInput.value = '';
            showToast(`已添加域名: @${domain} (离线模式)`);
        }
    }
}

async function deleteDomain(domain) {
    if (state.domains.length <= 1) {
        showToast('至少需要保留一个域名');
        return;
    }

    try {
        await fetch(`${CONFIG.API_BASE_URL}/api/domains/${encodeURIComponent(domain)}`, {
            method: 'DELETE',
        });

        state.domains = state.domains.filter(d => d !== domain);
        
        if (state.selectedDomain === domain) {
            state.selectedDomain = state.domains[0];
        }
        
        updateDomainUI();
        renderDomainList();
        showToast(`已删除域名: @${domain}`);
    } catch (error) {
        console.error('删除域名失败:', error);
        // 离线模式 - 本地删除
        state.domains = state.domains.filter(d => d !== domain);
        if (state.selectedDomain === domain) {
            state.selectedDomain = state.domains[0];
        }
        updateDomainUI();
        renderDomainList();
        showToast(`已删除域名: @${domain} (离线模式)`);
    }
}

// ========================================
// 工具函数
// ========================================

function showToast(message) {
    elements.toast.textContent = message;
    elements.toast.classList.add('active');
    
    setTimeout(() => {
        elements.toast.classList.remove('active');
    }, 3000);
}

function formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    // 小于1分钟
    if (diff < 60000) {
        return '刚刚';
    }
    // 小于1小时
    if (diff < 3600000) {
        return `${Math.floor(diff / 60000)}分钟前`;
    }
    // 小于1天
    if (diff < 86400000) {
        return `${Math.floor(diff / 3600000)}小时前`;
    }
    // 同一年
    if (date.getFullYear() === now.getFullYear()) {
        return `${date.getMonth() + 1}月${date.getDate()}日`;
    }
    // 其他
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function generateMockEmails() {
    return [
        {
            id: '1',
            from: 'welcome@example.com',
            subject: '欢迎使用临时邮箱服务',
            timestamp: Date.now() - 3600000,
            read: false,
            body: '您好！\n\n欢迎使用我们的临时邮箱服务。这是一个完全免费的服务，旨在保护您的隐私。\n\n功能特性：\n- 即时创建临时邮箱\n- 自定义域名后缀\n- 自动接收邮件\n- 24小时后自动删除\n\n祝您使用愉快！\n\n临时邮箱团队',
        },
        {
            id: '2',
            from: 'noreply@service.com',
            subject: '这是一封测试邮件',
            timestamp: Date.now() - 7200000,
            read: false,
            body: '这是一封测试邮件的内容。\n\n您可以点击邮件查看完整内容。\n\n邮件会在列表中显示，点击后可以看到详细信息，包括：\n- 发件人\n- 主题\n- 时间\n- 完整正文\n\n测试成功！',
        },
    ];
}

// 启动应用
init();
