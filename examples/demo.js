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

const cards = document.querySelectorAll('.card');
window.superellipseInit(cards, {
	curveFactor: 1,
	precision: 2
});

let currentMode;
let currentCurve = 1;
let currentRadius = 30;

// Инициализация контроллера (один раз)
function initController() {
	btn.superellipseInit({
		curveFactor: currentCurve,
		precision: 2
	});
	// applyRadius(); // радиус применится, библиотека его перехватит
	updatePathDisplay();
}

// // Применяем настройки к кнопке напрямую
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
	btn.superellipse.setCurveFactor(currentCurve);
	updatePathDisplay();
}

// Смена режима
function switchMode(mode) {
	currentMode = mode;
	btn.superellipse.switchMode(currentMode);
	updatePathDisplay();
}

// Включение/выключение
function setEnabled(enabled) {
	console.log(`[demo.js] setEnabled: enabled ${enabled}`);
	if (enabled) {
		btn.superellipse.enable();
	} else {
		btn.superellipse.disable();
	}
	updatePathDisplay();
}

enableToggle.addEventListener('change', () => {
	setEnabled(enableToggle.checked);
});

// // Обработчики событий
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
		// обновляем активный класс
		modeBtns.forEach(b => b.classList.remove('active'));
		btnMode.classList.add('active');
		switchMode(mode);
	});
});

resetBtn.addEventListener('click', () => {
	setEnabled(false);

	currentRadius = 30;
	radiusSlider.value = currentRadius;
	radiusVal.textContent = currentRadius;
	applyRadius();

	currentCurve = 1;
	curveSlider.value = 1;
	curveVal.textContent = '1.00';
	applyCurve();

	// if (enableToggle.checked === false) {
		enableToggle.checked = true;
		setEnabled(true);
	// }

	currentMode = 'svg-layer';
	// сброс активного режима
	modeBtns.forEach(b => {
		if (b.getAttribute('data-mode') === currentMode) b.classList.add('active');
		else b.classList.remove('active');
	});
	switchMode(currentMode);

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
initController();