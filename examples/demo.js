// (закомментированный импорт остаётся без изменений)
// import { CssParser } from '../src/css-parser.js';
// const selectors = new CssParser();
// console.log(selectors);

const btn = document.getElementById('demoBtn');
const widthSlider = document.getElementById('width');
const widthVal = document.getElementById('widthVal');
const heightSlider = document.getElementById('height');
const heightVal = document.getElementById('heightVal');
const radiusSlider = document.getElementById('radius');
const radiusVal = document.getElementById('radiusVal');
const curveSlider = document.getElementById('curveFactor');
const curveVal = document.getElementById('curveVal');
const resetBtn = document.getElementById('resetBtn');
const pathDisplay = document.getElementById('pathDisplay');
const modeBtns = document.querySelectorAll('.demo__mode-btn');
const enableToggle = document.getElementById('enableToggle');
const copyBtn = document.getElementById('copyPathBtn');

let currentMode = 'svg-layer';
let currentSize = {
    width: 320,
    height: 120,
};
let currentCurve = 0.75;
let currentRadius = 24;

// Сохраняем контроллеры для кнопок режимов
let modeControllers = [];

// Инициализация всех элементов с superellipse
function initAllElements() {
    // Инициализируем основную кнопку
    btn.superellipseInit({
        curveFactor: currentCurve,
        precision: 2,
        debug: true,
    });

    // Инициализируем кнопки режимов
    modeControllers = [];
    modeBtns.forEach(modeBtn => {
        const controller = modeBtn.superellipseInit({
            curveFactor: 0.75,
            precision: 2,
        });
        modeControllers.push(controller);
    });

    // Инициализируем остальные элементы (бывшие .value-badge, .chip)
    window.superellipseInit(document.querySelectorAll('.controls__value, .demo__chip'), {
        curveFactor: 0.75,
        precision: 2,
        mode: 'clip-path'
    });
    // Инициализируем блоки controls, demo, path и кнопки .button_secondary
    window.superellipseInit(document.querySelectorAll('.button_secondary, .controls, .demo, .path, .path__content'), {
        curveFactor: 0.75,
        precision: 2
    });

    updatePathDisplay();
}

function applySize() {
    btn.style.width = currentSize.width + 'px';
    btn.style.height = currentSize.height + 'px';
}

function applyRadius() {
    btn.style.borderRadius = currentRadius + 'px';
}

function updatePathDisplay() {
    if (btn.superellipse && btn.superellipse.getPath) {
        pathDisplay.textContent = btn.superellipse.getPath();
    } else {
        pathDisplay.textContent = '—';
    }
}

function applyCurve() {
    if (btn.superellipse) {
        btn.superellipse.setCurveFactor(currentCurve);
    }
    updatePathDisplay();
}

function switchMode(mode) {
    currentMode = mode;
    if (btn.superellipse) {
        btn.superellipse.switchMode(currentMode);
        enableToggle.checked = btn.superellipse.isEnabled();
    }
    updatePathDisplay();
}

function setEnabled(enabled) {
    if (!btn.superellipse) return;
    if (enabled) {
        btn.superellipse.enable();
    } else {
        btn.superellipse.disable();
    }
    updatePathDisplay();
}

// Обновление состояния кнопок режимов (активный класс)
function updateModeButtonsState() {
    modeBtns.forEach(btnMode => {
        const mode = btnMode.getAttribute('data-mode');
        if (mode === currentMode) {
            btnMode.classList.add('demo__mode-btn_active');
        } else {
            btnMode.classList.remove('demo__mode-btn_active');
        }
    });
}

// Обработчики событий (очистка консоли)
document.querySelectorAll('#demoBtn, .demo__mode-btn, .button_secondary, .toggle').forEach(b => {
    b.addEventListener('click', () => {
        // console.clear();
    });
});

widthSlider.addEventListener('input', () => {
    currentSize.width = parseInt(widthSlider.value, 10);
    widthVal.textContent = currentSize.width;
    applySize();
    updatePathDisplay();
});
heightSlider.addEventListener('input', () => {
    currentSize.height = parseInt(heightSlider.value, 10);
    heightVal.textContent = currentSize.height;
    applySize();
    updatePathDisplay();
});

radiusSlider.addEventListener('input', () => {
    currentRadius = parseInt(radiusSlider.value, 10);
    radiusVal.textContent = currentRadius;
    applyRadius();
    updatePathDisplay();
});

curveSlider.addEventListener('input', () => {
    currentCurve = parseFloat(curveSlider.value);
    curveVal.textContent = currentCurve.toFixed(2);
    applyCurve();
    updatePathDisplay();
});

modeBtns.forEach(btnMode => {
    btnMode.addEventListener('click', () => {
        const mode = btnMode.getAttribute('data-mode');
        if (mode === currentMode) return;
        currentMode = mode;
        updateModeButtonsState();
        switchMode(mode);
    });
});

enableToggle.addEventListener('input', () => {
    setEnabled(enableToggle.checked);
});

resetBtn.addEventListener('click', () => {
    // Сначала отключаем суперэллипс для кнопки
    if (btn.superellipse) {
        btn.superellipse.disable();
    }

    // Сбрасываем значения
    currentRadius = 24;
    radiusSlider.value = currentRadius;
    radiusVal.textContent = currentRadius;
    applyRadius();

    currentCurve = 0.75;
    curveSlider.value = 0.75;
    curveVal.textContent = '0.75';
    applyCurve();

    // Сбрасываем режим
    currentMode = 'svg-layer';
    updateModeButtonsState();

    if (btn.superellipse) {
        btn.superellipse.switchMode(currentMode);
    }

    // Включаем обратно
    enableToggle.checked = true;
    setEnabled(true);

    updatePathDisplay();
});

// Копирование пути
function showSuccess() {
    copyBtn.textContent = '✅';
    setTimeout(() => copyBtn.textContent = '📋', 1500);
}
if (copyBtn) {
    copyBtn.addEventListener('click', () => {
        const text = pathDisplay.innerText;
        if (text && text !== '—') {
            const copyToClipboard = (str) => {
                if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
                    navigator.clipboard.writeText(str)
                        .then(() => showSuccess())
                        .catch(err => console.warn('Clipboard API failed:', err));
                } else {
                    const textarea = document.createElement('textarea');
                    textarea.value = str;
                    textarea.style.position = 'fixed';
                    textarea.style.top = '-9999px';
                    textarea.style.left = '-9999px';
                    document.body.appendChild(textarea);
                    textarea.select();
                    textarea.setSelectionRange(0, str.length);
                    const success = document.execCommand('copy');
                    document.body.removeChild(textarea);
                    if (success) showSuccess();
                    else console.warn('execCommand copy failed');
                }
            };
            copyToClipboard(text);
        }
    });
}

// Старт
initAllElements();