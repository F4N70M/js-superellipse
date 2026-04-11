/**
 * @file src/controller.js
 * 
 * @module sj-superellipse/controller
 * @since 1.0.0
 * @author f4n70m
 * 
 * @description
 * Класс `SuperellipseController` – основной контроллер, связывающий DOM-элемент с выбранным режимом
 * (`svg-layer` или `clip-path`). Отслеживает изменения размеров, стилей, атрибутов и удаление элемента
 * через `ResizeObserver`, `MutationObserver`, `IntersectionObserver`. Управляет кэшированием стилей,
 * переключением режимов, активацией/деактивацией эффекта.
 * 
 * @example
 * const controller = new SuperellipseController(element, { mode: 'svg-layer' });
 * controller.setCurveFactor(0.9);
 * controller.enable();
 */

import { jsse_styles, jsse_counter, jsse_stylesheet } from './global-cache.js';
import { jsse_getBorderRadiusFactor } from './core.js';
import { jsse_controllers } from './global-cache.js';
import { SuperellipseModeSvgLayer } from './mode-svg-layer.js';
import { SuperellipseModeClipPath } from './mode-clip-path.js';
import { jsse_console, jsse_css_selector } from './support.js';


/**
 * Контроллер, управляющий применением суперэллипса к DOM-элементу.
 */
export class SuperellipseController
{
	_id;
	_debug;

	_mode;
	_element;

	_precision; // Количество знаков после запятой
	_curveFactor;

	_mutationFrame;
	_resizeFrame;
	_intersectionFrame;
	

	_prepareTimer;
	_executeTimer;
	_isSelfMutation = false;

	_resizeObserver;
	_mutationObserver;
	_removalObserver;
	_intersectionObserver;

	_targetTriggers;
	_hoverHandlers;

	_needsUpdate;
	_isSelfApply;


	/**
	 * =============================================================
	 * PUBLIC
	 * =============================================================
	 */


	/**
	 * Создаёт экземпляр контроллера.
	 * @param {Element} element - Целевой DOM-элемент.
	 * @param {Object} [options] - Опции инициализации.
	 * @param {boolean} [options.force] - Принудительное пересоздание.
	 * @param {string} [options.mode='svg-layer'] - Режим работы.
	 * @param {number} [options.curveFactor] - Коэффициент кривизны.
	 * @param {number} [options.precision=2] - Точность округления.
	 */
	constructor(element, options = {}) {

		this._initId();
		
		/** Проверка существующего контроллера **/
		if (this._inControllers() && !options.force) {
			console.warn('[Superellipse] The element is already initialized. Use {force:true} to recreate it.');
			return this._getController();
		}
		
		this._element = element;

		/** Default options **/
		const settings = { 
		    mode: options.mode ?? 'svg-layer',
		    debug: options.debug ?? false,
		    curveFactor: options.curveFactor ?? jsse_getBorderRadiusFactor(),
		    precision: options.precision ?? 2
		};

		this._initDebug(settings.debug);

		jsse_console.debug({label:'CONTROLLER',element:this._element}, '[SETTINGS]', settings);


		this._curveFactor = settings.curveFactor;
		this._precision = settings.precision;


		this._needsUpdate = false;
		this._isSelfApply = false;

		/** Слушатели **/
		this._resizeObserver = null;
		this._mutationObserver = null;
		this._removalObserver = null;
		this._intersectionObserver = null;

		/** init **/
		this._initCacheStyles();
		this._setInitiatedAttr();
		
		this._setMode(settings.mode);
		this._activateMode();
		this._connectObservers();
	}

	/**
	 * Переключает режим работы.
	 * @param {string} modeName - Имя режима ('svg-layer' или 'clip-path').
	 * @returns {SuperellipseController} this (для цепочек).
	 */
	switchMode(modeName) {
		this._deactivateMode();
		this._unsetMode();
		this._setMode(modeName);
		this._activateMode();
		return this;
	}

	/**
	 * Проверяет, активирован ли суперэллипс.
	 * @returns {boolean} true, если активирован.
	 */
	isEnabled() {
		return this._mode.isActivated();
	}

