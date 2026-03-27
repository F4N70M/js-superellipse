const btn = document.getElementById('demoBtn');
const radiusSlider = document.getElementById('radius');
const radiusVal = document.getElementById('radiusVal');
const curveSlider = document.getElementById('curveFactor');
const curveVal = document.getElementById('curveVal');
const resetBtn = document.getElementById('resetBtn');
const pathDisplay = document.getElementById('pathDisplay');
const modeBtns = document.querySelectorAll('.mode-btn');

let currentOptions = {
    radius: 30,
    curveFactor: 1,
    mode: 'svg-layer'
};

// Обновление отображения пути
function updatePathDisplay() {
    if (btn.superellipse) {
        pathDisplay.textContent = btn.superellipse.getPath();
    } else {
        pathDisplay.textContent = '';
    }
}

// Применение текущих настроек к элементу
function applyCurrentOptions() {
    if (currentOptions.mode === 'none') {
        if (btn.superellipse) {
            btn.superellipse.destroy();
        }
        updatePathDisplay();
        return;
    }

    // Если контроллер уже существует и режим совпадает — обновляем параметры
    if (btn.superellipse && btn.superellipse.getCurrentMode() === currentOptions.mode) {
        btn.superellipse.setRadius(currentOptions.radius);
        btn.superellipse.setCurveFactor(currentOptions.curveFactor);
    } else {
        // Иначе создаём новый контроллер с текущими опциями
        btn.superellipseInit(currentOptions);
    }
    updatePathDisplay();
}

// Синхронизация активного класса у кнопок режимов
function syncModeUI() {
    modeBtns.forEach(btnMode => {
        const mode = btnMode.getAttribute('data-mode');
        if (mode === currentOptions.mode) {
            btnMode.classList.add('active');
        } else {
            btnMode.classList.remove('active');
        }
    });
}

// Обработчики кнопок режимов
modeBtns.forEach(modeBtn => {
    modeBtn.addEventListener('click', () => {
        const newMode = modeBtn.getAttribute('data-mode');
        if (newMode === currentOptions.mode) return;
        currentOptions.mode = newMode;
        applyCurrentOptions();
        syncModeUI();
    });
});

// Обработчики слайдеров
radiusSlider.addEventListener('input', () => {
    currentOptions.radius = parseInt(radiusSlider.value, 10);
    radiusVal.textContent = currentOptions.radius;
    if (btn.superellipse && currentOptions.mode !== 'none') {
        btn.superellipse.setRadius(currentOptions.radius);
        updatePathDisplay();
    } else if (currentOptions.mode !== 'none') {
        applyCurrentOptions();
    }
});

curveSlider.addEventListener('input', () => {
    currentOptions.curveFactor = parseFloat(curveSlider.value);
    curveVal.textContent = currentOptions.curveFactor.toFixed(2);
    if (btn.superellipse && currentOptions.mode !== 'none') {
        btn.superellipse.setCurveFactor(currentOptions.curveFactor);
        updatePathDisplay();
    } else if (currentOptions.mode !== 'none') {
        applyCurrentOptions();
    }
});

// Сброс
resetBtn.addEventListener('click', () => {
    radiusSlider.value = '30';
    curveSlider.value = '1';
    currentOptions = { radius: 30, curveFactor: 1, mode: 'svg-layer' };
    radiusVal.textContent = '30';
    curveVal.textContent = '1.00';
    applyCurrentOptions();
    syncModeUI();
});

// Инициализация
applyCurrentOptions();
syncModeUI();