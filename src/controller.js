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
import { jsse_element_has_class, jsse_debug } from './support.js';


/**
 * Контроллер, управляющий применением суперэллипса к DOM-элементу.
 */
export class SuperellipseController
{
	#id;
	#debug;

	#mode;
	#element;

	#precision; // Количество знаков после запятой
	#curveFactor;

	#mutationFrame;
	#resizeFrame;
	#intersectionFrame;
	

	#prepareTimer;
	#executeTimer;
	#isSelfMutation = false;

	#resizeObserver;
	#mutationObserver;
	#removalObserver;
	#intersectionObserver;

	#needsUpdate;
	#isSelfApply;


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

		this.#initId();
		this.#initDebug();
		
		/** Проверка существующего контроллера **/
		if (this.#inControllers() && !options.force) {
			console.warn('[Superellipse] Элемент уже инициализирован. Используйте force: true для пересоздания');
			return this.#getController();
		}

		options = {
			mode: 'svg-layer',
			...options
		};
		this.#element = element;
		this.#curveFactor = options.curveFactor ?? jsse_getBorderRadiusFactor();
		this.#precision = options.precision ?? 2;

		this.#needsUpdate = false;
		this.#isSelfApply = false;

		/** Слушатели **/
		this.#resizeObserver = null;
		this.#mutationObserver = null;
		this.#removalObserver = null;
		this.#intersectionObserver = null;

		/** init **/
		this.#initCacheStyles();
		this.#setInitiatedAttr();
		
