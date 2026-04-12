/**
 * @file src/global-cache.js
 * 
 * @module sj-superellipse/global-cache
 * @since 1.0.0
 * @author f4n70m
 * 
 * @description
 * Глобальные хранилища для кэширования данных между экземплярами контроллеров и режимов.
 */

import { StylesheetParser } from './stylesheet-parser.js';


/**
 * Карта для хранения контроллеров суперэллипса, связанных с DOM-элементами.
 * @since 1.0.0
 * @type {WeakMap<Element, import('./controller.js').SuperellipseController>}
 */
export const jsse_controllers = new WeakMap();


/**
 * Экземпляр парсера таблиц стилей для анализа CSS-правил.
 * @since 1.1.0
 * @type {import('./stylesheet-parser.js').StylesheetParser}
 */
export const jsse_stylesheet = new StylesheetParser();


/**
 * WeakMap для кэширования стилей элементов.
 * @since 1.0.0
 * @type {WeakMap<Element, Object>}
 */
export const jsse_styles = new WeakMap();


/**
 * Объект для хранения глобальных CSS-правил режимов.
 * @since 1.0.0
 * @namespace jsse_reset_css
 */
export const jsse_reset_css = {

	/**
	 * Внутреннее хранилище элементов `<style>` для каждого режима.
	 * @type {Object<string, {element: HTMLStyleElement, count: number}>}
	 */
	_list: {},

	/**
	 * Возвращает запись для заданного ключа.
	 * @since 1.0.0
	 * @param {string} key - Идентификатор режима (например, 'svg-layer').
	 * @returns {{element: HTMLStyleElement, count: number} | undefined}
	 */
	get(key) {
		return this._list[key];
	},

	/**
	 * Сохраняет элемент `<style>` для режима, удаляя предыдущий при необходимости.
	 * @since 1.0.0
	 * @param {string} key - Идентификатор режима.
	 * @param {HTMLStyleElement} el - Элемент стилей для добавления в `<head>`.
	 * @returns {void}
	 */
	set(key, el) {
		if (this.has(key)) {
			this.unset(key);
		}
		this._list[key] = {
			element: el,
			count: 1
		};
		/** Добавить элемент в конец <head> **/
		document.head.appendChild(el);
	},

	/**
	 * Удаляет запись и соответствующий элемент `<style>` из DOM.
	 * @since 1.0.0
	 * @param {string} key - Идентификатор режима.
	 * @returns {void}
	 */
	unset(key) {
		/** Удалить элемент **/
		this._list[key].element.remove();
		delete this._list[key];
	},

	/**
	 * Проверяет существование записи для указанного ключа.
	 * @since 1.0.0
	 * @param {string} key - Идентификатор режима.
	 * @returns {boolean}
	 */
	has(key) {
		return this._list[key] !== undefined;
	}
};

/**
 * Счётчик для генерации уникальных идентификаторов контроллеров.
 * @since 1.0.0
 * @namespace jsse_counter
 */
export const jsse_counter = {
	
	/**
	 * Текущее значение счётчика.
	 * @type {number}
	 */
	_value: 0,

	/**
	 * Увеличивает счётчик на 1.
	 * @returns {void}
	 */
	increment() { this._value++; },

	/**
	 * Уменьшает счётчик на 1.
	 * @returns {void}
	 */
	decrement() { this._value--; },

	/**
	 * Геттер, возвращающий текущее значение счётчика.
	 * @type {number}
	 */
	get value() { return this._value; }
};