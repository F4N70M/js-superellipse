const btn = document.getElementById('demoBtn');
const radiusSlider = document.getElementById('radius');
const radiusVal = document.getElementById('radiusVal');
const curveSlider = document.getElementById('curveFactor');
const curveVal = document.getElementById('curveVal');
const resetBtn = document.getElementById('resetBtn');
const pathDisplay = document.getElementById('pathDisplay');
const modeBtns = document.querySelectorAll('.mode-btn');
const enableToggle = document.getElementById('enableToggle');
const copyBtn = document.getElementById('copyPathBtn');

let currentMode = 'svg-layer';
let currentCurve = 1;
let currentRadius = 30;

// Сохраняем контроллеры для кнопок режимов
let modeControllers = [];

// Инициализация всех элементов с superellipse
function initAllElements() {
		// Инициализируем основную кнопку
		btn.superellipseInit({
				curveFactor: currentCurve,
				precision: 2
		});
		
		// Инициализируем кнопки режимов
		modeControllers = [];
		modeBtns.forEach(modeBtn => {
				const controller = modeBtn.superellipseInit({
						curveFactor: 1,
						precision: 2
				});
				modeControllers.push(controller);
		});
		
		// Инициализируем остальные элементы
		window.superellipseInit(document.querySelectorAll('.value-badge, .chip'), {
				curveFactor: 1,
				precision: 2,
				mode: 'clip-path'
		});
	window.superellipseInit(document.querySelectorAll('.btn-secondary, .card, .path-monospace'), {
		curveFactor: 1,
		precision: 2
	});
		
		updatePathDisplay();
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

// Обновление стилей кнопок режимов
function updateModeButtonsState() {
		modeBtns.forEach(btnMode => {
				const mode = btnMode.getAttribute('data-mode');
				if (mode === currentMode) {
						btnMode.classList.add('active');
				} else {
						btnMode.classList.remove('active');
				}
		});
}


radiusSlider.addEventListener('input', () => {
		// console.clear();
});
document.querySelectorAll('#demoBtn, .mode-btn, .btn-secondary, .toggle').forEach(b => {
		b.addEventListener('click', () => {
				// console.clear();
		});
});


// Обработчики событий
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
		// console.log('——————————');
		// console.log('[DEMO]', '[resetBtn]', '[click]');
		// console.log('——————————');
		// Сначала отключаем суперэллипс для кнопки
		if (btn.superellipse) {
				btn.superellipse.disable();
		}
		
		// Сбрасываем значения
		currentRadius = 30;
		radiusSlider.value = currentRadius;
		radiusVal.textContent = currentRadius;
		applyRadius();
		
		currentCurve = 1;
		curveSlider.value = 1;
		curveVal.textContent = '1.00';
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
if (copyBtn) {
		copyBtn.addEventListener('click', () => {
				const text = pathDisplay.innerText;
				if (text && text !== '—') {
						navigator.clipboard.writeText(text);
						copyBtn.textContent = '✅';
						setTimeout(() => copyBtn.textContent = '📋', 1500);
				}
		});
}

// Старт
initAllElements();