		this.#setMode(options.mode);
		this.#connectObservers();
	}

    /**
     * Переключает режим работы.
     * @param {string} modeName - Имя режима ('svg-layer' или 'clip-path').
     * @returns {SuperellipseController} this (для цепочек).
     */
	switchMode(modeName) {
		this.#unsetMode();
		this.#setMode(modeName);
		return this;
	}

    /**
     * Проверяет, активирован ли суперэллипс.
     * @returns {boolean} true, если активирован.
     */
	isEnabled() {
		return this.#mode.isActivated();
	}

    /**
     * Активирует суперэллипс.
     * @returns {SuperellipseController} this.
     */
	enable() {
		this.#mode.activate();
		return this;
	}

    /**
     * Деактивирует суперэллипс, восстанавливая исходные стили.
     * @returns {Element} Целевой элемент.
     */
	disable() {
		this.#mode.deactivate();
		return this.#element;
	}

    /**
     * Устанавливает коэффициент кривизны углов.
     * @param {number} value - Новое значение (диапазон -2..2).
     * @returns {SuperellipseController} this.
     */
	setCurveFactor(value) {
		this.#curveFactor = value;
		this.#mode.updateCurveFactor(value);
		return this;
	}

    /**
     * Устанавливает точность округления координат пути.
     * @param {number} value - Количество знаков после запятой.
     * @returns {SuperellipseController} this.
     */
	setPrecision(value) {
		this.#precision = value;
		this.#mode.updatePrecision(value);
		return this;
	}

    /**
     * Возвращает текущий SVG-путь суперэллипса.
     * @returns {string} Строка с командами path.
     */
	getPath() {
		return this.#mode.getPath();
	}

    /**
     * Полностью уничтожает контроллер и удаляет все связанные эффекты.
     * @returns {Element} Целевой элемент.
     */
	destroy() {
		return this.#destroyController();
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
	#initId() {
		this.#id = jsse_counter.value;
		jsse_counter.increment();
	}

    /**
     * Инициализирует флаг отладки.
     * @private
     */
	#initDebug() {
		this.#debug = (jsse_debug.id === null || this.#id === jsse_debug.id);
	}

    /**
     * Проверяет, включён ли режим отладки для данного контроллера.
     * @returns {boolean}
     * @private
     */
	#isDebug() {
		return this.#debug;
	}

    /**
     * Проверяет, не скрыт ли элемент (`display: none`).
     * @returns {boolean}
     * @private
     */
	#isDisplay() {
		const capturedStyles = getComputedStyle(this.#element);
		return capturedStyles.getPropertyValue('display') !== 'none';
	}


	/**
	 * Метод полного уничтожения контроллера (внутренняя логика).
     * @private
     */
	#destroyController() {
		this.#disconnectObservers();
		this.#unsetMode();
		this.#removeInitiatedAttr();

		this.#deleteCacheStyles();
		this.#deleteFromControllers();
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
	#setInitiatedAttr() {
		this.#element.setAttribute('data-jsse-initiated', true);
	}

    /**
     * Удаляет атрибут `data-jsse-initiated`.
     * @private
     */
	#removeInitiatedAttr() {
		this.#element.removeAttribute('data-jsse-initiated');
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
	#initCacheStyles() {
		if (!jsse_styles.get(this.#element)) {
			jsse_styles.set(this.#element, {});
		}
	}

    /**
     * Удаляет кэш стилей элемента.
     * @private
     */
	#deleteCacheStyles() {
		jsse_styles.delete(this.#element);
	}

    /**
     * Получает контроллер (если есть)
     * @private
     */
	#getController() {
		return jsse_controllers.get(this.#element);
	}

    /**
     * Проверяет существует ли контроллер
     * @private
     */
	#inControllers() {
		return !!this.#getController();
	}

    /**
     * Удаляет ссылку на контроллер из глобальной WeakMap.
     * @private
     */
	#deleteFromControllers() {
		jsse_controllers.delete(this.#element);
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
	#setMode(modeName) {
		switch (modeName) {
			case 'svg-layer':
				this.#mode = new SuperellipseModeSvgLayer(this.#element, this.#isDebug());
				break;

			case 'clip-path':
			default:
				this.#mode = new SuperellipseModeClipPath(this.#element, this.#isDebug());
				break;
		}
		this.#mode.setCurveFactor(this.#curveFactor);
		this.#mode.setPrecision(this.#precision);

		this.#mode.activate();
	}

    /**
     * Удаляет текущий режим, вызывая его деструктор.
     * @private
     */
	#unsetMode() {
		this.#mode.destroy();
		this.#mode = null;
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
	#connectObservers() {
		this.#mutationObserver = new MutationObserver(() => {
			this.#mutationHandler();
		});
		this.#mutationObserver.observe(this.#element, {
			attributes: true,
			attributeFilter: ['style', 'class']
		});

		if (typeof IntersectionObserver !== 'undefined') {
			this.#intersectionObserver = new IntersectionObserver((entries) => {
				this.#intersectionHandler(entries);
			});
			this.#intersectionObserver.observe(this.#element);
		}

		if (typeof ResizeObserver !== 'undefined') {
			this.#resizeObserver = new ResizeObserver(() => {
				this.#resizeHandler();
			});
			this.#resizeObserver.observe(this.#element);
		}

		this.#removalObserver = new MutationObserver(() => {
			this.#destroyHandler();
		});
		this.#removalObserver.observe(document.body, {
			childList: true,
			subtree: true
		});
	}

    /**
     * Отключает всех наблюдателей.
     * @private
     */
	#disconnectObservers() {
		if (this.#prepareTimer) clearTimeout(this.#prepareTimer);
		if (this.#executeTimer) clearTimeout(this.#executeTimer);

		if (this.#resizeObserver) this.#resizeObserver.disconnect();
		if (this.#mutationObserver) this.#mutationObserver.disconnect();
		if (this.#intersectionObserver) this.#intersectionObserver.disconnect();
		if (this.#removalObserver) this.#removalObserver.disconnect();
	}

    /**
     * Обработчик мутаций атрибутов/классов.
     * @private
     */
	#mutationHandler() {
		jsse_debug.print(this.#isDebug(), this.#element, ['MUTATION', 'DETECT', this.#isSelfMutation ? 'self' : 'flow']);
		if (this.#isSelfMutation)
			return;
		if (this.#prepareTimer !== null) {
			clearTimeout(this.#prepareTimer);
		}
		this.#prepareTimer = setTimeout(() => {
			this.#prepareTimer = null;
			jsse_debug.print(this.#isDebug(), this.#element, ['MUTATION', 'START']);
			this.#isSelfMutation = true;
			try {
				jsse_debug.print(this.#isDebug(), this.#element, ['MUTATION', 'UPDATE']);
				if (this.#isDisplay() && this.#needsUpdate) {
					this.#mode.update();
					this.#needsUpdate = false;
				} else {
					this.#mode.updateStyles();
				}
			} finally {
				if (this.#executeTimer !== null) {
					clearTimeout(this.#executeTimer);
				}
				this.#executeTimer = setTimeout(() => {
					this.#executeTimer = null;
					jsse_debug.print(this.#isDebug(), this.#element, ['MUTATION', 'END']);
					this.#isSelfMutation = false;

				}, 0);
			}
		}, 0);
	}

    /**
     * Обработчик изменения размеров.
     * @private
     */
	#resizeHandler() {
		if (this.#isDisplay()) {
			try {
				this.#mode.updateSize();
			} finally {
			}
		} else {
			this.#needsUpdate = true;
		}
	}

    /**
     * Обработчик видимости элемента (IntersectionObserver).
     * @param {IntersectionObserverEntry[]} entries - Записи пересечений.
     * @private
     */
	#intersectionHandler(entries) {
		if (entries[0].isIntersecting && this.#needsUpdate) {
			try {
				this.#mode.update();
				this.#needsUpdate = false;
			} finally {
			}
		}
	}

    /**
     * Обработчик удаления элемента из DOM.
     * @private
     */
	#destroyHandler() {
		if (!document.body.contains(this.#element)) {
			this.#destroyController();
		}
	}
}