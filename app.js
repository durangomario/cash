// Estado global de la aplicación
const state = {
    currentScreen: 'inicio',
    balance: 0,
    expenses: [],
    savings: [],
    investments: [],
    goals: [],
    get totalSavings() { return this.savings.reduce((a, b) => a + b.amount, 0); },
    get portfolio() { return this.investments.reduce((a, b) => a + b.amount, 0); },
    lastMonthTotal: 0,
    userName: '',
    userEmail: '',
    notifications: [
        "💡 Si reduces tus comidas fuera de casa esta semana, podrías ahorrar $40,000 adicionales.",
        "🔥 ¡Vas excelente! Has gastado 15% menos que el mes pasado a esta misma fecha.",
        "🎯 Estás a un 45% de lograr tu meta: MacBook Pro."
    ]
};

// Devuelve la clave de localStorage para el usuario activo
function getUserKey() {
    const email = localStorage.getItem('kash_active_user');
    return email ? `kash_user_${email}` : 'kash_user_guest';
}

function saveState() {
    localStorage.setItem(getUserKey(), JSON.stringify({
        balance: state.balance,
        expenses: state.expenses,
        savings: state.savings,
        investments: state.investments,
        lastMonthTotal: state.lastMonthTotal,
        userName: state.userName,
        userEmail: state.userEmail,
        goals: state.goals
    }));
}

function loadState() {
    const saved = localStorage.getItem(getUserKey());
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            if (parsed.balance !== undefined) state.balance = parsed.balance;
            if (parsed.lastMonthTotal !== undefined) state.lastMonthTotal = parsed.lastMonthTotal;
            if (parsed.userName) state.userName = parsed.userName;
            if (parsed.userEmail) state.userEmail = parsed.userEmail;
            if (parsed.goals) state.goals = parsed.goals;
            if (parsed.expenses) state.expenses = parsed.expenses.map(e => ({ ...e, date: new Date(e.date) }));
            if (parsed.savings) state.savings = parsed.savings.map(s => ({ ...s, date: new Date(s.date) }));
            if (parsed.investments) state.investments = parsed.investments.map(i => ({ ...i, date: new Date(i.date) }));
        } catch (e) { console.error("Error loading state", e); }
    }
}

// Utilidad para formatear moneda
const formatMoney = (amount) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(amount);
};

// ---- Filtro de Fecha (Inicio / Fin) ----
function initDateFilter() {
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const toStr = now.toISOString().split('T')[0];
    const fromStr = firstOfMonth.toISOString().split('T')[0];
    const fromEl = document.getElementById('date-from');
    const toEl = document.getElementById('date-to');
    if (fromEl && !fromEl.value) fromEl.value = fromStr;
    if (toEl && !toEl.value) toEl.value = toStr;
}

function applyDateRangeFilter() {
    renderInicio();
}

function getFilteredExpenses() {
    const fromVal = document.getElementById('date-from')?.value;
    const toVal = document.getElementById('date-to')?.value;
    if (!fromVal && !toVal) return state.expenses;
    const from = fromVal ? new Date(fromVal + 'T00:00:00') : new Date(0);
    const to = toVal ? new Date(toVal + 'T23:59:59') : new Date();
    return state.expenses.filter(e => e.date >= from && e.date <= to);
}

function getFilterLabel() {
    const fromVal = document.getElementById('date-from')?.value;
    const toVal = document.getElementById('date-to')?.value;
    if (fromVal && toVal && fromVal === toVal) return fromVal;
    if (fromVal && toVal) return `${fromVal} → ${toVal}`;
    return 'Periodo';
}


function getExpenseIcon(cat) {
    const icons = { 'Comida': '🍔', 'Transporte': '🚗', 'Salidas': '🎉', 'Compras': '🛍️', 'Otros': '📦' };
    return icons[cat] || '💸';
}

// Navegación
function switchScreen(screenId) {
    state.currentScreen = screenId;

    // UI Update
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(`screen-${screenId}`).classList.add('active');

    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.querySelector('span').innerText.toLowerCase() === screenId) {
            item.classList.add('active');
        } else if (screenId === 'inversion' && item.querySelector('span').innerText.toLowerCase() === 'invertir') {
            item.classList.add('active');
        }
    });

    // Renderizar datos de la pantalla activa
    if (screenId === 'inicio') renderInicio();
    if (screenId === 'gastos') renderGastos();
    if (screenId === 'ahorro') renderAhorro();
    if (screenId === 'inversion') renderInversion();
    if (screenId === 'perfil') renderPerfil();
}

