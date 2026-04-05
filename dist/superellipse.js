(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.Superellipse = {}));
})(this, (function (exports) { 'use strict';

    // src/styles-cache.js

    /**
     * Глобальный кэш отслеживания стилей
     */
    const jsse_styles = new WeakMap();

    /**
     * Модуль генерации SVG-пути для суперэллипса с регулируемой формой углов.
     * Основан на аппроксимации суперэллипса кубическими кривыми Безье.
     *
     * @module f4n70m/sj-superellipse
     * @since 1.0.0
     * @version 1.0.0
     * @author F4N70M
     * @license MIT
     *
     * @see {@link https://en.wikipedia.org/wiki/Superellipse|Суперэллипс на Wikipedia}
     * @see {@link https://github.com/F4N70M/js-superellipse|f4n70m/sj-superellipse}
     *
     * @example
     * const path = jsse_generateSuperellipsePath(200, 150, 30, 1.2);
     * document.querySelector('path').setAttribute('d', path);
     */

    /**
     * Округляет число до заданного количества знаков после запятой.
     *
     * @param {number} value - Исходное число.
     * @param {number} [precision=2] - Количество знаков после запятой (по умолчанию 2).
     * @returns {number} Округлённое число.
     */
    function jsse_roundf(value, precision = 2) {
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
    function jsse_getBorderRadiusFactor() {
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
    function jsse_generateSuperellipsePath(width, height, radius, curveFactor, precision = 2) {
        if (width <= 0 || height <= 0) {
            return "M0,0";  // или "M0,0" – пустой путь
        }
        if (typeof radius !== 'number' || isNaN(radius)) {
            radius = 0;
        }
        // константа идеальной окружности
        const G = jsse_getBorderRadiusFactor();
        // константа максимальной L при D == 1
        const J = 8 - 4 * Math.sqrt(2);

        // Множитель для нормализации координат
        let M = width >= height ? width : height;

        let kValue = Math.abs(curveFactor);
        let kSign  = curveFactor >= 0 ? 1 : -1;

        // Ограничиваем радиус половиной меньшей стороны
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

            // Определить эллипсные (k=1)
            let Rk1x = rxMax / rx;
            let Rk1y = ryMax / ry;
            let Lk1x = (kSign > 0) ? Math.min(Rk1x, J) : 1;
            let Lk1y = (kSign > 0) ? Math.min(Rk1y, J) : 1;
            jsse_getD2FromL1D1L2(R, G, Lk1x);
            jsse_getD2FromL1D1L2(R, G, Lk1y);
            let Jk1x = (1 / J) * Lk1x;
            let Jk1y = (1 / J) * Lk1y;

            // Относительное L (от 1 до Lk1, при k от G до 1)
            let Lk = Math.max((Math.min(kValue, 1) - G) / (1 - G), 0);
            let Lix = 1 + (Lk1x - 1) * Lk;
            let Liy = 1 + (Lk1y - 1) * Lk;

            // Определить Di (от Li)
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

        // Применяем масштабирование и округление
        const path = pathCommands.map(p => {
            if (typeof p === 'number') {
                return jsse_roundf(p * Qm, precision);
            }
            return p;
        }).join(' ');

        return path;
    }

    // src/mode.js

    /**
     * 
     * 
     * 
     */
    class SuperellipseMode {

    	_element;
    	_isActivated;

    	_size = {
    		width:  0,
    		height: 0
    	};
    	_curveFactor;
    	_precision;

    	_styles;

    	_path;
    	_resetPath;




    	/**
    	 * =============================================================
    	 * PUBLIC
    	 * =============================================================
    	 */


    	constructor(element) {
    		this._element = element;
    		this._curveFactor = jsse_getBorderRadiusFactor();
    		this._precision = 2;
    		this._isActivated = false;

    		this._init();
    	}

    	activate() {
    		if (this.isActivated()) return;

    		// Установить статус
    		this._isActivated = true;
    		// Подготовить к активации
    		this._captureStyles();
    		this._recalculateCurve();
    		// Применить Стили и кривую
    		this._applyCurrentInlineStyles();
    		this._applyCurrentCurve();
    	}
    	deactivate() {
    		if (!this.isActivated()) return;

    		// Установить статус
    		this._isActivated = false;
    		// Применить Стили и кривую
    		this._applyCurrentInlineStyles();
    		this._applyCurrentCurve();
    	}

    	update() {
    		this.updatePrepare();
    		this.updateExecute();
    	}
    	updatePrepare() {
    		this._captureStyles();
    		this._captureSize();
    		this._recalculateCurve();
    	}
    	updateExecute() {
    		this._applyCurrentInlineStyles();
    		this._applyCurrentCurve();
    	}


    	updateSize(update = true) {
    		this.updateSizePrepare();
    		if (update) {
    			this.updateSizeExecute();
    		}
    	}
    	updateSizePrepare() {
    		this._captureSize();
    		this._recalculateCurve();
    	}
    	updateSizeExecute() {
    		this._applyCurrentCurve();
    	}


    	updateStyles(update = true) {
    		this.updateStylesPrepare();
    		if (update) {
    			this.updateStylesExecute();
    		}
    	}
    	updateStylesPrepare() {
    		this._captureStyles();
    		this._recalculateCurve();
    	}
    	updateStylesExecute() {
    		this._applyCurrentInlineStyles();
    		this._applyCurrentCurve();
    	}


    	setCurveFactor(value, update = true) {
    		this._curveFactor = value;
    		if (update) {
    			this._recalculateCurve();
    			this._applyCurrentCurve();
    		}
    	}

    	setPrecision(value, update = true) {
    		this._precision = value;
    		if (update) {
    			this._recalculateCurve();
    			this._applyCurrentCurve();
    		}
    	}

    	getPath() {
    		return this._path;
    	}

    	isActivated() {
    		return this._isActivated;
    	}


    	/**
    	 * =============================================================
    	 * PRIVATE
    	 * =============================================================
    	 */


    	_init() {
    		this._initStyles();
    		this._initSize();
    		this._initCurve();
    	}

    	_getResetStyles() {
    		return {
    			'border-radius': '0px'
    		};
    	}

    	/**
    	 * =============================================================
    	 * STYLES
    	 * =============================================================
    	 */

    	_initStyles() {
    		this._styles = jsse_styles.get(this._element);
    		this._dropStyles();
    	}

    	_dropStyles() {
    		this._styles.computed = {};	// вычисленные значения элемента
    		this._styles.inline = {};	// inline значения элемента
    		this._styles.reset = {}; 	// значения для расчета кривой и виртуальных элементов
    	}

    	_captureStyles() {
    		/** 1. Получить актуальные inline-стили **/
    		// Получить актуальные очищенные inline
    		const capturedInlineStyles = this._getClearCapturedInlineStyles();
    		// Сохранить inline-стили
    		this._styles.inline = capturedInlineStyles;
    		/** 2. Вычислить актуальные computed-стили **/
    		// Восстановить inline-стили
    		if (this.isActivated()) {
    			this._clearResetStyles();
    		}
    		// получить текущие computed-стили
    		const capturedComputedStyles = this._getCapturedComputedStyles();
    		// Сохранить computed-стили
    		this._styles.computed = capturedComputedStyles;
    		/** 3. Обновить reset-стили **/
    		this._recalculateResetStyles();
    		/** 4. Возвращение исходных inline-стилей **/
    		this._applyInlineStyles(capturedInlineStyles, this._element);

    	}

    	_recalculateResetStyles() {
    		this._styles.reset = {};
    		const resetStyles = this._getResetStyles();
    		for (const prop in resetStyles) {
    			const computedValue = this._styles.computed[prop];
    			const inlineValue = this._styles.inline[prop]; 
    			const resetValue = resetStyles[prop];

    			// Запомнить необходимые inline для сброса
    			if (resetValue !== computedValue && resetValue !== inlineValue) {
    				this._styles.reset[prop] = resetValue;
    			}
    		}
    	}

    	_applyInlineStyles(props, element) {
    		const managedProperties = this._getManagedProperties();
    		for(const prop of managedProperties) {
    			const inlineValue = props[prop];
    			const currentValue = element.style.getPropertyValue(prop);
    			if (inlineValue !== undefined) {
    				if (currentValue !== inlineValue) {
    					// console.log(`[DEBUG] _applyInlineStyles: setting ${prop} from "${currentValue}" to "${inlineValue}"`);
    					element.style.setProperty(prop, inlineValue);
    				}
    			} else {
    				if (currentValue !== '') {
    					// console.log(`[DEBUG] _applyInlineStyles: removing ${prop} (was "${currentValue}")`);
    					element.style.removeProperty(prop);
    				}
    			}
    		}
    	}

    	_getCurrentInlineStyles() {
    		const managedProperties = this._getManagedProperties();
    		const result = {};
    		for (const prop of managedProperties) {
    			let inlineValue = this._styles.inline[prop];
    			if (this.isActivated() && prop in this._styles.reset) {
    				inlineValue = this._styles.reset[prop];
    			}
    			if (inlineValue !== undefined) {
    				result[prop] = inlineValue;
    			}
    		}
    		return result;
    	}

    	_applyCurrentInlineStyles() {
    		this._applyCurrentInlineElementStyles();
    	}

    	_applyCurrentInlineElementStyles() {
    		const inlineProps = this._getCurrentInlineStyles();
    		this._applyInlineStyles(inlineProps, this._element);
    	}

    	_applyResetStyles() {
    		for(const prop in this._styles.reset) {
    			const value = this._styles.reset[prop];
    			this._element.style.setProperty(prop, value);
    		}
    	}
    	_clearResetStyles() {
    		for(const prop in this._styles.reset) {
    			const inlineValue = this._styles.inline[prop];
    			if (inlineValue !== undefined) {
    				this._element.style.setProperty(prop, inlineValue);
    			} else {
    				this._element.style.removeProperty(prop);
    			}
    		}
    	}

    	_getClearCapturedInlineStyles() {
    		// Получить текущие inline
    		const result = this._getCapturedInlineStyles();
    		// Очистить полученные inline от сброшенных режимом значений
    		const managedProperties = this._getManagedProperties();
    		for (const prop of managedProperties) {
    			// если режим включен и значение совпадает с примененным reset
    			if (this.isActivated() && prop in this._styles.reset && result[prop] === this._styles.reset[prop]) {
    				if (prop in this._styles.inline) {
    					result[prop] = this._styles.inline[prop];
    				} else {
    					delete result[prop];
    				}
    			}
    			// иначе остается inline значение элемента
    		}
    		return result;
    	}

    	_getCapturedInlineStyles() {
    		const result = {};
    		const capturedStyles = this._element.style;
    		for (const prop of this._getManagedProperties()) {
    			const value = capturedStyles.getPropertyValue(prop);
    			if (value !== '') result[prop] = value;
    		}
    		return result;
    	}

    	_getCapturedComputedStyles() {
    		const result = {};
    		const capturedStyles = getComputedStyle(this._element);
    		for (const prop of this._getManagedProperties()) {
    			result[prop] = capturedStyles.getPropertyValue(prop);
    			// const value = capturedStyles.getPropertyValue(prop);
    			// result[prop] = value !== '' ? value   : null;
    		}
    		return result;
    	}

    	_getManagedProperties() {
    		return Object.keys(this._getResetStyles());
    	}

    	/**
    	 * =============================================================
    	 * SIZE
    	 * =============================================================
    	 */

    	_initSize() {
    		this._captureSize();
    	}

    	_captureSize() {
    		const rect = this._element.getBoundingClientRect();

    		this._size.width = rect.width;
    		this._size.height = rect.height;
    	}


    	/**
    	 * =============================================================
    	 * CURVE
    	 * =============================================================
    	 */

    	_initCurve() {
    		this._initInlinePath();
    	}

    	_initInlinePath() {
    		this._resetPath = this._element.style.getPropertyValue('clip-path');
    	}

    	_recalculateCurve() {
    		this._recalculatePath();
    	}

    	_recalculatePath() {
    		if ( !( this._size.width > 0 && this._size.height > 0 ) ) {
    			this._path = 'none'; // Сбрасываем путь
    			return;
    		}

    		const radiusValue = this._styles.computed['border-radius'];
    		const radiusNumber = radiusValue ? parseFloat(radiusValue) : 0;

    		this._path  = jsse_generateSuperellipsePath(
    			this._size.width,
    			this._size.height,
    			radiusNumber,
    			this._curveFactor,
    			this._precision
    		);
    	}
    	
    	_applyCurrentCurve() {
    		// console.log('[DEBUG]', '_applyCurrentCurve:', 'isActivated()', this.isActivated(), '_path', this._path);
    		if (this.isActivated()) {
    			this._applyCurve();
    		} else {
    			this._restoreCurve();
    		}
    	}
    	
    	_applyCurve() {
    		if (this._path) {
    			const newPath = `path("${this._path}")`;
    			if (this._element.style.getPropertyValue('clip-path') !== newPath) {
    				this._element.style.setProperty('clip-path', newPath);
    			}
    		} else {
    			if (this._element.style.getPropertyValue('clip-path') !== 'none') {
    				this._element.style.setProperty('clip-path', 'none');
    			}
    		}
    	}
    	
    	_restoreCurve() {
    		if (this._resetPath) {
    			this._element.style.setProperty('clip-path', this._resetPath);
    		} else {
    			this._element.style.removeProperty('clip-path');
    		}
    	}


    	/**
    	 * =============================================================
    	 * 
    	 * =============================================================
    	 */
    }

    // src/mode-svg-layer.js

    /**
     * 
     * 
     * 
     */
    class SuperellipseModeSvgLayer extends SuperellipseMode {

    	_virtualElementList = {};

    	_viewbox;




    	/**
    	 * =============================================================
    	 * PUBLIC
    	 * =============================================================
    	 */

    	constructor(element) {
    		super(element);

    		this._initViewbox();
    		this._initVirtualElementList();
    	}

    	activate() {
    		if (this.isActivated()) return;

    		// Установить статус
    		this._isActivated = true;
    		// Подготовить к активации
    		this._captureStyles();
    		this._recalculateCurve();
    		// Создать элементы виртуальных слоев
    		this._createInnerWrapper();
    		this._createSvgLayer();
    		// Применить Стили и кривую
    		this._applyCurrentInlineStyles();
    		this._applyCurrentCurve();
    	}
    	deactivate() {
    		if (!this.isActivated()) return;

    		// Установить статус
    		this._isActivated = false;
    		// Удалить элементы виртуальных слоев
    		this._removeInnerWrapper();
    		this._removeSvgLayer();
    		// Применить Стили и кривую
    		this._applyCurrentInlineStyles();
    		this._applyCurrentCurve();
    	}


    	/**
    	 * =============================================================
    	 * PRIVATE
    	 * =============================================================
    	 */


    	_getResetStyles() {
    		return {
    			'background': 'unset',
    			'border-color': '',
    			'border-width': '0px',
    			'border-style': '',
    			// 'border': 'unset',
    			'border-radius': '0px',
    			'box-shadow': 'unset',
    			'position': 'relative',
    		};
    	}


    	_getInliteSvgLayerStyles() {
    		return {
    				// 'border' : '',
    				// 'border-radius' : '',
    				// 'background': '',
    				// 'box-shadow': '',
    			'position': 'absolute',
    			'top': '0px',
    			'left': '0px',
    			'width': '100%',
    			'height': '100%',
    			'pointer-events': 'none',
    			// TODO: 
    			// 'clip-path': `url(#${clipId})`
    		};
    	}


    	_getInliteSvgLayerDivProps() {
    		return [
    			'background',
    			// 'background-size',
    			// 'background-position',
    			'box-shadow'
    		];
    	}


    	/**
    	 * =============================================================
    	 * STYLES
    	 * =============================================================
    	 */

    	_applyCurrentInlineStyles() {
    		this._applyCurrentInlineElementStyles();
    		this._applyCurrentInlineVirtualSvgLayerStyles();
    	}

    	_applyCurrentInlineVirtualSvgLayerStyles() {
    		if ( this.isActivated() ) {
    			this._applyCurrentInlineVirtualSvgLayerDivStyles();
    			this._applyCurrentInlineVirtualSvgLayerBorderStyles();
    			this._applyCurrentInlineVirtualSvgLayerShadowsStyles();
    		}
    	}
    	_applyCurrentInlineVirtualSvgLayerDivStyles() {
    		const inlineSvgLayerDivStyles = this._getCurrentInlineVirtualSvgLayerDivStyles();
    		const svgLayerDiv = this._virtualElementList.svgLayerDiv;
    		this._applyInlineStyles(inlineSvgLayerDivStyles, svgLayerDiv);
    	}
    	_getCurrentInlineVirtualSvgLayerDivStyles() {
    		const result = {};
    		const svgLayerDivProps = this._getInliteSvgLayerDivProps();
    		for (const prop of svgLayerDivProps) {
    			// Если есть общее свойство reset
    			if (prop in this._styles.computed) {
    				result[prop] = this._styles.computed[prop];
    			}
    		}
    		return result;
    	}

    	_applyCurrentInlineVirtualSvgLayerBorderStyles() {
    		const svgLayerBorder = this._virtualElementList.svgLayerBorder;
    		// this._applyInlineStyles(inlineSvgLayerDivStyles, svgLayerBorder);
    		const borderColor = this._styles.computed['border-color'];
    		svgLayerBorder.setAttribute('stroke', borderColor);
    		const borderWidth = this._styles.computed['border-width'];
    		const borderWidthNumber = borderWidth ? (parseFloat(borderWidth) * 2) : 0;
    		svgLayerBorder.setAttribute('stroke-width', borderWidthNumber);
    		const borderStyle = this._styles.computed['border-style'];
    		this._applyBorderStyleToStroke(borderStyle, svgLayerBorder);
    	}

    	_applyBorderStyleToStroke(borderStyle, pathElement) {
    		// Сброс атрибутов
    		pathElement.removeAttribute('stroke-dasharray');
    		pathElement.removeAttribute('stroke-linecap');
    		pathElement.removeAttribute('stroke-linejoin');
    		
    		switch(borderStyle) {
    			case 'solid':
    				// Сплошная линия (значения по умолчанию)
    				break;
    				
    			case 'dotted':
    				pathElement.setAttribute('stroke-dasharray', '0, 8');
    				pathElement.setAttribute('stroke-linecap', 'round');
    				break;
    				
    			case 'dashed':
    				pathElement.setAttribute('stroke-dasharray', '10, 6');
    				break;
    				
    			case 'double':
    				// Для double нужно два отдельных пути или фильтр
    				console.warn('double требует два отдельных элемента');
    				break;
    				
    			case 'groove':
    				pathElement.setAttribute('stroke-dasharray', '1, 2');
    				pathElement.setAttribute('stroke-linecap', 'round');
    				break;
    				
    			case 'ridge':
    				pathElement.setAttribute('stroke-dasharray', '3, 3');
    				break;
    				
    			case 'inset':
    				// Имитация inset через полупрозрачность
    				pathElement.setAttribute('stroke-opacity', '0.7');
    				break;
    				
    			case 'outset':
    				pathElement.setAttribute('stroke-opacity', '0.5');
    				break;
    				
    			case 'dash-dot':
    				// Кастомный стиль
    				pathElement.setAttribute('stroke-dasharray', '15, 5, 5, 5');
    				break;
    				
    			case 'dash-dot-dot':
    				// Кастомный стиль
    				pathElement.setAttribute('stroke-dasharray', '15, 5, 5, 5, 5, 5');
    				break;
    		}
    	}

    	_applyCurrentInlineVirtualSvgLayerShadowsStyles() {
    		const boxShadowValue = this._styles.computed['box-shadow'];
    		const shadows = this._parseBoxShadow(boxShadowValue);

    		const svg = this._virtualElementList.svgLayer;
    		const gFilters = this._virtualElementList.svgLayerGFilters;
    		const gShadows = this._virtualElementList.svgLayerGShadows;
    		const path = this._virtualElementList.svgLayerPath;

    		gFilters.replaceChildren();
    		gShadows.replaceChildren();

    		const id = svg.getAttribute('id');
    		const pathId = path.getAttribute('id');

    		for (let i = 0; i < shadows.length; i++) {

    			if (shadows[i].inset) continue;

    			const shadowValues = shadows[i];

    			const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
    				const feGaussianBlur = document.createElementNS('http://www.w3.org/2000/svg', 'feGaussianBlur');
    				const feOffset = document.createElementNS('http://www.w3.org/2000/svg', 'feOffset');
    				const feFlood = document.createElementNS('http://www.w3.org/2000/svg', 'feFlood');
    				const feComposite = document.createElementNS('http://www.w3.org/2000/svg', 'feComposite');
    			const shadow = document.createElementNS('http://www.w3.org/2000/svg', 'use');

    			const filterId = `${id}__filter_${i}`;
    				const filterBlurId = `${filterId}__blur`;
    				const filterOffsetId = `${filterId}__offset`;
    				const filterColorId = `${filterId}__color`;
    				const filterShadowId = `${filterId}__shadow`;
    			const shadowId = `${id}__shadow_${i}`;

    			gFilters.appendChild(filter);
    				filter.setAttribute('id', filterId);
    				filter.setAttribute('x', '-100%');
    				filter.setAttribute('y', '-100%');
    				filter.setAttribute('width', '300%');
    				filter.setAttribute('height', '300%');
    				filter.appendChild(feGaussianBlur);
    				filter.appendChild(feOffset);
    				filter.appendChild(feFlood);
    				filter.appendChild(feComposite);
    					feGaussianBlur.setAttribute('in', 'SourceAlpha');
    					feGaussianBlur.setAttribute('stdDeviation', shadowValues.blurRadius / 2);
    					feGaussianBlur.setAttribute('result', filterBlurId);
    					feOffset.setAttribute('dx', shadowValues.offsetX);
    					feOffset.setAttribute('dy', shadowValues.offsetY);
    					feOffset.setAttribute('in', filterBlurId);
    					feOffset.setAttribute('result', filterOffsetId);
    					feFlood.style.setProperty('flood-color', shadowValues.color);
    					feFlood.setAttribute('result', filterColorId);
    					feComposite.setAttribute('in', filterColorId);
    					feComposite.setAttribute('in2', filterOffsetId);
    					feComposite.setAttribute('operator', 'in');
    					feComposite.setAttribute('result', filterShadowId);

    			gShadows.appendChild(shadow);
    				shadow.setAttribute('href', `#${pathId}`);
    				shadow.setAttribute('id', shadowId);
    				shadow.setAttribute('filter', `url(#${filterId})`);
    		}
    	}

    	_parseBoxShadow(boxShadowValue) {
    	    if (!boxShadowValue || boxShadowValue === 'none') return [];
    	    
    	    // Разделяем тени
    	    const shadows = [];
    	    let current = '';
    	    let depth = 0;
    	    
    	    for (let char of boxShadowValue) {
    	        if (char === '(') depth++;
    	        if (char === ')') depth--;
    	        if (char === ',' && depth === 0) {
    	            shadows.push(current.trim());
    	            current = '';
    	        } else {
    	            current += char;
    	        }
    	    }
    	    shadows.push(current.trim());
    	    
    	    return shadows.map(shadow => {
    	        // Парсим одну тень
    	        const parts = shadow.match(/(?:rgba?\([^)]+\)|\S+)/g);
    	        if (!parts) return null;
    	        
    	        const result = {
    	            inset: false,
    	            color: null,
    	            offsetX: 0,
    	            offsetY: 0,
    	            blurRadius: 0,
    	            spreadRadius: 0,
    	            originalColorFormat: null  // исходный формат (уже нормализован getComputedStyle)
    	        };
    	        
    	        // Проверяем inset
    	        const insetIndex = parts.indexOf('inset');
    	        if (insetIndex !== -1) {
    	            result.inset = true;
    	            parts.splice(insetIndex, 1);
    	        }
    	        
    	        // Цвет всегда будет в формате rgb/rgba после getComputedStyle
    	        const colorPart = parts.find(p => p.startsWith('rgb'));
    	        if (colorPart) {
    	            result.color = colorPart;
    	            result.originalColorFormat = colorPart;
    	            parts.splice(parts.indexOf(colorPart), 1);
    	        }
    	        
    	        // Парсим числовые значения
    	        const numbers = parts
    	            .map(p => parseFloat(p))
    	            .filter(n => !isNaN(n));
    	        
    	        if (numbers[0] !== undefined) result.offsetX = numbers[0];
    	        if (numbers[1] !== undefined) result.offsetY = numbers[1];
    	        if (numbers[2] !== undefined) result.blurRadius = numbers[2];
    	        if (numbers[3] !== undefined) result.spreadRadius = numbers[3];
    	        
    	        return result;
    	    });
    	}



    	/**
    	 * =============================================================
    	 * VIRTUAL
    	 * =============================================================
    	 */



    	_initVirtualElementList() {
    		this._initVirtualInnerWrapper();
    		this._initVirtualSvgLayer();
    	}




    	_initVirtualSvgLayer() {
    		if (this._virtualElementList.svgLayer) return;

    		const id = Math.random().toString(36).slice(2, 10);
    		const svgId		= `jsse_${id}`;
    		const clipId	= `jsse_${id}__clip`;
    		const pathId	= `jsse_${id}__path`;
    		const filtersId	= `jsse_${id}__filters`;
    		const shadowsId	= `jsse_${id}__shadows`;
    		const divId		= `jsse_${id}__div`;
    		const borderId	= `jsse_${id}__border`;

    		const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    		const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    		const clipPath = document.createElementNS('http://www.w3.org/2000/svg', 'clipPath');
    		const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    		const gFilters = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    		const gShadows = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    		const html = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
    		const div = document.createElementNS('http://www.w3.org/1999/xhtml', 'div');
    		const border = document.createElementNS('http://www.w3.org/2000/svg', 'use');

    		/** svg **/
    		svg.setAttribute('id', svgId);
    		svg.classList.add('jsse--svg-layer--bg');
    		svg.setAttribute('viewBox', this._getViewbox());
    		svg.setAttribute('preserveAspectRatio', 'none');
    		const svgProps = this._getInliteSvgLayerStyles();
    		for (const prop in svgProps) {
    			svg.style.setProperty(prop, svgProps[prop]);
    		}
    		// svg.style.setProperty('clip-path', `url(#${clipId})`);
    		svg.style.setProperty('overflow', 'visible');
    		svg.appendChild(defs);
    		svg.appendChild(gShadows);
    		svg.appendChild(html);
    		svg.appendChild(border);
    		/** svg > defs **/
    		defs.appendChild(clipPath);
    		defs.appendChild(gFilters);
    		/** svg > defs > clipPath **/
    		clipPath.setAttribute('id', clipId);
    		clipPath.appendChild(path);
    		/** svg > defs > clipPath > path **/
    		path.setAttribute('id', pathId);
    		path.setAttribute('d', ''); // только создаем слой, не заполняем
    		/** svg > defs > g **/
    		gFilters.setAttribute('id', filtersId);
    		/** svg > g **/
    		gShadows.setAttribute('id', shadowsId);
    		/** svg > foreignObject **/
    		html.setAttribute('id', shadowsId);
    		html.setAttribute('width', '100%');
    		html.setAttribute('height', '100%');
    		html.setAttribute('clip-path', `url(#${clipId})`);
    		html.appendChild(div);
    		/** svg > foreignObject > div **/
    		div.setAttribute('id', divId);
    		div.style.setProperty('width', '100%');
    		div.style.setProperty('height', '100%');
    		/** svg > border **/
    		border.setAttribute('id', borderId);
    		border.setAttribute('href', `#${pathId}`);
    		border.setAttribute('fill', 'none');
    		border.setAttribute('stroke', '');
    		border.setAttribute('stroke-width', '0');
    		border.setAttribute('clip-path', `url(#${clipId})`);


    		this._virtualElementList.svgLayer = svg;
    		this._virtualElementList.svgLayerPath = path;
    		this._virtualElementList.svgLayerGFilters = gFilters;
    		this._virtualElementList.svgLayerGShadows = gShadows;
    		this._virtualElementList.svgLayerDiv = div;
    		this._virtualElementList.svgLayerBorder = border;
    	}

    	_initVirtualInnerWrapper() {
    		if (this._virtualElementList.innerWrapper) return;

    		const innerWrapper = document.createElement('div');
    		innerWrapper.className = 'jsse--svg-layer--content';
    		innerWrapper.style.setProperty('position', 'relative');

    		this._virtualElementList.innerWrapper = innerWrapper;
    	}




    	_createSvgLayer() {
    		const svgLayer = this._virtualElementList.svgLayer;
    		// TODO: нужна ли проверка на наличие svgLayer у this._element?
    		this._element.insertBefore(svgLayer, this._element.firstChild);
    	}

    	_removeSvgLayer() {
    		const svgLayer = this._virtualElementList.svgLayer;
    		if (svgLayer && svgLayer.parentNode === this._element) {
    			this._element.removeChild(svgLayer);
    		}
    	}

    	_createInnerWrapper() {
    		const innerWrapper = this._virtualElementList.innerWrapper;

    		// Перемещаем внутренние элемены this._element в innerWrapper
    		const children = Array.from(this._element.childNodes);
    		for (const child of children) {
    			innerWrapper.appendChild(child);
    		}

    		this._element.appendChild(innerWrapper);
    	}

    	_removeInnerWrapper() {
    		const innerWrapper = this._virtualElementList.innerWrapper;

    		// Перемещаем внутренние элемены innerWrapper в this._element
    		const children = Array.from(innerWrapper.childNodes);
    		for (const child of children) {
    			this._element.appendChild(child);
    		}

    		this._element.removeChild(innerWrapper);
    	}



    	/**
    	 * =============================================================
    	 * CURVE
    	 * =============================================================
    	 */

    	_initViewbox() {
    		this._recalculateViewbox();
    	}

    	_recalculateCurve() {
    		super._recalculateCurve();

    		this._recalculateViewbox();
    	}

    	_recalculateViewbox() {
    		if ( this._size.width > 0 && this._size.height > 0 ) {
    			this._viewbox = `0 0 ${this._size.width} ${this._size.height}`;
    		} else {
    			this._viewbox = '0 0 0 0'; // Сбрасываем путь
    		}
    	}

    	_getViewbox() {
    		return this._viewbox;
    	}
    	
    	_applyCurve() {
    		// Избегаем лишних мутаций
    		const currentClipPath = this._element.style.getPropertyValue('clip-path');
    		if (currentClipPath !== 'none') {
    			this._element.style.setProperty('clip-path', 'none');
    		}
    		// if (!(currentClipPath === '' || currentClipPath === undefined )) {
    		// 	this._element.style.setProperty('clip-path', '');
    		// }
    			// this._element.style.setProperty('clip-path', 'none');

    		const svgLayer = this._virtualElementList.svgLayer;
    		svgLayer.setAttribute('viewBox', this._getViewbox());

    		const svgLayerPath = this._virtualElementList.svgLayerPath;
    		if (this._path) {
    			svgLayerPath.setAttribute('d', this._path);
    		} else {
    			svgLayerPath.setAttribute('d', '');
    			// svgLayerPath.removeAttribute('d');
    		}
    	}
    	
    	_restoreCurve() {
    		const svgLayerPath = this._virtualElementList.svgLayerPath;

    		svgLayerPath.setAttribute('d', '');
    		// svgLayerPath.removeAttribute('d');

    		super._restoreCurve();
    	}


    	/**
    	 * =============================================================
    	 * 
    	 * =============================================================
    	 */
    }

    // src/mode-clip-path.js

    /**
     * 
     * 
     * 
     */
    class SuperellipseModeClipPath extends SuperellipseMode {


    	/**
    	 * =============================================================
    	 * PUBLIC
    	 * =============================================================
    	 */

    	constructor(element) {
    		super(element);
    	}


    	/**
    	 * =============================================================
    	 * 
    	 * =============================================================
    	 */
    }

    // src/controller.js

    // const superellipseStyleTracking = new WeakMap();

    class SuperellipseController
    {
    	#mode;
    	#element;

    	#precision; // Количество знаков после запятой
    	#curveFactor;

    	#mutationFrame;
    	#resizeFrame;
    	#intersectionFrame;
    	
    	#resizeObserver;
    	#mutationObserver;
    	#removalObserver;
    	#intersectionObserver;

    	#needsUpdate;
    	#isSelfApply;

    	#debugCounter = 0;

    	/**
    	 * =============================================================
    	 * PUBLIC
    	 * =============================================================
    	 */


    	constructor(element, options = {}) {
    		options = {
    			mode: 'svg-layer',
    			...options
    		};
    		this.#element = element;
    		this.#curveFactor = options.curveFactor ?? jsse_getBorderRadiusFactor();
    		this.#precision = options.precision ?? 2;

    		this.#needsUpdate = false;
    		this.#isSelfApply = false;

    		// Слушатели
    		this.#resizeObserver = null;
    		this.#mutationObserver = null;
    		this.#removalObserver = null;
    		this.#intersectionObserver = null;

    		// init
    		this.#initCacheStyles();
    		this.#setMode(options.mode);
    		this.#connectObservers();
    	}

    	switchMode(modeName) {
    		this.#unsetMode();
    		this.#setMode(modeName);

    		return this;
    	}

    	enable() {
    		// this.#mode.activate();
    		this.#isSelfApply = true;
    		try {
    			this.#mode.activate();
    		} finally {
    			this.#isSelfApply = false;
    		}

    		return this;
    	}

    	disable() {
    		this.#mode.deactivate();

    		return this._element;
    	}

    	setCurveFactor(value) {
    		this.#curveFactor = value;
    		this.#mode.setCurveFactor(value);

    		return this;
    	}

    	setPrecision(value) {
    		this.#precision = value;
    		this.#mode.setPrecision(value);

    		return this;
    	}

    	getPath() {
    		return this.#mode.getPath();
    	}

    	destroy() {
    		this.#destroyController();

    		return this._element;
    	}


    	/**
    	 * =============================================================
    	 * PRIVATE
    	 * =============================================================
    	 */



    	#isDisplay() {
    		const capturedStyles = getComputedStyle(this.#element);
    		return capturedStyles.getPropertyValue('display') !== 'none';
    	}


    	/**
    	 * =============================================================
    	 * CACHE
    	 * =============================================================
    	 */


    	#initCacheStyles() {
    		let cacheStyles = jsse_styles.get(this.#element);
    		if (!cacheStyles) {
    			cacheStyles = {};
    			jsse_styles.set(this.#element, cacheStyles);
    		}
    	}

    	#deleteCacheStyles() {
    		jsse_styles.delete(this.#element);
    	}


    	/**
    	 * =============================================================
    	 * MODE
    	 * =============================================================
    	 */


    	#setMode(modeName) {
    		switch (modeName) {
    			case 'svg-layer':
    				this.#mode = new SuperellipseModeSvgLayer(this.#element);
    				break;

    			case 'clip-path':
    			default:
    				this.#mode = new SuperellipseModeClipPath(this.#element);
    				break;
    		}
    		this.#mode.setCurveFactor(this.#curveFactor, false);
    		this.#mode.setPrecision(this.#precision, false);

    		this.#mode.activate();
    	}

    	#unsetMode() {
    		this.#mode.deactivate();
    		this.#mode = null;
    	}


    	/**
    	 * =============================================================
    	 * 
    	 * =============================================================
    	 */

    	/**
    	 * Метод уничтожения контроллера
    	 */
    	#destroyController() {
    		this.#disconnectObservers();
    		this.#unsetMode();

    		this.#deleteCacheStyles();
    		this.#deleteFromControllers();
    	}
    	
    	#deleteFromControllers() {
    		jsse_controllers.delete(this.#element);
    	}


    	/**
    	 * =============================================================
    	 * 
    	 * =============================================================
    	 */


    	#connectObservers() {
    		this.#mutationObserver = new MutationObserver(() => {
    			this.#mutationHandler();
    		});
    		this.#mutationObserver.observe(this.#element, {
    			attributes: true,
    			attributeFilter: ['style', 'class']
    		});

    		if (typeof IntersectionObserver !== 'undefined') {
    			this.#intersectionObserver = new IntersectionObserver((entries) => {
    				this.#intersectionHandler(entries);
    			});
    			this.#intersectionObserver.observe(this.#element);
    		}

    		if (typeof ResizeObserver !== 'undefined') {
    			this.#resizeObserver = new ResizeObserver(() => {
    				this.#resizeHandler();
    			});
    			this.#resizeObserver.observe(this.#element);
    		}

    		this.#removalObserver = new MutationObserver(() => {
    			this.#destroyHandler();
    		});
    		this.#removalObserver.observe(document.body, {
    			childList: true,
    			subtree: true
    		});
    	}

    	#disconnectObservers() {
    		// if (this.#mutationFrame) cancelAnimationFrame(this.#mutationFrame);
    		// if (this.#resizeFrame) cancelAnimationFrame(this.#resizeFrame);
    		// if (this.#intersectionFrame) cancelAnimationFrame(this.#intersectionFrame);
    		// clearTimeout вместо cancelAnimationFrame
    		if (this.#mutationFrame) clearTimeout(this.#mutationFrame);
    		if (this.#resizeFrame) clearTimeout(this.#resizeFrame);
    		if (this.#intersectionFrame) clearTimeout(this.#intersectionFrame);

    		if (this.#resizeObserver) this.#resizeObserver.disconnect();
    		if (this.#mutationObserver) this.#mutationObserver.disconnect();
    		if (this.#intersectionObserver) this.#intersectionObserver.disconnect();
    		if (this.#removalObserver) this.#removalObserver.disconnect();
    	}


    	/**
    	 * =============================================================
    	 * 
    	 * =============================================================
    	 */
    	#mutationHandler() {

    		const counter = this.#debugCounter++;
    		console.log(`[DEBUG] "${this.#element.classList}" #mutationHandler(): start ${counter}"`);

    		this.#mutationObserver.disconnect();
    		try {
    			if (this.#isDisplay() && this.#needsUpdate) {
    				this.#mode.update();
    				this.#needsUpdate = false;
    			} else {
    				this.#mode.updateStyles();
    			}
    		} finally {
    			this.#mutationObserver.observe(this.#element, {
    				attributes: true,
    				attributeFilter: ['style', 'class']
    			});
    			console.log(`[DEBUG] #mutationHandler(): end ${counter}"`);
    		}
    	}

    	#resizeHandler() {
    		if (this.#isDisplay()) {
    			try {
    				this.#mode.updateSize();
    			} finally {
    			}
    		} else {
    			this.#needsUpdate = true;
    		}
    	}

    	#intersectionHandler(entries) {
    		if (entries[0].isIntersecting && this.#needsUpdate) {
    			try {
    				this.#mode.update();
    				this.#needsUpdate = false;
    			} finally {
    			}
    		}
    	}

    	#destroyHandler() {
    		if (!document.body.contains(this.#element)) {
    			this.#destroyController();
    		}
    	}
    }

    const jsse_controllers = new WeakMap(); // экспортируем

    // Геттер для доступа к контроллеру через element.superellipse
    Object.defineProperty(Element.prototype, 'superellipse', {
        get() {
            return jsse_controllers.get(this);
        }
    });

    // Метод инициализации на элементе
    Element.prototype.superellipseInit = function(options) {
        let controller = jsse_controllers.get(this);
        if (controller) {
            controller.destroy();
        }
        controller = new SuperellipseController(this, options);
        jsse_controllers.set(this, controller);
        return this; // для цепочек
    };

    // Глобальная функция superellipseInit
    function superellipseInit(target, options) {
        if (typeof target === 'string') {
            const elements = document.querySelectorAll(target);
            const controllersList = [];
            elements.forEach(el => {
                el.superellipseInit(options);
                controllersList.push(el.superellipse);
            });
            return controllersList;
        } else if (target instanceof Element) {
            target.superellipseInit(options);
            return target.superellipse;
        } else if (target instanceof NodeList || Array.isArray(target)) {
            const controllersList = [];
            for (let i = 0; i < target.length; i++) {
                const el = target[i];
                if (el instanceof Element) {
                    el.superellipseInit(options);
                    controllersList.push(el.superellipse);
                }
            }
            return controllersList;
        } else {
            throw new Error('superellipseInit: первый аргумент должен быть селектором, элементом или коллекцией элементов');
        }
    }
    if (typeof window !== 'undefined') {
        window.superellipseInit = superellipseInit;
    }

    exports.SuperellipseController = SuperellipseController;
    exports.jsse_generateSuperellipsePath = jsse_generateSuperellipsePath;
    exports.superellipseInit = superellipseInit;

}));
