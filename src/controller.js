/**
 * @file src/controller.js
 * 
 * @module js-superellipse/controller
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


	_eventHandlers;


	/**
	 * =============================================================
	 * PUBLIC
	 * =============================================================
	 */


	/**
	 * Создаёт экземпляр контроллера.
	 * @since 1.0.0
	 * @param {Element} element - Целевой DOM-элемент.
	 * @param {Object} [options] - Опции инициализации.
	 * @param {boolean} [options.force] - Принудительное пересоздание, если контроллер уже существует.
	 * @param {string} [options.mode='svg-layer'] - Режим работы: 'svg-layer' или 'clip-path'.
	 * @param {number} [options.curveFactor] - Коэффициент кривизны (диапазон -2..2).
	 * @param {number} [options.precision=2] - Количество знаков после запятой в координатах пути.
	 * @param {boolean} [options.debug=false] - Включить отладочный вывод.
	 * @returns {SuperellipseController} Экземпляр контроллера.
	 */
	constructor(element, options = {}) {

		this._initId();
		
		/** Проверка существующего контроллера **/
		if (this._inControllers() && !options.force) {
			jsse_console.warn({label:'CONTROLLER', element: element}, 'The element is already initialized. Use {force:true} to recreate it.');
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
		this._initEvents();
		this._initCacheStyles();
		this._setInitiatedAttr();
		
		this._setMode(settings.mode);
		this._activateMode();
		this._connectObservers();
	}

	/**
	 * Переключает режим работы.
	 * @since 1.0.0
	 * @param {string} modeName - Имя режима ('svg-layer' или 'clip-path').
	 * @returns {SuperellipseController} this (для цепочек вызовов).
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
	 * @since 1.0.0
	 * @returns {boolean} true, если эффект активен.
	 */
	isEnabled() {
		return this._mode.isActivated();
	}

	/**
	 * Активирует суперэллипс.
	 * @since 1.0.0
	 * @returns {SuperellipseController} this.
	 */
	enable() {
		this._activateMode();
		return this;
	}

	/**
	 * Деактивирует суперэллипс, восстанавливая исходные стили.
	 * @since 1.0.0
	 * @returns {Element} Целевой элемент.
	 */
	disable() {
		this._deactivateMode();
		return this;
	}

	/**
	 * Устанавливает коэффициент кривизны углов.
	 * @since 1.0.0
	 * @param {number} value - Новое значение (диапазон -2..2).
	 * @returns {SuperellipseController} this.
	 */
	setCurveFactor(value) {
		this._curveFactor = value;
		this._mode.updateCurveFactor(value);
		this._emit('update', { type: 'curveFactor' });
		return this;
	}

	/**
	 * Устанавливает точность округления координат пути.
	 * @since 1.0.0
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
	 * @since 1.0.0
	 * @returns {string} Строка с командами path.
	 */
	getPath() {
		return this._mode.getPath();
	}

	/**
	 * Полностью уничтожает контроллер и удаляет все связанные эффекты.
	 * @since 1.0.0
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
	 * @since 1.0.0
	 * @protected
	 * @returns {void}
	 */
	_initId() {
		this._id = jsse_counter.value;
		jsse_counter.increment();
	}

	/**
	 * Инициализирует флаг отладки.
	 * @since 1.0.0
	 * @protected
	 * @param {boolean} debug - Включить отладку.
	 * @returns {void}
	 */
	_initDebug(debug) {
		this._debug = !!debug;
		if (this._debug) {
			jsse_console.set(this._element);
		}
	}

	/**
	 * Проверяет, включён ли режим отладки для данного контроллера.
	 * @since 1.0.0
	 * @protected
	 * @returns {boolean}
	 */
	_isDebug() {
		return this._debug;
	}

	/**
	 * Проверяет, не скрыт ли элемент (`display: none`).
	 * @since 1.0.0
	 * @protected
	 * @returns {boolean}
	 */
	_isDisplay() {
		const capturedStyles = getComputedStyle(this._element);
		return capturedStyles.getPropertyValue('display') !== 'none';
	}

	/**
	 * Полное уничтожение контроллера (внутренняя логика).
	 * @since 1.0.0
	 * @protected
	 * @returns {void}
	 */
	_destroyController() {
		this._disconnectObservers();
		this._deactivateMode();
		this._unsetMode();
		this._removeInitiatedAttr();

		this._destroyStylesheet();

		this._deleteCacheStyles();
		this._deleteFromControllers();
	}


	/**
	 * =============================================================
	 * EVENTS API
	 * =============================================================
	 */

	/**
	 * Инициализирует систему событий.
	 * @since 1.2.0
	 * @protected
	 * @returns {void}
	 */
	_initEvents() {
		this._eventHandlers = {
			update: [],
			activate: [],
			deactivate: [],
			error: []
		}
	};

	/**
	 * Подписывается на событие контроллера.
	 * @since 1.2.0
	 * @param {string} event - Имя события ('update', 'activate', 'deactivate', 'error').
	 * @param {Function} callback - Функция-обработчик. Принимает объект события.
	 * @returns {SuperellipseController} this.
	 */
	on(event, callback) {
		if (this._eventHandlers[event]) {
			this._eventHandlers[event].push(callback);
		}
		return this;
	}

	/**
	 * Отписывается от события контроллера.
	 * @since 1.2.0
	 * @param {string} event - Имя события.
	 * @param {Function} callback - Ранее добавленный обработчик.
	 * @returns {SuperellipseController} this.
	 */
	off(event, callback) {
		if (this._eventHandlers[event]) {
			const index = this._eventHandlers[event].indexOf(callback);
			if (index !== -1) this._eventHandlers[event].splice(index, 1);
		}
		return this;
	}

	/**
	 * Вызывает событие с заданными данными.
	 * @since 1.2.0
	 * @protected
	 * @param {string} event - Имя события.
	 * @param {*} data - Данные события.
	 * @returns {void}
	 */
	_emit(event, data) {
		if (this._eventHandlers[event]) {
			this._eventHandlers[event].forEach(cb => {
				try {
					cb({ type: event, data, timestamp: Date.now(), target: this._element });
				} catch (e) {
					console.error('[JSSE] Event handler error:', e);
				}
			});
		}
	}


	/**
	 * =============================================================
	 * MODE
	 * =============================================================
	 */


	/**
	 * Устанавливает активный режим.
	 * @since 1.0.0
	 * @protected
	 * @param {string} modeName - Имя режима ('svg-layer' или 'clip-path').
	 * @returns {void}
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

	}

	/**
	 * Удаляет текущий режим, вызывая его деструктор.
	 * @since 1.0.0
	 * @protected
	 * @returns {void}
	 */
	_unsetMode() {

		this._mode.destroy();
		this._mode = null;
	}

	/**
	 * Активирует текущий режим и инициализирует обработчики hover.
	 * @since 1.0.0
	 * @protected
	 * @returns {void}
	 */
	_activateMode() {
		this._mode.activate();
		this._initStylesheet();
		this._registerTargetListeners(this._targetTriggers);

		this._emit('activate', { mode: this._mode._getModeName() });
	}

	/**
	 * Деактивирует текущий режим и удаляет обработчики hover.
	 * @since 1.0.0
	 * @protected
	 * @returns {void}
	 */
	_deactivateMode() {
		this._mode.deactivate();
		this._unregisterTargetListeners();

		this._emit('deactivate', { mode: this._mode._getModeName() });
	}


	/**
	 * =============================================================
	 * ATTRIBUTES
	 * =============================================================
	 */


	/**
	 * Присваивает элементу атрибут `data-jsse-initiated`.
	 * @since 1.0.0
	 * @protected
	 * @returns {void}
	 */
	_setInitiatedAttr() {
		this._element.setAttribute('data-jsse-initiated', true);
	}

	/**
	 * Удаляет атрибут `data-jsse-initiated`.
	 * @since 1.0.0
	 * @protected
	 * @returns {void}
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
	 * @since 1.0.0
	 * @protected
	 * @returns {void}
	 */
	_initCacheStyles() {
		if (!jsse_styles.get(this._element)) {
			jsse_styles.set(this._element, {});
		}
	}

	/**
	 * Удаляет кэш стилей элемента.
	 * @since 1.0.0
	 * @protected
	 * @returns {void}
	 */
	_deleteCacheStyles() {
		jsse_styles.delete(this._element);
	}

	/**
	 * Получает контроллер, связанный с элементом (из глобальной WeakMap).
	 * @since 1.0.0
	 * @protected
	 * @returns {SuperellipseController|undefined}
	 */
	_getController() {
		return jsse_controllers.get(this._element);
	}

	/**
	 * Проверяет, существует ли контроллер для элемента.
	 * @since 1.0.0
	 * @protected
	 * @returns {boolean}
	 */
	_inControllers() {
		return !!this._getController();
	}

	/**
	 * Удаляет ссылку на контроллер из глобальной WeakMap.
	 * @since 1.0.0
	 * @protected
	 * @returns {void}
	 */
	_deleteFromControllers() {
		jsse_controllers.delete(this._element);
	}


	/**
	 * =============================================================
	 * STYLESHEET
	 * =============================================================
	 */

	/**
	 * Инициализирует парсинг стилей и находит триггеры для hover.
	 * @since 1.1.0
	 * @protected
	 * @returns {void}
	 */
	_initStylesheet() {
		this._targetTriggers = this._getTargetTriggers();
		jsse_console.debug({label:'STYLESHEET',element:this._element}, '[TARGET]', '[INIT]');
	}

	/**
	 * Уничтожает данные стилей и обработчики hover.
	 * @since 1.1.0
	 * @protected
	 * @returns {void}
	 */
	_destroyStylesheet() {
		this._targetTriggers = null;
		this._hoverHandlers = null
		this._unregisterGlobalTouchEndListener();
		jsse_console.debug({label:'STYLESHEET',element:this._element}, '[TARGET]', '[DESTROY]');
	}

	/**
	 * Регистрирует обработчики событий на элементах-триггерах.
	 * @since 1.1.0
	 * @protected
	 * @param {Object} triggers - Объект, где ключ – селектор, значение – массив элементов.
	 * @returns {void}
	 */
	_registerTargetListeners(triggers) {
		this._hoverHandlers = {};
		for (const selector in triggers) {
			this._hoverHandlers[selector] = {
				in : (event) => { this._triggerHandlerIn(selector, event); },
				out : (event) => { this._triggerHandlerOut(selector, event); },
				touchStart : (event) => { this._triggerHandlerTouchIn(selector, event) },
				on : [],
				hovered : false,
				touchCount : 0
			};
			triggers[selector].forEach((trigger) => {
				this._hoverHandlers[selector].on.push(trigger);
				this._registerTriggerListener(trigger, selector);
			});
		}
		jsse_console.debug({label:'STYLESHEET',element:this._element}, '[TARGET]', '[EVENTS]', true);
	}

	/**
	 * Удаляет все зарегистрированные обработчики с триггеров.
	 * @since 1.1.0
	 * @protected
	 * @returns {void}
	 */
	_unregisterTargetListeners() {
		for (const selector in this._hoverHandlers) {
			for (const trigger of this._hoverHandlers[selector].on) {
				if (trigger && trigger.removeEventListener) {
					this._unregisterTriggerListener(trigger, selector);
				}
			}
		}
		this._hoverHandlers = {};

		// Удаляем глобальный обработчик touchend
		if (this._globalTouchEndHandler) {
			document.body.removeEventListener('touchend', this._globalTouchEndHandler);
			this._globalTouchEndHandler = null;
		}
		
		jsse_console.debug({label:'STYLESHEET',element:this._element}, '[TARGET]', '[EVENTS]', false);
	}

	/**
	 * Добавляет обработчики на конкретный элемент-триггер.
	 * @since 1.1.0
	 * @protected
	 * @param {Element} trigger - DOM-элемент-триггер.
	 * @param {string} selector - Селектор, связанный с триггером.
	 * @returns {void}
	 */
	_registerTriggerListener(trigger, selector) {
		// Мышь / перо
		trigger.addEventListener('mouseenter', this._hoverHandlers[selector].in);
		trigger.addEventListener('mouseleave', this._hoverHandlers[selector].out);
		
		// Касание
		trigger.addEventListener('touchstart', this._hoverHandlers[selector].touchStart);
		this._registerGlobalTouchEndListener();

		jsse_console.debug({label:'STYLESHEET',element:this._element}, '[TRIGGER]', '[EVENT]', true, selector);
	}

	/**
	 * Регистрирует глобальный обработчик `touchend` для корректной работы hover на сенсорных экранах.
	 * @since 1.1.0
	 * @protected
	 * @returns {void}
	 */
	_registerGlobalTouchEndListener() {
		// Глобальный обработчик touchend (добавляем один раз)
		if (!this._globalTouchEndHandler) {
			this._globalTouchEndHandler = (event) => {
				for (const selector in this._hoverHandlers) {
					const handler = this._hoverHandlers[selector];
					if (handler.touchCount > 0) {
						this._triggerHandlerTouchOut(selector, event);
					}
				}
			};
			document.body.addEventListener('touchend', this._globalTouchEndHandler);
		}
	}

	/**
	 * Удаляет глобальный обработчик `touchend`.
	 * @since 1.1.0
	 * @protected
	 * @returns {void}
	 */
	_unregisterGlobalTouchEndListener() {
		if (this._globalTouchEndHandler) {
			document.body.removeEventListener('touchend', this._globalTouchEndHandler);
			this._globalTouchEndHandler = null;
		}
	}

	/**
	 * Удаляет обработчики с элемента-триггера.
	 * @since 1.1.0
	 * @protected
	 * @param {Element} trigger - DOM-элемент-триггер.
	 * @param {string} selector - Селектор, связанный с триггером.
	 * @returns {void}
	 */
	_unregisterTriggerListener(trigger, selector) {
		trigger.removeEventListener('mouseenter', this._hoverHandlers[selector].in);
		trigger.removeEventListener('mouseleave', this._hoverHandlers[selector].out);
		trigger.removeEventListener('touchstart', this._hoverHandlers[selector].touchStart);

		jsse_console.debug({label:'STYLESHEET',element:this._element}, '[TRIGGER]', '[EVENT]', false, selector);
	}

	/**
	 * Обработчик события `mouseenter` / `pointerenter` на триггере.
	 * @since 1.1.0
	 * @protected
	 * @param {string} selector - Селектор триггера.
	 * @param {Event} event - Событие.
	 * @returns {void}
	 */
	_triggerHandlerIn(selector, event) {
		if ( !this._element.matches(selector) || !this._hoverHandlers[selector] ) return;
		this._hoverHandlers[selector].hovered = true;
		jsse_console.debug({label:'HOVER',element:this._element}, '[IN]', selector, event);
		this._mutationHandler();
	}

	/**
	 * Обработчик события `mouseleave` / `pointerleave` на триггере.
	 * @since 1.1.0
	 * @protected
	 * @param {string} selector - Селектор триггера.
	 * @param {Event} event - Событие.
	 * @returns {void}
	 */
	_triggerHandlerOut(selector, event) {
		if ( this._element.matches(selector) || !this._hoverHandlers[selector] || !this._hoverHandlers[selector]?.hovered ) return;
		this._hoverHandlers[selector].hovered = false;
		jsse_console.debug({label:'HOVER',element:this._element}, '[OUT]', selector, event);
		this._mutationHandler();
	}

	/**
	 * Обработчик `touchstart` на триггере (увеличивает счётчик касаний).
	 * @since 1.1.0
	 * @protected
	 * @param {string} selector - Селектор триггера.
	 * @param {TouchEvent} event - Событие касания.
	 * @returns {void}
	 */
	_triggerHandlerTouchIn(selector, event) {
		if ( !this._hoverHandlers[selector] || this._hoverHandlers[selector]?.touchCount !== undefined ) {
			this._hoverHandlers[selector].touchCount++;
			if (this._hoverHandlers[selector].touchCount === 1) {
				this._triggerHandlerIn(selector, event);
			}
		}
	}

	/**
	 * Обработчик `touchend` (уменьшает счётчик касаний и вызывает выход при обнулении).
	 * @since 1.1.0
	 * @protected
	 * @param {string} selector - Селектор триггера.
	 * @param {TouchEvent} event - Событие касания.
	 * @returns {void}
	 */
	_triggerHandlerTouchOut(selector, event) {
		if ( !this._hoverHandlers[selector] || this._hoverHandlers[selector]?.touchCount !== undefined ) {
			this._hoverHandlers[selector].touchCount--;
			if (this._hoverHandlers[selector].touchCount === 0) {
				this._triggerHandlerOut(selector, event);
			}
		}
	}

	/**
	 * Находит все элементы-триггеры, которые могут вызвать изменение стилей при наведении на целевой элемент.
	 * @since 1.1.0
	 * @protected
	 * @returns {Object<string, Element[]>} Объект, где ключ – селектор, значение – массив элементов.
	 */
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

	/**
	 * Для заданного CSS-правила (селектора) возвращает массив элементов-триггеров.
	 * @since 1.1.0
	 * @protected
	 * @param {StylesheetParserSelector} selector - Объект селектора.
	 * @returns {Element[]}
	 */
	_getSelectorTriggerElements(selector) {
		const selectorTargetElements = [];
		const selectorParts = selector.getTriggerParts();
		for (const selectorPart of selectorParts) {
			const triggerElements = this._getSelectorPartTriggerElements(selectorPart);
			selectorTargetElements.push(...triggerElements);
		}
		return selectorTargetElements;
	}

	/**
	 * Для одной части составного селектора возвращает элементы-триггеры.
	 * @since 1.1.0
	 * @protected
	 * @param {Object} selectorPart - Часть селектора с полями parent, neighbor, child.
	 * @returns {Element[]}
	 */
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

	/**
	 * Реализация поиска триггеров с использованием современного CSS-селектора `:has()`.
	 * @since 1.1.0
	 * @protected
	 * @param {Object} selectorPart - Часть селектора.
	 * @param {string} neighborSelector - Селектор соседнего элемента.
	 * @returns {Element[]}
	 */
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

	/**
	 * Fallback-реализация поиска триггеров для браузеров без поддержки `:has()`.
	 * @since 1.1.0
	 * @protected
	 * @param {string} parentSelector - Селектор родителя.
	 * @param {string} neighborSelector - Селектор соседа (с комбинатором).
	 * @param {string} childSelector - Селектор дочернего элемента (целевой элемент).
	 * @returns {Element[]}
	 */
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

	/**
	 * Возвращает список элементов, соответствующих селектору, в заданном контексте.
	 * @since 1.1.0
	 * @protected
	 * @param {string} selector - CSS-селектор.
	 * @param {Element|Document} [parent=document] - Корневой элемент для поиска.
	 * @returns {NodeListOf<Element>}
	 */
	_getSelectorElements(selector, parent=document) {
		return parent.querySelectorAll(selector);
	}

	/**
	 * Проверяет, содержится ли целевой элемент внутри родителя с учётом дочернего селектора.
	 * @since 1.1.0
	 * @protected
	 * @param {Element} parent - Потенциальный родитель.
	 * @param {string} selector - Селектор дочернего элемента.
	 * @returns {boolean}
	 */
	_elementMatchesChildSelector(parent, selector) {
		if (!(parent.contains(this._element) || parent === this._element)) {
			return false;
		}
		if (parent === this._element) return true;

		const children = this._getSelectorElements(selector, parent);
		return Array.from(children).includes(this._element);
	}

	/**
	 * Заглушка для получения элементов-триггеров (не используется).
	 * @since 1.1.0
	 * @protected
	 * @returns {void}
	 */
	_getTriggerElements() {
		const targetSelectors = jsse_stylesheet.getTargetSelectors(this._element, {selectorHasHover:true});
	}


	/**
	 * =============================================================
	 * OBSERVERS
	 * =============================================================
	 */

	/**
	 * Подключает наблюдатели: MutationObserver, ResizeObserver, IntersectionObserver и отслеживание удаления.
	 * @since 1.0.0
	 * @protected
	 * @returns {void}
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
	 * Отключает всех наблюдателей и очищает таймеры.
	 * @since 1.0.0
	 * @protected
	 * @returns {void}
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
	 * Обработчик мутаций (изменение атрибутов style/class). Запускает отложенное обновление.
	 * @since 1.0.0
	 * @protected
	 * @returns {void}
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
					this._emit('update', { type: 'full' });
					this._needsUpdate = false;
				} else {
					this._mode.updateStyles();
					this._emit('update', { type: 'styles' });
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
	 * Обработчик изменения размеров элемента. При скрытом элементе устанавливает флаг `_needsUpdate`.
	 * @since 1.0.0
	 * @protected
	 * @returns {void}
	 */
	_resizeHandler() {
		if (this._isDisplay()) {
			try {
				this._mode.updateSize();
				this._emit('update', { type: 'size' });
			} finally {
			}
		} else {
			this._needsUpdate = true;
		}
	}

	/**
	 * Обработчик видимости элемента (IntersectionObserver). При появлении элемента выполняет отложенное обновление.
	 * @since 1.0.0
	 * @protected
	 * @param {IntersectionObserverEntry[]} entries - Записи пересечений.
	 * @returns {void}
	 */
	_intersectionHandler(entries) {
		if (entries[0].isIntersecting && this._needsUpdate) {
			try {
				this._mode.update();
				this._emit('update', { type: 'full' });
				this._needsUpdate = false;
			} finally {
			}
		}
	}

	/**
	 * Обработчик удаления элемента из DOM. При отсутствии элемента в документе уничтожает контроллер.
	 * @since 1.0.0
	 * @protected
	 * @returns {void}
	 */
	_destroyHandler() {
		if (!document.body.contains(this._element)) {
			this._destroyController();
		}
	}
}