const LIMITS = {
  secondary: { maxEnergy: 1.5, distance: 0,  label: 'Вторичка'  },
  primary:   { maxEnergy: 2.4, distance: 10, label: 'Основное'  },
  sniper:    { maxEnergy: 2.9, distance: 25, label: 'Снайперка' }
};

let initialized = false;

function init() {
  if (initialized) return;

  const root = document.getElementById('calculator-root');
  if (!root) return;

  const weightSlider = document.getElementById('calc-weight');
  const speedSlider = document.getElementById('calc-speed');
  const weightValue = document.getElementById('calc-weight-value');
  const speedValue = document.getElementById('calc-speed-value');
  const energyEl = document.getElementById('calc-energy');
  const speed20El = document.getElementById('calc-speed-20');
  const statusEl = document.getElementById('calc-status');
  const rows = root.querySelectorAll('[data-weapon]');

  if (!weightSlider || !speedSlider) return;

  const statusCells = {};
  ['secondary', 'primary', 'sniper'].forEach(key => {
    statusCells[key] = root.querySelector('[data-status="' + key + '"]');
  });

  function getCategory(energy) {
    if (energy <= 1.5) return 'secondary';
    if (energy <= 2.4) return 'primary';
    if (energy <= 2.9) return 'sniper';
    return 'over';
  }

  function update() {
    const weight = parseFloat(weightSlider.value);
    const speed = parseFloat(speedSlider.value);
    const energy = (weight * speed * speed) / 2000;
    const speed20 = Math.sqrt(energy * 2000 / 0.20);

    weightValue.textContent = weight.toFixed(2) + ' г';
    speedValue.textContent = Math.round(speed) + ' м/с';
    energyEl.textContent = energy.toFixed(2) + ' Дж';
    speed20El.textContent = Math.round(speed20) + ' м/с';

    const category = getCategory(energy);

    rows.forEach(row => row.classList.remove('calc-row-active', 'calc-row-warning'));

    const activeRow = root.querySelector('[data-weapon="' + category + '"]');
    const limit = category !== 'over' ? LIMITS[category] : null;
    const allowed = category !== 'over' && energy <= limit.maxEnergy;

    if (activeRow) {
      activeRow.classList.add(allowed ? 'calc-row-active' : 'calc-row-warning');
    }

    Object.keys(statusCells).forEach(key => {
      const cell = statusCells[key];
      if (!cell) return;
      cell.innerHTML = '';
      const icon = document.createElement('span');
      icon.className = 'material-icons ' + (energy <= LIMITS[key].maxEnergy ? 'calc-ok' : 'calc-fail');
      icon.textContent = energy <= LIMITS[key].maxEnergy ? 'check_circle' : 'cancel';
      cell.appendChild(icon);
    });

    renderStatus(statusEl, category, limit, allowed);
  }

  weightSlider.addEventListener('input', update);
  speedSlider.addEventListener('input', update);
  update();

  initialized = true;
}

function renderStatus(el, category, limit, allowed) {
  el.classList.remove('calc-status-ok', 'calc-status-fail');
  el.innerHTML = '';

  let icon, text, statusClass;

  if (category === 'over') {
    statusClass = 'calc-status-fail';
    icon = 'error';
    text = 'Не допуск: превышен максимальный лимит (2.9 Дж)';
  } else if (allowed) {
    statusClass = 'calc-status-ok';
    icon = 'check_circle';
    text = 'Допуск: разрешено, дистанция ' + limit.distance + ' м (категория «' + limit.label + '»)';
  } else {
    statusClass = 'calc-status-fail';
    icon = 'error';
    text = 'Не допуск: превышен лимит для «' + limit.label + '» (макс. ' + limit.maxEnergy + ' Дж)';
  }

  el.classList.add(statusClass);

  const iconEl = document.createElement('span');
  iconEl.className = 'material-icons';
  iconEl.textContent = icon;
  el.appendChild(iconEl);

  const textEl = document.createElement('span');
  textEl.textContent = text;
  el.appendChild(textEl);
}

export const Calculator = { load: init };