// ---- Pantalla 1: Inicio ----
function renderInicio() {
    // Gastos totales reales (para notificaciones comparativas)
    const totalExpenses = state.expenses.reduce((acc, curr) => acc + curr.amount, 0);

    // Gastos filtrados por fecha seleccionada
    const filteredExpenses = getFilteredExpenses();
    const filteredTotal = filteredExpenses.reduce((acc, curr) => acc + curr.amount, 0);

    document.getElementById('home-balance').innerText = formatMoney(state.balance);
    document.getElementById('home-expenses').innerText = formatMoney(filteredTotal);
    document.getElementById('home-savings').innerText = formatMoney(state.totalSavings);

    // Actualizar etiqueta del filtro activo
    const labelEl = document.getElementById('home-expenses-label');
    if (labelEl) labelEl.innerText = `Gastos (${getFilterLabel()})`;

    // Nombre de usuario en saludo
    const usernameEl = document.getElementById('home-username');
    if (usernameEl) usernameEl.innerText = state.userName || 'amigo';

    // Notificaciones dinámicas basadas en datos reales (usa totales completos)
    const metaTotal = 4000000;
    const pctMeta = Math.min(100, Math.round((state.totalSavings / metaTotal) * 100));
    const ahorroRestante = metaTotal - state.totalSavings;

    const dynamicNotifications = [
        `💡 Si reduces tus comidas fuera de casa esta semana, podrías ahorrar $40,000 adicionales.`,
        totalExpenses > state.lastMonthTotal
            ? `⚠️ Has gastado más que el mes pasado. ¡Revisa tus gastos!`
            : `🔥 ¡Vas excelente! Has gastado menos que el mes pasado a esta misma fecha.`,
        pctMeta >= 100
            ? `🏆 ¡Felicitaciones! Ya alcanzaste tu meta de ${formatMoney(metaTotal)}.`
            : `🎯 Estás a un ${pctMeta}% de lograr tu meta. Te faltan ${formatMoney(ahorroRestante)} para llegar a ${formatMoney(metaTotal)}.`
    ];

    const randomNotif = dynamicNotifications[Math.floor(Math.random() * dynamicNotifications.length)];
    document.getElementById('smart-notifications').innerHTML = `
        <div class="notification">
            <div class="notification-icon">
                <i data-lucide="bell"></i>
            </div>
            <p style="font-size: 14px;">${randomNotif}</p>
        </div>
    `;
    lucide.createIcons();
}


