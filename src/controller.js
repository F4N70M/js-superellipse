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

import { jsse_styles, jsse_counter } from './global-cache.js';
import { jsse_getBorderRadiusFactor } from './core.js';
import { jsse_controllers } from './global-cache.js';
import { SuperellipseModeSvgLayer } from './mode-svg-layer.js';
import { SuperellipseModeClipPath } from './mode-clip-path.js';
import { jsse_element_has_class, jsse_console } from './support.js';


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

		options = {
			mode: 'svg-layer',
			...options
		};
		this._element = element;
		this._initDebug((!!options.debug) ?? false);
		this._curveFactor = options.curveFactor ?? jsse_getBorderRadiusFactor();
		this._precision = options.precision ?? 2;

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
		
		this._setMode(options.mode);
		this._connectObservers();
	}

	/**
	 * Переключает режим работы.
	 * @param {string} modeName - Имя режима ('svg-layer' или 'clip-path').
	 * @returns {SuperellipseController} this (для цепочек).
	 */
	switchMode(modeName) {
		this._unsetMode();
		this._setMode(modeName);
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
		this._mode.activate();
		return this;
	}

	/**
	 * Деактивирует суперэллипс, восстанавливая исходные стили.
	 * @returns {Element} Целевой элемент.
	 */
	disable() {
		this._mode.deactivate();
		return this._element;
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
	_initDebug(bool) {
		this._debug = bool;
		if (bool) {
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
		this._unsetMode();
		this._removeInitiatedAttr();

		this._deleteCacheStyles();
		this._deleteFromControllers();
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

		this._mode.activate();
	}

	/**
	 * Удаляет текущий режим, вызывая его деструктор.
	 * @private
	 */
	_unsetMode() {
		this._mode.destroy();
		this._mode = null;
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
		jsse_console.debug(this._element, '[MUTATION]', '[DETECT]', this._isSelfMutation ? 'self' : 'flow');
		if (this._isSelfMutation)
			return;
		if (this._prepareTimer !== null) {
			clearTimeout(this._prepareTimer);
		}
		this._prepareTimer = setTimeout(() => {
			this._prepareTimer = null;
			jsse_console.debug(this._element, '[MUTATION]', '[START]');
			this._isSelfMutation = true;
			try {
				jsse_console.debug(this._element, '[MUTATION]', '[UPDATE]');
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
					jsse_console.debug(this._element, '[MUTATION]', '[END]');
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