	/**
	 * Активирует суперэллипс.
	 * @returns {SuperellipseController} this.
	 */
	enable() {
		this._activateMode();
		return this;
	}

	/**
	 * Деактивирует суперэллипс, восстанавливая исходные стили.
	 * @returns {Element} Целевой элемент.
	 */
	disable() {
		this._deactivateMode();
		return this;
	}

	/**
	 * Устанавливает коэффициент кривизны углов.
	 * @param {number} value - Новое значение (диапазон -2..2).
	 * @returns {SuperellipseController} this.
	 */
	setCurveFactor(value) {
		this._curveFactor = value;
		this._mode.updateCurveFactor(value);
		return this;
	}

	/**
	 * Устанавливает точность округления координат пути.
	 * @param {number} value - Количество знаков после запятой.
	 * @returns {SuperellipseController} this.
	 */
	setPrecision(value) {
		this._precision = value;
		this._mode.updatePrecision(value);
		return this;
	}

	/**
	 * Возвращает текущий SVG-путь суперэллипса.
	 * @returns {string} Строка с командами path.
	 */
	getPath() {
		return this._mode.getPath();
	}

	/**
	 * Полностью уничтожает контроллер и удаляет все связанные эффекты.
	 * @returns {Element} Целевой элемент.
	 */
	destroy() {
		return this._destroyController();
	}


	/**
	 * =============================================================
	 * PRIVATE
	 * =============================================================
	 */


	/**
	 * Инициализирует уникальный идентификатор контроллера.
	 * @private
	 */
	_initId() {
		this._id = jsse_counter.value;
		jsse_counter.increment();
	}

	/**
	 * Инициализирует флаг отладки.
	 * @private
	 */
	_initDebug(debug) {
		this._debug = !!debug;
		if (this._debug) {
			jsse_console.set(this._element);
		}
	}

	/**
	 * Проверяет, включён ли режим отладки для данного контроллера.
	 * @returns {boolean}
	 * @private
	 */
	_isDebug() {
		return this._debug;
	}

	/**
	 * Проверяет, не скрыт ли элемент (`display: none`).
	 * @returns {boolean}
	 * @private
	 */
	_isDisplay() {
		const capturedStyles = getComputedStyle(this._element);
		return capturedStyles.getPropertyValue('display') !== 'none';
	}


	/**
	 * Метод полного уничтожения контроллера (внутренняя логика).
	 * @private
	 */
	_destroyController() {
		this._disconnectObservers();
		this._deactivateMode();
		this._unsetMode();
		this._removeInitiatedAttr();

		this._deleteCacheStyles();
		this._deleteFromControllers();
	}


	/**
	 * =============================================================
	 * MODE
	 * =============================================================
	 */


	/**
	 * Устанавливает активный режим.
	 * @param {string} modeName - Имя режима.
	 * @private
	 */
	_setMode(modeName) {
		switch (modeName) {
			case 'svg-layer':
				this._mode = new SuperellipseModeSvgLayer(this._element);
				break;

			case 'clip-path':
			default:
				this._mode = new SuperellipseModeClipPath(this._element);
				break;
		}
		this._mode.setCurveFactor(this._curveFactor);
		this._mode.setPrecision(this._precision);
		
		// this._mode.activate();
	}

	/**
	 * Удаляет текущий режим, вызывая его деструктор.
	 * @private
	 */
	_unsetMode() {

		this._mode.destroy();
		this._mode = null;
	}

	_activateMode() {
		this._mode.activate();
		this._initStylesheet();
		this._registerTargetListeners(this._targetTriggers);
	}

	_deactivateMode() {
		this._mode.deactivate();
		this._unregisterTargetListeners();
	}


	/**
	 * =============================================================
	 * ATTRIBUTES
	 * =============================================================
	 */


	/**
	 * Присваивает элементу атрибут `data-jsse-initiated`.
	 * @private
	 */
	_setInitiatedAttr() {
		this._element.setAttribute('data-jsse-initiated', true);
	}

