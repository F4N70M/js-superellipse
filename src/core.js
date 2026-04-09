/**
 * @file src/core.js
 * 
 * @module sj-superellipse/core
 * @since 1.0.0
 * @author f4n70m
 * 
 * @description
 * Ядро математических расчётов суперэллипса. Содержит функцию `jsse_generateSuperellipsePath`,
 * которая по заданным ширине, высоте, радиусу скругления и коэффициенту кривизны генерирует
 * SVG-путь, аппроксимирующий суперэллипс с помощью кубических кривых Безье.
 * 
 * Также экспортирует вспомогательные функции:
 * - `jsse_roundf` – округление чисел с заданной точностью,
 * - `jsse_getBorderRadiusFactor` – возвращает константу (4/3)*(√2-1) для аппроксимации окружности.
 * 
 * @see {@link https://en.wikipedia.org/wiki/Superellipse|Суперэллипс}
 * @see {@link https://github.com/f4n70m/js-superellipse|f4n70m/sj-superellipse}
 * 
 * @example
 * import { jsse_generateSuperellipsePath } from 'js-superellipse/core';
 * const path = jsse_generateSuperellipsePath(200, 150, 30, 1.2);
 * svgPathElement.setAttribute('d', path);
 */

/**
 * Округляет число до заданного количества знаков после запятой.
 *
 * @param {number} value - Исходное число.
 * @param {number} [precision=2] - Количество знаков после запятой (по умолчанию 2).
 * @returns {number} Округлённое число.
 */
export function jsse_roundf(value, precision = 2) {
	const factor = 10 ** precision;
	return (Math.round(value * factor) / factor).toFixed(precision);
}

/**
 * Вычисляет параметр D2 для второй кривой Безье, обеспечивая касание
 * центра первой кривой с центром второй.
 *
 * В контексте суперэллипса параметры L (размах) и D (отклонение контрольных точек)
 * описывают форму кубической кривой Безье, используемой для построения углов.
 * Зная эталонную пару (L1, D1) и желаемый размах L2, функция находит такое D2,
 * при котором центральная точка второй кривой будет лежать на касательной,
 * проведённой из центра первой кривой (обеспечивается гладкое соединение).
 *
 * @param {number} L1 - Размах эталонной кривой Безье.
 * @param {number} D1 - Отклонение контрольных точек эталонной кривой.
 * @param {number} L2 - Размах целевой кривой Безье.
 * @returns {number} Вычисленное значение D2, ограниченное сверху 1.
 * @throws {Error} Если L2 близко к нулю.
 */
function jsse_getD2FromL1D1L2(L1, D1, L2) {
	if (Math.abs(L2) < 1e-10) {
		throw new Error('L2 не может быть нулевым');
	}
	const D2 = (4 * L2 - L1 * (4 - 3 * D1)) / (3 * L2);
	return Math.min(D2, 1);
}

/**
 * 
 */
export function jsse_getBorderRadiusFactor() {
	return (4 / 3) * (Math.sqrt(2) - 1);
}

/**
 * 
 * Основная функция генерации SVG path для суперэллипса с изменяемой формой углов.
 * Форма углов определяется параметром curveFactor (от -2 до 2):
 *   -2 : вогнутые прямоугольные углы
 *   -G : вогнутые круглые углы (G = (4/3)*(√2-1) ≈ 0.5523)
 *    0 : прямой скос
 *    G : выпуклые круглые углы
 *    1 : выгнутые суперэллипсные углы
 *    2 : выгнутые прямоугольные углы
 * 
 * Функция генерирует непрерывный спектр форм от вогнутых прямоугольных (-2) до выгнутых прямоугольных (2), проходя через скос (0), круглые углы (±G) и суперэллипсные (1); 
 * где G = (4/3)*(√2-1) ≈ 0.5522847498 — константа, при которой кривые Безье аппроксимируют четверть окружности.
 * Благодаря использованию кубических кривых Безье и тщательно подобранной интерполяции достигается плавное изменение геометрии при любом curveFactor в заданном диапазоне.
 * 
 * @param {number} width  - Ширина фигуры.
 * @param {number} height - Высота фигуры.
 * @param {number} radius - Радиус скругления углов (будет автоматически ограничен).
 * @param {number} curveFactor - Коэффициент формы углов, диапазон [-2, 2].
 * @param {number} [precision=2] - Количество знаков после запятой в координатах.
 * @returns {string} Строка с SVG-командами для элемента <path>.
 * @throws {Error} Если при вычислениях возникает деление на ноль (маловероятно при корректных параметрах).
 * 
 */