// ---- Pantalla 2: Gastos ----
function renderGastos() {
    const currentExpenses = state.expenses.reduce((acc, curr) => acc + curr.amount, 0);
    document.getElementById('gastos-total').innerText = formatMoney(currentExpenses);

    // Render List
    document.getElementById('expenses-list').innerHTML = state.expenses.map(e => `
        <div class="expense-item">
            <div style="display: flex; gap: 10px; align-items: center;">
                <div class="expense-icon">${getExpenseIcon(e.category)}</div>
                <div>
                    <h4>${e.category}</h4>
                    <p style="font-size: 12px; color: var(--text-secondary);">${e.date.toLocaleDateString()}</p>
                </div>
            </div>
            <div style="text-align: right;">
                <h4 style="color: var(--danger);">-${formatMoney(e.amount)}</h4>
                <div style="margin-top: 5px;">
                    <button onclick="editExpense(${e.id})" style="background: none; border: none; color: var(--text-secondary); cursor: pointer; margin-right: 10px;" title="Editar"><i data-lucide="edit-2" style="width: 14px; height: 14px;"></i></button>
                    <button onclick="deleteExpense(${e.id})" style="background: none; border: none; color: var(--danger); cursor: pointer;" title="Eliminar"><i data-lucide="trash-2" style="width: 14px; height: 14px;"></i></button>
                </div>
            </div>
        </div>
    `).join('');

    // Gráfica CSS Simple (agrupación por categoría)
    const chartContainer = document.getElementById('expense-chart');
    const categories = [
        { name: 'Comida', icon: '🍔' },
        { name: 'Transporte', icon: '🚗' },
        { name: 'Salidas', icon: '🎉' },
        { name: 'Compras', icon: '🛍️' },
        { name: 'Otros', icon: '📦' }
    ];

    const maxAmount = Math.max(...categories.map(c => state.expenses.filter(e => e.category === c.name).reduce((a, b) => a + b.amount, 0)), 50000);

    chartContainer.innerHTML = categories.map(cat => {
        const catTotal = state.expenses.filter(e => e.category === cat.name).reduce((a, b) => a + b.amount, 0);
        const heightPercent = (catTotal / maxAmount) * 100;

        let displayValue = '$0';
        if (catTotal >= 1000) {
            displayValue = '$' + (catTotal / 1000).toFixed(0) + 'k';
        } else if (catTotal > 0) {
            displayValue = '$' + catTotal;
        }

        return `
            <div class="chart-bar-wrapper">
                <span style="font-size: 10px; color: var(--accent-blue); font-weight: bold; margin-bottom: 4px;">${displayValue}</span>
                <div class="chart-bar" style="height: ${heightPercent}%; ${heightPercent === 0 ? 'min-height: 2px;' : ''}"></div>
                <span class="chart-label" style="font-size: 16px; margin-top: 5px;" title="${cat.name}">${cat.icon}</span>
            </div>
        `;
    }).join('');

    // Recomendación / Comparación
    const trendEl = document.getElementById('expense-trend');
    const recEl = document.getElementById('expense-recommendation');

    let highestCategory = "Salidas"; // default
    if (state.expenses.length > 0) {
        const catTotals = {};
        state.expenses.forEach(e => {
            catTotals[e.category] = (catTotals[e.category] || 0) + e.amount;
        });
        highestCategory = Object.keys(catTotals).reduce((a, b) => catTotals[a] > catTotals[b] ? a : b);
    }

    if (currentExpenses > state.lastMonthTotal) {
        trendEl.innerHTML = `📈 Más que el mes pasado`;
        trendEl.style.color = "var(--danger)";
        trendEl.style.background = "rgba(239, 68, 68, 0.2)";
        recEl.innerHTML = `<p style="font-size: 14px;">⚠️ Has gastado más de lo habitual. Te recomendamos pausar los gastos en "${highestCategory}" esta semana.</p>`;
    } else {
        trendEl.innerHTML = `📉 Menos que el mes pasado`;
        trendEl.style.color = "var(--safe)";
        trendEl.style.background = "rgba(16, 185, 129, 0.2)";
        recEl.innerHTML = `<p style="font-size: 14px;">✅ ¡Buen trabajo! Mantén este ritmo y lograrás tu meta de ahorro más rápido.</p>`;
    }

    // Renderizar iconos
    lucide.createIcons();
}

function toggleModal(modalId, show) {
    document.getElementById(modalId).style.display = show ? 'flex' : 'none';
}

function addExpense() {
    const category = document.getElementById('exp-category').value;
    const amount = parseFloat(document.getElementById('exp-amount').value);

    if (!amount || isNaN(amount)) return;

    state.expenses.unshift({
        id: Date.now(),
        category,
        amount,
        date: new Date()
    });

    state.balance -= amount; // Restar del saldo disponible

    toggleModal('expense-modal', false);
    document.getElementById('exp-amount').value = '';

    // Re-render si estamos en la pantalla de gastos
    if (state.currentScreen === 'gastos') renderGastos();
    // Actualizar inicio de fondo
    renderInicio();

    saveState();
    alert(`¡Has registrado un gasto de ${formatMoney(amount)} en ${category}!`);
}

function deleteExpense(id) {
    const expenseIndex = state.expenses.findIndex(e => e.id === id);
    if (expenseIndex === -1) return;

    if (confirm("¿Seguro que deseas eliminar este gasto? El dinero regresará a tu saldo disponible.")) {
        state.balance += state.expenses[expenseIndex].amount;
        state.expenses.splice(expenseIndex, 1);

        if (state.currentScreen === 'gastos') renderGastos();
        if (state.currentScreen === 'inicio') renderInicio();
        saveState();
    }
}

function editExpense(id) {
    const expense = state.expenses.find(e => e.id === id);
    if (!expense) return;

    const amountStr = prompt(`Nuevo monto para ${expense.category}:`, expense.amount);
    if (!amountStr) return;
    const newAmount = parseFloat(amountStr);
    if (isNaN(newAmount) || newAmount < 0) return alert("Monto inválido");

    state.balance += expense.amount;
    state.balance -= newAmount;
    expense.amount = newAmount;

    if (state.currentScreen === 'gastos') renderGastos();
    if (state.currentScreen === 'inicio') renderInicio();
    saveState();
}

