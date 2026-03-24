const btn = document.getElementById('demoBtn');
const radiusSlider = document.getElementById('radius');
const radiusVal = document.getElementById('radiusVal');
const curveSlider = document.getElementById('curveFactor');
const curveVal = document.getElementById('curveVal');
const modeSelect = document.getElementById('modeSelect');
const resetBtn = document.getElementById('resetBtn');
const destroyBtn = document.getElementById('destroyBtn');
const pathDisplay = document.getElementById('pathDisplay');

let currentOptions = {
    radius: 30,
    curveFactor: 1,
    mode: 'svg-layer'
};

function updateButton() {
    btn.superellipseInit(currentOptions);
    // Обновляем отображение пути (через геттер)
    if (btn.superellipse) {
        pathDisplay.textContent = btn.superellipse.getPath();
    }
}

radiusSlider.addEventListener('input', () => {
    currentOptions.radius = parseInt(radiusSlider.value);
    radiusVal.textContent = currentOptions.radius;
    if (btn.superellipse) btn.superellipse.setRadius(currentOptions.radius);
    else updateButton();
});

curveSlider.addEventListener('input', () => {
    currentOptions.curveFactor = parseFloat(curveSlider.value);
    curveVal.textContent = currentOptions.curveFactor.toFixed(2);
    if (btn.superellipse) btn.superellipse.setCurveFactor(currentOptions.curveFactor);
    else updateButton();
});

modeSelect.addEventListener('change', () => {
    currentOptions.mode = modeSelect.value;
    if (btn.superellipse) btn.superellipse.setMode(currentOptions.mode);
    else updateButton();
});

resetBtn.addEventListener('click', () => {
    radiusSlider.value = '30';
    curveSlider.value = '1';
    modeSelect.value = 'svg-layer';
    currentOptions = { radius: 30, curveFactor: 0.8, mode: 'svg-layer' };
    radiusVal.textContent = '30';
    curveVal.textContent = '1.00';
    updateButton();
});

destroyBtn.addEventListener('click', () => {
    if (btn.superellipse) {
        btn.superellipse.destroy();
        pathDisplay.textContent = '';
    }
});

// Инициализация
updateButton();