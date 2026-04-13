/**
 * @file src/mode.js
 * 
 * @module js-superellipse/mode
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

import { jsse_styles, jsse_reset_css } from './global-cache.js';
import { jsse_generateSuperellipsePath, jsse_getBorderRadiusFactor } from './core.js';

import { jsse_console } from './support.js';

/**
 * Базовый класс для реализации режимов суперэллипса.
 * @class SuperellipseMode
 * @since 1.0.0
 */
export class SuperellipseMode {

	_element;

	_isInitiated;
	_isActivated;
	// _isDebug;

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
	 * @since 1.0.0
	 * @param {Element} element - Целевой элемент.
	 * @param {boolean} [debug=false] - Флаг отладки.
	 */
	constructor(element) {

		this._element = element;

		// this._isDebug = debug;
		this._isActivated = false;

		this._curveFactor = jsse_getBorderRadiusFactor();
		this._precision = 2;

		this._init();
	}

	/**
	 * Активирует режим.
	 * @since 1.0.0
	 * @returns {void}
	 */
	activate() {
		if (this.isActivated()) return;
		jsse_console.debug({label:'MODE',element:this._element}, `activate(${this._getModeName()})`);
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
	 * @since 1.0.0
	 * @returns {void}
	 */
	deactivate() {
		if (!this.isActivated()) return;
		jsse_console.debug({label:'MODE',element:this._element}, `deactivate(${this._getModeName()})`);
		/** Установить статус **/
		this._setStatus(false);
		/** Удалить элементы виртуальных слоев **/
		this._removeVirtualElements();
		/** Выполнить обновление **/
		this._executeUpdate();
	}

	/**
	 * Полное обновление (стили, размер, путь).
	 * @since 1.0.0
	 * @returns {void}
	 */
	update() {
		jsse_console.debug({label:'MODE',element:this._element}, 'update()');
		/** Актуализировать данные захвата **/
		this._updateCaptured();
		/** Подготовить обновление **/
		this._prepareUpdate();
		/** Выполнить обновление **/
		this._executeUpdate();
	}

	/**
	 * Обновление только размеров.
	 * @since 1.0.0
	 * @returns {void}
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
	 * @since 1.0.0
	 * @returns {void}
	 */
	updateStyles() {
		jsse_console.debug({label:'MODE',element:this._element}, 'updateStyles()');
		/** Актуализировать стили **/
		this._updateCapturedStyles();
		/** Подготовить обновление **/
		this._prepareUpdate();
		/** Выполнить обновление **/
		this._executeUpdate();
	}

	/**
	 * Обновление коэффициента кривизны.
	 * @since 1.0.0
	 * @param {number} value - Новое значение коэффициента кривизны.
	 * @returns {void}
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
	 * @since 1.0.0
	 * @param {number} value - Количество знаков после запятой.
	 * @returns {void}
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
	 * @since 1.0.0
	 * @param {number} value - Новое значение коэффициента кривизны.
	 * @returns {void}
	 */
	setCurveFactor(value) {
		this._curveFactor = value;
	}

	/**
	 * Устанавливает точность округления.
	 * @since 1.0.0
	 * @param {number} value - Количество знаков после запятой.
	 * @returns {void}
	 */
	setPrecision(value) {
		this._precision = value;
	}

	/**
	 * Возвращает текущий SVG-путь.
	 * @since 1.0.0
	 * @returns {string}
	 */
	getPath() {
		return this._path;
	}

	/**
	 * Проверяет, активирован ли режим.
	 * @since 1.0.0
	 * @returns {boolean}
	 */
	isActivated() {
		return this._isActivated;
	}

	/**
	 * Уничтожает режим, удаляет все артефакты.
	 * @since 1.0.0
	 * @returns {void}
	 */
	destroy() {
		this.deactivate();
		this._removeModeAttr();
		this._destroyResetStyles();
	}


	/**
	 * =============================================================
	 * PRIVATE
	 * =============================================================
	 */


	/**
	 * Инициализация режима.
	 * @since 1.0.0
	 * @private
	 * @returns {void}
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
	 * @since 1.0.0
	 * @private
	 * @param {boolean} status - Статус активации.
	 * @returns {void}
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
	 * @since 1.0.0
	 * @private
	 * @returns {void}
	 */
	_updateCaptured() {
		this._updateCapturedStyles();
		this._updateCapturedSize();
	}

	/**
	 * Подготавливает обновление (пересчёт кривой).
	 * @since 1.0.0
	 * @private
	 * @returns {void}
	 */
	_prepareUpdate() {
		this._recalculateCurve();
	}

	/**
	 * Выполняет обновление (применяет кривую).
	 * @since 1.0.0
	 * @private
	 * @returns {void}
	 */
	_executeUpdate() {
		this._applyCurrentCurve();
	}

	/**
	 * Возвращает имя режима.
	 * @since 1.0.0
	 * @protected
	 * @returns {string}
	 */
	_getModeName() {
		return 'clip-path';
	}

	/**
	 * Возвращает карту стилей, которые нужно временно применить для корректного чтения.
	 * @since 1.0.0
	 * @protected
	 * @returns {Object<string, string>}
	 */
	_getReadingStyles() {
		return {
			'transition': 'unset'
		};
	}

	/**
	 * Возвращает карту стилей, применяемых при активации режима.
	 * @since 1.0.0
	 * @protected
	 * @returns {Object<string, string>}
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
	 * @since 1.0.0
	 * @protected
	 * @returns {void}
	 */
	_appendVirtualElements() {}

	/**
	 * Удаляет виртуальные элементы.
	 * @since 1.0.0
	 * @protected
	 * @returns {void}
	 */
	_removeVirtualElements() {}


	/**
	 * =============================================================
	 * ATTRIBUTES
	 * =============================================================
	 */


	/**
	 * Устанавливает атрибут `data-jsse-mode`.
	 * @since 1.0.0
	 * @protected
	 * @returns {void}
	 */
	_setModeAttr() {
		this._element.setAttribute('data-jsse-mode', this._getModeName());
	}

	/**
	 * Удаляет атрибут `data-jsse-mode`.
	 * @since 1.0.0
	 * @protected
	 * @returns {void}
	 */
	_removeModeAttr() {
		this._element.removeAttribute('data-jsse-mode');
	}

	/**
	 * Устанавливает атрибут `data-jsse-activated`.
	 * @since 1.0.0
	 * @protected
	 * @returns {void}
	 */
	_setActivatedAttr() {
		this._element.setAttribute('data-jsse-activated', true);
	}

	/**
	 * Удаляет атрибут `data-jsse-activated`.
	 * @since 1.0.0
	 * @protected
	 * @returns {void}
	 */
	_removeActivatedAttr() {
		this._element.removeAttribute('data-jsse-activated');
	}

	/**
	 * Устанавливает атрибут `data-jsse-reading`.
	 * @since 1.0.0
	 * @protected
	 * @returns {void}
	 */
	_setReadingAttr() {
		this._element.setAttribute('data-jsse-reading', true);
	}

	/**
	 * Удаляет атрибут `data-jsse-reading`.
	 * @since 1.0.0
	 * @protected
	 * @returns {void}
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
	 * @since 1.0.0
	 * @protected
	 * @returns {void}
	 */
	_initResetStyles() {
		const modeName = this._getModeName();
		if (!jsse_reset_css.has(modeName)) {
			const styleElement = this._createModeCssStyleElement(modeName);
			jsse_reset_css.set(modeName, styleElement);
		} else {
			jsse_reset_css.get(modeName).count++;
		}

		jsse_console.debug({label:'MODE',element:this._element}, '[RESET STYLES]', 'INIT');
		// jsse_console.debug({label:'MODE'}, '[RESET STYLES]', '[INIT]', modeName, jsse_reset_css.get(modeName).count);
	}

	/**
	 * Уничтожает глобальные CSS-правила режима.
	 * @since 1.0.0
	 * @protected
	 * @returns {void}
	 */
	_destroyResetStyles() {
		const modeName = this._getModeName();
		if (!jsse_reset_css.has(modeName)) return;

		const modeResetStyle = jsse_reset_css.get(modeName);
		modeResetStyle.count--;

		jsse_console.debug({label:'MODE',element:this._element}, '[RESET STYLES]', '[DESTROY]');
		// jsse_console.debug({label:'MODE'}, '[RESET STYLES]', '[DESTROY]', modeName, jsse_reset_css.get(modeName).count);

		if (modeResetStyle.count <= 0) {
			jsse_reset_css.unset(modeName);
		}

	}

	/**
	 * Возвращает CSS-текст для сброса стилей режима.
	 * @since 1.0.0
	 * @protected
	 * @param {string} modeName - Имя режима.
	 * @returns {string}
	 */
	_getResetCssText(modeName) {
		let cssString = '';

		const activatedStyles = this._getActivatedStyles();
		// cssString += `*:hover [data-jsse-mode="${modeName}"][data-jsse-activated=true],`;
		// cssString += `[data-jsse-mode="${modeName}"][data-jsse-activated=true]:hover,`;
		cssString += `[data-jsse-mode="${modeName}"][data-jsse-activated=true]`;
		cssString += `{`;
		for (const prop in activatedStyles) {
			if (activatedStyles[prop] === '') continue;
			cssString += `\n\t${prop}: ${activatedStyles[prop]} !important;`;
		}
		cssString += `\n}`;

		cssString += `\n`;

		const readingStyles = this._getReadingStyles();
		// cssString += `*:hover [data-jsse-mode="${modeName}"][data-jsse-reading=true],`;
		// cssString += `[data-jsse-mode="${modeName}"][data-jsse-reading=true]:hover,`;
		cssString += `[data-jsse-mode="${modeName}"][data-jsse-reading=true]`;
		cssString += `{`;
		for (const prop in readingStyles) {
			if (readingStyles[prop] === '') continue;
			cssString += `\n\t${prop}: ${readingStyles[prop]} !important;`;
		}
		cssString += `\n}`;

		return cssString;
	}

	/**
	 * Создаёт элемент `<style>` для режима.
	 * @since 1.0.0
	 * @protected
	 * @param {string} modeName - Имя режима.
	 * @returns {HTMLStyleElement}
	 */
	_createModeCssStyleElement(modeName) {
		const textContent = this._getResetCssText(modeName);
		/** Создать элемент <style> **/
		const styleElement = document.createElement('style');
		styleElement.setAttribute('id', `jsse__css_${modeName}`);
		/** Заполнить элемент CSS-правилами **/
		styleElement.textContent = textContent;
		return styleElement;
	}


	/**
	 * =============================================================
	 * STYLES
	 * =============================================================
	 */


	/**
	 * Обновляет захваченные стили.
	 * @since 1.0.0
	 * @protected
	 * @returns {void}
	 */
	_updateCapturedStyles() {
		jsse_console.debug({label:'MODE',element:this._element}, '_updateCapturedStyles()');
		const capturedComputedStyles = this._getCapturedStyles();
		/** Сохранить computed-стили **/
		this._styles.computed = capturedComputedStyles;
	}

	/**
	 * Получает вычисленные стили с временным снятием атрибута активации.
	 * @since 1.0.0
	 * @protected
	 * @param {boolean} [clear=true] - Снимать ли атрибут активации перед чтением.
	 * @returns {Object<string, string>}
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
	 * @since 1.0.0
	 * @protected
	 * @returns {Object<string, string>}
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
	 * @since 1.0.0
	 * @protected
	 * @param {string} prop - Имя CSS-свойства.
	 * @returns {string|undefined}
	 */
	_getComputedProp(prop) {
		if ('computed' in this._styles && prop in this._styles.computed)
			return this._styles.computed[prop];
	}

	/**
	 * Возвращает массив свойств CSS, управляемых режимом.
	 * @since 1.0.0
	 * @protected
	 * @returns {string[]}
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
	 * @since 1.0.0
	 * @protected
	 * @returns {void}
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
	 * @since 1.0.0
	 * @protected
	 * @returns {void}
	 */
	_initSize() {
		this._updateCapturedSize();
	}

	/**
	 * Обновляет захваченные размеры.
	 * @since 1.0.0
	 * @protected
	 * @returns {void}
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
	 * @since 1.0.0
	 * @protected
	 * @returns {void}
	 */
	_initCurve() {
		this._initInlinePath();
	}

	/**
	 * Сохраняет исходный `clip-path`.
	 * @since 1.0.0
	 * @protected
	 * @returns {void}
	 */
	_initInlinePath() {
		this._resetPath = this._element.style.getPropertyValue('clip-path');
	}

	/**
	 * Пересчитывает путь на основе текущих размеров и радиуса.
	 * @since 1.0.0
	 * @protected
	 * @returns {void}
	 */
	_recalculateCurve() {
		this._recalculatePath();
	}

	/**
	 * Генерирует SVG-путь.
	 * @since 1.0.0
	 * @protected
	 * @returns {void}
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
	 * @since 1.0.0
	 * @protected
	 * @returns {void}
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
	 * @since 1.0.0
	 * @protected
	 * @returns {void}
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
	 * @since 1.0.0
	 * @protected
	 * @returns {void}
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