	/**
	 * Удаляет атрибут `data-jsse-initiated`.
	 * @private
	 */
	_removeInitiatedAttr() {
		this._element.removeAttribute('data-jsse-initiated');
	}


	/**
	 * =============================================================
	 * CACHE
	 * =============================================================
	 */


	/**
	 * Инициализирует кэш стилей для элемента.
	 * @private
	 */
	_initCacheStyles() {
		if (!jsse_styles.get(this._element)) {
			jsse_styles.set(this._element, {});
		}
	}

	/**
	 * Удаляет кэш стилей элемента.
	 * @private
	 */
	_deleteCacheStyles() {
		jsse_styles.delete(this._element);
	}

	/**
	 * Получает контроллер (если есть)
	 * @private
	 */
	_getController() {
		return jsse_controllers.get(this._element);
	}

	/**
	 * Проверяет существует ли контроллер
	 * @private
	 */
	_inControllers() {
		return !!this._getController();
	}

	/**
	 * Удаляет ссылку на контроллер из глобальной WeakMap.
	 * @private
	 */
	_deleteFromControllers() {
		jsse_controllers.delete(this._element);
	}


	/**
	 * =============================================================
	 * STYLESHEET
	 * =============================================================
	 */


	_initStylesheet() {
		this._targetTriggers = this._getTargetTriggers();
		jsse_console.debug({label:'STYLESHEET',element:this._element}, '[TARGET]', '[INIT]');
	}

	_registerTargetListeners(triggers) {
		this._hoverHandlers = {};
		for (const selector in triggers) {
			this._hoverHandlers[selector] = {
				in : (event) => { this._triggerHandlerIn(selector, event); },
				out : (event) => { this._triggerHandlerOut(selector, event); },
				on : [],
				hovered : false
			};
			triggers[selector].forEach((trigger) => {
				this._hoverHandlers[selector].on.push(trigger);
				this._registerTriggerListener(trigger, selector);
			});
		}
		jsse_console.debug({label:'STYLESHEET',element:this._element}, '[TARGET]', '[EVENTS]', true);
	}

	_unregisterTargetListeners() {
		for (const selector in this._hoverHandlers) {
			for (const trigger of this._hoverHandlers[selector].on) {
				this._unregisterTriggerListener(trigger, selector);
			}
		}
		this._hoverHandlers = {};
		jsse_console.debug({label:'STYLESHEET',element:this._element}, '[TARGET]', '[EVENTS]', false);
	}

	_registerTriggerListener(trigger, selector) {
		trigger.addEventListener('pointerenter', this._hoverHandlers[selector].in);
		trigger.addEventListener('pointerleave', this._hoverHandlers[selector].out);
		jsse_console.debug({label:'STYLESHEET',element:this._element}, '[TRIGGER]', '[EVENT]', true, selector);
	}

	_unregisterTriggerListener(trigger, selector) {
		trigger.removeEventListener('pointerenter', this._hoverHandlers[selector].in);
		trigger.removeEventListener('pointerleave', this._hoverHandlers[selector].out);
		jsse_console.debug({label:'STYLESHEET',element:this._element}, '[TRIGGER]', '[EVENT]', false, selector);
	}

		_triggerHandlerIn(selector, event) {
			if ( !this._element.matches(selector) ) return;
			this._hoverHandlers[selector].hovered = true;
			jsse_console.debug({label:'HOVER',element:this._element}, '[IN]', selector);
			this._mutationHandler();
		}

		_triggerHandlerOut(selector, event) {
			if ( !this._hoverHandlers[selector].hovered ) return;
			this._hoverHandlers[selector].hovered = false;
			jsse_console.debug({label:'HOVER',element:this._element}, '[OUT]', selector);
			this._mutationHandler();
		}

	_getTargetTriggers() {
		const triggerList = {};
		const targetSelectors = jsse_stylesheet.getTargetSelectors(this._element, {selectorHasHover:true});
		for (const targetSelector of targetSelectors) {
			const selectorTargetElements = this._getSelectorTriggerElements(targetSelector);
			if (selectorTargetElements.length > 0) {
				const selector = targetSelector.getSelector();
				triggerList[selector] = selectorTargetElements;
			}
		}
		return triggerList;
	}

