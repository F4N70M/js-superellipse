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

import { jsse_styles, jsse_reset_css } from './global-cache.js';
import { jsse_generateSuperellipsePath, jsse_getBorderRadiusFactor } from './core.js';

import { jsse_console } from './support.js';

/**
 * Базовый класс для реализации режимов суперэллипса.
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
		this._destroyResetStyles();
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
		if (!jsse_reset_css.has(modeName)) {
			const styleElement = this._createModeCssStyleElement(modeName);
			jsse_reset_css.set(modeName, styleElement);
		} else {
			jsse_reset_css.get(modeName).count++;
		}

		jsse_console.debug({label:'MODE',element:this._element}, '[RESET STYLES]', 'INIT');
		// jsse_console.debug({label:'MODE'}, '[RESET STYLES]', '[INIT]', modeName, jsse_reset_css.get(modeName).count);
	}

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

	_getResetCssText(modeName) {
		let cssString = '';

		const activatedStyles = this._getActivatedStyles();
		cssString += `*:hover [data-jsse-mode="${modeName}"][data-jsse-activated=true],`;
		cssString += `[data-jsse-mode="${modeName}"][data-jsse-activated=true]:hover,`;
		cssString += `[data-jsse-mode="${modeName}"][data-jsse-activated=true]`;
		cssString += `{`;
		for (const prop in activatedStyles) {
			if (activatedStyles[prop] === '') continue;
			cssString += `\n\t${prop}: ${activatedStyles[prop]} !important;`;
		}
		cssString += `\n}`;

		cssString += `\n`;

		const readingStyles = this._getReadingStyles();
		cssString += `*:hover [data-jsse-mode="${modeName}"][data-jsse-reading=true],`;
		cssString += `[data-jsse-mode="${modeName}"][data-jsse-reading=true]:hover,`;
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
	 * @param {string} modeName
	 * @param {string} textContent
	 * @protected
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
	 * @protected
	 */
	_updateCapturedStyles() {
		jsse_console.debug({label:'MODE',element:this._element}, '_updateCapturedStyles()');
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