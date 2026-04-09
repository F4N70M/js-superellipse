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
export const jsse_debug = {
	_list: [],
	set(element) {
		this._list.push(element);
		console.log(this._list);
	},
	names(element, names = []) {
		if (this._list.includes(element)) {
			let namesString = '';
			if (Array.isArray(names) && names.length > 0) {
				const bracketed = names.map(name => `[${name}]`);
				namesString = bracketed.join(' ');
			}
			const hasString = namesString.length > 0;
			const string = '[DEBUG]' + (hasString ? ' ' + namesString : '');
			console.log(string, [element]);
		}
	},
	print(element, names = [], value) {
		if (this._list.includes(element)) {
			let namesString = '';
			if (Array.isArray(names) && names.length > 0) {
				const bracketed = names.map(name => `[${name}]`);
				namesString = bracketed.join(' ');
			}
			const hasString = namesString.length > 0;
			const string = '[DEBUG]' + (hasString ? ' ' + namesString : '');
			console.log(string, value, [element]);
		}
	}
};