// ---- Pantalla 3: Ahorro ----
function renderAhorro() {
    const goalsList = document.getElementById('goals-list');
    if (!goalsList) return;

    if (state.goals.length === 0) {
        goalsList.innerHTML = `
            <div style="text-align: center; padding: 20px; color: var(--text-secondary);">
                <p style="font-size: 32px; margin-bottom: 10px;">🎯</p>
                <p style="font-size: 14px;">Aún no tienes metas. ¡Agrega una!</p>
            </div>`;
        return;
    }

    goalsList.innerHTML = state.goals.map(g => {
        const pct = Math.min(100, Math.round((g.saved / g.target) * 100));
        const barColor = pct >= 100 ? 'var(--safe)' : 'var(--accent-blue)';
        return `
        <div class="card" style="margin-bottom: 14px; padding: 16px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 22px;">${g.emoji}</span>
                    <span style="font-weight: 600;">${g.name}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 6px;">
                    <span style="color: ${barColor}; font-weight: bold; font-size: 13px;">${pct}%</span>
                    <button onclick="deleteGoal(${g.id})" style="background: none; border: none; color: var(--danger); cursor: pointer;" title="Eliminar meta">
                        <i data-lucide="trash-2" style="width: 15px; height: 15px;"></i>
                    </button>
                </div>
            </div>
            <div class="progress-container">
                <div class="progress-bar" style="width: ${pct}%; background: ${barColor};"></div>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
                <p style="font-size: 12px; color: var(--text-secondary);">
                    ${formatMoney(g.saved)} de ${formatMoney(g.target)}
                </p>
                ${pct < 100 ? `<button onclick="addSavingToGoal(${g.id})" style="padding: 5px 12px; border-radius: 8px; background: rgba(56,189,248,0.15); border: 1px solid var(--accent-blue); color: var(--accent-blue); cursor: pointer; font-size: 12px; font-family: 'Outfit', sans-serif;">+ Abonar</button>` : `<span style="font-size: 12px; color: var(--safe);">✅ ¡Meta lograda!</span>`}
            </div>
        </div>`;
    }).join('');

    lucide.createIcons();
}

function addGoal() {
    const name = document.getElementById('goal-name').value.trim();
    const target = parseFloat(document.getElementById('goal-target').value);
    const emoji = document.getElementById('goal-emoji').value.trim() || '🎯';

    if (!name || isNaN(target) || target <= 0) return alert('Ingresa un nombre y un monto válido.');

    state.goals.push({ id: Date.now(), name, target, emoji, saved: 0 });
    saveState();
    toggleModal('goal-modal', false);
    document.getElementById('goal-name').value = '';
    document.getElementById('goal-target').value = '';
    document.getElementById('goal-emoji').value = '';
    renderAhorro();
}

function deleteGoal(id) {
    if (!confirm('¿Eliminar esta meta? Los abonos realizados NO regresan al saldo.')) return;
    state.goals = state.goals.filter(g => g.id !== id);
    saveState();
    renderAhorro();
    renderInicio();
}

function addSavingToGoal(id) {
    const goal = state.goals.find(g => g.id === id);
    if (!goal) return;

    const amountStr = prompt(`¿Cuánto deseas abonar a "${goal.name}"? (Se descontará de tu saldo disponible)`);
    if (!amountStr) return;
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) return alert('Monto inválido.');
    if (state.balance < amount) return alert('No tienes suficiente saldo disponible.');

    state.balance -= amount;
    goal.saved += amount;
    state.savings.unshift({ id: Date.now(), amount, date: new Date() });
    saveState();
    renderAhorro();
    renderInicio();
    alert(`¡Abonaste ${formatMoney(amount)} a tu meta "${goal.name}"!`);
}

function calculateSavings() {
    const amount = parseFloat(document.getElementById('calc-amount').value);
    const months = parseInt(document.getElementById('calc-months').value);

    if (!amount || !months) return;

    const total = amount * months;
    document.getElementById('calc-result').innerText = `En ${months} meses tendrías ${formatMoney(total)} ahorrados.`;
}


