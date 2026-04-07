/**
 * 
 * @module sj-superellipse
 * @version 1.0.0
 * @author f4n70m
 * @license MIT
 * 
 * @description
 * Библиотека для применения суперэллипсов к произвольным DOM-элементам.
 * Позволяет плавно изменять форму углов от вогнутых прямоугольных (-2) до выгнутых прямоугольных (2),
 * проходя через скос (0), круглые углы (±G) и классический суперэллипс (1).
 * 
 * Особенности:
 * - Два режима работы: `clip-path` (легковесный) и `svg-layer` (полнофункциональный с поддержкой фонов, границ и теней).
 * - Автоматическое отслеживание изменений размеров, стилей, видимости и атрибутов элемента.
 * - Поддержка `border-radius`, `border`, `box-shadow`, `background` в режиме `svg-layer`.
 * - Несколько способов инициализации: через селектор, элемент, коллекцию или глобальную функцию.
 * - Умное кэширование стилей для минимизации перерисовок.
 * 
 * @typicalname superellipse
 * 
 * @example
 * // Инициализация элемента с режимом svg-layer (по умолчанию)
 * const element = document.querySelector('.my-element');
 * const controller = element.superellipseInit({
 *   curveFactor: 1.2,
 *   precision: 3
 * });
 * 
 * // Изменение коэффициента кривизны
 * controller.setCurveFactor(0.8);
 * 
 * // Переключение режима
 * controller.switchMode('clip-path');
 * 
 * // Инициализация всех элементов с классом .rounded
 * superellipseInit('.rounded', { mode: 'clip-path' });
 * 
 * @example
 * // Генерация только SVG-пути без привязки к DOM
 * import { jsse_generateSuperellipsePath } from 'js-superellipse';
 * const path = jsse_generateSuperellipsePath(200, 150, 20, 1.5);
 * document.querySelector('path').setAttribute('d', path);
 */

/**
 * Глобальная функция для инициализации суперэллипса на одном или нескольких элементах.
 * @function superellipseInit
 * @memberof module:js-superellipse
 * @param {string|Element|NodeList|Array<Element>} target - CSS-селектор, DOM-элемент или коллекция.
 * @param {Object} [options] - Опции инициализации.
 * @param {string} [options.mode='svg-layer'] - Режим: `'svg-layer'` (полная поддержка стилей) или `'clip-path'` (только обрезка).
 * @param {number} [options.curveFactor] - Коэффициент кривизны (от -2 до 2). По умолчанию `(4/3)*(√2-1) ≈ 0.5523`.
 * @param {number} [options.precision=2] - Количество знаков после запятой в координатах пути.
 * @param {boolean} [options.force=false] - Принудительное пересоздание контроллера, если элемент уже инициализирован.
 * @returns {SuperellipseController|Array<SuperellipseController>} Контроллер для одного элемента или массив контроллеров.
 * @throws {Error} Если target не является селектором, элементом или коллекцией.
 */