	_getSelectorTriggerElements(selector) {
		const selectorTargetElements = [];
		const selectorParts = selector.getTriggerParts();
		for (const selectorPart of selectorParts) {
			const triggerElements = this._getSelectorPartTriggerElements(selectorPart);
			selectorTargetElements.push(...triggerElements);
		}
		return selectorTargetElements;
	}
		_getSelectorPartTriggerElements(selectorPart) {
			if (selectorPart.neighbor) {
				const neighborSelector = `${selectorPart.neighbor.combinator}${selectorPart.neighbor.clean}`;
				const cssSelectorHasCombinator = `:has(${selectorPart.neighbor.combinator}*)`;
				const hasCombinatorIsSupport = jsse_css_selector.isSupport(cssSelectorHasCombinator);
				if (hasCombinatorIsSupport) {
					return this._getSelectorPartTriggerElementsWithHasSupport(selectorPart, neighborSelector);
				} else {
					// Браузер НЕ поддерживает :has() — используем fallback
					jsse_console.warn({label:'HOVER', element: this._element}, '[FALLBACK] Using manual DOM traversal for:', neighborSelector);
					return  this._getSelectorPartTriggerElementsWithoutHasSupport(selectorPart.parent, neighborSelector, selectorPart.child);
				}
			} else {
				// Нет соседа — обычный селектор
				const triggers = Array.from(document.querySelectorAll(selectorPart.parent));
				return triggers.filter(trigger => 
					this._elementMatchesChildSelector(trigger, selectorPart.child)
				);
			}
		}
		_getSelectorPartTriggerElementsWithHasSupport(selectorPart, neighborSelector) {
			// Браузер поддерживает :has() — используем быстрый селектор
			const triggersSelector = `${selectorPart.parent}:has(${neighborSelector})`;
			const siblingSelector = `${selectorPart.parent}${neighborSelector}`;
			
			const triggers = Array.from(document.querySelectorAll(triggersSelector));
			const siblings = Array.from(document.querySelectorAll(siblingSelector));
			
			return triggers.filter((trigger, index) => {
				const current = siblings[index];
				return this._elementMatchesChildSelector(current, selectorPart.child);
			});
		}
		_getSelectorPartTriggerElementsWithoutHasSupport(parentSelector, neighborSelector, childSelector) {
			const result = [];
			
			// 1. Находим всех потенциальных родителей
			const allParents = Array.from(document.querySelectorAll(parentSelector));
			
			// 2. Парсим комбинатор и чистый селектор соседа
			const combinator = neighborSelector.trim()[0]; // '+' или '~'
			const cleanNeighborSelector = neighborSelector.trim().substring(1).trim();
			
			for (const parent of allParents) {
				// 3. Ищем соседние элементы относительно родителя или внутри него
				let neighborElements = [];
				
				if (combinator === '+') {
					// Соседний элемент (сразу следующий)
					const nextSibling = parent.nextElementSibling;
					if (nextSibling && nextSibling.matches(cleanNeighborSelector)) {
						neighborElements = [nextSibling];
					}
				} else if (combinator === '~') {
					// Все последующие соседние элементы
					let sibling = parent.nextElementSibling;
					while (sibling) {
						if (sibling.matches(cleanNeighborSelector)) {
							neighborElements.push(sibling);
						}
						sibling = sibling.nextElementSibling;
					}
				}
				
				// 4. Проверяем, содержит ли найденный сосед целевой элемент
				for (const neighbor of neighborElements) {
					if (this._elementMatchesChildSelector(neighbor, childSelector)) {
						result.push(parent);
						break; // Нашли триггер для этого родителя
					}
				}
			}
			
			return result;
		}

	_getSelectorElements(selector, parent=document) {
		return parent.querySelectorAll(selector);
	}