// ---- Pantalla 4: Inversión ----
function renderInversion() {
    document.getElementById('inv-portfolio').innerText = formatMoney(state.portfolio);

    const invList = document.getElementById('investments-list');
    if (invList) {
        invList.innerHTML = state.investments.length === 0 ? '' : `
            <h4 style="margin-bottom: 10px; font-size: 14px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 10px;">Mis Inversiones</h4>
            ${state.investments.map(i => `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <div>
                        <p style="font-size: 14px; font-weight: bold;">${i.instrument}</p>
                        <p style="font-size: 12px; color: var(--text-secondary);">${i.date.toLocaleDateString()}</p>
                    </div>
                    <div style="text-align: right;">
                        <p style="color: var(--safe); font-weight: bold; margin-bottom: 5px;">${formatMoney(i.amount)}</p>
                        <div>
                            <button onclick="editInvestment(${i.id})" style="background: none; border: none; color: var(--text-secondary); cursor: pointer; margin-right: 5px;" title="Editar"><i data-lucide="edit-2" style="width: 14px; height: 14px;"></i></button>
                            <button onclick="deleteInvestment(${i.id})" style="background: none; border: none; color: var(--danger); cursor: pointer;" title="Eliminar"><i data-lucide="trash-2" style="width: 14px; height: 14px;"></i></button>
                        </div>
                    </div>
                </div>
            `).join('')}
        `;
        lucide.createIcons();
    }
}

function simulateInvest(instrumentName) {
    const amountStr = prompt(`¿Cuánto deseas invertir en ${instrumentName}? (COP)`);
    if (!amountStr) return;
    const amount = parseFloat(amountStr);

    if (isNaN(amount) || amount <= 0) {
        return alert("Monto inválido");
    }

    if (state.balance < amount) {
        alert(`Necesitas al menos ${formatMoney(amount)} en tu saldo disponible para hacer esta inversión.`);
        return;
    }

    state.balance -= amount;
    state.investments.unshift({ id: Date.now(), instrument: instrumentName, amount: amount, date: new Date() });

    renderInversion();
    if (state.currentScreen === 'inicio') renderInicio();

    saveState();
    alert(`¡Inversión simulada exitosa! ${formatMoney(amount)} añadidos a tu portafolio en ${instrumentName}.`);
}

function deleteInvestment(id) {
    const index = state.investments.findIndex(i => i.id === id);
    if (index === -1) return;

    if (confirm("¿Seguro que deseas eliminar esta inversión? El dinero regresará a tu saldo disponible.")) {
        state.balance += state.investments[index].amount;
        state.investments.splice(index, 1);
        renderInversion();
        if (state.currentScreen === 'inicio') renderInicio();
        saveState();
    }
}

function editInvestment(id) {
    const inv = state.investments.find(i => i.id === id);
    if (!inv) return;

    const amountStr = prompt(`Nuevo monto para ${inv.instrument}:`, inv.amount);
    if (!amountStr) return;
    const newAmount = parseFloat(amountStr);
    if (isNaN(newAmount) || newAmount < 0) return alert("Monto inválido");

    state.balance += inv.amount;

    if (state.balance < newAmount) {
        state.balance -= inv.amount;
        return alert("No tienes suficiente dinero disponible para esta inversión.");
    }

    state.balance -= newAmount;
    inv.amount = newAmount;

    renderInversion();
    if (state.currentScreen === 'inicio') renderInicio();
    saveState();
}

