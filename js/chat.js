/**
 * 对话模块（纯前端版本）
 * 处理对话发送、接收、历史管理、图片上传
 * 直接调用阿里云 DashScope API，无需后端
 */
const ChatModule = {
  conversations: [],
  currentConversationId: null,
  pendingImages: [],
  isWaiting: false,

  /**
   * 初始化
   */
  init() {
    // 发送按钮
    document.getElementById('sendBtn').addEventListener('click', () => this.sendMessage());
    
    // 回车发送
    const input = document.getElementById('messageInput');
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    // 自动调整输入框高度
    input.addEventListener('input', () => this.autoResize(input));

    // 清空对话
    document.getElementById('clearChatBtn').addEventListener('click', () => {
      App.showModal('清空全部对话', '确定要清空所有对话记录吗？此操作不可撤销。', () => {
        this.clearAllConversations();
      });
    });

    // 图片上传
    document.getElementById('uploadImageBtn').addEventListener('click', () => {
      document.getElementById('imageFileInput').click();
    });

    document.getElementById('imageFileInput').addEventListener('change', (e) => {
      this.handleImageUpload(e);
    });

    // 新建对话
    document.getElementById('newChatBtn').addEventListener('click', () => {
      this.createNewConversation();
    });

    // 欢迎页建议点击
    document.querySelectorAll('.suggestion-card').forEach(card => {
      card.addEventListener('click', () => {
        const suggestion = card.dataset.suggestion;
        input.value = suggestion;
        this.sendMessage();
      });
    });

    // 加载历史对话
    this.loadConversations();
    this.renderConversationList();

    // 如果没有对话，创建一个新的
    if (this.conversations.length === 0) {
      this.createNewConversation();
    } else {
      this.currentConversationId = this.conversations[0].id;
      this.renderMessages();
      this.renderConversationList();
    }
  },

  /**
   * 自动调整输入框高度
   */
  autoResize(input) {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 120) + 'px';
  },

  /**
   * 创建新对话
   */
  createNewConversation() {
    const conv = {
      id: 'conv_' + Date.now(),
      title: '新对话',
      messages: [],
      createdAt: new Date().toISOString()
    };
    this.conversations.unshift(conv);
    this.currentConversationId = conv.id;
    this.saveConversations();
    this.renderConversationList();
    this.renderMessages();
  },

  /**
   * 切换对话
   */
  switchConversation(convId) {
    this.currentConversationId = convId;
    this.renderMessages();
    this.renderConversationList();
  },

  /**
   * 删除对话
   */
  deleteConversation(convId) {
    this.conversations = this.conversations.filter(c => c.id !== convId);
    if (this.currentConversationId === convId) {
      this.currentConversationId = this.conversations.length > 0 ? this.conversations[0].id : null;
      if (!this.currentConversationId) {
        this.createNewConversation();
      } else {
        this.renderMessages();
      }
    }
    this.saveConversations();
    this.renderConversationList();
    App.showToast('对话已删除', 'success');
  },

  /**
   * 清空全部对话
   */
  clearAllConversations() {
    this.conversations = [];
    this.currentConversationId = null;
    this.saveConversations();
    this.createNewConversation();
    App.showToast('已清空全部对话', 'success');
  },

  /**
   * 获取当前对话
   */
  getCurrentConversation() {
    return this.conversations.find(c => c.id === this.currentConversationId);
  },

  /**
   * 处理图片上传
   */
  handleImageUpload(event) {
    const files = event.target.files;
    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        App.showToast('请上传图片文件', 'warning');
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        App.showToast('图片大小不能超过10MB', 'warning');
        continue;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        this.pendingImages.push({
          name: file.name,
          data: e.target.result,
          base64: e.target.result.split(',')[1]
        });
        this.renderImagePreviews();
      };
      reader.readAsDataURL(file);
    }
    event.target.value = '';
  },

  /**
   * 渲染图片预览
   */
  renderImagePreviews() {
    const bar = document.getElementById('imagePreviewBar');
    bar.innerHTML = '';
    this.pendingImages.forEach((img, index) => {
      const item = document.createElement('div');
      item.className = 'image-preview-item';
      item.innerHTML = `
        <img src="${img.data}" alt="${img.name}">
        <button class="image-preview-remove" onclick="ChatModule.removeImage(${index})">×</button>
      `;
      bar.appendChild(item);
    });
  },

  /**
   * 移除待上传图片
   */
  removeImage(index) {
    this.pendingImages.splice(index, 1);
    this.renderImagePreviews();
  },

  /**
   * 发送消息
   */
  async sendMessage() {
    if (this.isWaiting) return;

    const input = document.getElementById('messageInput');
    const text = input.value.trim();

    if (!text && this.pendingImages.length === 0) {
      return;
    }

    // 检查API Key
    if (!App.apiKey) {
      App.showToast('请先在左侧设置中输入 API Key', 'warning');
      if (window.innerWidth <= 768) {
        document.getElementById('sidebar').classList.add('open');
        document.getElementById('sidebarOverlay').classList.add('active');
      }
      return;
    }

    const conv = this.getCurrentConversation();
    if (!conv) {
      this.createNewConversation();
      return this.sendMessage();
    }

    // 构建用户消息
    const hasImages = this.pendingImages.length > 0;
    const userMessage = {
      role: 'user',
      content: text || (hasImages ? '请分析这张图片' : ''),
      images: hasImages ? this.pendingImages.map(img => img.data) : [],
      timestamp: new Date().toISOString()
    };

    conv.messages.push(userMessage);

    // 更新对话标题（如果是第一条消息）
    if (conv.messages.length === 1) {
      conv.title = text.substring(0, 20) || '图片分析';
    }

    // 清空输入
    input.value = '';
    input.style.height = 'auto';
    const sentImages = [...this.pendingImages];
    this.pendingImages = [];
    this.renderImagePreviews();

    // 渲染消息
    this.renderMessages();
    this.saveConversations();
    this.renderConversationList();

    // 显示等待状态
    this.isWaiting = true;
    this.showTypingIndicator();

    try {
      // 构建API请求消息
      let apiMessages = [];
      
      if (hasImages) {
        // 图片分析 - 使用多模态消息格式
        const content = [];
        if (text) {
          content.push({ type: 'text', text: text });
        }
        sentImages.forEach(imgData => {
          content.push({
            type: 'image_url',
            image_url: { url: imgData }
          });
        });
        
        if (!text) {
          content.unshift({ type: 'text', text: '请分析这张施工相关图片，识别可能的安全隐患、施工问题或图片中的关键信息。' });
        }

        apiMessages = [{
          role: 'user',
          content: content
        }];

        // 添加历史对话上下文（最近5条文字消息）
        const recentMessages = conv.messages.slice(-6, -1);
        for (const msg of recentMessages) {
          if (msg.role === 'user' || msg.role === 'assistant') {
            apiMessages.unshift({
              role: msg.role,
              content: msg.content
            });
          }
        }
      } else {
        // 纯文字对话 - 构建历史消息
        const recentMessages = conv.messages.slice(-10);
        apiMessages = recentMessages.map(msg => ({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content
        }));
      }

      // 调用API
      const model = hasImages ? 'qwen-vl-plus' : App.model;
      const response = await App.callAPI('/api/chat', {
        messages: apiMessages,
        model: model,
        systemPrompt: App.systemPrompt,
        useKnowledgeBase: App.useKnowledgeBase,
        apiKey: App.apiKey
      });

      // 添加AI回复
      const aiMessage = {
        role: 'assistant',
        content: response.reply,
        timestamp: new Date().toISOString()
      };
      conv.messages.push(aiMessage);
      this.saveConversations();
      this.renderMessages();

    } catch (err) {
      let errorTip = '请检查：\n1. API Key 是否正确\n2. 网络连接是否正常\n3. 浏览器控制台是否有跨域(CORS)错误';
      if (err.message && (err.message.includes('API Key') || err.message.includes('api_key') || err.message.includes('Incorrect API key'))) {
        errorTip = '请检查：\n1. API Key 是否正确\n2. API Key 是否已开通阿里云 DashScope 服务\n3. API Key 是否有对应模型的使用权限';
      } else if (err.message && err.message.includes('CORS')) {
        errorTip = '跨域请求被阻止。请确保：\n1. 将文件部署到域名服务器上访问\n2. 或使用支持 Node.js 的服务器部署完整版';
      } else if (err.message && err.message.includes('模型')) {
        errorTip = '请检查：\n1. 所选模型是否正确\n2. API Key 是否有该模型的使用权限';
      }
      const errorMsg = {
        role: 'assistant',
        content: `⚠️ 请求失败：${err.message}\n\n${errorTip}`,
        timestamp: new Date().toISOString(),
        isError: true
      };
      conv.messages.push(errorMsg);
      this.saveConversations();
      this.renderMessages();
      console.error('发送消息失败:', err);
    } finally {
      this.isWaiting = false;
      this.hideTypingIndicator();
    }
  },

  /**
   * 显示打字指示器
   */
  showTypingIndicator() {
    const container = this.getMessagesContainer();
    if (!container) return;
    
    const typing = document.createElement('div');
    typing.className = 'message ai';
    typing.id = 'typingIndicator';
    typing.innerHTML = `
      <div class="message-avatar">AI</div>
      <div class="message-content">
        <div class="message-bubble">
          <div class="typing-indicator">
            <span></span><span></span><span></span>
          </div>
        </div>
      </div>
    `;
    container.appendChild(typing);
    container.scrollTop = container.scrollHeight;
  },

  /**
   * 隐藏打字指示器
   */
  hideTypingIndicator() {
    const typing = document.getElementById('typingIndicator');
    if (typing) typing.remove();
  },

  /**
   * 获取消息容器
   */
  getMessagesContainer() {
    const activePanel = document.querySelector('.module-panel.active');
    if (!activePanel) return null;
    return activePanel.querySelector('.chat-messages');
  },

  /**
   * 渲染消息列表
   */
  renderMessages() {
    const container = this.getMessagesContainer();
    if (!container) return;

    const conv = this.getCurrentConversation();
    if (!conv || conv.messages.length === 0) {
      const activeModule = document.querySelector('.module-tab.active').dataset.module;
      if (activeModule === 'chat') {
        container.innerHTML = this.getWelcomeHTML('chat');
        this.bindWelcomeSuggestions();
      } else if (activeModule === 'image') {
        container.innerHTML = this.getWelcomeHTML('image');
      }
      return;
    }

    let html = '';
    conv.messages.forEach(msg => {
      const isUser = msg.role === 'user';
      const avatar = isUser ? '我' : 'AI';
      const time = new Date(msg.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });

      html += `<div class="message ${isUser ? 'user' : 'ai'}">`;
      html += `<div class="message-avatar">${avatar}</div>`;
      html += `<div class="message-content">`;
      
      if (msg.images && msg.images.length > 0) {
        msg.images.forEach(img => {
          html += `<img class="message-image" src="${img}" alt="上传图片">`;
        });
      }
      
      if (msg.content) {
        const formattedContent = isUser ? this.escapeHtml(msg.content) : App.formatMarkdown(msg.content);
        html += `<div class="message-bubble">${formattedContent}</div>`;
      }
      
      html += `<div class="message-time">${time}</div>`;
      html += `</div></div>`;
    });

    container.innerHTML = html;
    container.scrollTop = container.scrollHeight;
  },

  /**
   * 获取欢迎页HTML
   */
  getWelcomeHTML(type) {
    if (type === 'chat') {
      return `
        <div class="welcome-screen">
          <div class="welcome-icon">
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
              <rect x="8" y="8" width="48" height="48" rx="6" fill="#1a3a5c"/>
              <path d="M32 16L44 24V40L32 48L20 40V24L32 16Z" stroke="#f5a623" stroke-width="3" fill="none"/>
              <path d="M32 24L38 28V36L32 40L26 36V28L32 24Z" fill="#f5a623"/>
            </svg>
          </div>
          <h2>施工安全问答助手</h2>
          <p>欢迎使用施工安全智能问答系统，请输入您的施工安全问题，我将为您提供专业解答。</p>
          <div class="welcome-suggestions">
            <div class="suggestion-card" data-suggestion="脚手架搭设有哪些安全要求？">
              <span class="suggestion-icon">📋</span>
              <span>脚手架搭设安全要求</span>
            </div>
            <div class="suggestion-card" data-suggestion="高处作业的安全防护措施有哪些？">
              <span class="suggestion-icon">🛡️</span>
              <span>高处作业安全防护</span>
            </div>
            <div class="suggestion-card" data-suggestion="施工现场临时用电安全规范是什么？">
              <span class="suggestion-icon">⚡</span>
              <span>临时用电安全规范</span>
            </div>
            <div class="suggestion-card" data-suggestion="深基坑施工安全注意事项有哪些？">
              <span class="suggestion-icon">🏗️</span>
              <span>深基坑施工安全</span>
            </div>
          </div>
        </div>
      `;
    } else {
      return `
        <div class="welcome-screen">
          <div class="welcome-icon">
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
              <rect x="8" y="8" width="48" height="48" rx="6" fill="#1a3a5c"/>
              <rect x="18" y="18" width="28" height="28" rx="2" stroke="#f5a623" stroke-width="3" fill="none"/>
              <circle cx="26" cy="26" r="3" fill="#f5a623"/>
              <polyline points="42,38 34,30 22,42" stroke="#f5a623" stroke-width="3" fill="none"/>
            </svg>
          </div>
          <h2>图片智能分析</h2>
          <p>上传施工现场照片、安全隐患图片、施工图纸或考题截图，AI将智能识别并分析图片内容。</p>
          <div class="image-suggestions">
            <div class="img-sugg-item">📷 施工现场安全隐患排查</div>
            <div class="img-sugg-item">📐 施工图纸问题解读</div>
            <div class="img-sugg-item">📝 考题截图考点分析</div>
            <div class="img-sugg-item">⚠️ 违规操作识别</div>
          </div>
        </div>
      `;
    }
  },

  /**
   * 绑定欢迎页建议点击
   */
  bindWelcomeSuggestions() {
    document.querySelectorAll('.suggestion-card').forEach(card => {
      card.addEventListener('click', () => {
        const suggestion = card.dataset.suggestion;
        document.getElementById('messageInput').value = suggestion;
        this.sendMessage();
      });
    });
  },

  /**
   * 渲染对话列表
   */
  renderConversationList() {
    const list = document.getElementById('conversationList');
    if (this.conversations.length === 0) {
      list.innerHTML = '<div class="conversation-empty">暂无历史对话</div>';
      return;
    }

    let html = '';
    this.conversations.forEach(conv => {
      const isActive = conv.id === this.currentConversationId;
      html += `
        <div class="conversation-item ${isActive ? 'active' : ''}" onclick="ChatModule.switchConversation('${conv.id}')">
          <span class="conversation-title">${this.escapeHtml(conv.title)}</span>
          <button class="conversation-delete" onclick="event.stopPropagation(); ChatModule.deleteConversation('${conv.id}')" title="删除">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </button>
        </div>
      `;
    });
    list.innerHTML = html;
  },

  /**
   * 保存对话到本地存储
   */
  saveConversations() {
    try {
      localStorage.setItem('csa_conversations', JSON.stringify(this.conversations));
    } catch (e) {
      console.error('保存对话失败:', e);
      if (e.name === 'QuotaExceededError') {
        this.conversations = this.conversations.slice(0, 5);
        try {
          localStorage.setItem('csa_conversations', JSON.stringify(this.conversations));
        } catch (e2) {
          App.showToast('存储空间不足，已自动清理旧对话', 'warning');
        }
      }
    }
  },

  /**
   * 从本地存储加载对话
   */
  loadConversations() {
    try {
      const data = localStorage.getItem('csa_conversations');
      this.conversations = data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('加载对话失败:', e);
      this.conversations = [];
    }
  },

  /**
   * HTML转义
   */
  escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
};