	_elementMatchesChildSelector(parent, selector) {
		if (!(parent.contains(this._element) || parent === this._element)) {
			return false;
		}
		if (parent === this._element) return true;

		const children = this._getSelectorElements(selector, parent);
		return Array.from(children).includes(this._element);
	}

	_getTriggerElements() {
		const targetSelectors = jsse_stylesheet.getTargetSelectors(this._element, {selectorHasHover:true});
	}


	/**
	 * =============================================================
	 * OBSERVERS
	 * =============================================================
	 */

	/**
	 * Подключает наблюдатели (MutationObserver, ResizeObserver, IntersectionObserver и пр.).
	 * @private
	 */
	_connectObservers() {
		this._mutationObserver = new MutationObserver(() => {
			this._mutationHandler();
		});
		this._mutationObserver.observe(this._element, {
			attributes: true,
			attributeFilter: ['style', 'class']
		});

		if (typeof IntersectionObserver !== 'undefined') {
			this._intersectionObserver = new IntersectionObserver((entries) => {
				this._intersectionHandler(entries);
			});
			this._intersectionObserver.observe(this._element);
		}

		if (typeof ResizeObserver !== 'undefined') {
			this._resizeObserver = new ResizeObserver(() => {
				this._resizeHandler();
			});
			this._resizeObserver.observe(this._element);
		}

		this._removalObserver = new MutationObserver(() => {
			this._destroyHandler();
		});
		this._removalObserver.observe(document.body, {
			childList: true,
			subtree: true
		});
	}

	/**
	 * Отключает всех наблюдателей.
	 * @private
	 */
	_disconnectObservers() {
		if (this._prepareTimer) clearTimeout(this._prepareTimer);
		if (this._executeTimer) clearTimeout(this._executeTimer);

		if (this._resizeObserver) this._resizeObserver.disconnect();
		if (this._mutationObserver) this._mutationObserver.disconnect();
		if (this._intersectionObserver) this._intersectionObserver.disconnect();
		if (this._removalObserver) this._removalObserver.disconnect();
	}

	/**
	 * Обработчик мутаций атрибутов/классов.
	 * @private
	 */
	_mutationHandler() {
		jsse_console.debug({label:'MUTATION', element:this._element}, '[DETECT]', this._isSelfMutation ? 'self' : 'flow');
		if (this._isSelfMutation)
			return;
		if (this._prepareTimer !== null) {
			clearTimeout(this._prepareTimer);
		}
		this._prepareTimer = setTimeout(() => {
			this._prepareTimer = null;
			jsse_console.debug({label:'MUTATION', element:this._element}, '[START]');
			this._isSelfMutation = true;
			try {
				jsse_console.debug({label:'MUTATION', element:this._element}, '[UPDATE]');
				if (this._isDisplay() && this._needsUpdate) {
					this._mode.update();
					this._needsUpdate = false;
				} else {
					this._mode.updateStyles();
				}
			} finally {
				if (this._executeTimer !== null) {
					clearTimeout(this._executeTimer);
				}
				this._executeTimer = setTimeout(() => {
					this._executeTimer = null;
					jsse_console.debug({label:'MUTATION', element:this._element}, '[END]');
					this._isSelfMutation = false;

				}, 0);
			}
		}, 0);
	}

	/**
	 * Обработчик изменения размеров.
	 * @private
	 */
	_resizeHandler() {
		if (this._isDisplay()) {
			try {
				this._mode.updateSize();
			} finally {
			}
		} else {
			this._needsUpdate = true;
		}
	}

	/**
	 * Обработчик видимости элемента (IntersectionObserver).
	 * @param {IntersectionObserverEntry[]} entries - Записи пересечений.
	 * @private
	 */
	_intersectionHandler(entries) {
		if (entries[0].isIntersecting && this._needsUpdate) {
			try {
				this._mode.update();
				this._needsUpdate = false;
			} finally {
			}
		}
	}

	/**
	 * Обработчик удаления элемента из DOM.
	 * @private
	 */
	_destroyHandler() {
		if (!document.body.contains(this._element)) {
			this._destroyController();
		}
	}
}