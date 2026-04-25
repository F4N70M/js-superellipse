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
 */

import { jsse_animated_props, Transition } from './transition.js';
import { jsse_styles, jsse_reset_css } from './global-cache.js';
import { jsse_generateSuperellipsePath, jsse_getBorderRadiusFactor } from './core.js';
import { jsse_console } from './support.js';

/**
 * Базовый класс для реализации режимов суперэллипса.
 * @class SuperellipseMode
 * @since 1.0.0
 */
export class SuperellipseMode {

	_id;

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
	_transition = null;

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
		/** Отменить анимацию перехода возвращения сброшеннных стилей **/
		this._cancelTransition();
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
		if (!this.isActivated()) return;
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
		if (!this.isActivated()) return;
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
		if (!this.isActivated()) return;
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
		if (!this.isActivated()) return;
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
		if (!this.isActivated()) return;
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
	 * @protected
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
	 * @protected
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
	 * @protected
	 * @returns {void}
	 */
	_updateCaptured() {
		this._updateCapturedStyles();
		this._updateCapturedSize();
	}

	/**
	 * Подготавливает обновление (пересчёт кривой).
	 * @since 1.0.0
	 * @protected
	 * @returns {void}
	 */
	_prepareUpdate() {
		this._recalculateCurve();
	}

	/**
	 * Выполняет обновление (применяет кривую).
	 * @since 1.0.0
	 * @protected
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
	 * Возвращает список свойств, отслеживаемых для анимаций.
	 * @since 1.5.3
	 * @protected
	 * @returns {Array<string>}
	 */
	_getTransitionProperties() {
		return [
			'border-radius',
		];
	}


	/**
	 * =============================================================
	 * VIRTUAL
	 * =============================================================
	 */



	/**
	 * Создаёт HTML-элемент с указанным тегом.
	 * @since 1.5.0 – Перенесен из `SuperellipseModeSvgLayer::_createVirtualHtmlElement` [1.0.0]
	 * @protected
	 * @param {string} tag - Имя тега (например, 'div').
	 * @returns {HTMLElement}
	 */
	_createVirtualHtmlElement(tag) {
		return document.createElement(tag);
	}


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

		const transitionStyles = {
			'transition-property': 'all',
			'transition-duration': '0s',
			'transition-timing-function': 'ease',
			'transition-delay': '0s',
		};

		const activatedStyles = this._getActivatedStyles();
		jsse_console.debug({label:'ResetCssText',element:this._element}, activatedStyles, this._styles.computed);
		cssString += `[data-jsse-mode="${modeName}"][data-jsse-activated=true]:not([data-jsse-reading=true])`;
		cssString += `{`;
		for (const prop in activatedStyles) {
			if (activatedStyles[prop] === '') continue;
			cssString += `\n\t${prop}: ${activatedStyles[prop]} !important;`;
		}
		for (const prop in transitionStyles) {
			cssString += `\n\t${prop}: var(--jsse-${prop}, ${transitionStyles[prop]});`;
		}

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
	 * Обновляет захваченные стили и переходы.
	 * @since 1.5.3
	 * @protected
	 * @returns {void}
	 */
	_updateCapturedStyles() {
		/** Сохранить computed-стили **/
		const captured = this._getCapturedStyles();
		this._styles.computed = captured.computed;
		this._styles.transition = captured.transition;
		this._updateTransitionStyles();
		jsse_console.debug({label:'MODE',element:this._element}, '[STYLES]', '[CAPTURED]');
	}

	/**
	 * Получает вычисленные стили с временным снятием атрибута активации.
	 * @since 1.0.0
	 * @protected
	 * @returns {{ computed: Object<string, string>, transition: Object<string, string> }}
	 *          Объект с вычисленными стилями (computed) и параметрами перехода (transition).
	 */
	_getCapturedStyles() {
		return this._getManagedComputedStyle();
	}

	/**
	 * Получает вычисленные стили применяя принудительный reflow.
	 * @since 1.5.3
	 * @protected
	 * @returns {CSSStyleDeclaration}
	 */
	_getComputedStyle() {
		this._reflow();
		return getComputedStyle(this._element);
	}

	/**
	 * Вызывает принудительный reflow элемента для синхронизации стилей.
	 * @since 1.5.3
	 * @protected
	 * @returns {void}
	 */
	_reflow() {
		jsse_console.debug({label:'MODE',element:this._element}, '[REFLOW]');
		this._element.offsetHeight;
	}

	/**
	 * Возвращает объект управления переходами (`Transition`).
	 * Если объект ещё не создан, инициализирует новый экземпляр.
	 * @since 1.5.3
	 * @protected
	 * @returns {Transition} Экземпляр класса `Transition`.
	 */
	_getTransition() {
		if (this._transition === null) {
			this._transition = new Transition();
		}
		return this._transition;
	}

