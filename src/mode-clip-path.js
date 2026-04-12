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

import { SuperellipseMode } from './mode.js';


/**
 * Режим, использующий CSS-свойство `clip-path` для обрезки элемента.
 * Не требует создания дополнительных DOM-узлов, но не поддерживает тени, границы и сложные фоны.
 * @class SuperellipseModeClipPath
 * @extends SuperellipseMode
 * @since 1.0.0
 */
export class SuperellipseModeClipPath extends SuperellipseMode {


	/**
	 * =============================================================
	 * PUBLIC
	 * =============================================================
	 */

	/**
	 * Создаёт экземпляр режима clip-path.
	 * @since 1.0.0
	 * @param {Element} element - Целевой DOM-элемент.
	 * @param {boolean} [debug=false] - Флаг отладки (передаётся в родительский класс).
	 * @returns {SuperellipseModeClipPath} Экземпляр режима.
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