/**
 * @file src/api.js
 * 
 * @module js-superellipse/api
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
import { SuperellipseController } from './controller.js';
import { jsse_controllers } from './global-cache.js';
import { jsse_console } from './support.js';


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
		jsse_console.warn({label:'API', element: this}, 'The element already has a controller. Use {force:true} to recreate it.');
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
export function superellipseInit(target, options) {
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