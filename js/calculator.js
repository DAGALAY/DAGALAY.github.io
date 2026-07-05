/**
 * 工程计算模块
 * 支持脚手架参数、荷载计算、基础工程量、施工配比
 */
const EngineeringCalculator = {
  currentCalc: 'scaffold',

  /**
   * 初始化
   */
  init() {
    document.querySelectorAll('.calc-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.calc-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.currentCalc = tab.dataset.calc;
        this.renderForm();
      });
    });

    this.renderForm();
  },

  /**
   * 渲染表单
   */
  renderForm() {
    const container = document.getElementById('calcFormArea');
    const resultArea = document.getElementById('calcResultArea');
    resultArea.classList.remove('show');

    switch (this.currentCalc) {
      case 'scaffold':
        container.innerHTML = this.scaffoldForm();
        break;
      case 'load':
        container.innerHTML = this.loadForm();
        break;
      case 'foundation':
        container.innerHTML = this.foundationForm();
        break;
      case 'mixratio':
        container.innerHTML = this.mixRatioForm();
        break;
    }
  },

  // ============ 脚手架参数核算 ============
  scaffoldForm() {
    return `
      <h3 style="font-size:16px;color:#1a3a5c;margin-bottom:16px;">脚手架参数核算</h3>
      <div class="calc-form-row">
        <div class="calc-form-group">
          <label>脚手架类型</label>
          <select id="sfType">
            <option value="double">双排扣件式钢管脚手架</option>
            <option value="single">单排扣件式钢管脚手架</option>
          </select>
        </div>
        <div class="calc-form-group">
          <label>搭设高度 <span class="hint">(m)</span></label>
          <input type="number" id="sfHeight" value="24" step="0.1" placeholder="如：24">
        </div>
      </div>
      <div class="calc-form-row">
        <div class="calc-form-group">
          <label>立杆纵距 <span class="hint">(m)</span></label>
          <input type="number" id="sfLongitudinal" value="1.5" step="0.1" placeholder="如：1.5">
        </div>
        <div class="calc-form-group">
          <label>立杆横距 <span class="hint">(m)</span></label>
          <input type="number" id="sfTransverse" value="1.05" step="0.05" placeholder="如：1.05">
        </div>
      </div>
      <div class="calc-form-row">
        <div class="calc-form-group">
          <label>步距 <span class="hint">(m)</span></label>
          <input type="number" id="sfStep" value="1.8" step="0.1" placeholder="如：1.8">
        </div>
        <div class="calc-form-group">
          <label>钢管规格</label>
          <select id="sfPipe">
            <option value="48.3x3.6">Φ48.3×3.6mm</option>
            <option value="48x3.5">Φ48×3.5mm</option>
            <option value="51x3.0">Φ51×3.0mm</option>
          </select>
        </div>
      </div>
      <button class="calc-btn" onclick="EngineeringCalculator.calcScaffold()">计算参数</button>
    `;
  },

  calcScaffold() {
    const height = parseFloat(document.getElementById('sfHeight').value);
    const lon = parseFloat(document.getElementById('sfLongitudinal').value);
    const tra = parseFloat(document.getElementById('sfTransverse').value);
    const step = parseFloat(document.getElementById('sfStep').value);
    const type = document.getElementById('sfType').value;

    if (!height || !lon || !tra || !step) {
      App.showToast('请填写所有参数', 'warning');
      return;
    }

    // 计算步数
    const steps = Math.ceil(height / step);
    // 立杆数量（每跨，双排）
    const rows = type === 'double' ? 2 : 1;
    const postsPerBay = rows + 1; // 每跨立杆数（含端部）
    // 连墙件数量（两步三跨）
    const tieCount = Math.ceil((height / (step * 2)) * (1)); // 简化估算
    // 钢管长度估算（每平方米立面面积约需钢管）
    const areaPerBay = height * lon;
    const pipePerM2 = 1.5; // 经验值：每平方米约1.5m钢管
    const totalPipe = areaPerBay * pipePerM2 * rows;
    // 扣件数量（约为钢管长度的0.5-0.8个/米）
    const fastenerCount = Math.round(totalPipe * 0.6);
    // 脚手板面积
    const plankArea = tra * lon;
    // 安全网面积
    const netArea = height * lon;

    // 规范校验
    const warnings = [];
    if (height > 50) warnings.push('搭设高度超过50m，需编制专项施工方案并组织专家论证');
    if (height > 24) warnings.push('搭设高度超过24m，需编制专项施工方案');
    if (lon > 2.0) warnings.push('立杆纵距超过2.0m，超出规范限值（JGJ 130）');
    if (tra > 1.55) warnings.push('立杆横距超过1.55m，超出规范限值');
    if (step > 1.8) warnings.push('步距超过1.8m，超出规范限值');

    let html = `
      <h3>脚手架参数计算结果</h3>
      <div class="calc-result-item">
        <span class="calc-result-label">搭设步数</span>
        <span class="calc-result-value">${steps} 步</span>
      </div>
      <div class="calc-result-item">
        <span class="calc-result-label">每跨立杆数</span>
        <span class="calc-result-value">${postsPerBay} 根</span>
      </div>
      <div class="calc-result-item">
        <span class="calc-result-label">钢管总长度（每跨）</span>
        <span class="calc-result-value">${totalPipe.toFixed(1)} m</span>
      </div>
      <div class="calc-result-item">
        <span class="calc-result-label">扣件数量（每跨）</span>
        <span class="calc-result-value">约 ${fastenerCount} 个</span>
      </div>
      <div class="calc-result-item">
        <span class="calc-result-label">脚手板面积（每层每跨）</span>
        <span class="calc-result-value">${plankArea.toFixed(2)} m²</span>
      </div>
      <div class="calc-result-item">
        <span class="calc-result-label">安全网面积（每跨）</span>
        <span class="calc-result-value">${netArea.toFixed(2)} m²</span>
      </div>
      <div class="calc-result-item">
        <span class="calc-result-label">连墙件设置</span>
        <span class="calc-result-value">两步三跨</span>
      </div>
    `;

    if (warnings.length > 0) {
      html += `<div class="calc-result-note"><strong>⚠ 规范校验提醒：</strong><br>${warnings.map(w => '• ' + w).join('<br>')}<br><br>依据：《建筑施工扣件式钢管脚手架安全技术规范》(JGJ 130)</div>`;
    } else {
      html += `<div class="calc-result-note"><strong>✓ 规范校验通过</strong><br>各项参数均在规范允许范围内。依据：JGJ 130</div>`;
    }

    document.getElementById('calcResultArea').innerHTML = html;
    document.getElementById('calcResultArea').classList.add('show');
  },

  // ============ 荷载计算 ============
  loadForm() {
    return `
      <h3 style="font-size:16px;color:#1a3a5c;margin-bottom:16px;">施工荷载计算</h3>
      <div class="calc-form-row">
        <div class="calc-form-group">
          <label>计算类型</label>
          <select id="loadType">
            <option value="floor">楼板施工荷载</option>
            <option value="scaffold">脚手架荷载</option>
            <option value="crane">吊装荷载</option>
          </select>
        </div>
        <div class="calc-form-group">
          <label>施工均布荷载 <span class="hint">(kN/m²)</span></label>
          <input type="number" id="loadUniform" value="3.0" step="0.1" placeholder="如：3.0">
        </div>
      </div>
      <div class="calc-form-row">
        <div class="calc-form-group">
          <label>计算面积 <span class="hint">(m²)</span></label>
          <input type="number" id="loadArea" value="10" step="0.1" placeholder="如：10">
        </div>
        <div class="calc-form-group">
          <label>恒载（自重）<span class="hint">(kN/m²)</span></label>
          <input type="number" id="loadDead" value="1.5" step="0.1" placeholder="如：1.5">
        </div>
      </div>
      <div class="calc-form-row">
        <div class="calc-form-group">
          <label>安全系数</label>
          <select id="loadFactor">
            <option value="1.2">1.2（基本组合）</option>
            <option value="1.4">1.4（施工活载）</option>
            <option value="1.5">1.5（特殊工况）</option>
          </select>
        </div>
        <div class="calc-form-group">
          <label>集中荷载 <span class="hint">(kN，可选)</span></label>
          <input type="number" id="loadPoint" value="0" step="0.1" placeholder="如：2.0">
        </div>
      </div>
      <button class="calc-btn" onclick="EngineeringCalculator.calcLoad()">计算荷载</button>
    `;
  },

  calcLoad() {
    const uniform = parseFloat(document.getElementById('loadUniform').value);
    const area = parseFloat(document.getElementById('loadArea').value);
    const dead = parseFloat(document.getElementById('loadDead').value);
    const factor = parseFloat(document.getElementById('loadFactor').value);
    const point = parseFloat(document.getElementById('loadPoint').value);

    if (isNaN(uniform) || isNaN(area) || isNaN(dead)) {
      App.showToast('请填写必要参数', 'warning');
      return;
    }

    // 均布活载总值
    const liveLoad = uniform * area;
    // 恒载总值
    const deadLoad = dead * area;
    // 总荷载（标准值）
    const totalStandard = liveLoad + deadLoad;
    // 设计值（乘以分项系数）
    const liveDesign = liveLoad * 1.4;
    const deadDesign = deadLoad * 1.2;
    const totalDesign = liveDesign + deadDesign + point;

    let html = `
      <h3>荷载计算结果</h3>
      <div class="calc-result-item">
        <span class="calc-result-label">活载标准值</span>
        <span class="calc-result-value">${liveLoad.toFixed(2)} kN</span>
      </div>
      <div class="calc-result-item">
        <span class="calc-result-label">恒载标准值</span>
        <span class="calc-result-value">${deadLoad.toFixed(2)} kN</span>
      </div>
      <div class="calc-result-item">
        <span class="calc-result-label">荷载标准值合计</span>
        <span class="calc-result-value">${totalStandard.toFixed(2)} kN</span>
      </div>
      <div class="calc-result-item">
        <span class="calc-result-label">活载设计值 (×1.4)</span>
        <span class="calc-result-value">${liveDesign.toFixed(2)} kN</span>
      </div>
      <div class="calc-result-item">
        <span class="calc-result-label">恒载设计值 (×1.2)</span>
        <span class="calc-result-value">${deadDesign.toFixed(2)} kN</span>
      </div>
      ${point > 0 ? `<div class="calc-result-item">
        <span class="calc-result-label">集中荷载设计值</span>
        <span class="calc-result-value">${(point * factor).toFixed(2)} kN</span>
      </div>` : ''}
      <div class="calc-result-item" style="background:rgba(245,166,35,0.08);padding:14px;border-radius:6px;margin-top:8px;">
        <span class="calc-result-label" style="font-weight:600;">总荷载设计值</span>
        <span class="calc-result-value" style="font-size:18px;">${totalDesign.toFixed(2)} kN</span>
      </div>
      <div class="calc-result-note">
        <strong>计算说明：</strong><br>
        • 活载分项系数取1.4，恒载分项系数取1.2（GB 50009）<br>
        • 施工均布荷载标准值：结构脚手架≥3.0 kN/m²，装修脚手架≥2.0 kN/m²<br>
        • 依据：《建筑结构荷载规范》(GB 50009)、《建筑施工临时支撑结构技术规范》(JGJ 300)
      </div>
    `;

    document.getElementById('calcResultArea').innerHTML = html;
    document.getElementById('calcResultArea').classList.add('show');
  },

  // ============ 基础工程量 ============
  foundationForm() {
    return `
      <h3 style="font-size:16px;color:#1a3a5c;margin-bottom:16px;">基础工程量测算</h3>
      <div class="calc-form-row">
        <div class="calc-form-group">
          <label>基础类型</label>
          <select id="foundationType">
            <option value="strip">条形基础</option>
            <option value="independent">独立基础</option>
            <option value="slab">筏板基础</option>
            <option value="pile">桩基础</option>
          </select>
        </div>
        <div class="calc-form-group">
          <label>长度 <span class="hint">(m)</span></label>
          <input type="number" id="foundationLength" value="10" step="0.1">
        </div>
      </div>
      <div class="calc-form-row">
        <div class="calc-form-group">
          <label>宽度 <span class="hint">(m)</span></label>
          <input type="number" id="foundationWidth" value="2" step="0.1">
        </div>
        <div class="calc-form-group">
          <label>高度/厚度 <span class="hint">(m)</span></label>
          <input type="number" id="foundationHeight" value="1.5" step="0.1">
        </div>
      </div>
      <div class="calc-form-row">
        <div class="calc-form-group">
          <label>数量 <span class="hint">(个/根)</span></label>
          <input type="number" id="foundationCount" value="1" step="1">
        </div>
        <div class="calc-form-group">
          <label>混凝土强度等级</label>
          <select id="concreteGrade">
            <option value="C20">C20</option>
            <option value="C25">C25</option>
            <option value="C30" selected>C30</option>
            <option value="C35">C35</option>
            <option value="C40">C40</option>
          </select>
        </div>
      </div>
      <button class="calc-btn" onclick="EngineeringCalculator.calcFoundation()">计算工程量</button>
    `;
  },

  calcFoundation() {
    const length = parseFloat(document.getElementById('foundationLength').value);
    const width = parseFloat(document.getElementById('foundationWidth').value);
    const height = parseFloat(document.getElementById('foundationHeight').value);
    const count = parseInt(document.getElementById('foundationCount').value) || 1;
    const type = document.getElementById('foundationType').value;
    const grade = document.getElementById('concreteGrade').value;

    if (!length || !width || !height) {
      App.showToast('请填写所有尺寸参数', 'warning');
      return;
    }

    // 单个体积
    let singleVolume;
    let typeName;
    switch (type) {
      case 'strip':
        singleVolume = length * width * height;
        typeName = '条形基础';
        break;
      case 'independent':
        singleVolume = length * width * height;
        typeName = '独立基础';
        break;
      case 'slab':
        singleVolume = length * width * height;
        typeName = '筏板基础';
        break;
      case 'pile':
        singleVolume = Math.PI * (width / 2) ** 2 * length;
        typeName = '桩基础';
        break;
      default:
        singleVolume = length * width * height;
        typeName = '基础';
    }

    const totalVolume = singleVolume * count;
    // 模板面积（简化估算）
    const formworkArea = (2 * (length + width) * height) * count;
    // 钢筋估算（经验值：约100-150 kg/m³）
    const rebarEstimate = totalVolume * 120;
    // 开挖体积（考虑工作面和放坡，简化系数1.3）
    const excavationVolume = totalVolume * 1.3;

    let html = `
      <h3>基础工程量计算结果</h3>
      <div class="calc-result-item">
        <span class="calc-result-label">基础类型</span>
        <span class="calc-result-value">${typeName}</span>
      </div>
      <div class="calc-result-item">
        <span class="calc-result-label">单个体积</span>
        <span class="calc-result-value">${singleVolume.toFixed(2)} m³</span>
      </div>
      <div class="calc-result-item">
        <span class="calc-result-label">总数量</span>
        <span class="calc-result-value">${count} 个</span>
      </div>
      <div class="calc-result-item" style="background:rgba(245,166,35,0.08);padding:14px;border-radius:6px;">
        <span class="calc-result-label" style="font-weight:600;">混凝土总方量</span>
        <span class="calc-result-value" style="font-size:18px;">${totalVolume.toFixed(2)} m³ (${grade})</span>
      </div>
      <div class="calc-result-item">
        <span class="calc-result-label">模板面积（估算）</span>
        <span class="calc-result-value">${formworkArea.toFixed(2)} m²</span>
      </div>
      <div class="calc-result-item">
        <span class="calc-result-label">钢筋用量（估算）</span>
        <span class="calc-result-value">约 ${(rebarEstimate / 1000).toFixed(2)} t</span>
      </div>
      <div class="calc-result-item">
        <span class="calc-result-label">土方开挖量（估算）</span>
        <span class="calc-result-value">${excavationVolume.toFixed(2)} m³</span>
      </div>
      <div class="calc-result-note">
        <strong>计算说明：</strong><br>
        • 模板面积按基础侧面展开面积计算<br>
        • 钢筋用量按经验值 120 kg/m³ 估算，实际以配筋图为准<br>
        • 土方开挖量按基础体积×1.3系数估算（含工作面和放坡）<br>
        • 实际工程量应以施工图纸和工程量计算规则为准
      </div>
    `;

    document.getElementById('calcResultArea').innerHTML = html;
    document.getElementById('calcResultArea').classList.add('show');
  },

  // ============ 施工配比 ============
  mixRatioForm() {
    return `
      <h3 style="font-size:16px;color:#1a3a5c;margin-bottom:16px;">施工配比简易计算</h3>
      <div class="calc-form-row">
        <div class="calc-form-group">
          <label>混凝土强度等级</label>
          <select id="mixGrade">
            <option value="C15">C15</option>
            <option value="C20">C20</option>
            <option value="C25">C25</option>
            <option value="C30" selected>C30</option>
            <option value="C35">C35</option>
            <option value="C40">C40</option>
          </select>
        </div>
        <div class="calc-form-group">
          <label>需要方量 <span class="hint">(m³)</span></label>
          <input type="number" id="mixVolume" value="1" step="0.1" placeholder="如：1">
        </div>
      </div>
      <div class="calc-form-row">
        <div class="calc-form-group">
          <label>水泥强度等级</label>
          <select id="cementGrade">
            <option value="32.5">32.5</option>
            <option value="42.5" selected>42.5</option>
            <option value="52.5">52.5</option>
          </select>
        </div>
        <div class="calc-form-group">
          <label>坍落度要求</label>
          <select id="slump">
            <option value="30">30-50mm（干硬性）</option>
            <option value="55" selected>55-70mm（塑性）</option>
            <option value="90">90-110mm（流动性）</option>
          </select>
        </div>
      </div>
      <button class="calc-btn" onclick="EngineeringCalculator.calcMixRatio()">计算配比</button>
    `;
  },

  calcMixRatio() {
    const grade = document.getElementById('mixGrade').value;
    const volume = parseFloat(document.getElementById('mixVolume').value);
    const cementGrade = document.getElementById('cementGrade').value;
    
    if (!volume) {
      App.showToast('请输入需要方量', 'warning');
      return;
    }

    // 经验配合比（每m³混凝土材料用量，单位kg）
    const mixDesigns = {
      'C15': { cement: 280, water: 185, sand: 720, gravel: 1195, ratio: '1:2.57:4.27' },
      'C20': { cement: 330, water: 185, sand: 680, gravel: 1205, ratio: '1:2.06:3.65' },
      'C25': { cement: 380, water: 185, sand: 640, gravel: 1195, ratio: '1:1.68:3.15' },
      'C30': { cement: 430, water: 185, sand: 600, gravel: 1205, ratio: '1:1.40:2.80' },
      'C35': { cement: 480, water: 185, sand: 570, gravel: 1205, ratio: '1:1.19:2.51' },
      'C40': { cement: 530, water: 185, sand: 540, gravel: 1205, ratio: '1:1.02:2.27' }
    };

    const mix = mixDesigns[grade];
    
    // 水灰比
    const waterCementRatio = (mix.water / mix.cement).toFixed(2);
    
    // 按需方量计算
    const totalCement = mix.cement * volume;
    const totalWater = mix.water * volume;
    const totalSand = mix.sand * volume;
    const totalGravel = mix.gravel * volume;

    let html = `
      <h3>施工配比计算结果（${grade}）</h3>
      <div class="calc-result-item">
        <span class="calc-result-label">强度等级</span>
        <span class="calc-result-value">${grade}</span>
      </div>
      <div class="calc-result-item">
        <span class="calc-result-label">水泥强度等级</span>
        <span class="calc-result-value">${cementGrade}</span>
      </div>
      <div class="calc-result-item">
        <span class="calc-result-label">水灰比</span>
        <span class="calc-result-value">${waterCementRatio}</span>
      </div>
      <div class="calc-result-item">
        <span class="calc-result-label">质量配合比</span>
        <span class="calc-result-value">${mix.ratio}</span>
      </div>
      <div style="margin-top:16px;padding:16px;background:#f0f2f5;border-radius:8px;">
        <div style="font-size:13px;font-weight:600;color:#1a3a5c;margin-bottom:10px;">每立方米材料用量 (kg/m³)</div>
        <div class="calc-result-item">
          <span class="calc-result-label">水泥</span>
          <span class="calc-result-value">${mix.cement} kg</span>
        </div>
        <div class="calc-result-item">
          <span class="calc-result-label">水</span>
          <span class="calc-result-value">${mix.water} kg</span>
        </div>
        <div class="calc-result-item">
          <span class="calc-result-label">砂</span>
          <span class="calc-result-value">${mix.sand} kg</span>
        </div>
        <div class="calc-result-item">
          <span class="calc-result-label">石子</span>
          <span class="calc-result-value">${mix.gravel} kg</span>
        </div>
      </div>
      <div style="margin-top:12px;padding:16px;background:rgba(245,166,35,0.08);border-radius:8px;">
        <div style="font-size:13px;font-weight:600;color:#1a3a5c;margin-bottom:10px;">${volume}m³ 所需材料总量</div>
        <div class="calc-result-item">
          <span class="calc-result-label">水泥</span>
          <span class="calc-result-value">${totalCement.toFixed(0)} kg (${(totalCement/50).toFixed(1)} 袋)</span>
        </div>
        <div class="calc-result-item">
          <span class="calc-result-label">水</span>
          <span class="calc-result-value">${totalWater.toFixed(0)} kg</span>
        </div>
        <div class="calc-result-item">
          <span class="calc-result-label">砂</span>
          <span class="calc-result-value">${totalSand.toFixed(0)} kg (${(totalSand/1600).toFixed(2)} m³)</span>
        </div>
        <div class="calc-result-item">
          <span class="calc-result-label">石子</span>
          <span class="calc-result-value">${totalGravel.toFixed(0)} kg (${(totalGravel/1500).toFixed(2)} m³)</span>
        </div>
      </div>
      <div class="calc-result-note">
        <strong>注意事项：</strong><br>
        • 以上为经验参考配比，实际施工前必须进行试验室试配<br>
        • 砂石密度按：砂1600 kg/m³、石子1500 kg/m³换算<br>
        • 施工中应根据砂石含水率调整用水量<br>
        • 依据：《普通混凝土配合比设计规程》(JGJ 55)
      </div>
    `;

    document.getElementById('calcResultArea').innerHTML = html;
    document.getElementById('calcResultArea').classList.add('show');
  }
};
