/**
 * Balatro 贴金助手 - 核心逻辑
 * 使用 localStorage 持久化用户的贴金进度
 */

// ==================== 状态管理 ====================

// 从 localStorage 读取已贴金的 Joker 名单
function loadGildedSet() {
    try {
        const data = localStorage.getItem('balatro-gilded');
        return data ? new Set(JSON.parse(data)) : new Set();
    } catch {
        return new Set();
    }
}

// 保存已贴金名单到 localStorage
function saveGildedSet(gildedSet) {
    localStorage.setItem('balatro-gilded', JSON.stringify([...gildedSet]));
}

// 全局状态
let gildedSet = loadGildedSet();
let currentFilter = 'all';
let currentSearch = '';

// ==================== 渲染函数 ====================

/**
 * 创建单张 Joker 卡片的 DOM 元素
 * @param {Object} joker - 小丑牌数据
 * @param {string} context - 'dashboard' 或 'collection'
 */
function createCardElement(joker, context) {
    const card = document.createElement('div');
    const rarityClass = joker.rarity.toLowerCase();
    const isGilded = gildedSet.has(joker.name);
    const isOnBoard = !isGilded; // 不在贴金名单中 = 在提示板上（待贴金）

    card.className = `joker-card rarity-${rarityClass}`;

    if (context === 'collection') {
        if (isGilded) {
            card.classList.add('gilded');
        } else if (isOnBoard) {
            // 在 collection 中，未贴金的牌显示 on-board 标记（如果它在提示板上）
            // 实际上所有未贴金的牌都在提示板上，所以这里不需要额外标记
        }
    }

    // 构建卡片内容
    card.innerHTML = `
    <img class="joker-img" src="${joker.imgSrc}" alt="${joker.name}" loading="lazy" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 80 112%22><rect fill=%22%231a2332%22 width=%2280%22 height=%22112%22 rx=%226%22/><text fill=%22%235a6a7a%22 x=%2240%22 y=%2260%22 text-anchor=%22middle%22 font-size=%2210%22>?</text></svg>'">
    <div class="joker-name">${joker.name}</div>
    <div class="joker-effect">${joker.effect}</div>
    <span class="joker-rarity ${rarityClass}">${joker.rarity}</span>
  `;

    // 绑定点击事件
    card.addEventListener('click', () => {
        if (context === 'dashboard') {
            // 提示板中点击 = 标记为已贴金
            markAsGilded(joker.name);
        } else {
            // 卡库中点击 = 切换贴金状态
            toggleGild(joker.name);
        }
    });

    return card;
}

/**
 * 渲染提示板（按稀有度分栏）
 */
function renderDashboard() {
    const rarities = ['Common', 'Uncommon', 'Rare', 'Legendary'];
    const grids = {
        Common: document.getElementById('grid-common'),
        Uncommon: document.getElementById('grid-uncommon'),
        Rare: document.getElementById('grid-rare'),
        Legendary: document.getElementById('grid-legendary'),
    };
    const counts = {
        Common: document.getElementById('count-common'),
        Uncommon: document.getElementById('count-uncommon'),
        Rare: document.getElementById('count-rare'),
        Legendary: document.getElementById('count-legendary'),
    };
    const sections = {
        Common: document.getElementById('section-common'),
        Uncommon: document.getElementById('section-uncommon'),
        Rare: document.getElementById('section-rare'),
        Legendary: document.getElementById('section-legendary'),
    };

    // 获取未贴金的 Jokers
    const ungildedJokers = JOKERS.filter(j => !gildedSet.has(j.name));
    let totalUngilded = 0;

    // 按稀有度分组渲染
    rarities.forEach(rarity => {
        const grid = grids[rarity];
        grid.innerHTML = '';

        const jokersInRarity = ungildedJokers.filter(j => j.rarity === rarity);
        counts[rarity].textContent = jokersInRarity.length;
        totalUngilded += jokersInRarity.length;

        if (jokersInRarity.length === 0) {
            sections[rarity].classList.add('hidden');
        } else {
            sections[rarity].classList.remove('hidden');
            jokersInRarity.forEach(joker => {
                grid.appendChild(createCardElement(joker, 'dashboard'));
            });
        }
    });

    // 更新提示板计数
    document.getElementById('dashboard-count').textContent = `(${totalUngilded})`;

    // 空状态显示
    const emptyState = document.getElementById('empty-dashboard');
    if (totalUngilded === 0) {
        emptyState.classList.remove('hidden');
    } else {
        emptyState.classList.add('hidden');
    }

    // 更新进度条
    updateProgress();
}

