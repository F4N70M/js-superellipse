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
 * Проверяет, содержит ли элемент указанный CSS-класс.
 * @function jsse_element_has_class
 * @param {Element} element - DOM-элемент.
 * @param {string} classname - Имя класса.
 * @returns {boolean}
 */
export function jsse_element_has_class(element, classname) {
	return element.classList.contains(classname);
}


/**
 * Объект для управления отладочным выводом.
 * @namespace jsse_debug
 */
export const jsse_console = {
	_list: [],
	set(element) {
		this._list.push(element);
		console.log(this._list);
	},
	debug(...values) {
		if (values.length == 0) {
			throw new Error('Нет параметров для вывода');
		}
		if (values.length > 1 && (values[0] instanceof Element)) {
			// Удалить из массива и вернуть первый элемент
			const element = values.shift();
			if(this._list.includes(element)) {
				console.debug('[DEBUG]', {element});
				console.debug(' └──', ...values);
			}
		}
		else {
			console.debug('[DEBUG]');
			console.debug('└──', ...values);
		}
	}
};