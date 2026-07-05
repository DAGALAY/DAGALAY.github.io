/**
 * 施工安全问答助手 - 主控制器（纯前端版本）
 * 直接调用阿里云 DashScope API，无需 Node.js 后端
 * 部署到任何静态主机或直接打开 HTML 即可使用
 */
const App = {
  // 全局状态
  apiKey: '',
  model: 'qwen-plus',
  systemPrompt: '',
  useKnowledgeBase: true,
  currentModule: 'chat',

  // DashScope API 地址
  API_URL: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',

  // 预设系统提示词
  presetPrompts: {
    engineer: '你是一位资深建筑施工安全工程师，拥有20年以上施工现场安全管理经验，精通国家建筑施工安全规范和标准（包括但不限于JGJ 59、JGJ 80、JGJ 130、JGJ 46、JGJ 162等）。请用专业、准确、简洁的语言回答施工安全问题，在回答中引用相关规范条文，注重实操指导性。',
    teacher: '你是一位施工安全培训讲师，擅长将复杂的施工安全知识以通俗易懂的方式讲解。回答问题时请注重知识点的系统性、逻辑性和教学性，适当举例说明，帮助学习者深入理解施工安全规范要点。',
    examiner: '你是一位施工安全考试阅卷老师，熟悉施工安全考试出题规律和评分标准。回答问题时请注重考点的准确性和规范性，指出常见的易错点和注意事项，帮助考生备考施工安全员考试、三类人员考试等。',
    calculator: '你是一位工程计算专员，精通建筑施工中的各类计算，包括脚手架计算、荷载计算、模板计算、基坑支护计算等。回答问题时请给出详细的计算过程、公式和参数取值依据，确保计算结果的准确性。',
    inspector: '你是一位现场安全检查员，熟悉施工现场各类安全隐患的识别和处理。回答问题时请从现场实际出发，指出常见安全隐患、违规行为及其整改措施，注重实用性和可操作性。',
    custom: ''
  },

  /**
   * 初始化应用
   */
  async init() {
    // 加载设置
    this.loadSettings();

    // 初始化各模块
    ChatModule.init();
    UnitsConverter.init();
    EngineeringCalculator.init();
    QuestionModule.init();

    // 绑定全局事件
    this.bindEvents();

    // 初始化UI状态
    this.updateUIState();

    // 更新API状态
    this.updateApiStatus();

    console.log('[施工安全问答助手] 纯前端模式初始化完成');
  },

  /**
   * 更新API状态显示
   */
  updateApiStatus() {
    const status = document.getElementById('apiStatus');
    const text = status.querySelector('.status-text');
    
    if (this.apiKey) {
      status.className = 'api-status connected';
      text.textContent = '已连接';
    } else {
      status.className = 'api-status disconnected';
      text.textContent = '未配置';
    }
  },

  /**
   * 绑定全局事件
   */
  bindEvents() {
    // 功能模块切换
    document.querySelectorAll('.module-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this.switchModule(tab.dataset.module);
      });
    });

    // 移动端侧边栏
    document.getElementById('mobileMenuBtn').addEventListener('click', () => {
      document.getElementById('sidebar').classList.toggle('open');
      document.getElementById('sidebarOverlay').classList.toggle('active');
    });

    document.getElementById('sidebarOverlay').addEventListener('click', () => {
      document.getElementById('sidebar').classList.remove('open');
      document.getElementById('sidebarOverlay').classList.remove('active');
    });

    // API Key 保存
    document.getElementById('saveApiKey').addEventListener('click', () => {
      this.saveApiKey();
    });

    // API Key 显示/隐藏
    document.getElementById('toggleApiKeyVisibility').addEventListener('click', () => {
      const input = document.getElementById('apiKeyInput');
      input.type = input.type === 'password' ? 'text' : 'password';
    });

    // 模型选择
    document.getElementById('modelSelect').addEventListener('change', (e) => {
      this.model = e.target.value;
      this.saveSettings();
    });

    // 系统提示词预设
    document.getElementById('presetPromptSelect').addEventListener('change', (e) => {
      const preset = e.target.value;
      if (preset && this.presetPrompts[preset]) {
        document.getElementById('systemPromptInput').value = this.presetPrompts[preset];
        this.systemPrompt = this.presetPrompts[preset];
      } else if (preset === 'custom') {
        document.getElementById('systemPromptInput').focus();
      }
      this.saveSettings();
    });

    // 系统提示词输入
    document.getElementById('systemPromptInput').addEventListener('input', (e) => {
      this.systemPrompt = e.target.value;
      this.saveSettings();
    });

    // 知识库开关
    document.getElementById('knowledgeBaseToggle').addEventListener('change', (e) => {
      this.useKnowledgeBase = e.target.checked;
      this.saveSettings();
      this.showToast(
        e.target.checked ? '已开启知识库增强' : '已关闭知识库增强',
        'info'
      );
    });

    // 弹窗事件
    document.getElementById('modalCancel').addEventListener('click', () => {
      this.hideModal();
    });
    document.getElementById('modalOverlay').addEventListener('click', (e) => {
      if (e.target.id === 'modalOverlay') this.hideModal();
    });
  },

  /**
   * 切换功能模块
   */
  switchModule(moduleName) {
    this.currentModule = moduleName;

    // 更新标签状态
    document.querySelectorAll('.module-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.module === moduleName);
    });

    // 更新面板显示
    document.querySelectorAll('.module-panel').forEach(panel => {
      panel.classList.remove('active');
    });
    
    const panel = document.getElementById('module-' + moduleName);
    if (panel) panel.classList.add('active');

    // 切换输入区显示
    const inputArea = document.getElementById('inputArea');
    if (moduleName === 'units' || moduleName === 'calculator') {
      inputArea.style.display = 'none';
    } else {
      inputArea.style.display = 'block';
    }

    // 如果是图片分析模块，自动切换到视觉模型
    if (moduleName === 'image') {
      const modelSelect = document.getElementById('modelSelect');
      if (!modelSelect.value.includes('vl')) {
        modelSelect.value = 'qwen-vl-plus';
        this.model = 'qwen-vl-plus';
        this.saveSettings();
      }
      ChatModule.renderMessages();
    } else if (moduleName === 'chat') {
      ChatModule.renderMessages();
    }

    // 移动端关闭侧边栏
    if (window.innerWidth <= 768) {
      document.getElementById('sidebar').classList.remove('open');
      document.getElementById('sidebarOverlay').classList.remove('active');
    }
  },

  /**
   * 保存API Key
   */
  saveApiKey() {
    const input = document.getElementById('apiKeyInput');
    this.apiKey = input.value.trim();
    this.saveSettings();
    this.updateApiStatus();
    
    if (this.apiKey) {
      this.showToast('API Key 已保存', 'success');
    } else {
      this.showToast('API Key 已清除', 'info');
    }
  },

  /**
   * 更新UI状态
   */
  updateUIState() {
    document.getElementById('apiKeyInput').value = this.apiKey;
    document.getElementById('modelSelect').value = this.model;
    document.getElementById('systemPromptInput').value = this.systemPrompt;
    document.getElementById('knowledgeBaseToggle').checked = this.useKnowledgeBase;

    // 匹配预设
    const presetSelect = document.getElementById('presetPromptSelect');
    for (const [key, value] of Object.entries(this.presetPrompts)) {
      if (value && value === this.systemPrompt) {
        presetSelect.value = key;
        break;
      }
    }
  },

  /**
   * 保存设置到本地存储
   */
  saveSettings() {
    const settings = {
      apiKey: this.apiKey,
      model: this.model,
      systemPrompt: this.systemPrompt,
      useKnowledgeBase: this.useKnowledgeBase
    };
    try {
      localStorage.setItem('csa_settings', JSON.stringify(settings));
    } catch (e) {
      console.error('保存设置失败:', e);
    }
  },

  /**
   * 加载设置
   */
  loadSettings() {
    try {
      const data = localStorage.getItem('csa_settings');
      if (data) {
        const settings = JSON.parse(data);
        this.apiKey = settings.apiKey || '';
        this.model = settings.model || 'qwen-plus';
        this.systemPrompt = settings.systemPrompt || this.presetPrompts.engineer;
        this.useKnowledgeBase = settings.useKnowledgeBase !== undefined ? settings.useKnowledgeBase : true;
      } else {
        this.systemPrompt = this.presetPrompts.engineer;
      }
    } catch (e) {
      console.error('加载设置失败:', e);
      this.systemPrompt = this.presetPrompts.engineer;
    }
  },

  /**
   * 调用阿里云 DashScope API（纯前端直连）
   * @param {string} endpoint - 未使用，保留兼容
   * @param {object} body - 请求参数 { messages, model, systemPrompt, useKnowledgeBase, apiKey }
   */
  async callAPI(endpoint, body) {
    const apiKey = body.apiKey || this.apiKey;
    if (!apiKey) {
      throw new Error('请先在左侧设置中输入 API Key');
    }

    // 构建系统提示词
    let fullSystemPrompt = body.systemPrompt || this.presetPrompts.engineer;
    
    // 附加知识库上下文
    if (body.useKnowledgeBase && typeof KnowledgeBase !== 'undefined') {
      fullSystemPrompt += KnowledgeBase.buildContext();
    }

    // 构建请求体
    const requestBody = {
      model: body.model || this.model,
      messages: [
        { role: 'system', content: fullSystemPrompt },
        ...body.messages
      ],
      temperature: 0.7,
      max_tokens: 4096
    };

    console.log(`[API] 模型: ${requestBody.model}, 消息数: ${requestBody.messages.length}`);

    let response;
    try {
      response = await fetch(this.API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(requestBody)
      });
    } catch (networkErr) {
      console.error('[API] 网络请求失败:', networkErr);
      throw new Error('网络请求失败，请检查网络连接是否正常。如遇跨域(CORS)错误，请确保部署在正式域名下而非本地file://打开。');
    }

    // 检查响应类型
    const contentType = response.headers.get('content-type') || '';

    if (!response.ok) {
      let errorData = {};
      if (contentType.includes('application/json')) {
        errorData = await response.json().catch(() => ({}));
      } else {
        const errorText = await response.text().catch(() => '');
        errorData = { error: { message: errorText.substring(0, 500) || `HTTP ${response.status}` } };
      }
      console.error('[API错误]', response.status, errorData);
      throw new Error(errorData.error?.message || `API请求失败 (HTTP ${response.status})`);
    }

    if (!contentType.includes('application/json')) {
      const text = await response.text().catch(() => '');
      console.error('[API] 非JSON响应:', contentType);
      throw new Error('API返回了非JSON响应，请稍后重试。');
    }

    let data;
    try {
      data = await response.json();
    } catch (jsonErr) {
      console.error('[API] JSON解析失败:', jsonErr);
      throw new Error('API响应格式错误，无法解析JSON。');
    }

    // 验证返回数据结构
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('[API] 数据结构异常:', JSON.stringify(data).substring(0, 300));
      throw new Error('API返回数据格式异常，请稍后重试。');
    }

    return {
      success: true,
      reply: data.choices[0].message.content,
      model: data.model,
      usage: data.usage
    };
  },

  /**
   * 格式化Markdown
   */
  formatMarkdown(text) {
    if (!text) return '';
    
    let html = this.escapeHtml(text);
    
    // 代码块
    html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, '<pre><code>$2</code></pre>');
    
    // 行内代码
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // 标题
    html = html.replace(/^### (.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^## (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^# (.+)$/gm, '<h2>$1</h2>');
    
    // 粗体
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    
    // 斜体
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    
    // 引用
    html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');
    
    // 列表
    html = html.replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>');
    html = html.replace(/^[-•] (.+)$/gm, '<li>$1</li>');
    
    // 连续的li包裹ul
    html = html.replace(/(<li>[\s\S]*?<\/li>)(?!\s*<li>)/g, '<ul>$1</ul>');
    
    // 表格（简单处理）
    html = html.replace(/^\|(.+)\|$/gm, (match) => {
      const cells = match.split('|').filter(c => c.trim());
      return '<tr>' + cells.map(c => `<td>${c.trim()}</td>`).join('') + '</tr>';
    });
    html = html.replace(/(<tr>[\s\S]*?<\/tr>)(?!\s*<tr>)/g, '<table border="1">$1</table>');
    
    // 段落和换行
    html = html.split('\n\n').map(para => {
      if (para.match(/^<(h\d|ul|ol|pre|blockquote|table)/)) {
        return para;
      }
      return '<p>' + para.replace(/\n/g, '<br>') + '</p>';
    }).join('\n');
    
    return html;
  },

  /**
   * HTML转义
   */
  escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  /**
   * 显示弹窗
   */
  showModal(title, message, onConfirm) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalMessage').textContent = message;
    document.getElementById('modalOverlay').classList.add('active');
    
    const confirmBtn = document.getElementById('modalConfirm');
    const newBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);
    newBtn.addEventListener('click', () => {
      this.hideModal();
      if (onConfirm) onConfirm();
    });
  },

  /**
   * 隐藏弹窗
   */
  hideModal() {
    document.getElementById('modalOverlay').classList.remove('active');
  },

  /**
   * 显示加载提示
   */
  showLoading(text = '正在处理...') {
    document.getElementById('loadingText').textContent = text;
    document.getElementById('loadingOverlay').classList.add('active');
  },

  /**
   * 隐藏加载提示
   */
  hideLoading() {
    document.getElementById('loadingOverlay').classList.remove('active');
  },

  /**
   * 显示Toast提示
   */
  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = 'toast ' + type;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
};

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
