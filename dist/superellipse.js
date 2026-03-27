(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.Superellipse = {}));
})(this, (function (exports) { 'use strict';

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
        console.log(width, height, radius, curveFactor, precision);
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

    // src/controller.js

    // Глобальный кэш отслеживания стилей
    const superellipseStyleTracking = new WeakMap();

    // Управляемые свойства
    // const JSSE_MANAGED_PROPERTIES = ['border-radius', 'background', 'background-color', 'background-image', 'border', 'box-shadow', 'position'];
    // const JSSE_MANAGED_PROPERTIES = ['border-radius', 'background', 'border', 'box-shadow', 'position'];
    // const JSSE_MANAGED_PROPERTIES = ['borderRadius', 'background', 'backgroundColor', 'backgroundImage', 'border', 'boxShadow', 'position'];

    class SuperellipseController
    {
    	#mode;
    	#precision; // Количество знаков после запятой
    	#curveFactor;
    	#status;	// current mode is enabled
    	#autoResize;
    	#sizes;
    	#path;
    	
    	#options

    	#element;
    	#svgLayer;
    	#contentWrapper;
    	
    	#needsUpdate;
    	
    	#resizeObserver;
    	#mutationObserver;
    	#removalObserver;
    	#intersectionObserver;

    	#resetStyles = {
    		'border-radius': '0',
    		'background': 'unset',
    		'border': 'unset',
    		'box-shadow': 'unset',
    	};

    	/**
    	 * =============================================================
    	 * Основные методы
    	 * =============================================================
    	 */

    	/**
    	 * public switchMode
    	 * 
    	 * @return {bool}
    	 */
    	switchMode(mode) {
    		if (mode === this.getCurrentMode())
    			return true;

    		this.#disableMode();

    		this.#setCurrentMode(mode);
    		return this.#enableMode();
    	}

    	/**
    	 * public destroy
    	 */
    	destroy() {
    		this.#destroyController();
    	}

    	/**
    	 * public setCurveFactor
    	 * 
    	 * @return {bool}
    	 */
    	setCurveFactor(value) {
    		this.#curveFactor = value;
    		this.#applyModeStyles();
    		this.#applyCurve();
    	}

    	/**
    	 * public setCurveFactor
    	 * 
    	 * @return {bool}
    	 */
    	setPrecision(value) {
    		this.#precision = value;
    		this.#applyModeStyles();
    		this.#applyCurve();
    	}

    	
    	

    	/**
    	 * =============================================================
    	 * Controller
    	 * =============================================================
    	 */

    	constructor(element, options = {}) {
    		this.#element = element;
    		this.#options = {
    			mode: 'svg-layer',
    			...options
    		};
    		this.#mode = this.#options.mode;
    		this.#curveFactor = this.#options.curveFactor ?? jsse_getBorderRadiusFactor();
    		this.#precision = this.#options.precision ?? 2;
    		this.#autoResize = this.#options.autoResize ?? true;

    		this.#status = false;
    		this.#needsUpdate = false;
    		this.#svgLayer = null;
    		this.#contentWrapper = null;
    		// this.#lastPath = '';

    		// Слушатели
    		this.#resizeObserver = null;
    		this.#mutationObserver = null;
    		this.#removalObserver = null;
    		this.#intersectionObserver = null;

    		this.#init();
    	}

    	/**
    	 * 
    	 */
    	#init() {
    		this.#captureSizes();
    		this.#initStyles();
    		this.#recalculatePath();
    		this.#setupObservers();
    		this.#initMode();
    		// this.#applyModeStyles();
    	}

    	/**
    	 * Метод уничтожения контроллера
    	 */
    	#destroyController() {
    		this.#disconnectObservers();
    		this.#disableMode();
    			// this.#restoreOriginalContent(); // в #disableMode()
    			// this.#restoreElementStyles(); // в #disableMode()
    			// this.#clearClipPath(); // в #disableMode()
    		this.#deleteFromControllers();
    		this.#setModeStatus(false);
    	}
    	

    	/**
    	 * =============================================================
    	 * Change Mode
    	 * =============================================================
    	 */

    	#initMode() {
    		this.#enableMode();
    	}

    	#disableMode() {
    		this.#setModeStatus(false);

    		switch ( this.	getCurrentMode() ) {
    			case 'svg-layer':
    				this.#disableSvgLayerMode();
    				break;

    			case 'clip-path':
    				this.#disableClipPathMode();
    					// this.#clearClipPath();
    				break;

    			default:
    				return false;
    		}
    		this.#restoreElementStyles();
    		this.#resetCurve();
    	}

    	#enableMode() {
    		this.#setModeStatus(true);

    		const mode = this.getCurrentMode();
    		switch (mode) {
    			case 'svg-layer':
    				this.#enableSvgLayerMode();
    				break;
    			case 'clip-path':
    				this.#enableClipPathMode();
    				break;
    			default:
    				throw new Error(`Режима ${mode} не существует`);
    		}
    		this.#applyModeStyles();
    		this.#applyCurve();
    		return true;
    	}

    	#enableSvgLayerMode() {
    		this.#wrapInner();
    		this.#createSvgLayer();
    		// this.#updateSvgLayerStyles();
    		// this.#applySvgLayerModeStyles();
    	}

    	#disableSvgLayerMode() {
    		this.#removeSvgLayer();
    		this.#unwrapInner();
    	}

    	#enableClipPathMode() {
    		// На будущее
    		// сейчас ничего дополнительного не делает
    	}

    	#disableClipPathMode() {
    		// На будущее
    		// сейчас ничего дополнительного не делает
    	}

    	#applyModeStyles() {
    		/** isNeedsUpdate **/
    		const display = this.#getCapturedComputedStyles().display;
    		if (display === 'none') {
    			this.#needsUpdate = true;
    			return;
    		}
    		this.#needsUpdate = false;

    		if ( this.#getModeStatus() ) {			
    			switch (this.getCurrentMode()) {
    				case 'svg-layer':
    					this.#applySvgLayerModeStyles();
    					break;

    				case 'clip-path':
    					this.#applyClipPathModeStyles();
    					break;

    				default:
    					return false;
    			}
    		}
    	}

    	#applySvgLayerModeStyles() {
    		this.#resetElementStyles();

    		for (const prop of this.#getManagedProperties()) {
    			const value = this.#getTrackedStyleCurrent(prop)?.computed;
    			if (value !== null && value !== undefined) {
    				this.#svgLayer.style.setProperty(prop, value);
    			}
    			else {
    				this.#svgLayer.style.removeProperty(prop);
    			}
    		}
    	}

    	#applyClipPathModeStyles() {
    		this.#applyCurrentElementStyles();
    	}

    	#wrapInner() {
    		if (this.#contentWrapper) return;

    		const wrapper = document.createElement('div');
    		wrapper.className = 'jsse--svg-layer--content';
    		wrapper.style.setProperty('position', 'relative');

    		const children = Array.from(this.#element.childNodes);
    		for (let child of children) {
    			wrapper.appendChild(child);
    			// this.#element.removeChild(child);
    		}
    		this.#element.appendChild(wrapper);
    		this.#contentWrapper = wrapper;
    	}

    	#unwrapInner() {
    		if (this.#contentWrapper === null) return;

    		const children = Array.from(this.#contentWrapper.childNodes);
    		for (let child of children) {
    			this.#element.appendChild(child);
    		}
    		this.#element.removeChild(this.#contentWrapper);
    		this.#contentWrapper = null;
    	}

    	#createSvgLayer() {
    		const clipId = 'jsse_Clip_' + Math.random().toString(36).substr(2, 8);
    		const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    		svg.classList.add('jsse--svg-layer--bg');
    		svg.setAttribute('viewBox', this.#getViewbox());
    		svg.setAttribute('preserveAspectRatio', 'none');
    		svg.style.setProperty('position', 'absolute');
    		svg.style.setProperty('top', '0');
    		svg.style.setProperty('left', '0');
    		svg.style.setProperty('width', '100%');
    		svg.style.setProperty('height', '100%');
    		svg.style.setProperty('pointer-events', 'none');
    		svg.style.setProperty('clip-path', `url(#${clipId})`);

    		const clipShape = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    		clipShape.setAttribute('d', ''); // только создаем слой, не заполняем
    		const clipPath = document.createElementNS('http://www.w3.org/2000/svg', 'clipPath');
    		clipPath.setAttribute('id', clipId);
    		clipPath.appendChild(clipShape);
    		const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    		defs.appendChild(clipPath);
    		svg.appendChild(defs);

    		this.#element.insertBefore(svg, this.#element.firstChild);
    		this.#svgLayer = svg;
    	}

    	#removeSvgLayer() {
    		if (this.#svgLayer && this.#svgLayer.parentNode === this.#element) {
    			this.#element.removeChild(this.#svgLayer);
    		}
    		this.#svgLayer = null;
    	}
    	

    	/**
    	 * =============================================================
    	 * Change path params
    	 * =============================================================
    	 */

    	#captureSizes() {
    		const rect = this.#element.getBoundingClientRect();
    		this.#sizes = {
    			width: rect.width,
    			height: rect.height
    		};
    	}

    	#getSizes() {
    		return this.#sizes;
    	}


    	#getCurrentBorderRadius() {
    		let borderRadius = this.#getTrackedStyleCurrent('border-radius')?.computed;
    		borderRadius = borderRadius ? parseFloat(borderRadius) : 0;
    		return borderRadius;
    	}

    	#getCurveFactor() {
    		return this.#curveFactor;
    	}

    	#getPrecision() {
    		return this.#precision;
    	}

    	#recalculatePath() {
    		const sizes = this.#getSizes();
    		if (!sizes.width || !sizes.height) {
    			this.#setPath(''); // Сбрасываем путь
    			return false;
    		}

    		const path  = jsse_generateSuperellipsePath(
    			sizes.width,
    			sizes.height,
    			this.#getCurrentBorderRadius(),
    			this.#getCurveFactor(),
    			this.#getPrecision()
    		);
    		this.#setPath(path);
    	}

    	getPath() {
    		return this.#path;
    	}

    	#setPath(path) {
    		this.#path = path;
    	}

    	#getViewbox() {
    		const sizes = this.#getSizes();
    		if (!sizes.width || !sizes.height) {
    			console.warn('js-superellipse: Нет размеров для viewbox.');
    			return null;
    		}
    		return `0 0 ${sizes.width} ${sizes.height}`;
    	}

    	#applyCurve() {
    		const path = this.getPath();
    		if (!path) {
    			console.warn('js-superellipse: Получен пустой path.');
    			return;
    		}

    		switch ( this.getCurrentMode() ) {
    			case 'svg-layer':
    				const viewbox = this.#getViewbox();
                	if (!viewbox) {
                		console.warn('js-superellipse: Получен пустой viewbox.');
                		return; // если viewbox невалидный — выходим
                	}
    				this.#svgLayer.setAttribute('viewBox', viewbox);
    				const clipPathElem = this.#svgLayer.querySelector('clipPath path');
    				if (clipPathElem) clipPathElem.setAttribute('d', path);
    				break;

    			case 'clip-path':
    				this.#element.style.setProperty('clipPath', `path('${path}')`);
    				break;

    			default:
    				throw new Error(`Метод обновления кривой не найден`);
    		}
    	}

    	#resetCurve() {
    		const mode = this.getCurrentMode();

    		switch (mode) {
    			case 'svg-layer':
    				// this.#svgLayer.removeAttribute('viewBox');
    				// const clipPathElem = this.#svgLayer.querySelector('clipPath path');
    				// if (clipPathElem) clipPathElem.removeAttribute('d');
    				break;

    			case 'clip-path':
    				this.#element.style.removeProperty('clipPath');
    				break;

    			default:
    				throw new Error(`Метод сброса кривой не найден`);
    		}
    	}
    	

    	/**
    	 * =============================================================
    	 * Styles
    	 * =============================================================
    	 */

    	#getTrackedStyleOriginal(prop) {
    		return this.#getTrackingProp('style')?.original?.[prop];
    	}

    	#getTrackedStyleCurrent(prop) {
    		return this.#getTrackingProp('style')?.current?.[prop];
    	}

    	#getResetStyles() {
    		return this.#resetStyles;
    	}

    	#initStyles() {
    		if (this.#hasTrackingProp('style')) return;

    		this.#captureStyles(true);
    	}

    	/**
    	 * styles.original.prop.computed
    	 * styles.original.prop.inline
    	 * styles.current.prop.computed
    	 * styles.current.prop.inline 
    	 */
    	#captureStyles(isOriginal = false) {
    		if (isOriginal) {
    			this.#setOriginalStyles( this.#getFormatCapturedProperties() );
    		}
    		this.#setCurrentStyles( this.#getFormatCapturedProperties() );
    	}

    	#setOriginalStyles(formatCapturedProperties) {
    		const tracking = this.#getTracking();
    		if (!tracking.style) tracking.style = {};
    		tracking.style.original = formatCapturedProperties;
    	}
    	#setCurrentStyles(formatCapturedProperties) {
    		const tracking = this.#getTracking();
    		if (!tracking.style) tracking.style = {};
    		tracking.style.current = formatCapturedProperties;
    	}

    	#getFormatCapturedProperties() {
    		return this.#formatCapturedProperties(
    			this.#getCaptureStyles(),
    			this.#getManagedProperties()
    		);
    	}

    	#formatCapturedProperties(captureStyles, managedProperties) {
    		const formatCapturedProperties = {};
    		for (const prop of managedProperties) {
    			formatCapturedProperties[prop] = this.#formatPropValue(
    				captureStyles.inline.getPropertyValue(prop),
    				captureStyles.computed.getPropertyValue(prop)
    			);
    		}
    		return formatCapturedProperties;
    	}

    	#formatPropValue(inlineValue, computedValue) {
    		return {
    			computed: computedValue,
    			inline:   inlineValue !== '' ? inlineValue   : null
    		}
    	}

    	#getCaptureStyles() {
    		return {
    			computed: this.#getCapturedComputedStyles(),
    			inline: this.#getCapturedInlineStyles()
    		}
    	}

    	#getCapturedComputedStyles() {
    		return getComputedStyle(this.#element);
    	}

    	#getCapturedInlineStyles() {
    		return this.#element.style;
    	}

    	// #applyStyles()

    	#applyCurrentElementStyles() {
    		const tracking = this.#getTrackingProp('style');
    		if (!tracking) return;

    		for (const prop of this.#getManagedProperties()) {
    			const value = this.#getTrackedStyleCurrent(prop)?.inline;
    			if (value !== null && value !== undefined) {
    				this.#element.style.setProperty(prop, value);
    			} else {
    				this.#element.style.removeProperty(prop);
    			}
    		}
    	}

    	#resetElementStyles() {
    		const tracking = this.#getTrackingProp('style');
    		if (!tracking) return;

    		for (const prop of this.#getManagedProperties()) {
    			const value = this.#getResetStyles()?.[prop];
    			if (value !== null && value !== undefined) {
    				this.#element.style.setProperty(prop, value);
    			}
    		}
    	}

    	#restoreElementStyles() {
    		this.#applyCurrentElementStyles();

    		// this.#unsetTrackingProp('style');
    	}

    	// #updateSvgLayerStyles() {
    	// 	if (!this.#svgLayer) return;

    	// 	for (const prop of this.#getManagedProperties()) {
    	// 		const value = this.#getTrackedStyleCurrent(prop)?.computed;
    	// 		this.#svgLayer.style.setProperty(prop, value);
    	// 	}
    	// }

    	/**
    	 * =============================================================
    	 * Tracking
    	 * =============================================================
    	 */

    	#hasTracking() {
    		return superellipseStyleTracking.has(this.#element)
    	}

    	#getTracking() {
    		let tracking = superellipseStyleTracking.get(this.#element);
    		if (!tracking) {
    			tracking = {};
    			superellipseStyleTracking.set(this.#element, tracking);
    		}
    		return tracking;
    	}

    	#hasTrackingProp(key) {
    		return !! this.#getTrackingProp(key);
    	}

    	#getTrackingProp(key) {
    		return this.#getTracking()[key];
    	}

    	#setTrackingProp(key, value) {
    		let tracking = this.#getTracking();
    		tracking[key] = value;
    	}

    	#unsetTrackingProp(key) {
    		const tracking = this.#getTracking();
    		delete tracking[key];
    	}

    	#unsetTracking() {
    		superellipseStyleTracking.delete(this.#element);
    	}

    	/**
    	 * =============================================================
    	 * Observers
    	 * =============================================================
    	 */

    	#setupObservers() {
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

    		if (this.#autoResize && typeof ResizeObserver !== 'undefined') {
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
    		if (this.#resizeObserver) this.#resizeObserver.disconnect();
    		if (this.#mutationObserver) this.#mutationObserver.disconnect();
    		if (this.#intersectionObserver) this.#intersectionObserver.disconnect();
    		if (this.#removalObserver) this.#removalObserver.disconnect();
    	}

    	

    	/**
    	 * =============================================================
    	 * Изменение при обновлениях
    	 * =============================================================
    	 */

    	#mutationHandler() {
    		console.log('#mutationHandler', this.#getCurrentBorderRadius(), this.#getTrackingProp('style')?.current);

    		this.#captureStyles();
    		this.#recalculatePath();

    		this.#applyModeStyles();
    		this.#applyCurve();
    	}

    	#resizeHandler() {
    		if (this.#getCapturedComputedStyles().display !== 'none') {

    			this.#captureSizes();
    			this.#recalculatePath();

    			this.#applyModeStyles();
    			this.#applyCurve();

    		} else {
    			this.#needsUpdate = true;
    		}
    	}

    	#intersectionHandler(entries) {
    		if (entries[0].isIntersecting && this.#needsUpdate) {
    			this.#needsUpdate = false;

    			this.#captureStyles();
    			this.#captureSizes();
    			this.#recalculatePath();

    			this.#applyModeStyles();
    			this.#applyCurve();
    		}
    	}

    	#destroyHandler() {
    		if (!document.body.contains(this.#element)) {
    			this.#destroyController();
    		}
    	}

    	/**
    	 * =============================================================
    	 * =============================================================
    	 */

    	/**
    	 * =============================================================
    	 * ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ
    	 * =============================================================
    	 */

    	#getManagedProperties() {
    		return Object.keys(this.#resetStyles);
    	}

    	// --- Геттеры и вспомогательные методы ---
    	#setCurrentMode(mode) { this.#mode = mode; }
    	getCurrentMode() { return this.#mode; }
    	#setModeStatus(bool) { this.#status = bool; }
    	#getModeStatus() { return this.#status; }

    	#deleteFromControllers() { jsse_controllers.delete(this.#element); }
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

    exports.SuperellipseController = SuperellipseController;
    exports.jsse_generateSuperellipsePath = jsse_generateSuperellipsePath;
    exports.superellipseInit = superellipseInit;

}));
//# sourceMappingURL=superellipse.js.map
