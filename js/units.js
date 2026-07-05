/**
 * 单位换算模块
 * 支持长度、面积、体积、重量、压强、力的换算
 */
const UnitsConverter = {
  // 换算单位定义（基准单位为第一个）
  categories: {
    length: {
      name: '长度',
      base: 'm',
      units: {
        'mm': { name: '毫米 (mm)', factor: 0.001 },
        'cm': { name: '厘米 (cm)', factor: 0.01 },
        'm': { name: '米 (m)', factor: 1 },
        'km': { name: '千米 (km)', factor: 1000 },
        'in': { name: '英寸 (in)', factor: 0.0254 },
        'ft': { name: '英尺 (ft)', factor: 0.3048 },
        'yd': { name: '码 (yd)', factor: 0.9144 },
        'mi': { name: '英里 (mi)', factor: 1609.344 }
      }
    },
    area: {
      name: '面积',
      base: 'm²',
      units: {
        'mm²': { name: '平方毫米 (mm²)', factor: 0.000001 },
        'cm²': { name: '平方厘米 (cm²)', factor: 0.0001 },
        'm²': { name: '平方米 (m²)', factor: 1 },
        'km²': { name: '平方千米 (km²)', factor: 1000000 },
        'ha': { name: '公顷 (ha)', factor: 10000 },
        'mu': { name: '亩', factor: 666.6667 },
        'ft²': { name: '平方英尺 (ft²)', factor: 0.092903 },
        'ac': { name: '英亩 (ac)', factor: 4046.86 }
      }
    },
    volume: {
      name: '体积',
      base: 'm³',
      units: {
        'cm³': { name: '立方厘米 (cm³)', factor: 0.000001 },
        'mL': { name: '毫升 (mL)', factor: 0.000001 },
        'L': { name: '升 (L)', factor: 0.001 },
        'm³': { name: '立方米 (m³)', factor: 1 },
        'gal': { name: '加仑 (gal)', factor: 0.003785 },
        'ft³': { name: '立方英尺 (ft³)', factor: 0.028317 }
      }
    },
    weight: {
      name: '重量',
      base: 'kg',
      units: {
        'mg': { name: '毫克 (mg)', factor: 0.000001 },
        'g': { name: '克 (g)', factor: 0.001 },
        'kg': { name: '千克 (kg)', factor: 1 },
        't': { name: '吨 (t)', factor: 1000 },
        'lb': { name: '磅 (lb)', factor: 0.453592 },
        'kN': { name: '千牛 (kN)', factor: 101.9716 }
      }
    },
    pressure: {
      name: '压强',
      base: 'Pa',
      units: {
        'Pa': { name: '帕斯卡 (Pa)', factor: 1 },
        'kPa': { name: '千帕 (kPa)', factor: 1000 },
        'MPa': { name: '兆帕 (MPa)', factor: 1000000 },
        'bar': { name: '巴 (bar)', factor: 100000 },
        'atm': { name: '标准大气压 (atm)', factor: 101325 },
        'psi': { name: '磅/平方英寸 (psi)', factor: 6894.76 },
        'mmHg': { name: '毫米汞柱 (mmHg)', factor: 133.322 }
      }
    },
    force: {
      name: '力',
      base: 'N',
      units: {
        'N': { name: '牛顿 (N)', factor: 1 },
        'kN': { name: '千牛 (kN)', factor: 1000 },
        'MN': { name: '兆牛 (MN)', factor: 1000000 },
        'kgf': { name: '千克力 (kgf)', factor: 9.80665 },
        'lbf': { name: '磅力 (lbf)', factor: 4.44822 },
        'tf': { name: '吨力 (tf)', factor: 9806.65 }
      }
    }
  },

  currentCategory: 'length',

  /**
   * 初始化单位换算模块
   */
  init() {
    // 分类切换
    document.querySelectorAll('.units-cat-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.units-cat-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.currentCategory = tab.dataset.cat;
        this.renderConverter();
      });
    });

    this.renderConverter();
  },

  /**
   * 渲染换算器
   */
  renderConverter() {
    const cat = this.categories[this.currentCategory];
    const container = document.getElementById('unitsConverter');
    
    let optionsHtml = '';
    for (const [key, unit] of Object.entries(cat.units)) {
      optionsHtml += `<option value="${key}">${unit.name}</option>`;
    }

    container.innerHTML = `
      <div class="units-input-group">
        <div class="units-field">
          <label>输入数值</label>
          <input type="number" id="unitsValueInput" placeholder="输入数值..." step="any" value="1">
        </div>
        <div class="units-field">
          <label>源单位</label>
          <select id="unitsFromSelect">${optionsHtml}</select>
        </div>
        <button class="units-swap" id="unitsSwapBtn" title="交换单位">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="17 1 21 5 17 9"/>
            <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
            <polyline points="7 23 3 19 7 15"/>
            <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
          </svg>
        </button>
        <div class="units-field">
          <label>目标单位</label>
          <select id="unitsToSelect">${optionsHtml}</select>
        </div>
      </div>
    `;

    // 默认选择不同的源和目标
    const fromSelect = document.getElementById('unitsFromSelect');
    const toSelect = document.getElementById('unitsToSelect');
    const unitKeys = Object.keys(cat.units);
    fromSelect.value = unitKeys[0];
    toSelect.value = unitKeys[Math.min(1, unitKeys.length - 1)];

    // 事件绑定
    document.getElementById('unitsValueInput').addEventListener('input', () => this.convert());
    document.getElementById('unitsFromSelect').addEventListener('change', () => this.convert());
    document.getElementById('unitsToSelect').addEventListener('change', () => this.convert());
    document.getElementById('unitsSwapBtn').addEventListener('click', () => this.swap());

    this.convert();
  },

  /**
   * 执行换算
   */
  convert() {
    const cat = this.categories[this.currentCategory];
    const value = parseFloat(document.getElementById('unitsValueInput').value);
    const fromUnit = document.getElementById('unitsFromSelect').value;
    const toUnit = document.getElementById('unitsToSelect').value;

    if (isNaN(value)) {
      document.getElementById('unitsResultTable').innerHTML = '<p style="color:#999;text-align:center;padding:20px;">请输入有效数值</p>';
      return;
    }

    // 转换为基准单位再转为目标单位
    const baseValue = value * cat.units[fromUnit].factor;
    const result = baseValue / cat.units[toUnit].factor;

    // 生成所有单位的换算结果表
    let tableHtml = `
      <table>
        <thead>
          <tr>
            <th>单位</th>
            <th>换算值</th>
          </tr>
        </thead>
        <tbody>
    `;

    for (const [key, unit] of Object.entries(cat.units)) {
      const converted = baseValue / unit.factor;
      const isHighlight = (key === fromUnit || key === toUnit);
      const formatted = this.formatNumber(converted);
      tableHtml += `
        <tr class="${isHighlight ? 'highlight' : ''}">
          <td>${unit.name}</td>
          <td>${formatted}</td>
        </tr>
      `;
    }

    tableHtml += '</tbody></table>';

    // 高亮显示目标单位换算结果
    tableHtml = `
      <div style="text-align:center;margin-bottom:16px;padding:16px;background:rgba(245,166,35,0.08);border-radius:8px;">
        <div style="font-size:13px;color:#718096;margin-bottom:4px;">换算结果</div>
        <div style="font-size:24px;font-weight:700;color:#1a3a5c;">
          ${this.formatNumber(value)} ${cat.units[fromUnit].name.split(' ')[0]} 
          = 
          ${this.formatNumber(result)} ${cat.units[toUnit].name.split(' ')[0]}
        </div>
      </div>
    ` + tableHtml;

    document.getElementById('unitsResultTable').innerHTML = tableHtml;
  },

  /**
   * 交换源和目标单位
   */
  swap() {
    const fromSelect = document.getElementById('unitsFromSelect');
    const toSelect = document.getElementById('unitsToSelect');
    const temp = fromSelect.value;
    fromSelect.value = toSelect.value;
    toSelect.value = temp;
    this.convert();
  },

  /**
   * 格式化数字
   */
  formatNumber(num) {
    if (Math.abs(num) >= 1000000 || (Math.abs(num) < 0.001 && num !== 0)) {
      return num.toExponential(4);
    }
    if (Number.isInteger(num)) {
      return num.toLocaleString('zh-CN');
    }
    return parseFloat(num.toFixed(6)).toLocaleString('zh-CN');
  }
};
