/**
 * 题目生成与答案分析模块
 * 支持生成施工安全题目、用户作答、智能批改
 */
const QuestionModule = {
  generatedQuestions: [],
  userAnswers: {},

  /**
   * 初始化
   */
  init() {
    document.getElementById('generateQuestionsBtn').addEventListener('click', () => {
      this.generateQuestions();
    });
  },

  /**
   * 生成题目
   */
  async generateQuestions() {
    const type = document.getElementById('questionType').value;
    const count = parseInt(document.getElementById('questionCount').value);
    const topic = document.getElementById('questionTopic').value;
    const difficulty = document.getElementById('questionDifficulty').value;

    const btn = document.getElementById('generateQuestionsBtn');
    btn.disabled = true;
    btn.textContent = '生成中...';
    App.showLoading('正在生成施工安全题目...');

    try {
      const typeMap = {
        choice: '选择题',
        judge: '判断题',
        short: '简答题',
        practice: '实操问答题',
        mixed: '混合题型（选择题、判断题、简答题）'
      };

      let prompt = `你是一位施工安全考试出题专家。请生成${count}道施工安全${typeMap[type]}，`;

      if (topic) {
        prompt += `知识点方向为"${topic}"，`;
      }
      prompt += `难度为${difficulty}。\n\n`;

      prompt += `要求：
1. 题目内容必须符合国家建筑施工安全规范和标准
2. 每道题必须包含：题号、题目内容、选项（选择题需要ABCD四个选项）、正确答案、考点解析
3. 选择题和判断题需要明确标出正确答案
4. 简答题和实操问答题需要给出参考答案要点
5. 考点解析要简明扼要，说明涉及的规范条文

请严格按照以下JSON格式输出（不要包含markdown代码块标记）：
{
  "questions": [
    {
      "id": 1,
      "type": "选择题|判断题|简答题|实操问答题",
      "title": "题目内容",
      "options": {"A": "选项A内容", "B": "选项B内容", "C": "选项C内容", "D": "选项D内容"},
      "answer": "正确答案（选择题为A/B/C/D，判断题为正确/错误，简答题为参考答案要点）",
      "analysis": "考点解析"
    }
  ]
}`;

      const messages = [{ role: 'user', content: prompt }];

      const response = await App.callAPI('/api/chat', {
        messages,
        systemPrompt: '你是一位资深施工安全培训讲师和考试出题专家，精通建筑施工安全各类规范标准。你生成的题目必须专业、准确、符合规范。',
        useKnowledgeBase: true
      });

      // 解析JSON
      let questionsData;
      try {
        // 尝试提取JSON
        let jsonStr = response.reply;
        // 移除可能的markdown代码块标记
        jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        questionsData = JSON.parse(jsonStr);
      } catch (e) {
        // 如果解析失败，尝试从文本中提取
        const jsonMatch = response.reply.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            questionsData = JSON.parse(jsonMatch[0]);
          } catch (e2) {
            throw new Error('题目解析失败，请重试');
          }
        } else {
          throw new Error('题目解析失败，请重试');
        }
      }

      this.generatedQuestions = questionsData.questions || [];
      this.userAnswers = {};
      this.renderQuestions();

    } catch (err) {
      App.showToast('生成题目失败: ' + err.message, 'error');
      console.error(err);
    } finally {
      btn.disabled = false;
      btn.textContent = '生成题目';
      App.hideLoading();
    }
  },

  /**
   * 渲染题目
   */
  renderQuestions() {
    const container = document.getElementById('questionsDisplay');
    const analysisContainer = document.getElementById('questionsAnalysis');
    analysisContainer.classList.remove('show');

    if (this.generatedQuestions.length === 0) {
      container.innerHTML = '<p style="text-align:center;color:#999;padding:20px;">暂无题目</p>';
      container.classList.remove('show');
      return;
    }

    let html = '<h3 style="font-size:16px;color:#1a3a5c;margin-bottom:16px;">施工安全考题</h3>';

    this.generatedQuestions.forEach((q, index) => {
      const isObjective = q.type === '选择题' || q.type === '判断题';
      
      html += `<div class="question-card" data-qid="${q.id || index}">`;
      html += `<div class="question-header">`;
      html += `<span class="question-number">第 ${index + 1} 题</span>`;
      html += `<span class="question-type-badge">${q.type}</span>`;
      html += `</div>`;
      html += `<div class="question-title">${this.escapeHtml(q.title)}</div>`;

      if (q.options && typeof q.options === 'object') {
        html += '<div class="question-options">';
        for (const [key, val] of Object.entries(q.options)) {
          html += `<div class="question-option" data-option="${key}" onclick="QuestionModule.selectOption(${index}, '${key}')">`;
          html += `<span class="question-option-label">${key}.</span>`;
          html += `<span>${this.escapeHtml(val)}</span>`;
          html += `</div>`;
        }
        html += '</div>';
      } else if (q.type === '判断题') {
        html += '<div class="question-options">';
        html += `<div class="question-option" data-option="正确" onclick="QuestionModule.selectOption(${index}, '正确')"><span class="question-option-label">A.</span><span>正确</span></div>`;
        html += `<div class="question-option" data-option="错误" onclick="QuestionModule.selectOption(${index}, '错误')"><span class="question-option-label">B.</span><span>错误</span></div>`;
        html += '</div>';
      } else {
        // 简答题/实操问答题
        html += `<textarea class="question-answer-input" id="answer_${index}" placeholder="请输入你的答案..."></textarea>`;
      }

      html += '<div class="question-actions">';
      html += `<button class="btn-submit-answer" onclick="QuestionModule.submitAnswer(${index})">提交答案</button>`;
      html += `<button onclick="QuestionModule.showAnswer(${index})">查看答案</button>`;
      html += '</div>';

      html += `<div class="question-feedback" id="feedback_${index}"></div>`;
      html += '</div>';
    });

    html += '<div style="text-align:center;margin-top:16px;">';
    html += '<button class="btn-primary btn-small" style="padding:10px 30px;font-size:14px;" onclick="QuestionModule.analyzeAll()">提交全部并分析</button>';
    html += '</div>';

    container.innerHTML = html;
    container.classList.add('show');
  },

  /**
   * 选择选项
   */
  selectOption(qIndex, option) {
    // 取消之前的选择
    const card = document.querySelector(`.question-card[data-qid="${this.generatedQuestions[qIndex].id || qIndex}"]`);
    if (!card) return;
    
    card.querySelectorAll('.question-option').forEach(opt => {
      opt.classList.remove('selected');
    });
    
    // 选中当前
    const selected = card.querySelector(`.question-option[data-option="${option}"]`);
    if (selected) {
      selected.classList.add('selected');
    }
    
    this.userAnswers[qIndex] = option;
  },

  /**
   * 提交单题答案
   */
  async submitAnswer(qIndex) {
    const question = this.generatedQuestions[qIndex];
    let userAnswer = this.userAnswers[qIndex];

    // 如果是简答题，从textarea获取
    if (!userAnswer && (question.type === '简答题' || question.type === '实操问答题')) {
      const textarea = document.getElementById(`answer_${qIndex}`);
      userAnswer = textarea ? textarea.value.trim() : '';
    }

    if (!userAnswer) {
      App.showToast('请先选择或输入答案', 'warning');
      return;
    }

    const feedback = document.getElementById(`feedback_${qIndex}`);
    feedback.innerHTML = '<p style="color:#999;">正在分析答案...</p>';
    feedback.classList.add('show');

    try {
      const isObjective = question.type === '选择题' || question.type === '判断题';
      
      if (isObjective) {
        // 客观题直接比对
        const correct = userAnswer === question.answer;
        feedback.className = 'question-feedback show ' + (correct ? 'correct' : 'wrong');
        feedback.innerHTML = `
          <h4>${correct ? '✓ 回答正确' : '✗ 回答错误'}</h4>
          <p><strong>你的答案：</strong>${userAnswer}</p>
          <p><strong>正确答案：</strong>${question.answer}</p>
          <p><strong>考点解析：</strong>${this.escapeHtml(question.analysis || '暂无解析')}</p>
        `;

        // 标记选项颜色
        const card = document.querySelector(`.question-card[data-qid="${question.id || qIndex}"]`);
        if (card) {
          card.querySelectorAll('.question-option').forEach(opt => {
            const optVal = opt.dataset.option;
            opt.classList.remove('correct', 'wrong', 'selected');
            if (optVal === question.answer) {
              opt.classList.add('correct');
            } else if (optVal === userAnswer && !correct) {
              opt.classList.add('wrong');
            }
          });
        }
      } else {
        // 主观题调用AI批改
        const prompt = `请批改以下施工安全${question.type}：

题目：${question.title}

学生答案：${userAnswer}

参考答案：${question.answer}

请从以下方面分析：
1. 判断对错（完全正确/部分正确/错误）
2. 指出学生答案中的亮点和不足
3. 标注是否存在违规问题描述
4. 给出标准作答方案
5. 解释考点

请用简洁专业的方式回答。`;

        const response = await App.callAPI('/api/chat', {
          messages: [{ role: 'user', content: prompt }],
          systemPrompt: '你是一位严格的施工安全考试阅卷老师，请根据参考答案对学生的作答进行专业批改和点评。',
          useKnowledgeBase: true
        });

        feedback.className = 'question-feedback show correct';
        feedback.innerHTML = `
          <h4>📝 答案分析报告</h4>
          <div style="white-space:pre-wrap;">${App.formatMarkdown(response.reply)}</div>
        `;
      }
    } catch (err) {
      feedback.className = 'question-feedback show wrong';
      feedback.innerHTML = `<p>分析失败: ${err.message}</p>`;
    }
  },

  /**
   * 查看答案
   */
  showAnswer(qIndex) {
    const question = this.generatedQuestions[qIndex];
    const feedback = document.getElementById(`feedback_${qIndex}`);
    feedback.className = 'question-feedback show correct';
    
    let html = `<h4>📋 参考答案</h4>`;
    html += `<p><strong>正确答案：</strong>${this.escapeHtml(question.answer)}</p>`;
    html += `<p><strong>考点解析：</strong>${this.escapeHtml(question.analysis || '暂无解析')}</p>`;
    
    feedback.innerHTML = html;
  },

  /**
   * 分析全部答题情况
   */
  analyzeAll() {
    const container = document.getElementById('questionsAnalysis');
    const objectiveQuestions = this.generatedQuestions.filter(q => q.type === '选择题' || q.type === '判断题');
    
    if (objectiveQuestions.length === 0) {
      App.showToast('当前题型不支持自动评分，请逐题提交查看分析', 'info');
      return;
    }

    let correctCount = 0;
    let answeredCount = 0;

    objectiveQuestions.forEach((q, idx) => {
      const qIndex = this.generatedQuestions.indexOf(q);
      const userAns = this.userAnswers[qIndex];
      if (userAns) {
        answeredCount++;
        if (userAns === q.answer) correctCount++;
      }
    });

    const score = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;
    const unanswered = objectiveQuestions.length - answeredCount;

    let html = `
      <h3>答题分析报告</h3>
      <div class="analysis-score">${score} 分</div>
      <div class="analysis-detail">
        <p><strong>客观题总数：</strong>${objectiveQuestions.length} 题</p>
        <p><strong>已作答：</strong>${answeredCount} 题</p>
        <p><strong>未作答：</strong>${unanswered} 题</p>
        <p><strong>答对：</strong>${correctCount} 题</p>
        <p><strong>答错：</strong>${answeredCount - correctCount} 题</p>
        <p><strong>正确率：</strong>${answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0}%</p>
      </div>
    `;

    if (score >= 80) {
      html += `<div class="calc-result-note" style="background:rgba(56,161,105,0.08);border-left-color:#38a169;">
        <strong>🎉 优秀！</strong>你的施工安全知识掌握较好，建议继续保持。对于错题请仔细查看考点解析，巩固薄弱知识点。
      </div>`;
    } else if (score >= 60) {
      html += `<div class="calc-result-note">
        <strong>📚 合格</strong>已达到基本要求，但仍有提升空间。建议重点复习错题涉及的规范条文，加强薄弱环节的学习。
      </div>`;
    } else {
      html += `<div class="calc-result-note" style="background:rgba(229,62,62,0.08);border-left-color:#e53e3e;">
        <strong>⚠️ 需要加强</strong>得分较低，建议系统学习建筑施工安全规范，重点关注脚手架、高处作业、临时用电、基坑工程等核心知识点。
      </div>`;
    }

    container.innerHTML = html;
    container.classList.add('show');
    container.scrollIntoView({ behavior: 'smooth' });
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