// ---- Pantalla 5: Perfil ----
function renderPerfil() {
    let xp = (state.expenses.length * 10) + (state.savings.length * 50) + (state.investments.length * 100);
    let level = Math.floor(xp / 500) + 1;
    let currentLevelXp = xp % 500;
    let progressPercent = (currentLevelXp / 500) * 100;

    let levelTitle = level === 1 ? "Novato" : level < 5 ? "Ahorrador Frecuente" : "Inversor Pro";

    const profileLvl = document.getElementById('profile-level');
    if (profileLvl) {
        // Nombre e imagen del perfil
        const displayName = state.userName || 'Usuario KASH';
        const nameEl = document.getElementById('profile-name');
        const avatarEl = document.getElementById('profile-avatar');
        if (nameEl) nameEl.innerHTML = `${displayName} <button onclick="editUserName()" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;vertical-align:middle;" title="Editar nombre"><i data-lucide="edit-2" style="width:14px;height:14px;"></i></button>`;
        if (avatarEl) avatarEl.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(displayName)}`;

        profileLvl.innerText = `Nivel ${level}: ${levelTitle}`;
        document.getElementById('profile-xp').innerText = `${currentLevelXp} / 500 XP (Total: ${xp} XP)`;
        document.getElementById('profile-progress').style.width = `${progressPercent}%`;

        const badges = [
            { icon: '🐣', title: 'Primer Paso', unlocked: true },
            { icon: '🎯', title: 'Meta Cumplida', unlocked: state.totalSavings >= 4000000 },
            { icon: '📊', title: 'Rey del Presup.', unlocked: state.expenses.length >= 5 },
            { icon: '💎', title: 'Inversor Pro', unlocked: state.investments.length >= 1 },
            { icon: '🔥', title: 'Ahorrador Frec.', unlocked: state.savings.length >= 3 },
            { icon: '🏆', title: 'KASH Master', unlocked: level >= 5 }
        ];

        document.getElementById('badges-container').innerHTML = badges.map(b => `
            <div class="badge ${b.unlocked ? 'unlocked' : ''}">
                <div class="badge-icon">${b.icon}</div>
                <span class="badge-title" style="font-size: 11px;">${b.title}</span>
            </div>
        `).join('');

        lucide.createIcons();
    }
}

function editUserName() {
    const newName = prompt('¿Cómo quieres que te llamemos?', state.userName || '');
    if (newName && newName.trim()) {
        state.userName = newName.trim();
        saveState();
        renderPerfil();
        renderInicio();
    }
}

// ---- Ingresos, Ahorros y Balance ----
function editBalance() {
    const amountStr = prompt("Ingresa el nuevo saldo total disponible (sobrescribirá el actual):", state.balance);
    if (!amountStr) return;
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount < 0) return alert("Monto inválido");

    state.balance = amount;
    if (state.currentScreen === 'inicio') renderInicio();
    saveState();
    alert(`Saldo actualizado a ${formatMoney(amount)}`);
}

function addIncome() {
    const amountStr = prompt("¿Cuánto dinero quieres ingresar? (COP)");
    if (!amountStr) return;
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) return alert("Monto inválido");

    state.balance += amount;

    if (state.currentScreen === 'inicio') renderInicio();
    saveState();
    alert(`¡Has ingresado ${formatMoney(amount)} a tu saldo!`);
}

function addSavings() {
    const amountStr = prompt("¿Cuánto deseas abonar a tu meta? (Se descontará de tu dinero disponible)");
    if (!amountStr) return;
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) return alert("Monto inválido");

    if (state.balance < amount) {
        return alert("No tienes suficiente dinero disponible. ¡Añade ingresos primero!");
    }

    state.balance -= amount;
    state.savings.unshift({ id: Date.now(), amount: amount, date: new Date() });

    renderAhorro();
    if (state.currentScreen === 'inicio') renderInicio();
    saveState();
    alert(`¡Has abonado ${formatMoney(amount)} a tu meta de ahorro!`);
}

function deleteSaving(id) {
    const index = state.savings.findIndex(s => s.id === id);
    if (index === -1) return;

    if (confirm("¿Seguro que deseas eliminar este abono? El dinero regresará a tu saldo disponible.")) {
        state.balance += state.savings[index].amount;
        state.savings.splice(index, 1);
        renderAhorro();
        if (state.currentScreen === 'inicio') renderInicio();
        saveState();
    }
}

function editSaving(id) {
    const saving = state.savings.find(s => s.id === id);
    if (!saving) return;

    const amountStr = prompt(`Nuevo monto para este abono:`, saving.amount);
    if (!amountStr) return;
    const newAmount = parseFloat(amountStr);
    if (isNaN(newAmount) || newAmount < 0) return alert("Monto inválido");

    state.balance += saving.amount;

    if (state.balance < newAmount) {
        state.balance -= saving.amount;
        return alert("No tienes suficiente dinero disponible para este nuevo abono.");
    }

    state.balance -= newAmount;
    saving.amount = newAmount;

    renderAhorro();
    if (state.currentScreen === 'inicio') renderInicio();
    saveState();
}

// Inicialización
window.onload = () => {
    loadState();
    initDateFilter();
    renderInicio();
    renderAhorro();
    renderInversion();
    renderPerfil();
};