/**
 * 渲染卡库
 */
function renderCollection() {
    const grid = document.getElementById('collection-grid');
    grid.innerHTML = '';

    let filteredJokers = JOKERS;

    // 稀有度筛选
    if (currentFilter !== 'all') {
        filteredJokers = filteredJokers.filter(j => j.rarity === currentFilter);
    }

    // 搜索筛选
    if (currentSearch) {
        const query = currentSearch.toLowerCase();
        filteredJokers = filteredJokers.filter(j =>
            j.name.toLowerCase().includes(query) ||
            j.effect.toLowerCase().includes(query)
        );
    }

    filteredJokers.forEach(joker => {
        grid.appendChild(createCardElement(joker, 'collection'));
    });
}

/**
 * 更新进度条
 */
function updateProgress() {
    const total = JOKERS.length;
    const gilded = gildedSet.size;
    const percent = Math.round((gilded / total) * 100);

    document.getElementById('progress-count').textContent = `${gilded} / ${total}`;
    document.getElementById('progress-bar').style.width = `${percent}%`;
    document.getElementById('progress-percentage').textContent = `${percent}%`;
}

// ==================== 操作函数 ====================

/**
 * 标记为已贴金（从提示板移除）
 */
function markAsGilded(name) {
    gildedSet.add(name);
    saveGildedSet(gildedSet);
    renderDashboard();
    renderCollection();
}

/**
 * 切换贴金状态
 */
function toggleGild(name) {
    if (gildedSet.has(name)) {
        gildedSet.delete(name);
    } else {
        gildedSet.add(name);
    }
    saveGildedSet(gildedSet);
    renderDashboard();
    renderCollection();
}

/**
 * 全选（标记所有为未贴金 = 全部添加到提示板）
 */
function selectAllUngilded() {
    gildedSet.clear();
    saveGildedSet(gildedSet);
    renderDashboard();
    renderCollection();
}

/**
 * 清除全部（标记所有为已贴金 = 清空提示板）
 */
function clearAll() {
    JOKERS.forEach(j => gildedSet.add(j.name));
    saveGildedSet(gildedSet);
    renderDashboard();
    renderCollection();
}

/**
 * 导出进度为 JSON 文件
 */
function exportProgress() {
    const data = {
        version: 1,
        exportDate: new Date().toISOString(),
        totalJokers: JOKERS.length,
        gildedCount: gildedSet.size,
        gildedJokers: [...gildedSet]
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `balatro-gilding-progress-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

/**
 * 从 JSON 文件导入进度
 */
function importProgress(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if (data.gildedJokers && Array.isArray(data.gildedJokers)) {
                gildedSet = new Set(data.gildedJokers);
                saveGildedSet(gildedSet);
                renderDashboard();
                renderCollection();
                alert(`✅ Successfully imported! ${gildedSet.size} Jokers marked as gilded.`);
            } else {
                alert('❌ Invalid file format.');
            }
        } catch {
            alert('❌ Failed to parse the file.');
        }
    };
    reader.readAsText(file);
}

// ==================== 事件绑定 ====================

document.addEventListener('DOMContentLoaded', () => {
    // 初始渲染
    renderDashboard();
    renderCollection();

    // 搜索
    document.getElementById('search-input').addEventListener('input', (e) => {
        currentSearch = e.target.value;
        renderCollection();
    });

    // 稀有度筛选按钮
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.rarity;
            renderCollection();
        });
    });

    // 全选未贴金
    document.getElementById('btn-select-all').addEventListener('click', selectAllUngilded);

    // 清除全部
    document.getElementById('btn-clear-all').addEventListener('click', () => {
        if (confirm('Mark all Jokers as gilded? (Clear the dashboard)')) {
            clearAll();
        }
    });

    // 导出
    document.getElementById('btn-export').addEventListener('click', exportProgress);

    // 导入
    document.getElementById('btn-import').addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            importProgress(e.target.files[0]);
            e.target.value = ''; // 重置，允许再次选择同一文件
        }
    });
});