	/**
	 * Получает вычисленные стили для управляемых свойств.
	 * @since 1.5.3
	 * @protected
	 * @returns {{ computed: Object<string, string>, transition: Object<string, string> }}
	 *          Объект, содержащий захваченные значения управляемых свойств (computed)
	 *          и распарсенные компоненты CSS-перехода (transition).
	 */
	_getManagedComputedStyle() {

		const managed = this._getManagedProperties();
		const animatedPropList = jsse_animated_props.getList();

		const micro = performance.now(); 

		/**  **/
		const computed = getComputedStyle(this._element);
		const current = {
			computed: {},
			transition: {}
		};
		const diff = {};
		const before = {
			/** Сохранить начальные значения стилей **/
			computed: (()=>{
				const result = {};
				for (const prop of animatedPropList) {
					result[prop] = computed.getPropertyValue(prop);
				}
				return result;
			})(),
			/** Получить все inline значения **/
			inline: (()=>{
				const result = {};
				for (let i = 0; i < this._element.style.length; i++) {
					const prop = this._element.style[i];
					result[prop] = {
						value: this._element.style.getPropertyValue(prop),
						priority: this._element.style.getPropertyPriority(prop)
					}
				}
				return result;
			})(),
			transition: {
				inline: this._element.style.getPropertyValue('transition'),
				priority: this._element.style.getPropertyPriority('transition'),
			}
		}

		/** Включить режим чтения стилей **/
		this._setReadingAttr();

		/** Получить оригинальное значение transition – Вынужденный reflow при чтении значений свойств стилей – фиксирует значения стилей как начальные **/
		const transitionValue = computed.getPropertyValue('transition');

			const transition = this._getTransition();
			transition.setStyleString(transitionValue);
			const resetTransitionProps = this._getTransitionProperties();
			current.transition = transition.getStyleString(resetTransitionProps);

		/** Установить временный transition: none – для мгновенного применения стилей **/
		this._element.style.setProperty('transition', 'none', 'important');

		/** Получить конечные значения стилей – Вынужденный reflow при чтении значений свойств стилей – фиксирует значения стилей как начальные (инициализирует скачек при анимации) **/
		for (const prop of managed) {
			if (prop === 'transition') continue;
			current.computed[prop] = computed.getPropertyValue(prop);
		}

		/** Установить временный transition: 0s – для отмены мгновенного применения стилей **/
		this._element.style.setProperty('transition', '0s', 'important');

		/** Установить временно в inline начальные значения стилей **/
		for (const prop in before.computed) {
			const beforeValue = before.computed[prop];
			const value = computed.getPropertyValue(prop);
			if (value !== beforeValue) {
				/** сохранить конечное значение расхождения **/
				diff[prop] = value;
				/** сбросить начальное значение через установку временного inline **/
				this._element.style.setProperty(prop, beforeValue, 'important');
			}
		}

		/** Вызвать reflow – фиксирует значения стилей как начальные (отменяет скачек при анимации) **/
		this._reflow();

		/** Сбросить временный transition **/
		this._element.style.setProperty('transition', before.transition.inline, before.transition.priority);

		/** Сбросить временные inline **/
		for (const prop in diff) {
			this._element.style.setProperty(prop, before.inline[prop]?.value??'', before.inline[prop]?.priority??'');
		}

		/** Выключить режим чтения стилей **/
		this._removeReadingAttr();

		return current;
	}

	/**
	 * Обновляет CSS-переменные элемента, отвечающие за параметры перехода, на основе захваченных стилей transition.
	 * Устанавливает переменные:
	 * - `--jsse-transition-property`
	 * - `--jsse-transition-duration`
	 * - `--jsse-transition-timing-function`
	 * - `--jsse-transition-delay`
	 * @since 1.5.3
	 * @protected
	 * @returns {void}
	 */
	_updateTransitionStyles() {
		jsse_console.debug({label:'MODE',element:this._element}, '[TRANSITION]', '[PARTS]', this._styles.transition);
		this._element.style.setProperty('--jsse-transition-property', this._styles.transition['property']);
		this._element.style.setProperty('--jsse-transition-duration', this._styles.transition['duration']);
		this._element.style.setProperty('--jsse-transition-timing-function', this._styles.transition['timing-function']);
		this._element.style.setProperty('--jsse-transition-delay', this._styles.transition['delay']);
	}

	/**
	 * Отменяет CSS-переход при деактивации режима для предотвращения нежелательных анимаций.
	 * @since 1.5.3
	 * @protected
	 * @returns {void}
	 */
	_cancelTransition() {
		const before = {
			value: this._element.style.getPropertyValue('transition'),
			priority: this._element.style.getPropertyPriority('transition')
		};
		this._element.style.setProperty('transition', 'none', 'important');
		this._element.style.setProperty('transition', '0s', 'important');
		this._reflow();
		this._element.style.setProperty('transition', before.value, before.priority);
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
 	 * Возвращает массив свойств CSS, управляемых режимом для переходов.
	 * @since 1.5.3
	 * @protected
	 * @returns {string[]}
	 */
	_getManagedTransitionProperties() {
		return ['transition-property', 'transition-duration', 'transition-timing-function', 'transition-delay'];
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