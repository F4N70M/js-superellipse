/**
 * @file src/support.js
 * 
 * @module sj-superellipse/support
 * @since 1.0.0
 * @author f4n70m
 * 
 * @description
 * Вспомогательные утилиты и инструменты отладки.
 * - `jsse_debug` – объект для условного вывода отладочных сообщений в консоль.
 */


export const jsse_css_selector = {
	list : {},
	isSupport(selector) {
		if (this.list[selector] === undefined) {
			try {
				const value = `selector(${selector})`;
				this.list[selector] = CSS.supports(value);
			} catch (e) {
				this.list[selector] = false;
			}
		}
		// if (!this.list[selector]) {
		// 	jsse_console.warn({'label':'SUPPORT'}, '[SELECTOR]', selector, this.list[selector]);
		// }
		return this.list[selector];
	}
};


/**
 * Объект для управления отладочным выводом.
 * @namespace jsse_debug
 */
export const jsse_console = {
	_list: [],
	set(element) {
		this._list.push(element);
		// this.debug('set', {element});
		// console.log(this._list);
		// console.debug(`[DEBUG]`, {src:'jsse_console::set', element});
		console.debug('[JSSE]', '[DEBUG]', true, '\n\t', {element:element});
	},
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