export function jsse_generateSuperellipsePath(width, height, radius, curveFactor, precision = 2) {
	if (width <= 0 || height <= 0) {
		return "M0,0";  // или "M0,0" – пустой путь
	}
	if (typeof radius !== 'number' || isNaN(radius)) {
		radius = 0;
	}
	/** константа идеальной окружности **/
	const G = jsse_getBorderRadiusFactor();
	/** константа максимальной L при D == 1 **/
	const J = 8 - 4 * Math.sqrt(2);

	/** Множитель для нормализации координат **/
	let M = width >= height ? width : height;

	let kValue = Math.abs(curveFactor);
	let kSign  = curveFactor >= 0 ? 1 : -1;

	/** Ограничиваем радиус половиной меньшей стороны **/
	let rxMax = width / 2;
	let ryMax = height / 2;
	let rMax  = Math.min(rxMax, ryMax);
	let r = Math.min(radius, rMax);
	let rMaxSpan = Math.abs(rxMax - ryMax);
	if (rxMax >= ryMax) {
		rxMax = ryMax + Math.min(rMax / 4, rMaxSpan / 4);
	} else {
		ryMax = rxMax + Math.min(rMax / 4, rMaxSpan / 4);
	}
	let rx = Math.min(r, rxMax);
	let ry = Math.min(r, ryMax);

	let Dx = 0, Dy = 0;
	let Lx = 0, Ly = 0;
	let Sx = 0, Sy = 0;

	if (r !== 0) {
		let R = 1;

		/** Определить эллипсные (k=1) **/
		let Rk1x = rxMax / rx;
		let Rk1y = ryMax / ry;
		let Lk1x = (kSign > 0) ? Math.min(Rk1x, J) : 1;
		let Lk1y = (kSign > 0) ? Math.min(Rk1y, J) : 1;
		let Dk1x = jsse_getD2FromL1D1L2(R, G, Lk1x);
		Dk1x = Math.min(Dk1x, 1);
		let Dk1y = jsse_getD2FromL1D1L2(R, G, Lk1y);
		Dk1y = Math.min(Dk1y, 1);
		let Jk1x = (1 / J) * Lk1x;
		let Jk1y = (1 / J) * Lk1y;

		/** Относительное L (от 1 до Lk1, при k от G до 1) **/
		let Lk = Math.max((Math.min(kValue, 1) - G) / (1 - G), 0);
		let Lix = 1 + (Lk1x - 1) * Lk;
		let Liy = 1 + (Lk1y - 1) * Lk;

		/** Определить Di (от Li) **/
		let Six = 0, Siy = 0;
		let Dix, Diy;
		if (kValue <= G) {
			Dix = Diy = kValue;
		} else {
			let Dlix = jsse_getD2FromL1D1L2(R, G, Lix);
			let Dliy = jsse_getD2FromL1D1L2(R, G, Liy);
			if (kValue <= 1) {
				Dix = Dlix;
				Diy = Dliy;
			} else {
				Jk1x = G + (1 / (Lk1x / J)) * (1 - G);
				Jk1y = G + (1 / (Lk1y / J)) * (1 - G);
				let Jix = Math.min((kValue - 1) / (Jk1x - 1), 1);
				let Jiy = Math.min((kValue - 1) / (Jk1y - 1), 1);

				let Lsx = Lix + (J - Lix) * Jix;
				let Lsy = Liy + (J - Liy) * Jiy;
				let Dlsx = jsse_getD2FromL1D1L2(R, G, Lsx);
				let Dlsy = jsse_getD2FromL1D1L2(R, G, Lsy);
				Dix = Math.min(Dlsx, 1);
				Diy = Math.min(Dlsy, 1);

				if (kValue > Jk1x) {
					Six = (kValue - Jk1x) / (2 - Jk1x);
				}
				if (kValue > Jk1y) {
					Siy = (kValue - Jk1y) / (2 - Jk1y);
				}
			}
		}

		Lx = Lix * (1 - Six);
		Ly = Liy * (1 - Siy);
		Sx = Lix * Six;
		Sy = Liy * Siy;
		Dx = Lx * Dix;
		Dy = Ly * Diy;
	}

	let Qm = M;
	let Qw = width / M;
	let Qh = height / M;
	let Qr = r / M;
	let Q0 = { x: 0, y: 0 };
	let Q1 = { x: Qw, y: 0 };
	let Q2 = { x: Qw, y: Qh };
	let Q3 = { x: 0, y: Qh };

	let pathCommands;
	if (kSign >= 0) {
		pathCommands = [
			`M`, Q0.x, Q0.y + (Sy + Ly) * Qr,
			`L`, Q0.x, Q0.y + (Ly) * Qr,
			`C`, Q0.x, Q0.y + (Ly - Dy) * Qr, Q0.x + (Lx - Dx) * Qr, Q0.y, Q0.x + (Lx) * Qr, Q0.y,
			`L`, Q0.x + (Sx + Lx) * Qr, Q0.y,
			`L`, Q1.x - (Sx + Lx) * Qr, Q1.y,
			`L`, Q1.x - (Lx) * Qr, Q1.y,
			`C`, Q1.x - (Lx - Dx) * Qr, Q1.y, Q1.x, Q1.y + (Ly - Dy) * Qr, Q1.x, Q1.y + (Ly) * Qr,
			`L`, Q1.x, Q1.y + (Sy + Ly) * Qr,
			`L`, Q2.x, Q2.y - (Sy + Ly) * Qr,
			`L`, Q2.x, Q2.y - (Ly) * Qr,
			`C`, Q2.x, Q2.y - (Ly - Dy) * Qr, Q2.x - (Lx - Dx) * Qr, Q2.y, Q2.x - (Lx) * Qr, Q2.y,
			`L`, Q2.x - (Sx + Lx) * Qr, Q2.y,
			`L`, Q3.x + (Sx + Lx) * Qr, Q3.y,
			`L`, Q3.x + (Lx) * Qr, Q3.y,
			`C`, Q3.x + (Lx - Dx) * Qr, Q3.y, Q3.x, Q3.y - (Ly - Dy) * Qr, Q3.x, Q3.y - (Ly) * Qr,
			`L`, Q3.x, Q3.y - (Sy + Ly) * Qr,
			'Z'
		];
	} else {
		pathCommands = [
			`M`, Q0.x, Q0.y + (Sy + Ly) * Qr,
			`L`, Q0.x + (Sx) * Qr, Q0.y + (Sy + Ly) * Qr,
			`C`, Q0.x + (Sx + Dx) * Qr, Q0.y + (Sy + Ly) * Qr, Q0.x + (Sx + Lx) * Qr, Q0.y + (Sy + Dy) * Qr, Q0.x + (Sx + Lx) * Qr, Q0.y + (Sy) * Qr,
			`L`, Q0.x + (Sx + Lx) * Qr, Q0.y,
			`L`, Q1.x - (Sx + Lx) * Qr, Q1.y,
			`L`, Q1.x - (Sx + Lx) * Qr, Q1.y + (Sy) * Qr,
			`C`, Q1.x - (Sx + Lx) * Qr, Q1.y + (Sy + Dy) * Qr, Q1.x - (Sx + Dx) * Qr, Q1.y + (Sy + Ly) * Qr, Q1.x - (Sx) * Qr, Q1.y + (Sy + Ly) * Qr,
			`L`, Q1.x, Q1.y + (Sy + Ly) * Qr,
			`L`, Q2.x, Q2.y - (Sy + Ly) * Qr,
			`L`, Q2.x - Sx * Qr, Q2.y - (Sy + Ly) * Qr,
			`C`, Q2.x - (Sx + Dx) * Qr, Q2.y - (Sy + Ly) * Qr, Q2.x - (Sx + Lx) * Qr, Q2.y - (Sy + Dy) * Qr, Q2.x - (Sx + Lx) * Qr, Q2.y - (Sy) * Qr,
			`L`, Q2.x - (Sx + Lx) * Qr, Q2.y,
			`L`, Q3.x + (Sx + Lx) * Qr, Q3.y,
			`L`, Q3.x + (Sx + Lx) * Qr, Q3.y - Sy * Qr,
			`C`, Q3.x + (Sx + Lx) * Qr, Q3.y - (Sy + Dy) * Qr, Q3.x + (Sx + Dx) * Qr, Q3.y - (Sy + Ly) * Qr, Q3.x + Sx * Qr, Q3.y - (Sy + Ly) * Qr,
			`L`, Q3.x, Q3.y - (Sy + Ly) * Qr,
			'Z'
		];
	}

	/** Применяем масштабирование и округление **/
	const path = pathCommands.map(p => {
		if (typeof p === 'number') {
			return jsse_roundf(p * Qm, precision);
		}
		return p;
	}).join(' ');

	return path;
}