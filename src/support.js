/**
 * @file src/support.js
 * 
 * @module js-superellipse/support
 * @since 1.0.0
 * @author f4n70m
 * 
 * @description
 * Вспомогательные утилиты и инструменты отладки.
 */


/**
 * Объект для проверки поддержки CSS-селекторов.
 * @namespace jsse_css_selector
 * @since 1.1.0
 */
export const jsse_css_selector = {

	/**
	 * Кэш результатов проверки поддержки селекторов.
	 * @since 1.1.0
	 * @type {Object<string, boolean>}
	 */
	list : {},

	/**
	 * Проверяет, поддерживает ли браузер указанный CSS-селектор.
	 * @since 1.1.0
	 * @param {string} selector - CSS-селектор для проверки (например, ':has(.a)').
	 * @returns {boolean} true, если селектор поддерживается, иначе false.
	 */
	isSupport(selector) {
		if (this.list[selector] === undefined) {
			try {
				const value = `selector(${selector})`;
				this.list[selector] = CSS.supports(value);
			} catch (e) {
				this.list[selector] = false;
			}
		}
		return this.list[selector];
	}
};


/**
 * Объект для управления отладочным выводом в консоль.
 * @namespace jsse_console
 * @since 1.0.0
 */
export const jsse_console = {

	/**
	 * Список DOM-элементов, для которых включена отладка.
	 * @type {Element[]}
	 * @private
	 */
	_list: [],
	
	/**
	 * Включает отладку для указанного элемента.
	 * @since 1.0.0
	 * @param {Element} element - DOM-элемент.
	 * @returns {void}
	 */
	set(element) {
		this._list.push(element);
		// this.debug('set', {element});
		// console.log(this._list);
		// console.debug(`[DEBUG]`, {src:'jsse_console::set', element});
		console.debug('[JSSE]', '[DEBUG]', true, '\n\t', {element:element});
	},

	/**
	 * Выводит отладочное сообщение в консоль (если отладка включена для элемента или сообщение глобальное).
	 * @since 1.0.0
	 * @param {Object} options - Опции.
	 * @param {Element} [options.element] - Элемент, для которого проверяется включение отладки.
	 * @param {string} [options.label='DEBUG'] - Метка для вывода.
	 * @param {...any} values - Значения для вывода.
	 * @returns {void}
	 */
	debug(options, ...values) {
		if (options.element) {
			if(this._list.includes(options.element)) {
				console.debug('[JSSE]', `[${options?.label??'DEBUG'}]`, ...values, '\n\t', {element:options.element});
			}
		}
		else {
			console.debug('[JSSE]', `[${options?.label??'DEBUG'}]`, ...values);
		}
	},

	/**
	 * Выводит предупреждение в консоль (если отладка включена для элемента или сообщение глобальное).
	 * @since 1.0.0
	 * @param {Object} options - Опции.
	 * @param {Element} [options.element] - Элемент, для которого проверяется включение отладки.
	 * @param {string} [options.label='DEBUG'] - Метка для вывода.
	 * @param {...any} values - Значения для вывода.
	 * @returns {void}
	 */
	warn(options, ...values) {
		if (options.element) {
			if(this._list.includes(options.element)) {
				console.warn('[JSSE]', `[${options?.label??'DEBUG'}]`, ...values, '\n\t', {element:options.element});
			}
		}
		else {
			console.warn('[JSSE]', `[${options?.label??'DEBUG'}]`, ...values);
		}
	}
};