/**
 * Класс контроллера, управляющего жизненным циклом суперэллипса для конкретного элемента.
 * @class SuperellipseController
 * @memberof module:js-superellipse
 * @hideconstructor
 * @example
 * const controller = new SuperellipseController(element, options);
 * // или через фабрику: element.superellipseInit(options)
 */

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.Superellipse = {}));
})(this, (function (exports) { 'use strict';

    /**
     * @file src/global-cache.js
     * 
     * @module sj-superellipse/global-cache
     * @since 1.0.0
     * @author f4n70m
     * 
     * @description
     * Глобальные хранилища для кэширования данных между экземплярами контроллеров и режимов.
     * - `jsse_styles` (WeakMap) – кэш захваченных стилей для каждого элемента.
     * - `jsse_css` – хранилище глобально добавленных элементов `<style>` для режимов.
     * - `jsse_counter` – счётчик для генерации уникальных идентификаторов контроллеров.
     */


    /**
     * Карта для хранения контроллеров суперэллипса, связанных с DOM-элементами.
     * @type {WeakMap<Element, SuperellipseController>}
     */
    const jsse_controllers = new WeakMap(); // экспортируем


    /**
     * WeakMap для кэширования стилей элементов.
     * @type {WeakMap<Element, Object>}
     */
    const jsse_styles = new WeakMap();


    /**
     * Объект для хранения глобальных CSS-правил режимов.
     * @namespace jsse_css
     */
    const jsse_css = {
        _list: {},
        get(key) {
            return this._list[key];
        },
        set(key, el) {
            this._list[key] = el;
        },
        isset(key) {
            return this._list[key] !== undefined;
        }
    };

    /**
     * Счётчик для генерации уникальных идентификаторов контроллеров.
     * @namespace jsse_counter
     */
    const jsse_counter = {
    	_value: 0,
    	increment() { this._value++; },
    	decrement() { this._value--; },
    	get value() { return this._value; }
    };

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
            jsse_getD2FromL1D1L2(R, G, Lk1x);
            jsse_getD2FromL1D1L2(R, G, Lk1y);
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

    /**
     * @file src/support.js
     * 
     * @module sj-superellipse/support
     * @since 1.0.0
     * @author f4n70m
     * 
     * @description
     * Вспомогательные утилиты и инструменты отладки.
     * - `jsse_element_has_class` – проверка наличия класса у элемента.
     * - `jsse_debug` – объект для условного вывода отладочных сообщений в консоль.
     */


    /**
     * Объект для управления отладочным выводом.
     * @namespace jsse_debug
     */
    const jsse_debug = {
    	id : null,
    	// id : 1,
    	print : (debug, element, names, value = null) => {
    		if (debug) {
    			if (names.length > 0) {
    				for (var i = 0; i < names.length; i++) {
    					names[i] = `[${names[i]}]`;
    				}
    				names.join(' ');
    			}
    		}
    	}
    };

    /**
     * @file src/mode.js
     * 
     * @module sj-superellipse/mode
     * @since 1.0.0
     * @author f4n70m
     * 
     * @description
     * Базовый класс `SuperellipseMode`, от которого наследуются конкретные реализации режимов.
     * Содержит общую логику захвата стилей и размеров элемента, пересчёта SVG-пути суперэллипса,
     * применения/восстановления CSS-свойств (`clip-path`). Определяет защищённые методы, которые должны
     * быть переопределены в дочерних классах.
     * 
     * @example
     * class MyMode extends SuperellipseMode {
     *   _getActivatedStyles() { return { /* стили активации *\}; }
     *   _getModeName() { return 'my-mode'; }
     *   _appendVirtualElements() { /* реализация *\/ }
     *   _removeVirtualElements() { /* реализация *\/ }
     * }
     */


    /**
     * Базовый класс для реализации режимов суперэллипса.
     */
    class SuperellipseMode {

    	_element;

    	_isInitiated;
    	_isActivated;
    	_isDebug;

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


        /**
         * @param {Element} element - Целевой элемент.
         * @param {boolean} [debug=false] - Флаг отладки.
         */
    	constructor(element, debug = false) {

    		this._element = element;

    		this._isDebug = debug;
    		this._isActivated = false;

    		this._curveFactor = jsse_getBorderRadiusFactor();
    		this._precision = 2;

    		this._init();
    	}

        /**
         * Активирует режим.
         */
    	activate() {
    		if (this.isActivated()) return;
    		/** Актуализировать данные захвата **/
    		this._updateCaptured();
    		/** Установить статус **/
    		this._setStatus(true);
    		/** Создать виртуальные элементы **/
    		this._appendVirtualElements();
    		/** Подготовить обновление **/
    		this._prepareUpdate();
    		/** Выполнить обновление **/
    		this._executeUpdate();
    	}

        /**
         * Деактивирует режим.
         */
    	deactivate() {
    		if (!this.isActivated()) return;
    		/** Установить статус **/
    		this._setStatus(false);
    		/** Удалить элементы виртуальных слоев **/
    		this._removeVirtualElements();
    		/** Выполнить обновление **/
    		this._executeUpdate();
    	}

        /**
         * Полное обновление (стили, размер, путь).
         */
    	update() {
    		/** Актуализировать данные захвата **/
    		this._updateCaptured();
    		/** Подготовить обновление **/
    		this._prepareUpdate();
    		/** Выполнить обновление **/
    		this._executeUpdate();
    	}

        /**
         * Обновление только размеров.
         */
    	updateSize() {
    		/** Актуализировать размеры **/
    		this._updateCapturedSize();
    		/** Подготовить обновление **/
    		this._prepareUpdate();
    		/** Выполнить обновление **/
    		this._executeUpdate();

    	}

        /**
         * Обновление только стилей.
         */
    	updateStyles() {
    		/** Актуализировать стили **/
    		this._updateCapturedStyles();
    		/** Подготовить обновление **/
    		this._prepareUpdate();
    		/** Выполнить обновление **/
    		this._executeUpdate();
    	}

        /**
         * Обновление коэффициента кривизны.
         * @param {number} value
         */
    	updateCurveFactor(value) {
    		this.setCurveFactor(value);
    		/** Подготовить обновление **/
    		this._prepareUpdate();
    		/** Выполнить обновление **/
    		this._executeUpdate();
    	}

        /**
         * Обновление точности округления.
         * @param {number} value
         */
    	updatePrecision(value) {
    		this.setPrecision(value);
    		/** Подготовить обновление **/
    		this._prepareUpdate();
    		/** Выполнить обновление **/
    		this._executeUpdate();
    	}

        /**
         * Устанавливает коэффициент кривизны.
         * @param {number} value
         */
    	setCurveFactor(value) {
    		this._curveFactor = value;
    	}

        /**
         * Устанавливает точность округления.
         * @param {number} value
         */
    	setPrecision(value) {
    		this._precision = value;
    	}

        /**
         * Возвращает текущий SVG-путь.
         * @returns {string}
         */
    	getPath() {
    		return this._path;
    	}

        /**
         * Проверяет, активирован ли режим.
         * @returns {boolean}
         */
    	isActivated() {
    		return this._isActivated;
    	}

        /**
         * Уничтожает режим, удаляет все артефакты.
         */
    	destroy() {
    		this.deactivate();
    		this._removeModeAttr();
    	}


    	/**
    	 * =============================================================
    	 * PRIVATE
    	 * =============================================================
    	 */


        /**
         * Инициализация режима.
         * @private
         */
    	_init() {
    		this._id = Math.random().toString(36).slice(2, 10);
    		this._initStyles();
    		this._setModeAttr();
    		this._initSize();
    		this._initCurve();
    		this._isInitiated = true;
    	}

        /**
         * Устанавливает статус активации.
         * @param {boolean} status
         * @private
         */
    	_setStatus(status) {
    		this._isActivated = status;
    		if (status) {
    			this._setActivatedAttr();
    		} else {
    			this._removeActivatedAttr();
    		}
    	}

        /**
         * Захватывает актуальные стили и размеры.
         * @private
         */
    	_updateCaptured() {
    		this._updateCapturedStyles();
    		this._updateCapturedSize();
    	}

        /**
         * Подготавливает обновление (пересчёт кривой).
         * @private
         */
    	_prepareUpdate() {
    		this._recalculateCurve();
    	}

        /**
         * Выполняет обновление (применяет кривую).
         * @private
         */
    	_executeUpdate() {
    		this._applyCurrentCurve();
    	}

        /**
         * Возвращает имя режима.
         * @returns {string}
         * @protected
         */
    	_getModeName() {
    		return 'clip-path';
    	}

        /**
         * Возвращает карту стилей, которые нужно временно применить для корректного чтения.
         * @returns {Object<string, string>}
         * @protected
         */
    	_getReadingStyles() {
    		return {
    			'transition': 'unset'
    		};
    	}

        /**
         * Возвращает карту стилей, применяемых при активации режима.
         * @returns {Object<string, string>}
         * @protected
         */
    	_getActivatedStyles() {
    		return {
    			'border-radius': '0px'
    		};
    	}


    	/**
    	 * =============================================================
    	 * VIRTUAL
    	 * =============================================================
    	 */


        /**
         * Создаёт виртуальные элементы (если нужно).
         * @protected
         */
    	_appendVirtualElements() {}

        /**
         * Удаляет виртуальные элементы.
         * @protected
         */
    	_removeVirtualElements() {}


    	/**
    	 * =============================================================
    	 * ATTRIBUTES
    	 * =============================================================
    	 */


        /**
         * Устанавливает атрибут `data-jsse-mode`.
         * @protected
         */
    	_setModeAttr() {
    		this._element.setAttribute('data-jsse-mode', this._getModeName());
    	}

        /**
         * Удаляет атрибут `data-jsse-mode`.
         * @protected
         */
    	_removeModeAttr() {
    		this._element.removeAttribute('data-jsse-mode');
    	}

        /**
         * Устанавливает атрибут `data-jsse-activated`.
         * @protected
         */
    	_setActivatedAttr() {
    		this._element.setAttribute('data-jsse-activated', true);
    	}

        /**
         * Удаляет атрибут `data-jsse-activated`.
         * @protected
         */
    	_removeActivatedAttr() {
    		this._element.removeAttribute('data-jsse-activated');
    	}

        /**
         * Устанавливает атрибут `data-jsse-reading`.
         * @protected
         */
    	_setReadingAttr() {
    		this._element.setAttribute('data-jsse-reading', true);
    	}

        /**
         * Удаляет атрибут `data-jsse-reading`.
         * @protected
         */
    	_removeReadingAttr() {
    		this._element.removeAttribute('data-jsse-reading');
    	}


    	/**
    	 * =============================================================
    	 * CSS
    	 * =============================================================
    	 */


        /**
         * Инициализирует глобальные CSS-правила для режима.
         * @protected
         */
    	_initResetStyles() {
    		const modeName = this._getModeName();
    		if (jsse_css.isset(modeName)) return;

    		let cssString = '';

    		const activatedStyles = this._getActivatedStyles();
    		cssString += `[data-jsse-mode="${modeName}"][data-jsse-activated=true]{`;
    		for (const prop in activatedStyles) {
    			if (activatedStyles[prop] === '') continue;
    			cssString += `\n\t${prop}: ${activatedStyles[prop]};`;
    		}
    		cssString += `\n}`;

    		cssString += `\n`;

    		const readingStyles = this._getReadingStyles();
    		cssString += `[data-jsse-mode="${modeName}"][data-jsse-reading=true]{`;
    		for (const prop in readingStyles) {
    			if (readingStyles[prop] === '') continue;
    			cssString += `\n\t${prop}: ${readingStyles[prop]};`;
    		}
    		cssString += `\n}`;

    		this._initModeCssStyleElement(modeName, cssString);
    	}

        /**
         * Создаёт элемент `<style>` для режима.
         * @param {string} modeName
         * @param {string} textContent
         * @protected
         */
    	_initModeCssStyleElement(modeName, textContent) {
    		/** Создать элемент <style> **/
    		const styleElement = document.createElement('style');
    		styleElement.setAttribute('id', `jsse__css_${modeName}`);
    		/** Заполнить элемент CSS-правилами **/
    		styleElement.textContent = textContent;
    		/** Сохранить глобально **/
    		jsse_css.set(modeName, styleElement);
    		/** Добавить элемент в конец <body> **/
    		this._appendModeCssStyleElement(styleElement);
    	}

    	/**
    	 * 
    	 * TODO: доработать _appendModeCssStyleElement()
    	 * 
    	 */
    	_appendModeCssStyleElement(styleElement) {
    		document.body.appendChild(styleElement);
    	}

    	/**
    	 * 
    	 * TODO: реализовать _removeModeCssStyleElement()
    	 * 
    	 */
    	_removeModeCssStyleElement(styleElement) {}


    	/**
    	 * =============================================================
    	 * STYLES
    	 * =============================================================
    	 */


        /**
         * Обновляет захваченные стили.
         * @protected
         */
    	_updateCapturedStyles() {
    		jsse_debug.print(this._isDebug, this._element, ['MODE', 'CAPTURE']);

    		const capturedComputedStyles = this._getCapturedStyles();
    		/** Сохранить computed-стили **/
    		this._styles.computed = capturedComputedStyles;
    	}

        /**
         * Получает вычисленные стили с временным снятием атрибута активации.
         * @param {boolean} [clear=true] - Снимать ли атрибут активации перед чтением.
         * @returns {Object<string, string>}
         * @protected
         */
    	_getCapturedStyles(clear = true) {
    		const hasAttribute = this._element.hasAttribute('data-jsse-activated');

    		if (hasAttribute && clear) {
    			this._removeActivatedAttr();
    		}
    		this._setReadingAttr();

    		const result = this._getManagedComputedStyle();

    		if (hasAttribute && clear) {
    			this._setActivatedAttr();
    		}
    		this._removeReadingAttr();
    		return result;
    	}

        /**
         * Получает вычисленные стили для управляемых свойств.
         * @returns {Object<string, string>}
         * @protected
         */
    	_getManagedComputedStyle() {
    		const result = {};
    		const capturedStyles = getComputedStyle(this._element);
    		for (const prop of this._getManagedProperties()) {
    			result[prop] = capturedStyles.getPropertyValue(prop);
    		}
    		return result;
    	}

        /**
         * Возвращает значение захваченного вычисленного свойства.
         * @param {string} prop
         * @returns {string}
         * @protected
         */
    	_getComputedProp(prop) {
    		if ('computed' in this._styles && prop in this._styles.computed)
    			return this._styles.computed[prop];
    	}


        /**
         * 
         * TODO: _dropStyles()
         * 
         * Сбрасывает захваченные стили.
         * @protected
         */
    	_dropStyles() {
    		this._styles.computed = {};	// вычисленные значения элемента
    	}

        /**
         * Возвращает массив свойств CSS, управляемых режимом.
         * @returns {string[]}
         * @protected
         */
    	_getManagedProperties() {
    		return Object.keys(this._getActivatedStyles());
    	}


    	/**
    	 * =============================================================
    	 * CACHE
    	 * =============================================================
    	 */

        /**
         * Инициализирует хранилище стилей.
         * @protected
         */
    	_initStyles() {
    		this._styles = jsse_styles.get(this._element);
    		this._initResetStyles();
    	}

    	/**
    	 * =============================================================
    	 * SIZE
    	 * =============================================================
    	 */


        /**
         * Инициализирует размеры.
         * @protected
         */
    	_initSize() {
    		this._updateCapturedSize();
    	}

        /**
         * Обновляет захваченные размеры.
         * @protected
         */
    	_updateCapturedSize() {
    		const rect = this._element.getBoundingClientRect();

    		this._size.width = rect.width;
    		this._size.height = rect.height;
    	}


    	/**
    	 * =============================================================
    	 * CURVE
    	 * =============================================================
    	 */


        /**
         * Инициализирует кривую.
         * @protected
         */
    	_initCurve() {
    		this._initInlinePath();
    	}

        /**
         * Сохраняет исходный `clip-path`.
         * @protected
         */
    	_initInlinePath() {
    		this._resetPath = this._element.style.getPropertyValue('clip-path');
    	}

        /**
         * Пересчитывает путь на основе текущих размеров и радиуса.
         * @protected
         */
    	_recalculateCurve() {
    		this._recalculatePath();
    	}

        /**
         * Генерирует SVG-путь.
         * @protected
         */
    	_recalculatePath() {
    		if ( !( this._size.width > 0 && this._size.height > 0 ) ) {
    			this._path = 'none'; // Сбрасываем путь
    			return;
    		}

    		const radiusValue = this._getComputedProp('border-radius');
    		const radiusNumber = radiusValue ? parseFloat(radiusValue) : 0;

    		this._path  = jsse_generateSuperellipsePath(
    			this._size.width,
    			this._size.height,
    			radiusNumber,
    			this._curveFactor,
    			this._precision
    		);
    	}

        /**
         * Применяет текущий путь (если активирован) или восстанавливает исходный.
         * @protected
         */
    	_applyCurrentCurve() {
    		if (this.isActivated()) {
    			this._applyCurve();
    		} else {
    			this._restoreCurve();
    		}
    	}

        /**
         * Применяет суперэллипс через `clip-path`.
         * @protected
         */
    	_applyCurve() {
    		if (this._path && this._path !== 'none') {
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

        /**
         * Восстанавливает исходный `clip-path`.
         * @protected
         */
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

    /**
     * @file src/mode-svg-layer.js
     * 
     * @module sj-superellipse/mode-svg-layer
     * @since 1.0.0
     * @author f4n70m
     * 
     * @description
     * Режим `svg-layer` – полнофункциональный режим, создающий наложенный SVG-слой для отрисовки
     * суперэллипса. Позволяет корректно отображать `background`, `border`, `box-shadow` элемента.
     * Переносит дочернее содержимое во внутренний div-контейнер, а поверх него размещает SVG,
     * который повторяет геометрию суперэллипса с возможностью применения градиентов, теней и
     * произвольных стилей обводки.
     * 
     * @extends SuperellipseMode
     * @example
     * const mode = new SuperellipseModeSvgLayer(element);
     * mode.activate();
     */



    /**
     * Режим, создающий наложенный SVG-слой для отрисовки фона, границ и теней.
     * @extends SuperellipseMode
     */
    class SuperellipseModeSvgLayer extends SuperellipseMode {

    	_virtualElementList = {};

    	_viewbox;


    	/**
    	 * =============================================================
    	 * PUBLIC
    	 * =============================================================
    	 */


        /**
         * @param {Element} element - Целевой элемент.
         * @param {boolean} [debug=false] - Флаг отладки.
         */
    	constructor(element, debug = false) {
    		super(element, debug);

    		this._initViewbox();
    		this._initVirtualElementList();
    	}


    	/**
    	 * =============================================================
    	 * PRIVATE
    	 * =============================================================
    	 */


        /**
         * Выполняет обновление: применяет стили к слою div и обновляет путь.
         * @override
         * @protected
         */
    	_executeUpdate() {
    		this._applyCurrentInlineVirtualSvgLayerStyles();
    		this._applyCurrentCurve();
    	}

        /**
         * Возвращает имя режима ('svg-layer').
         * @override
         * @protected
         * @returns {string}
         */
    	_getModeName() {
    		return 'svg-layer';
    	}

        /**
         * Возвращает стили, применяемые к основному элементу при активации.
         * @override
         * @protected
         * @returns {Object<string, string>}
         */
    	_getActivatedStyles() {
    		return {
    			'background': 'none',
    			'border-color': 'transparent',
    			'border-width': '0px',
    			'border-style': 'none',
    			// 'border': 'unset',
    			'border-radius': '0px',
    			'box-shadow': 'unset',
    			'position': 'relative',
    		};
    	}

        /**
         * Возвращает стили для SVG-контейнера.
         * @protected
         * @returns {Object<string, string>}
         */
    	_getSvgLayerStyles() {
    		return {
    			'position': 'absolute',
    			'top': '0px',
    			'left': '0px',
    			'width': '100%',
    			'height': '100%',
    			'pointer-events': 'none'
    		};
    	}

        /**
         * Возвращает список CSS-свойств, которые переносятся во внутренний div.
         * @protected
         * @returns {string[]}
         */
    	_getSvgLayerDivProps() {
    		return [
    			// 'color',
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


        /**
         * Применяет инлайновые стили к указанному элементу.
         * @param {Object<string, string>} props - Объект стилей.
         * @param {HTMLElement|SVGElement} element - Целевой элемент.
         * @protected
         */
    	_applyInlineStyles(props, element) {
    		const managedProperties = this._getManagedProperties();
    		for(const prop of managedProperties) {
    			const inlineValue = props[prop];
    			const currentValue = element.style.getPropertyValue(prop);
    			if (inlineValue !== undefined) {
    				if (currentValue !== inlineValue) {
    					element.style.setProperty(prop, inlineValue);
    				}
    			} else {
    				if (currentValue !== '') {
    					element.style.removeProperty(prop);
    				}
    			}
    		}
    	}

    	/**
    	 * 
    	 * TODO: _applyCurrentInlineVirtualSvgLayerStyles()
    	 * 
    	 */
    	_applyCurrentInlineVirtualSvgLayerStyles() {
    		if ( this.isActivated() ) {
    			this._applyCurrentInlineVirtualSvgLayerDivStyles();
    			this._applyCurrentInlineVirtualSvgLayerBorderStyles();
    			this._applyCurrentInlineVirtualSvgLayerShadowsStyles();
    		}
    	}


        /**
         * Применяет стили к виртуальному div-слою.
         * @protected
         */
    	_applyCurrentInlineVirtualSvgLayerDivStyles() {
    		const inlineSvgLayerDivStyles = this._getCurrentInlineVirtualSvgLayerDivStyles();
    		const svgLayerDiv = this._virtualElementList.svgLayerDiv;
    		this._applyInlineStyles(inlineSvgLayerDivStyles, svgLayerDiv);
    	}

        /**
         * Возвращает стили для внутреннего div-слоя, извлечённые из вычисленных стилей элемента.
         * @protected
         * @returns {Object<string, string>}
         */
    	_getCurrentInlineVirtualSvgLayerDivStyles() {
    		jsse_debug.print(this._isDebug, this._element, ['_getCurrentInlineVirtualSvgLayerDivStyles']);
    		const result = {};
    		const svgLayerDivProps = this._getSvgLayerDivProps();
    		for (const prop of svgLayerDivProps) {
    			const value = this._getComputedProp(prop);
    			if (value !== undefined) {
    				result[prop] = value;
    			}
    		}
    		return result;
    	}

        /**
         * Применяет стили границы (цвет, толщину, стиль) к SVG-элементу `border`.
         * @protected
         */
    	_applyCurrentInlineVirtualSvgLayerBorderStyles() {
    		const svgLayerBorder = this._virtualElementList.svgLayerBorder;
    		const borderColor = this._getComputedProp('border-color');
    		svgLayerBorder.setAttribute('stroke', borderColor);
    		const borderWidth = this._getComputedProp('border-width');
    		const borderWidthNumber = borderWidth ? (parseFloat(borderWidth) * 2) : 0;
    		svgLayerBorder.setAttribute('stroke-width', borderWidthNumber);
    		const borderStyle = this._getComputedProp('border-style');
    		this._applyBorderStyleToStroke(borderStyle, svgLayerBorder);
    	}

        /**
         * Преобразует CSS-стиль границы в атрибуты SVG-элемента.
         * @param {string} borderStyle - Стиль границы (solid, dotted, dashed и т.д.).
         * @param {SVGElement} pathElement - Элемент, к которому применяется обводка.
         * @protected
         */
    	_applyBorderStyleToStroke(borderStyle, pathElement) {
    		/** Сброс атрибутов **/
    		pathElement.removeAttribute('stroke-dasharray');
    		pathElement.removeAttribute('stroke-linecap');
    		pathElement.removeAttribute('stroke-linejoin');
    		
    		switch(borderStyle) {
    			case 'solid':
    				/** Сплошная линия (значения по умолчанию) **/
    				break;
    				
    			case 'dotted':
    				pathElement.setAttribute('stroke-dasharray', '0, 8');
    				pathElement.setAttribute('stroke-linecap', 'round');
    				break;
    				
    			case 'dashed':
    				pathElement.setAttribute('stroke-dasharray', '10, 6');
    				break;
    				
    			case 'double':
    				/** Для double нужно два отдельных пути или фильтр **/
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
    				/** Имитация inset через полупрозрачность **/
    				pathElement.setAttribute('stroke-opacity', '0.7');
    				break;
    				
    			case 'outset':
    				pathElement.setAttribute('stroke-opacity', '0.5');
    				break;
    				
    			case 'dash-dot':
    				/** Кастомный стиль **/
    				pathElement.setAttribute('stroke-dasharray', '15, 5, 5, 5');
    				break;
    				
    			case 'dash-dot-dot':
    				/** Кастомный стиль **/
    				pathElement.setAttribute('stroke-dasharray', '15, 5, 5, 5, 5, 5');
    				break;
    		}
    	}

        /**
         * Применяет тени (`box-shadow`) к SVG-слою, создавая фильтры.
         * @protected
         */
    	_applyCurrentInlineVirtualSvgLayerShadowsStyles() {
    		const boxShadowValue = this._getComputedProp('box-shadow');
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

        /**
         * Разбирает значение `box-shadow` на массив объектов теней.
         * @param {string} boxShadowValue - Строка свойства `box-shadow`.
         * @returns {Array<Object>} Массив теней с полями: inset, color, offsetX, offsetY, blurRadius, spreadRadius.
         * @protected
         */
    	_parseBoxShadow(boxShadowValue) {
    	    if (!boxShadowValue || boxShadowValue === 'none') return [];
    	    
    	    /** Разделяем тени **/
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
    	        /** Парсим одну тень **/
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
    	        
    	        /** Проверяем inset **/
    	        const insetIndex = parts.indexOf('inset');
    	        if (insetIndex !== -1) {
    	            result.inset = true;
    	            parts.splice(insetIndex, 1);
    	        }
    	        
    	        /** Цвет всегда будет в формате rgb/rgba после getComputedStyle **/
    	        const colorPart = parts.find(p => p.startsWith('rgb'));
    	        if (colorPart) {
    	            result.color = colorPart;
    	            result.originalColorFormat = colorPart;
    	            parts.splice(parts.indexOf(colorPart), 1);
    	        }
    	        
    	        /** Парсим числовые значения **/
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


        /**
         * Инициализирует список виртуальных элементов (div, svg и пр.).
         * @protected
         */
    	_initVirtualElementList() {
    		this._initVirtualInnerWrapper();
    		this._initVirtualSvgLayer();
    	}

        /**
         * Создаёт SVG-элементы для слоя.
         * @protected
         */
    	_initVirtualSvgLayer() {
    		if (this._virtualElementList.svgLayer) return;

    		const id = this._id;
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
    		const svgProps = this._getSvgLayerStyles();
    		for (const prop in svgProps) {
    			svg.style.setProperty(prop, svgProps[prop]);
    		}
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

        /**
         * Создаёт внутренний div-обёртку для контента.
         * @protected
         */
    	_initVirtualInnerWrapper() {
    		if (this._virtualElementList.innerWrapper) return;

    		const innerWrapper = document.createElement('div');
    		innerWrapper.className = 'jsse--svg-layer--content';
    		innerWrapper.style.setProperty('position', 'relative');

    		this._virtualElementList.innerWrapper = innerWrapper;
    	}

        /**
         * Добавляет виртуальные элементы в DOM.
         * @override
         * @protected
         */
    	_appendVirtualElements() {
    		this._appendInnerWrapper();
    		this._appendSvgLayer();
    	}

        /**
         * Удаляет виртуальные элементы из DOM.
         * @override
         * @protected
         */
    	_removeVirtualElements() {
    		this._removeSvgLayer();
    		this._removeInnerWrapper();
    	}

        /**
         * Добавляет SVG-слой в начало элемента.
         * @protected
         */
    	_appendSvgLayer() {
    		const svgLayer = this._virtualElementList.svgLayer;
    		// TODO: нужна ли проверка на наличие svgLayer у this._element?
    		this._element.insertBefore(svgLayer, this._element.firstChild);
    	}

        /**
         * Удаляет SVG-слой.
         * @protected
         */
    	_removeSvgLayer() {
    		const svgLayer = this._virtualElementList.svgLayer;
    		if (svgLayer && svgLayer.parentNode === this._element) {
    			this._element.removeChild(svgLayer);
    		}
    	}

        /**
         * Перемещает дочерние элементы элемента во внутреннюю обёртку.
         * @protected
         */
    	_appendInnerWrapper() {
    		const innerWrapper = this._virtualElementList.innerWrapper;

    		/** Перемещаем внутренние элемены this._element в innerWrapper **/
    		const children = Array.from(this._element.childNodes);
    		for (const child of children) {
    			innerWrapper.appendChild(child);
    		}

    		this._element.appendChild(innerWrapper);
    	}

        /**
         * Возвращает дочерние элементы из обёртки обратно в элемент.
         * @protected
         */
    	_removeInnerWrapper() {
    		const innerWrapper = this._virtualElementList.innerWrapper;

    		/** Перемещаем внутренние элемены innerWrapper в this._element **/
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


        /**
         * Инициализирует viewBox.
         * @protected
         */
    	_initViewbox() {
    		this._recalculateViewbox();
    	}

        /**
         * Пересчитывает viewBox при изменении размеров.
         * @override
         * @protected
         */
    	_recalculateCurve() {
    		super._recalculateCurve();

    		this._recalculateViewbox();
    	}

        /**
         * Обновляет viewBox на основе текущих размеров.
         * @protected
         */
    	_recalculateViewbox() {
    		if ( this._size.width > 0 && this._size.height > 0 ) {
    			this._viewbox = `0 0 ${this._size.width} ${this._size.height}`;
    		} else {
    			this._viewbox = '0 0 0 0'; // Сбрасываем путь
    		}
    	}

        /**
         * Возвращает строку viewBox.
         * @protected
         * @returns {string}
         */
    	_getViewbox() {
    		return this._viewbox;
    	}

        /**
         * Применяет кривую, обновляя viewBox и d-атрибут пути.
         * @override
         * @protected
         */
    	_applyCurve() {
    		const svgLayer = this._virtualElementList.svgLayer;
    		svgLayer.setAttribute('viewBox', this._getViewbox());

    		const svgLayerPath = this._virtualElementList.svgLayerPath;
    		if (this._path) {
    			svgLayerPath.setAttribute('d', this._path);
    		} else {
    			svgLayerPath.setAttribute('d', '');
    		}
    	}

        /**
         * Восстанавливает исходный путь и очищает d-атрибут.
         * @override
         * @protected
         */
    	_restoreCurve() {
    		const svgLayerPath = this._virtualElementList.svgLayerPath;

    		svgLayerPath.setAttribute('d', '');

    		super._restoreCurve();
    	}


    	/**
    	 * =============================================================
    	 * 
    	 * =============================================================
    	 */
    }

    /**
     * @file src/mode-clip-path.js
     * 
     * @module sj-superellipse/mode-clip-path
     * @since 1.0.0
     * @author f4n70m
     * 
     * @description
     * Режим `clip-path` – самый лёгкий способ применения суперэллипса. Использует CSS-свойство `clip-path`
     * для обрезки элемента по форме суперэллипса. Не требует создания дополнительных DOM-узлов,
     * но не поддерживает корректное отображение теней (`box-shadow`), границ и сложных фонов.
     * 
     * @extends SuperellipseMode
     * @example
     * const mode = new SuperellipseModeClipPath(element);
     * mode.activate();
     */



    /**
     * Режим, использующий CSS-свойство `clip-path`.
     * @extends SuperellipseMode
     */
    class SuperellipseModeClipPath extends SuperellipseMode {


    	/**
    	 * =============================================================
    	 * PUBLIC
    	 * =============================================================
    	 */

        /**
         * @param {Element} element - Целевой элемент.
         * @param {boolean} [debug=false] - Флаг отладки.
         */
    	constructor(element, debug = false) {
    		super(element, debug);
    	}


    	/**
    	 * =============================================================
    	 * 
    	 * =============================================================
    	 */
    }

    /**
     * @file src/controller.js
     * 
     * @module sj-superellipse/controller
     * @since 1.0.0
     * @author f4n70m
     * 
     * @description
     * Класс `SuperellipseController` – основной контроллер, связывающий DOM-элемент с выбранным режимом
     * (`svg-layer` или `clip-path`). Отслеживает изменения размеров, стилей, атрибутов и удаление элемента
     * через `ResizeObserver`, `MutationObserver`, `IntersectionObserver`. Управляет кэшированием стилей,
     * переключением режимов, активацией/деактивацией эффекта.
     * 
     * @example
     * const controller = new SuperellipseController(element, { mode: 'svg-layer' });
     * controller.setCurveFactor(0.9);
     * controller.enable();
     */



    /**
     * Контроллер, управляющий применением суперэллипса к DOM-элементу.
     */
    class SuperellipseController
    {
    	#id;
    	#debug;

    	#mode;
    	#element;

    	#precision; // Количество знаков после запятой
    	#curveFactor;

    	#mutationFrame;
    	#resizeFrame;
    	#intersectionFrame;
    	

    	#prepareTimer;
    	#executeTimer;
    	#isSelfMutation = false;

    	#resizeObserver;
    	#mutationObserver;
    	#removalObserver;
    	#intersectionObserver;

    	#needsUpdate;
    	#isSelfApply;


    	/**
    	 * =============================================================
    	 * PUBLIC
    	 * =============================================================
    	 */


        /**
         * Создаёт экземпляр контроллера.
         * @param {Element} element - Целевой DOM-элемент.
         * @param {Object} [options] - Опции инициализации.
         * @param {boolean} [options.force] - Принудительное пересоздание.
         * @param {string} [options.mode='svg-layer'] - Режим работы.
         * @param {number} [options.curveFactor] - Коэффициент кривизны.
         * @param {number} [options.precision=2] - Точность округления.
         */
    	constructor(element, options = {}) {

    		this.#initId();
    		this.#initDebug();
    		
    		/** Проверка существующего контроллера **/
    		if (this.#inControllers() && !options.force) {
    			console.warn('[Superellipse] Элемент уже инициализирован. Используйте force: true для пересоздания');
    			return this.#getController();
    		}

    		options = {
    			mode: 'svg-layer',
    			...options
    		};
    		this.#element = element;
    		this.#curveFactor = options.curveFactor ?? jsse_getBorderRadiusFactor();
    		this.#precision = options.precision ?? 2;

    		this.#needsUpdate = false;
    		this.#isSelfApply = false;

    		/** Слушатели **/
    		this.#resizeObserver = null;
    		this.#mutationObserver = null;
    		this.#removalObserver = null;
    		this.#intersectionObserver = null;

    		/** init **/
    		this.#initCacheStyles();
    		this.#setInitiatedAttr();
    		
    		this.#setMode(options.mode);
    		this.#connectObservers();
    	}

        /**
         * Переключает режим работы.
         * @param {string} modeName - Имя режима ('svg-layer' или 'clip-path').
         * @returns {SuperellipseController} this (для цепочек).
         */
    	switchMode(modeName) {
    		this.#unsetMode();
    		this.#setMode(modeName);
    		return this;
    	}

        /**
         * Проверяет, активирован ли суперэллипс.
         * @returns {boolean} true, если активирован.
         */
    	isEnabled() {
    		return this.#mode.isActivated();
    	}

        /**
         * Активирует суперэллипс.
         * @returns {SuperellipseController} this.
         */
    	enable() {
    		this.#mode.activate();
    		return this;
    	}

        /**
         * Деактивирует суперэллипс, восстанавливая исходные стили.
         * @returns {Element} Целевой элемент.
         */
    	disable() {
    		this.#mode.deactivate();
    		return this.#element;
    	}

        /**
         * Устанавливает коэффициент кривизны углов.
         * @param {number} value - Новое значение (диапазон -2..2).
         * @returns {SuperellipseController} this.
         */
    	setCurveFactor(value) {
    		this.#curveFactor = value;
    		this.#mode.updateCurveFactor(value);
    		return this;
    	}

        /**
         * Устанавливает точность округления координат пути.
         * @param {number} value - Количество знаков после запятой.
         * @returns {SuperellipseController} this.
         */
    	setPrecision(value) {
    		this.#precision = value;
    		this.#mode.updatePrecision(value);
    		return this;
    	}

        /**
         * Возвращает текущий SVG-путь суперэллипса.
         * @returns {string} Строка с командами path.
         */
    	getPath() {
    		return this.#mode.getPath();
    	}

        /**
         * Полностью уничтожает контроллер и удаляет все связанные эффекты.
         * @returns {Element} Целевой элемент.
         */
    	destroy() {
    		return this.#destroyController();
    	}


    	/**
    	 * =============================================================
    	 * PRIVATE
    	 * =============================================================
    	 */


        /**
         * Инициализирует уникальный идентификатор контроллера.
         * @private
         */
    	#initId() {
    		this.#id = jsse_counter.value;
    		jsse_counter.increment();
    	}

        /**
         * Инициализирует флаг отладки.
         * @private
         */
    	#initDebug() {
    		this.#debug = (jsse_debug.id === null );
    	}

        /**
         * Проверяет, включён ли режим отладки для данного контроллера.
         * @returns {boolean}
         * @private
         */
    	#isDebug() {
    		return this.#debug;
    	}

        /**
         * Проверяет, не скрыт ли элемент (`display: none`).
         * @returns {boolean}
         * @private
         */
    	#isDisplay() {
    		const capturedStyles = getComputedStyle(this.#element);
    		return capturedStyles.getPropertyValue('display') !== 'none';
    	}


    	/**
    	 * Метод полного уничтожения контроллера (внутренняя логика).
         * @private
         */
    	#destroyController() {
    		this.#disconnectObservers();
    		this.#unsetMode();
    		this.#removeInitiatedAttr();

    		this.#deleteCacheStyles();
    		this.#deleteFromControllers();
    	}


    	/**
    	 * =============================================================
    	 * ATTRIBUTES
    	 * =============================================================
    	 */


        /**
         * Присваивает элементу атрибут `data-jsse-initiated`.
         * @private
         */
    	#setInitiatedAttr() {
    		this.#element.setAttribute('data-jsse-initiated', true);
    	}

        /**
         * Удаляет атрибут `data-jsse-initiated`.
         * @private
         */
    	#removeInitiatedAttr() {
    		this.#element.removeAttribute('data-jsse-initiated');
    	}


    	/**
    	 * =============================================================
    	 * CACHE
    	 * =============================================================
    	 */


        /**
         * Инициализирует кэш стилей для элемента.
         * @private
         */
    	#initCacheStyles() {
    		if (!jsse_styles.get(this.#element)) {
    			jsse_styles.set(this.#element, {});
    		}
    	}

        /**
         * Удаляет кэш стилей элемента.
         * @private
         */
    	#deleteCacheStyles() {
    		jsse_styles.delete(this.#element);
    	}

        /**
         * Получает контроллер (если есть)
         * @private
         */
    	#getController() {
    		return jsse_controllers.get(this.#element);
    	}

        /**
         * Проверяет существует ли контроллер
         * @private
         */
    	#inControllers() {
    		return !!this.#getController();
    	}

        /**
         * Удаляет ссылку на контроллер из глобальной WeakMap.
         * @private
         */
    	#deleteFromControllers() {
    		jsse_controllers.delete(this.#element);
    	}


    	/**
    	 * =============================================================
    	 * MODE
    	 * =============================================================
    	 */


        /**
         * Устанавливает активный режим.
         * @param {string} modeName - Имя режима.
         * @private
         */
    	#setMode(modeName) {
    		switch (modeName) {
    			case 'svg-layer':
    				this.#mode = new SuperellipseModeSvgLayer(this.#element, this.#isDebug());
    				break;

    			case 'clip-path':
    			default:
    				this.#mode = new SuperellipseModeClipPath(this.#element, this.#isDebug());
    				break;
    		}
    		this.#mode.setCurveFactor(this.#curveFactor);
    		this.#mode.setPrecision(this.#precision);

    		this.#mode.activate();
    	}

        /**
         * Удаляет текущий режим, вызывая его деструктор.
         * @private
         */
    	#unsetMode() {
    		this.#mode.destroy();
    		this.#mode = null;
    	}


    	/**
    	 * =============================================================
    	 * OBSERVERS
    	 * =============================================================
    	 */

        /**
         * Подключает наблюдатели (MutationObserver, ResizeObserver, IntersectionObserver и пр.).
         * @private
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

        /**
         * Отключает всех наблюдателей.
         * @private
         */
    	#disconnectObservers() {
    		if (this.#prepareTimer) clearTimeout(this.#prepareTimer);
    		if (this.#executeTimer) clearTimeout(this.#executeTimer);

    		if (this.#resizeObserver) this.#resizeObserver.disconnect();
    		if (this.#mutationObserver) this.#mutationObserver.disconnect();
    		if (this.#intersectionObserver) this.#intersectionObserver.disconnect();
    		if (this.#removalObserver) this.#removalObserver.disconnect();
    	}

        /**
         * Обработчик мутаций атрибутов/классов.
         * @private
         */
    	#mutationHandler() {
    		jsse_debug.print(this.#isDebug(), this.#element, ['MUTATION', 'DETECT', this.#isSelfMutation ? 'self' : 'flow']);
    		if (this.#isSelfMutation)
    			return;
    		if (this.#prepareTimer !== null) {
    			clearTimeout(this.#prepareTimer);
    		}
    		this.#prepareTimer = setTimeout(() => {
    			this.#prepareTimer = null;
    			jsse_debug.print(this.#isDebug(), this.#element, ['MUTATION', 'START']);
    			this.#isSelfMutation = true;
    			try {
    				jsse_debug.print(this.#isDebug(), this.#element, ['MUTATION', 'UPDATE']);
    				if (this.#isDisplay() && this.#needsUpdate) {
    					this.#mode.update();
    					this.#needsUpdate = false;
    				} else {
    					this.#mode.updateStyles();
    				}
    			} finally {
    				if (this.#executeTimer !== null) {
    					clearTimeout(this.#executeTimer);
    				}
    				this.#executeTimer = setTimeout(() => {
    					this.#executeTimer = null;
    					jsse_debug.print(this.#isDebug(), this.#element, ['MUTATION', 'END']);
    					this.#isSelfMutation = false;

    				}, 0);
    			}
    		}, 0);
    	}

        /**
         * Обработчик изменения размеров.
         * @private
         */
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

        /**
         * Обработчик видимости элемента (IntersectionObserver).
         * @param {IntersectionObserverEntry[]} entries - Записи пересечений.
         * @private
         */
    	#intersectionHandler(entries) {
    		if (entries[0].isIntersecting && this.#needsUpdate) {
    			try {
    				this.#mode.update();
    				this.#needsUpdate = false;
    			} finally {
    			}
    		}
    	}

        /**
         * Обработчик удаления элемента из DOM.
         * @private
         */
    	#destroyHandler() {
    		if (!document.body.contains(this.#element)) {
    			this.#destroyController();
    		}
    	}
    }

    /**
     * @file src/api.js
     * 
     * @module sj-superellipse/api
     * @since 1.0.0
     * @author f4n70m
     * 
     * @description
     * Публичное API библиотеки. Определяет глобальную функцию инициализации `superellipseInit`,
     * а также расширяет `Element.prototype` методами `superellipse` (геттер) и `superellipseInit`.
     * Управляет слабой картой контроллеров `jsse_controllers`.
     * 
     * @example
     * // Инициализация через глобальную функцию
     * const controller = superellipseInit('.card', { curveFactor: 1.2 });
     * 
     * @example
     * // Инициализация через метод элемента
     * const el = document.querySelector('.card');
     * el.superellipseInit({ mode: 'clip-path' });
     * const controller = el.superellipse;
     */


    /**
     * Геттер для доступа к контроллеру через element.superellipse.
     * @name Element.prototype.superellipse
     * @function
     * @returns {SuperellipseController|undefined} Контроллер, если элемент инициализирован, иначе undefined.
     */
    Object.defineProperty(Element.prototype, 'superellipse', {
        get() {
            return jsse_controllers.get(this);
        }
    });


    /**
     * Инициализирует контроллер суперэллипса на DOM-элементе.
     * @name Element.prototype.superellipseInit
     * @function
     * @param {Object} [options] - Опции инициализации.
     * @param {boolean} [options.force] - Если true, пересоздаёт контроллер, даже если он уже существует.
     * @param {string} [options.mode='svg-layer'] - Режим работы ('svg-layer' или 'clip-path').
     * @param {number} [options.curveFactor] - Коэффициент кривизны углов (диапазон -2..2).
     * @param {number} [options.precision=2] - Количество знаков после запятой в генерируемом пути.
     * @returns {SuperellipseController} Контроллер, связанный с элементом.
     */
    Element.prototype.superellipseInit = function(options) {
        let controller = jsse_controllers.get(this);

        if (controller && !options?.force) {
            console.warn('[Superellipse] Элемент уже имеет контроллер. Используйте { force: true } для пересоздания');
            return controller;
        }
        
        if (controller) {
            controller.destroy();
        }
        controller = new SuperellipseController(this, options);
        jsse_controllers.set(this, controller);
        return controller; // для цепочек
    };


    /**
     * Инициализирует один или несколько элементов суперэллипсом.
     * @function superellipseInit
     * @param {string|Element|NodeList|Array<Element>} target - CSS-селектор, DOM-элемент или коллекция элементов.
     * @param {Object} [options] - Опции инициализации (см. Element.prototype.superellipseInit).
     * @returns {SuperellipseController|Array<SuperellipseController>} Контроллер для одного элемента или массив контроллеров для нескольких.
     * @throws {Error} Если первый аргумент не является селектором, элементом или коллекцией.
     */
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
