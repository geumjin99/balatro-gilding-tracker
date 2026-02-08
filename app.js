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

// ==================== 摘要图生成 ====================

/**
 * 加载单张图片，返回 Promise
 * 设置 crossOrigin 以支持 Canvas 导出
 */
function loadImage(src) {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null); // 加载失败返回 null
        img.src = src;
    });
}

/**
 * 在 Canvas 上绘制未贴金 Joker 摘要图（卡面图片版）
 * 按稀有度分栏，紧凑缩略图网格，不显示名称
 */
async function generateSnapshot() {
    const canvas = document.getElementById('snapshot-canvas');
    const ctx = canvas.getContext('2d');
    const snapshotBtn = document.getElementById('btn-snapshot');

    // 显示加载状态
    snapshotBtn.disabled = true;
    snapshotBtn.innerHTML = '<span class="btn-icon">⏳</span> Loading...';

    // 收集未贴金数据，按稀有度分组
    const rarities = [
        { name: 'Common', color: '#4a9eff' },
        { name: 'Uncommon', color: '#4ade80' },
        { name: 'Rare', color: '#f43f5e' },
        { name: 'Legendary', color: '#a855f7' },
    ];

    const ungildedByRarity = {};
    let totalUngilded = 0;
    const allUngildedJokers = [];
    rarities.forEach(r => {
        const list = JOKERS.filter(j => j.rarity === r.name && !gildedSet.has(j.name));
        ungildedByRarity[r.name] = list;
        totalUngilded += list.length;
        allUngildedJokers.push(...list);
    });

    // 预加载所有未贴金 Joker 的图片
    const imageMap = new Map();
    const imagePromises = allUngildedJokers.map(async (joker) => {
        const img = await loadImage(joker.imgSrc);
        imageMap.set(joker.name, img);
    });
    await Promise.all(imagePromises);

    // 图片尺寸和布局参数
    const IMG_W = 52;
    const IMG_H = 73; // 保持 5:7 比例
    const IMG_GAP = 6;
    const W = 860;
    const PADDING = 25;
    const COLS_PER_ROW = Math.floor((W - PADDING * 2 + IMG_GAP) / (IMG_W + IMG_GAP));
    const SECTION_HEADER_H = 38;
    const GAP_BETWEEN_SECTIONS = 16;

    // 计算总高度
    let totalH = 25 + 70 + 40 + 10; // 顶部padding + 标题 + 进度条 + 间距
    rarities.forEach(r => {
        const count = ungildedByRarity[r.name].length;
        if (count > 0) {
            const rows = Math.ceil(count / COLS_PER_ROW);
            totalH += SECTION_HEADER_H + rows * (IMG_H + IMG_GAP) + GAP_BETWEEN_SECTIONS;
        }
    });
    totalH += 30 + 20; // 底部水印 + 留白

    // 设置 Canvas 尺寸
    canvas.width = W;
    canvas.height = totalH;

    // 背景
    ctx.fillStyle = '#0a0e14';
    ctx.fillRect(0, 0, W, totalH);

    // 顶部装饰线
    const lineGrad = ctx.createLinearGradient(100, 0, W - 100, 0);
    lineGrad.addColorStop(0, 'transparent');
    lineGrad.addColorStop(0.5, '#f5c842');
    lineGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = lineGrad;
    ctx.fillRect(0, 0, W, 2);

    // 标题
    let y = 30;
    ctx.fillStyle = '#f5c842';
    ctx.font = 'bold 22px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🃏 Balatro Gilding Tracker', W / 2, y);
    y += 26;
    ctx.fillStyle = '#8899aa';
    ctx.font = '13px Inter, sans-serif';
    ctx.fillText('Perfectionist++ — Ungilded Jokers', W / 2, y);
    y += 28;

    // 进度条
    const gilded = gildedSet.size;
    const total = JOKERS.length;
    const percent = Math.round((gilded / total) * 100);
    const barX = PADDING;
    const barW = W - PADDING * 2;
    const barH = 12;

    ctx.textAlign = 'left';
    ctx.fillStyle = '#8899aa';
    ctx.font = '11px Inter, sans-serif';
    ctx.fillText(`${gilded} / ${total} gilded (${percent}%)`, barX, y);
    ctx.textAlign = 'right';
    ctx.fillText(`${totalUngilded} remaining`, W - PADDING, y);
    y += 6;

    // 进度条底
    ctx.fillStyle = '#1a2332';
    ctx.beginPath();
    ctx.roundRect(barX, y, barW, barH, 6);
    ctx.fill();

    // 进度条填充
    const fillW = (gilded / total) * barW;
    if (fillW > 0) {
        const barGrad = ctx.createLinearGradient(barX, y, barX + fillW, y);
        barGrad.addColorStop(0, '#c09a20');
        barGrad.addColorStop(1, '#f5c842');
        ctx.fillStyle = barGrad;
        ctx.beginPath();
        ctx.roundRect(barX, y, Math.max(fillW, 8), barH, 6);
        ctx.fill();
    }

    y += barH + 16;

    // 按稀有度分栏绘制卡面图片
    ctx.textAlign = 'left';
    rarities.forEach(r => {
        const jokers = ungildedByRarity[r.name];
        if (jokers.length === 0) return;

        // 分栏标题背景
        ctx.fillStyle = '#131a24';
        ctx.beginPath();
        ctx.roundRect(PADDING, y, W - PADDING * 2, SECTION_HEADER_H - 4, 6);
        ctx.fill();

        // 稀有度左边彩色竖条
        ctx.fillStyle = r.color;
        ctx.beginPath();
        ctx.roundRect(PADDING, y, 4, SECTION_HEADER_H - 4, [6, 0, 0, 6]);
        ctx.fill();

        // 稀有度圆点
        ctx.beginPath();
        ctx.arc(PADDING + 18, y + (SECTION_HEADER_H - 4) / 2, 5, 0, Math.PI * 2);
        ctx.fill();

        // 稀有度名称
        ctx.fillStyle = r.color;
        ctx.font = 'bold 14px Inter, sans-serif';
        ctx.fillText(r.name, PADDING + 30, y + 23);

        // 数量
        ctx.fillStyle = '#5a6a7a';
        ctx.font = '12px Inter, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(`${jokers.length}`, W - PADDING - 10, y + 23);
        ctx.textAlign = 'left';

        y += SECTION_HEADER_H;

        // 绘制卡面图片网格
        jokers.forEach((joker, i) => {
            const col = i % COLS_PER_ROW;
            const row = Math.floor(i / COLS_PER_ROW);
            const imgX = PADDING + col * (IMG_W + IMG_GAP);
            const imgY = y + row * (IMG_H + IMG_GAP);

            const img = imageMap.get(joker.name);
            if (img) {
                // 绘制卡片背景（圆角矩形遮罩）
                ctx.save();
                ctx.beginPath();
                ctx.roundRect(imgX, imgY, IMG_W, IMG_H, 4);
                ctx.clip();
                ctx.drawImage(img, imgX, imgY, IMG_W, IMG_H);
                ctx.restore();

                // 细边框
                ctx.strokeStyle = r.color;
                ctx.globalAlpha = 0.4;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.roundRect(imgX, imgY, IMG_W, IMG_H, 4);
                ctx.stroke();
                ctx.globalAlpha = 1;
            } else {
                // 图片加载失败：绘制占位符
                ctx.fillStyle = '#1a2332';
                ctx.beginPath();
                ctx.roundRect(imgX, imgY, IMG_W, IMG_H, 4);
                ctx.fill();
                ctx.fillStyle = '#5a6a7a';
                ctx.font = '8px Inter, sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(joker.name, imgX + IMG_W / 2, imgY + IMG_H / 2 + 3);
                ctx.textAlign = 'left';
            }
        });

        const rows = Math.ceil(jokers.length / COLS_PER_ROW);
        y += rows * (IMG_H + IMG_GAP) + GAP_BETWEEN_SECTIONS;
    });

    // 如果没有未贴金的牌
    if (totalUngilded === 0) {
        ctx.fillStyle = '#f5c842';
        ctx.font = 'bold 20px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🏆 All 150 Jokers Gilded!', W / 2, y + 20);
    }

    // 底部水印
    ctx.fillStyle = '#3a4a5a';
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Generated ${new Date().toLocaleDateString()} · geumjin99.github.io/balatro-gilding-tracker`, W / 2, totalH - 10);

    // 恢复按钮状态
    snapshotBtn.disabled = false;
    snapshotBtn.innerHTML = '<span class="btn-icon">📸</span> Snapshot';

    // 显示 modal
    document.getElementById('snapshot-modal').classList.add('active');
}

/**
 * 下载摘要图为 PNG
 * 如果 Canvas 因跨域被污染，提示用户右键另存或截图
 */
function downloadSnapshot() {
    const canvas = document.getElementById('snapshot-canvas');
    try {
        const link = document.createElement('a');
        link.download = `balatro-ungilded-${new Date().toISOString().slice(0, 10)}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    } catch (e) {
        alert('⚠️ Unable to export due to cross-origin restrictions.\nPlease right-click the image and choose "Save Image As", or take a screenshot.');
    }
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

    // 生成摘要图
    document.getElementById('btn-snapshot').addEventListener('click', generateSnapshot);

    // 下载摘要图
    document.getElementById('btn-download-img').addEventListener('click', downloadSnapshot);

    // 关闭 modal
    document.getElementById('modal-close').addEventListener('click', () => {
        document.getElementById('snapshot-modal').classList.remove('active');
    });

    // 点击 modal 背景关闭
    document.getElementById('snapshot-modal').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) {
            e.currentTarget.classList.remove('active');
        }
    });
});

