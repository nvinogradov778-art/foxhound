// calculator.js
(function() {
    const weightSlider = document.getElementById('weightSlider');
    const speedSlider = document.getElementById('speedSlider');
    const weightValue = document.getElementById('weightValue');
    const speedValue = document.getElementById('speedValue');
    const energyDisplay = document.getElementById('energyDisplay');
    const speedOn20Display = document.getElementById('speedOn20Display');
    const rows = document.querySelectorAll('#rulesTable tbody tr');
    const statusSecondary = document.getElementById('statusSecondary');
    const statusPrimary = document.getElementById('statusPrimary');
    const statusSniper = document.getElementById('statusSniper');
    const statusMsg = document.getElementById('statusMessage');
    const LIMITS = {
        secondary: { maxEnergy: 1.5, distance: 0, label: 'Вторичка' },
        primary: { maxEnergy: 2.4, distance: 10, label: 'Основное' },
        sniper: { maxEnergy: 2.9, distance: 25, label: 'Снайперка' }
    };

    function getCategoryByEnergy(E) {
        if (E <= 1.5) return 'secondary';
        if (E <= 2.4) return 'primary';
        if (E <= 2.9) return 'sniper';
        return 'over';
    }

    function updateAll() {
        const m = parseFloat(weightSlider.value);
        const v = parseFloat(speedSlider.value);
        const E = (m * v * v) / 2000;
        const v20 = Math.sqrt(E * 2000 / 0.20);
        weightValue.textContent = m.toFixed(2) + ' г';
        speedValue.textContent = v.toFixed(0) + ' м/с';
        energyDisplay.textContent = E.toFixed(2) + ' Дж';
        speedOn20Display.textContent = v20.toFixed(0) + ' м/с';
        const category = getCategoryByEnergy(E);
        rows.forEach(row => row.classList.remove('active', 'warning'));
        let activeRow = null;
        rows.forEach(row => { if (row.dataset.weapon === category) activeRow = row; });
        let isAllowed = false;
        let limit = null;
        if (category !== 'over') {
            limit = LIMITS[category];
            isAllowed = E <= limit.maxEnergy;
        }
        if (activeRow) {
            if (isAllowed) activeRow.classList.add('active');
            else activeRow.classList.add('warning');
        }
        const statusMap = { secondary: statusSecondary, primary: statusPrimary, sniper: statusSniper };
        for (let w in statusMap) {
            const lim = LIMITS[w];
            const ok = E <= lim.maxEnergy;
            statusMap[w].innerHTML = ok
            ? '<span class="material-icons" style="color:var(--green); font-size:16px;">check</span>'
            : '<span class="material-icons" style="color:var(--red); font-size:16px;">close</span>';
        }
        if (category === 'over') {
            statusMsg.className = 'status-msg fail';
            statusMsg.innerHTML = '<span class="material-icons" style="color:var(--red);">error</span> Не допуск: превышен максимальный лимит (2.9 Дж)';
        } else if (isAllowed) {
            statusMsg.className = 'status-msg ok';
            statusMsg.innerHTML = `<span class="material-icons" style="color:var(--green);">check_circle</span> Допуск: разрешено, дистанция ${limit.distance} м (категория «${limit.label}»)`;
        } else {
            statusMsg.className = 'status-msg fail';
            statusMsg.innerHTML = `<span class="material-icons" style="color:var(--red);">error</span> Не допуск: превышен лимит для «${limit.label}» (макс. ${limit.maxEnergy} Дж)`;
        }
    }

    weightSlider.addEventListener('input', updateAll);
    speedSlider.addEventListener('input', updateAll);
    updateAll();

    window.Calculator = { updateAll };
})();
