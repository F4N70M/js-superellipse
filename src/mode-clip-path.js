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
 * Режим, использующий CSS-свойство `clip-path`.
 * @extends SuperellipseMode
 */
export class SuperellipseModeClipPath extends SuperellipseMode {


	/**
	 * =============================================================
	 * PUBLIC
	 * =============================================================
	 */

	/**
	 * @param {Element} element - Целевой элемент.
	 * @param {boolean} [debug=false] - Флаг отладки.
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