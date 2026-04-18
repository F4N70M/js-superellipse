/**
 * Глобальный трекер наведения курсора с учётом видимости элементов.
 * Отслеживает состояние `:hover` для заданных элементов, автоматически сбрасывая его,
 * если элемент выходит за пределы viewport или удаляется из DOM.
 *
 * @class GlobalHoverTracker
 * @since 1.4.0
 */
export class GlobalHoverTracker {

	/**
	 * Создаёт экземпляр трекера.
	 * Инициализирует внутренние структуры данных, IntersectionObserver, MutationObserver,
	 * ResizeObserver и глобальные обработчики событий.
	 *
	 * @constructor
	 * @since 1.4.0
	 */
	constructor() {
		// Ключ: элемент, значение: { hover: bool, inViewport: bool, callback: function }
		this.data = new WeakMap();
		this.elementsSet = new Set(); // для быстрого перебора (WeakMap не итерируемый)
		this.scheduled = false;

		this.intersectionObserver = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					const el = entry.target;
					const record = this.data.get(el);
					if (!record) continue;
					const newInViewport = entry.isIntersecting;
					if (record.inViewport !== newInViewport) {
						record.inViewport = newInViewport;
						if (!newInViewport && record.hover) {
							record.hover = false;
							if (record.callback) record.callback(el, false);
						}
						if (newInViewport) this._scheduleCheck();
					}
				}
			},
			{ threshold: 0 }
		);

		this._initEventListeners();
		this._initMutationObserver();
		this._initResizeObserver();
	}

	/**
	 * Начинает отслеживание состояния наведения для указанного элемента.
	 * @since 1.4.0
	 * @param {Element} element - DOM-элемент, за которым нужно следить.
	 * @param {Function} [callback] - function(element:Element,isHover:boolean):void - Опциональная функция, вызываемая при изменении состояния наведения.
	 * @returns {void}
	 */
	observe(element, callback) {
		if (this.elementsSet.has(element)) return;
		this.elementsSet.add(element);
		this.data.set(element, {
			hover: false,
			inViewport: false,
			callback: callback || null
		});
		this.intersectionObserver.observe(element);
		this.resizeObserver.observe(element);
		this._scheduleCheck(); // первая проверка
	}

	/**
	 * Прекращает отслеживание состояния наведения для указанного элемента.
	 * Удаляет элемент из всех наблюдателей и очищает связанные с ним данные.
	 * @since 1.4.0
	 * @param {Element} element - DOM-элемент, отслеживание которого нужно прекратить.
	 * @returns {void}
	 */
	unobserve(element) {
		if (!this.elementsSet.has(element)) return;
		this.elementsSet.delete(element);
		this.data.delete(element);
		this.intersectionObserver.unobserve(element);
		this.resizeObserver.unobserve(element);
	}

	/**
	 * Возвращает текущее сохранённое состояние указанного элемента.
	 *
	 * @since 1.4.0
	 *
	 * @param {Element} element - DOM-элемент, чьё состояние требуется получить.
	 * @returns {{hover: boolean, inViewport: boolean, callback: Function|null}|null} — Объект с полями или `null`, если элемент не отслеживается.
	 */
	getState(element) {
		return this.data.get(element) || null;
	}

	/**
	 * Полностью уничтожает экземпляр трекера:
	 * - отключает всех наблюдателей (IntersectionObserver, ResizeObserver, MutationObserver),
	 * - очищает набор отслеживаемых элементов.
	 * Внутренний WeakMap очищается автоматически сборщиком мусора.
	 * @since 1.4.0
	 * @returns {void}
	 */
	destroy() {
		// очистка всех наблюдателей
		this.intersectionObserver.disconnect();
		this.resizeObserver.disconnect();
		this.domObserver.disconnect();
		this.elementsSet.clear();
		// WeakMap очистится сам
	}

	/**
	 * Инициализирует глобальные обработчики событий (mousemove, pointermove, scroll, resize),
	 * которые вызывают отложенную проверку состояний.
	 * @protected
	 * @since 1.4.0
	 * @returns {void}
	 */
	_initEventListeners() {
		const events = ['mousemove', 'pointermove', 'scroll', 'resize'];
		events.forEach(event => {
			window.addEventListener(event, () => this._scheduleCheck(), { passive: true });
			document.addEventListener(event, () => this._scheduleCheck(), { passive: true });
		});
	}


	/**
	 * Инициализирует MutationObserver для отслеживания изменений в DOM.
	 * При любых изменениях (поддерево, список дочерних элементов, атрибуты) запускает отложенную проверку.
	 * @protected
	 * @since 1.4.0
	 * @returns {void}
	 */
	_initMutationObserver() {
		this.domObserver = new MutationObserver(() => this._scheduleCheck());
		this.domObserver.observe(document.body, { subtree: true, childList: true, attributes: true });
	}

	/**
	 * Инициализирует ResizeObserver для отслеживания изменения размеров отслеживаемых элементов.
	 * При изменении размера запускает отложенную проверку.
	 * @protected
	 * @since 1.4.0
	 * @returns {void}
	 */
	_initResizeObserver() {
		this.resizeObserver = new ResizeObserver(() => this._scheduleCheck());
	}

	/**
	 * Планирует выполнение полной проверки всех элементов в следующем кадре анимации.
	 * Предотвращает многократный вызов до выполнения запланированной проверки.
	 * @protected
	 * @since 1.4.0
	 * @returns {void}
	 */
	_scheduleCheck() {
		if (this.scheduled) return;
		this.scheduled = true;
		requestAnimationFrame(() => {
			this.scheduled = false;
			this._checkAll();
		});
	}

	/**
	 * Выполняет синхронную проверку состояния наведения для всех отслеживаемых элементов.
	 * Обновляет внутреннее состояние и вызывает колбэки при изменении.
	 * Элементы, потерявшие связь с DOM, автоматически удаляются из отслеживания.
	 * @protected
	 * @since 1.4.0
	 * @returns {void}
	 */
	_checkAll() {
		for (const el of this.elementsSet) {
			if (!el.isConnected) {
				this.unobserve(el);
				continue;
			}
			const record = this.data.get(el);
			if (!record) continue;

			if (!record.inViewport) {
				if (record.hover) {
					record.hover = false;
					if (record.callback) record.callback(el, false);
				}
				continue;
			}

			const nowHover = el.matches(':hover');
			if (nowHover !== record.hover) {
				record.hover = nowHover;
				if (record.callback) record.callback(el, nowHover);
			}
		}
	}
}