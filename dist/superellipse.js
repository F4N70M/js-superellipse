/**
 * 
 * @module js-superellipse
 * @version 1.0.0
 * @author f4n70m
 * @license MIT
 * 
 * @description
 * Библиотека для применения суперэллипсов к произвольным DOM-элементам.
 * Позволяет плавно изменять форму углов от вогнутых прямоугольных (-2) до выгнутых прямоугольных (2),
 * проходя через скос (0), круглые углы (±G) и классический суперэллипс (1).
 * 
 * Особенности:
 * - Два режима работы: `clip-path` (легковесный) и `svg-layer` (полнофункциональный с поддержкой границ и теней).
 * - Автоматическое отслеживание изменений размеров, стилей, видимости и атрибутов элемента.
 * - Поддержка `border-radius`, `border`, `box-shadow`, `background` в режиме `svg-layer`.
 * - Несколько способов инициализации: через селектор, элемент, коллекцию или глобальную функцию.
 * - Умное кэширование стилей для минимизации перерисовок.
 * 
 * @typicalname superellipse
 * 
 * @example
 * // Инициализация элемента с режимом svg-layer (по умолчанию)
 * const element = document.querySelector('.my-element');
 * const controller = element.superellipseInit({
 *   curveFactor: 1.2,
 *   precision: 3
 * });
 * 
 * // Изменение коэффициента кривизны
 * controller.setCurveFactor(0.8);
 * 
 * // Переключение режима
 * controller.switchMode('clip-path');
 * 
 * // Инициализация всех элементов с классом .rounded
 * superellipseInit('.rounded', { mode: 'clip-path' });
 * 
 * @example
 * // Генерация только SVG-пути без привязки к DOM
 * import { jsse_generateSuperellipsePath } from 'js-superellipse';
 * const path = jsse_generateSuperellipsePath(200, 150, 20, 1.5);
 * document.querySelector('path').setAttribute('d', path);
 */

/**
 * Глобальная функция для инициализации суперэллипса на одном или нескольких элементах.
 * @function superellipseInit
 * @memberof module:js-superellipse
 * @param {string|Element|NodeList|Array<Element>} target - CSS-селектор, DOM-элемент или коллекция.
 * @param {Object} [options] - Опции инициализации.
 * @param {string} [options.mode='svg-layer'] - Режим: `'svg-layer'` (полная поддержка стилей) или `'clip-path'` (только обрезка).
 * @param {number} [options.curveFactor] - Коэффициент кривизны (от -2 до 2). По умолчанию `(4/3)*(√2-1) ≈ 0.5523`.
 * @param {number} [options.precision=2] - Количество знаков после запятой в координатах пути.
 * @param {boolean} [options.force=false] - Принудительное пересоздание контроллера, если элемент уже инициализирован.
 * @returns {SuperellipseController|Array<SuperellipseController>} Контроллер для одного элемента или массив контроллеров.
 * @throws {Error} Если target не является селектором, элементом или коллекцией.
 */

/**
 * Класс контроллера, управляющего жизненным циклом суперэллипса для конкретного элемента.
 * @class SuperellipseController
 * @memberof module:js-superellipse
 * @hideconstructor
 * @example
 * const controller = new SuperellipseController(element, options);
 * // или через фабрику: element.superellipseInit(options)
 */

(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.Superellipse = {}));
})(this, (function (exports) { 'use strict';

	/**
	 * @file src/support.js
	 * 
	 * @module js-superellipse/support
	 * @since 1.0.0
	 * @author f4n70m
	 * 
	 * @description
	 * Вспомогательные утилиты и инструменты отладки.
	 */


	/**
	 * Объект для проверки поддержки CSS-селекторов.
	 * @namespace jsse_css_selector
	 * @since 1.1.0
	 */
	const jsse_css_selector = {

		/**
		 * Кэш результатов проверки поддержки селекторов.
		 * @since 1.1.0
		 * @type {Object<string, boolean>}
		 */
		list : {},

		/**
		 * Проверяет, поддерживает ли браузер указанный CSS-селектор.
		 * @since 1.1.0
		 * @param {string} selector - CSS-селектор для проверки (например, ':has(.a)').
		 * @returns {boolean} true, если селектор поддерживается, иначе false.
		 */
		isSupport(selector) {
			if (this.list[selector] === undefined) {
				try {
					const value = `selector(${selector})`;
					this.list[selector] = CSS.supports(value);
				} catch (e) {
					this.list[selector] = false;
				}
			}
			return this.list[selector];
		}
	};


	/**
	 * Объект для управления отладочным выводом в консоль.
	 * @namespace jsse_console
	 * @since 1.0.0
	 */
	const jsse_console = {

		/**
		 * Список DOM-элементов, для которых включена отладка.
		 * @type {Element[]}
		 * @private
		 */
		_list: [],
		
		/**
		 * Включает отладку для указанного элемента.
		 * @since 1.0.0
		 * @param {Element} element - DOM-элемент.
		 * @returns {void}
		 */
		set(element) {
			this._list.push(element);
			// this.debug('set', {element});
			// console.log(this._list);
			// console.debug(`[DEBUG]`, {src:'jsse_console::set', element});
			console.debug('[JSSE]', '[DEBUG]', true, '\n\t', {element:element});
		},

		/**
		 * Выводит отладочное сообщение в консоль (если отладка включена для элемента или сообщение глобальное).
		 * @since 1.0.0
		 * @param {Object} options - Опции.
		 * @param {Element} [options.element] - Элемент, для которого проверяется включение отладки.
		 * @param {string} [options.label='DEBUG'] - Метка для вывода.
		 * @param {...any} values - Значения для вывода.
		 * @returns {void}
		 */
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

		/**
		 * Выводит предупреждение в консоль (если отладка включена для элемента или сообщение глобальное).
		 * @since 1.0.0
		 * @param {Object} options - Опции.
		 * @param {Element} [options.element] - Элемент, для которого проверяется включение отладки.
		 * @param {string} [options.label='DEBUG'] - Метка для вывода.
		 * @param {...any} values - Значения для вывода.
		 * @returns {void}
		 */
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

	/**
	 * @file src/support.js
	 * 
	 * @module js-superellipse/css-parser
	 * @since 1.1.0
	 * @author f4n70m
	 * 
	 * @description
	 * Модуль парсинга css стилей страницы.
	 */



	/**
	 * Представляет фрагмент CSS-селектора (часть между комбинаторами).
	 * @class StylesheetParserFragment
	 * @since 1.1.0
	 */
	class StylesheetParserFragment {
		_combinator;
		_full;
		_clean;
		_pseudo;

		/**
		 * @param {Object} options - Параметры фрагмента.
		 * @param {string} options.combinator - Комбинатор (пробел, '>', '+', '~').
		 * @param {string} options.full - Полный текст фрагмента.
		 * @param {string} options.clean - Очищенный текст (без псевдоклассов).
		 * @param {string[]} options.pseudo - Список псевдоклассов/псевдоэлементов.
		 */
		constructor(options) {
			this._combinator = options.combinator;
			const isRoot = options.full === ':root';
			this._clean = isRoot||options.clean?options.clean:`*`;
			this._full = isRoot||options.clean?options.full:`*${options.full}`;
			this._pseudo = [...new Set(options.pseudo)];
		}

		/**
		 * Возвращает комбинатор.
		 * @since 1.1.0
		 * @returns {string}
		 */
		getCombinator() {
			return this._combinator;
		};

		/**
		 * Возвращает полный текст фрагмента.
		 * @since 1.1.0
		 * @returns {string}
		 */
		getFull() {
			return this._full;
		}

		/**
		 * Возвращает очищенный текст фрагмента.
		 * @since 1.1.0
		 * @returns {string}
		 */
		getClean() { return this._clean; };

		/**
		 * Возвращает список псевдоклассов/псевдоэлементов.
		 * @since 1.1.0
		 * @returns {string[]}
		 */
		getPseudoList() { return this.pseudo; };

		/**
		 * Проверяет наличие конкретного псевдокласса.
		 * @since 1.1.0
		 * @param {string} pseudo - Псевдокласс (например, ':hover').
		 * @returns {boolean}
		 */
		hasPseudo(pseudo) {
			return this._pseudo.includes(pseudo);
		}

		/**
		 * Проверяет наличие псевдокласса `:hover`.
		 * @since 1.1.0
		 * @returns {boolean}
		 */
		hasHover() {
			return this.hasPseudo(':hover');
		}
	}


	/**
	 * Список фрагментов селектора (массив с валидацией).
	 * @class StylesheetParserFragmentList
	 * @extends Array
	 * @since 1.1.0
	 */
	class StylesheetParserFragmentList extends Array {


		/**
		 * =============================================================
		 * ARRAY
		 * =============================================================
		 */


		/**
		 * Проверяет, является ли элемент валидным фрагментом.
		 * @since 1.1.0
		 * @static
		 * @private
		 * @param {any} item - Проверяемый элемент.
		 * @returns {boolean}
		 */
		static #isValid(item) {
			return item instanceof StylesheetParserFragment;
		}

		/**
		 * Добавляет валидные фрагменты в конец массива.
		 * @override
		 * @param {...StylesheetParserFragment} items - Фрагменты.
		 * @returns {number}
		 */
		push(...items) {
			const valid = items.filter(item => StylesheetParserFragmentList.#isValid(item));
			return super.push(...valid);
		}

		/**
		 * Добавляет валидные фрагменты в начало массива.
		 * @override
		 * @param {...StylesheetParserFragment} items - Фрагменты.
		 * @returns {number}
		 */
		unshift(...items) {
			const valid = items.filter(item => StylesheetParserFragmentList.#isValid(item));
			return super.unshift(...valid);
		}

		/**
		 * Изменяет содержимое массива, удаляя или заменяя элементы.
		 * @override
		 * @param {number} start - Индекс начала.
		 * @param {number} deleteCount - Количество удаляемых элементов.
		 * @param {...StylesheetParserFragment} items - Добавляемые фрагменты.
		 * @returns {StylesheetParserFragment[]}
		 */
		splice(start, deleteCount, ...items) {
			const valid = items.filter(item => StylesheetParserFragmentList.#isValid(item));
			return super.splice(start, deleteCount, ...valid);
		}

		// Все остальные методы (forEach, map, filter, find, pop, shift и т.д.) 
		// работают автоматически, так как они наследуются от Array


		/**
		 * =============================================================
		 * PUBLIC
		 * =============================================================
		 */


		/**
		 * Возвращает последний фрагмент (целевой).
		 * @since 1.1.0
		 * @returns {StylesheetParserFragment}
		 */
		getTarget() {
			return this[this.length-1];
		}

		/**
		 * Возвращает индексы фрагментов, содержащих `:hover`.
		 * @since 1.1.0
		 * @returns {number[]}
		 */
		getTriggerIndexList() {
			return this.reduce((indexes, element, index) => {
				if (element.hasHover()) {
					indexes.push(index);
				}
				return indexes;
			}, []);
		}

		/**
		 * Проверяет, есть ли хотя бы один фрагмент с `:hover`.
		 * @since 1.1.0
		 * @returns {boolean}
		 */
		hasTrigger() {
			return this.getTriggerIndexList().length > 0;
		}

		/**
		 * Проверяет, содержит ли целевой фрагмент `:hover`.
		 * @since 1.1.0
		 * @returns {boolean}
		 */
		targetIsTriggered() {
			return this.getTarget().hasHover();
		}


		/**
		 * =============================================================
		 * PRIVATE
		 * =============================================================
		 */
	}


	/**
	 * Представляет CSS-правило (селектор + стили).
	 * @class StylesheetParserSelector
	 * @since 1.1.0
	 */
	class StylesheetParserSelector {

		_media;
		_selector;
		_fragments;

		_ruleStyle;
		_styles;

		_triggerFragments;
		_triggerIndexList;
		_triggerParts;

		/**
		 * @param {string} selector - Текст селектора.
		 * @param {CSSStyleDeclaration} ruleStyle - Стили правила.
		 * @param {string|false} media - Медиа-выражение (если правило внутри @media).
		 */
		constructor(selector, ruleStyle, media) {
			/** @type {string|false} */
			this._media = media;
			/** @type {string} */
			this._selector = selector;
			/** @type {StylesheetParserFragmentList|null} */
			this._fragments = null;
			/** @type {CSSStyleDeclaration} */
			this._ruleStyle = ruleStyle;
			/** @type {Object<string, string>|null} */
			this._styles = null;
			/** @type {StylesheetParserFragmentList|null} */
			this._triggerFragments = null;
			/** @type {number[]|null} */
			this._triggerIndexList = null;
			/** @type {Array|null} */
			this._triggerParts = null;
		}

		/**
		 * =============================================================
		 * PUBLIC
		 * =============================================================
		 */


		/**
		 * Возвращает текст селектора.
		 * @since 1.1.0
		 * @returns {string}
		 */
		getSelector() {
			return this._selector;
		}

		/**
		 * Возвращает распарсенные стили правила.
		 * @since 1.1.0
		 * @returns {Object<string, string>}
		 */
		getStyles() {
			if (this._styles === null) {
				this._styles = this._parseStyles();
			}
			return this._styles;
		}

		/**
		 * Возвращает список фрагментов селектора.
		 * @since 1.1.0
		 * @returns {StylesheetParserFragmentList}
		 */
		getFragments() {
			if (this._fragments === null) {
				this._fragments = this._getSelectorFragments(this._selector);
			}
			return this._fragments;
		}

		/**
		 * Проверяет, соответствует ли текущее медиа-правило.
		 * @since 1.1.0
		 * @returns {boolean}
		 */
		matchMedia() {
			return !this._media || window.matchMedia(this._media).matches;
		}

		/**
		 * Возвращает части селектора, участвующие в hover-триггерах.
		 * @since 1.1.0
		 * @returns {Array<{parent: string, neighbor: Object|null, child: string}>}
		 */
		getTriggerParts() {
			if (this._triggerParts === null) {
				this._triggerParts = [];
				const fragments = this.getFragments();
				const targetIndexList = fragments.getTriggerIndexList();
				for(const targetIndex of targetIndexList) {
					const parts = {parent:'',neighbor:null,child:null};
					for (let i = 0; i<fragments.length; i++) {
						const fragment = fragments[i];
						if (i <= targetIndex) {
							parts.parent += fragment.getCombinator() + fragment.getClean();

							if (i + 1 < fragments.length) {
								const nextFragment = fragments[i+1];
								const nextCombinator = nextFragment.getCombinator();
								if ([' + ', ' ~ '].includes(nextCombinator)) {
									parts.neighbor = {
										combinator: nextCombinator,
										clean : nextFragment.getClean()
									};
									i++;
								}
							}
						} else {
							if (!parts.child) parts.child = '';
							parts.child += fragment.getCombinator() + fragment.getClean();
						}
					}
					this._triggerParts.push(parts);
				}
			}
			return this._triggerParts;
		}

		/**
		 * Возвращает фрагменты, содержащие `:hover`.
		 * @since 1.1.0
		 * @returns {StylesheetParserFragmentList}
		 */
		getTriggerFragments() {
			if (this._triggerFragments === null) {
				this._triggerFragments = new StylesheetParserFragmentList();
				const fragments = this.getFragments();
				const indexList = fragments.getTriggerIndexList();
				for(const index of indexList) {
					const fragment = fragments[index];
					this._triggerFragments.push(fragment);
				}
			}
			return this._triggerFragments;
		}



		/**
		 * =============================================================
		 * PRIVATE
		 * =============================================================
		 */
		
		/**
		 * Парсит CSS-стили из cssText.
		 * @private
		 * @returns {Object<string, string>}
		 */
		_parseStyles() {
			const styles = {};
			if (this._ruleStyle.cssText) {
				const declarations = this._ruleStyle.cssText.split(';');
				for (const decl of declarations) {
					const colonIndex = decl.indexOf(':');
					if (colonIndex > 0) {
						const prop = decl.substring(0, colonIndex).trim();
						const value = decl.substring(colonIndex + 1).trim();
						if (prop && value) {
							styles[prop] = value;
						}
					}
				}
			}
			return styles;
		}

		/**
		 * Разбивает селектор на фрагменты.
		 * @private
		 * @param {string} selector - Текст селектора.
		 * @returns {StylesheetParserFragmentList}
		 */
		_getSelectorFragments(selector) {
			const s = selector;
			const result = new StylesheetParserFragmentList();
			let options = {
				combinator : '',
				full  : '',
				clean : '',
				pseudo: []
			};
			let pseudo = '';
			let i = 0;
			while (i < s.length) {
				if (s[i] === ':') {
					/** завершение записи текущего фрагмента перед псевдоэлементом **/
					if (i > 0 && s[i + 1] === ':') {

						if (options.combinator === '') options.combinator = ' ';

						result.push(new StylesheetParserFragment(options));
						options = {
							combinator : '',
							full  : '',
							clean : '',
							pseudo: []
						};
					}
					/** Псевдоэлемент (два двоеточия) **/
					if (s[i + 1] === ':' || (i > 0 && s[i - 1] === ':')) {
						options.full += s[i];
						options.clean += s[i];
						i++;
					}
					/** Псевдокласс **/
					else {

						pseudo += s[i];
						let j = i + 1;
						// pseudo += s[i];
						while (j < s.length && /[\w-]/.test(s[j])) {
							pseudo += s[j];
							j++;
						}
						// если есть аргументы в скобках
						if (s[j] === '(') {
							pseudo += s[j];
							let depth = 1, k = j + 1;
							while (k < selector.length && depth) {
								if (selector[k] === '(') depth++;
								else if (selector[k] === ')') depth--;
								pseudo += s[k];
								k++;
							}
							options.pseudo.push(pseudo);
							options.full += pseudo;
							pseudo = '';
							i = k;
						}
						// если
						else {
							options.pseudo.push(pseudo);
							options.full += pseudo;
							pseudo = '';
							i = j;
						}
					}
				} else {
					/** проверка combinator **/
					if (s[i] === ' ') {

						result.push(new StylesheetParserFragment(options));

						let combinator = ' ';
						if (/[\>\~\+]/.test(s[i+1]) && s[i + 2] === ' ') {
							combinator = s[i]+s[i+1]+s[i+2];
							i += 2;
						}

						options = {
							combinator : combinator,
							full  : '',
							clean : '',
							pseudo: []
						};

						i++;
					}
					else {
						options.full += s[i];
						options.clean += s[i];
						i++;
					}
				}
			}
			result.push(new StylesheetParserFragment(options));
			return result;
		}
	}


	/**
	 * Список CSS-селекторов (массив с валидацией).
	 * @class StylesheetParserSelectorList
	 * @extends Array
	 * @since 1.1.0
	 */
	class StylesheetParserSelectorList extends Array {


		/**
		 * =============================================================
		 * ARRAY
		 * =============================================================
		 */


		/**
		 * Проверяет, является ли элемент валидным селектором.
		 * @since 1.1.0
		 * @static
		 * @private
		 * @param {any} item - Проверяемый элемент.
		 * @returns {boolean}
		 */
		static #isValid(item) {
			return item instanceof StylesheetParserSelector;
		}

		/**
		 * Добавляет валидные селекторы в конец массива.
		 * @since 1.1.0
		 * @override
		 * @param {...StylesheetParserSelector} items - Селекторы.
		 * @returns {number}
		 */
		push(...items) {
			const valid = items.filter(item => StylesheetParserSelectorList.#isValid(item));
			return super.push(...valid);
		}

		/**
		 * Добавляет валидные селекторы в начало массива.
		 * @since 1.1.0
		 * @override
		 * @param {...StylesheetParserSelector} items - Селекторы.
		 * @returns {number}
		 */
		unshift(...items) {
			const valid = items.filter(item => StylesheetParserSelectorList.#isValid(item));
			return super.unshift(...valid);
		}

		/**
		 * Изменяет содержимое массива, удаляя или заменяя элементы.
		 * @since 1.1.0
		 * @override
		 * @param {number} start - Индекс начала.
		 * @param {number} deleteCount - Количество удаляемых элементов.
		 * @param {...StylesheetParserSelector} items - Добавляемые селекторы.
		 * @returns {StylesheetParserSelector[]}
		 */
		splice(start, deleteCount, ...items) {
			const valid = items.filter(item => StylesheetParserSelectorList.#isValid(item));
			return super.splice(start, deleteCount, ...valid);
		}

		// Все остальные методы (forEach, map, filter, find, pop, shift и т.д.) 
		// работают автоматически, так как они наследуются от Array


		/**
		 * =============================================================
		 * PUBLIC
		 * =============================================================
		 */


		/**
		 * Возвращает селекторы, содержащие `:hover`.
		 * @since 1.1.0
		 * @returns {StylesheetParserSelector[]}
		 */
		getSelectorsWithHover() {
			return this.filter(item => item.getFragments().hasTrigger());
		}


		/**
		 * =============================================================
		 * PRIVATE
		 * =============================================================
		 */
	}


	/**
	 * Парсер таблиц стилей. Извлекает CSS-правила, разбирает селекторы и предоставляет доступ к ним.
	 * @class StylesheetParser
	 * @since 1.1.0
	 */
	class StylesheetParser {
		_selectors;
		_isParsed;

		constructor() {
			/** @type {StylesheetParserSelectorList|null} */
			this._selectors = null;
			/** @type {boolean} */
			this._isParsed = false;
		}
		
		/**
		 * =============================================================
		 * PUBLIC
		 * =============================================================
		 */

		/**
		 * Возвращает список всех селекторов.
		 * @since 1.1.0
		 * @returns {StylesheetParserSelectorList}
		 */
		getSelectors() {
			this._ensureParsed();
			return this._selectors;
		}

		/**
		 * Возвращает селекторы, содержащие `:hover`.
		 * @since 1.1.0
		 * @returns {StylesheetParserSelector[]}
		 */
		getSelectorsHasHover() {
			this._ensureParsed();
			return this._selectors.getSelectorsWithHover();
		}

		/**
		 * Возвращает селекторы, которые соответствуют элементу и (опционально) содержат `:hover`.
		 * @since 1.1.0
		 * @param {Element} element - Целевой элемент.
		 * @param {Object} [options] - Опции.
		 * @param {boolean} [options.selectorHasHover] - Если true, возвращать только селекторы с `:hover`.
		 * @returns {StylesheetParserSelector[]}
		 */
		getTargetSelectors(element, options={}) {
			this._ensureParsed();
			const targetList = this._createList();
			const parserList = this.getSelectors();
			for(const selector of parserList) {
				const fragments = selector.getFragments();
				const clean = fragments.getTarget().getClean();
				if (!clean) continue;
				const isMatch = element.matches(clean);
				fragments.hasTrigger();
				if (
					isMatch &&
					( !options?.selectorHasHover || options.selectorHasHover && fragments.hasTrigger() )
				) {
					targetList.push(selector);
				}
			}
			return targetList;
		}

		/**
		 * Сбрасывает состояние парсера (принудительный перепарсинг при следующем вызове).
		 * @since 1.1.0
		 * @returns {void}
		 */
		reset() {
			this._selectors = null;
			this._isParsed = false;
		}

		/**
		 * =============================================================
		 * PRIVATE
		 * =============================================================
		 */


		/**
		 * Гарантирует, что парсинг выполнен.
		 * @private
		 * @returns {void}
		 */
		_ensureParsed() {
			if (this._isParsed) return;
			this._init();
			this._isParsed = true;
		}

		/**
		 * Инициализирует парсер: создаёт список и парсит CSS-правила.
		 * @private
		 * @returns {void}
		 */
		_init() {
			this._selectors = this._createList();
			this._parseCssRules();
			jsse_console.debug({label:'STYLESHEET'}, '[LOADED]');
		}

		/**
		 * Создаёт пустой список селекторов.
		 * @private
		 * @returns {StylesheetParserSelectorList}
		 */
		_createList() {
			return new StylesheetParserSelectorList();
		}

		/**
		 * Парсит все CSS-правила из document.styleSheets.
		 * @private
		 * @returns {void}
		 */
		_parseCssRules() {
			for (const styleSheet of document.styleSheets) {
				try {
					const rules = styleSheet.cssRules || styleSheet.rules;
					if (!rules) continue;

					for (const rule of rules) {
						if (rule.type === CSSRule.STYLE_RULE) {
							this._selectors.push(...this._getParsedCssRule(rule));
						}
						else if (rule.type === CSSRule.MEDIA_RULE) {
							try {
								for (const subRule of rule.cssRules) {
									this._selectors.push(...this._getParsedCssRule(subRule, rule.media.mediaText));
								}
							} catch (e) {
								jsse_console.warn({label:'STYLESHEET'}, `Error processing @media rules from ${styleSheet.href || 'inline'}:`, e.message);
							}
						}
						// Можно добавить другие типы правил (CSSRule.IMPORT_RULE, CSSRule.SUPPORTS_RULE и т.д.)
					}
				} catch (e) {
					if (e.name === 'SecurityError') {
						jsse_console.warn(
							{label:'STYLESHEET'},
							`Cannot access stylesheet rules:`,
							`\n${styleSheet.href || 'inline / blob'}.`,
							`\nCause: CORS or file:// protocol.`,
							`\nTo fix this, use a local server (http://) or add the crossorigin attribute.`
						);
					} else if (e.name === 'InvalidAccessError') {
						jsse_console.warn({label:'STYLESHEET'}, `The stylesheet ${styleSheet.href || 'inline'} has not yet loaded or has invalid access.`);
					} else {
						jsse_console.warn({label:'STYLESHEET'}, `Unknown error reading ${styleSheet.href || 'inline'}:`, e.message);
					}
				}
			}
		}

		/**
		 * Преобразует CSSRule в массив селекторов.
		 * @private
		 * @param {CSSRule} rule - CSS-правило.
		 * @param {string|false} [media=false] - Медиа-выражение (если правило внутри @media).
		 * @returns {StylesheetParserSelector[]}
		 */
		_getParsedCssRule(rule, media=false) {
			const result = [];
			const selectorGroup = rule.selectorText;
			const selectorList = this._splitSelectorGroup(selectorGroup);
			const uniqueSelectorList = [...new Set(selectorList)];
			for (const selector of uniqueSelectorList) {
				result.push( new StylesheetParserSelector(selector, rule.style, media) );
			}
			return result;
		}


		/**
		 * Разбивает группу селекторов по запятым, игнорируя запятые внутри скобок.
		 * @private
		 * @param {string} selectorText - Текст группы селекторов.
		 * @returns {string[]}
		 * @example
		 * _splitSelectorGroup(":not(.a, .b), .c") → [":not(.a, .b)", ".c"]
		 */
		_splitSelectorGroup(selectorText) {
			const result = [];
			let current = '';
			let depth = 0;		  // глубина вложенности в круглые скобки
			let inString = false;   // для простоты не поддерживаем строки (в CSS их почти нет в селекторах)
			let escape = false;

			for (let i = 0; i < selectorText.length; i++) {
				const ch = selectorText[i];
				
				if (escape) {
					current += ch;
					escape = false;
					continue;
				}
				
				if (ch === '\\') {
					escape = true;
					current += ch;
					continue;
				}
				
				if (ch === '"' || ch === "'") {
					inString = !inString;
					current += ch;
					continue;
				}
				
				if (!inString) {
					if (ch === '(') {
						depth++;
					} else if (ch === ')') {
						depth--;
					}
				}
				
				if (ch === ',' && depth === 0 && !inString) {
					// Запятая на нулевом уровне – разделитель
					result.push(current.trim());
					current = '';
				} else {
					current += ch;
				}
			}
			
			if (current.trim() !== '') {
				result.push(current.trim());
			}
			
			return result;
		}
	}

	/**
	 * Глобальный трекер наведения курсора с учётом видимости элементов.
	 * Отслеживает состояние `:hover` для заданных элементов, автоматически сбрасывая его,
	 * если элемент выходит за пределы viewport или удаляется из DOM.
	 *
	 * @class GlobalHoverTracker
	 * @since 1.4.0
	 */
	class GlobalHoverTracker {

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
		 *
		 * @since 1.4.0
		 *
		 * @param {Element} element - DOM-элемент, за которым нужно следить.
		 * @param {Function} [callback] - Опциональная функция, вызываемая при изменении состояния наведения.
		 *                                Принимает два аргумента: элемент (Element) и новое состояние (boolean).
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
		 *
		 * @since 1.4.0
		 *
		 * @param {Element} element - DOM-элемент, отслеживание которого нужно прекратить.
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
		 * @returns {Object|null} Объект с полями `hover` (boolean), `inViewport` (boolean), `callback` (Function|null)
		 *                        или `null`, если элемент не отслеживается.
		 */
		getState(element) {
			return this.data.get(element) || null;
		}

		/**
		 * Полностью уничтожает экземпляр трекера:
		 * - отключает всех наблюдателей (IntersectionObserver, ResizeObserver, MutationObserver),
		 * - очищает набор отслеживаемых элементов.
		 * Внутренний WeakMap очищается автоматически сборщиком мусора.
		 *
		 * @since 1.4.0
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
		 *
		 * @protected
		 * @since 1.4.0
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
		 *
		 * @protected
		 * @since 1.4.0
		 */
		_initMutationObserver() {
			this.domObserver = new MutationObserver(() => this._scheduleCheck());
			this.domObserver.observe(document.body, { subtree: true, childList: true, attributes: true });
		}

		/**
		 * Инициализирует ResizeObserver для отслеживания изменения размеров отслеживаемых элементов.
		 * При изменении размера запускает отложенную проверку.
		 *
		 * @protected
		 * @since 1.4.0
		 */
		_initResizeObserver() {
			this.resizeObserver = new ResizeObserver(() => this._scheduleCheck());
		}

		/**
		 * Планирует выполнение полной проверки всех элементов в следующем кадре анимации.
		 * Предотвращает многократный вызов до выполнения запланированной проверки.
		 *
		 * @protected
		 * @since 1.4.0
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
		 *
		 * @protected
		 * @since 1.4.0
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

	/**
	 * @file src/global-cache.js
	 * 
	 * @module js-superellipse/global-cache
	 * @since 1.0.0
	 * @author f4n70m
	 * 
	 * @description
	 * Глобальные хранилища для кэширования данных между экземплярами контроллеров и режимов.
	 */



	/**
	 * Карта для хранения контроллеров суперэллипса, связанных с DOM-элементами.
	 * @since 1.0.0
	 * @type {WeakMap<Element, import('./controller.js').SuperellipseController>}
	 */
	const jsse_controllers = new WeakMap();


	/**
	 * Экземпляр парсера таблиц стилей для анализа CSS-правил.
	 * @since 1.1.0
	 * @type {import('./stylesheet-parser.js').StylesheetParser}
	 */
	const jsse_stylesheet = new StylesheetParser();


	/**
	 * WeakMap для кэширования стилей элементов.
	 * @since 1.0.0
	 * @type {WeakMap<Element, Object>}
	 */
	const jsse_styles = new WeakMap();


	/**
	 * Экземпляр обработчика hover событий.
	 * @since 1.4.0
	 * @type {import('./hover-tracker.js').GlobalHoverTracker}
	 */
	const jsse_hover_tracker = new GlobalHoverTracker();


	/**
	 * Карта для хранения триггеров состояний элементов.
	 * @since 1.4.0
	 * @type {WeakMap<Element, Set<Element>>}
	 */
	const jsse_trigger_callbacks = {
		
		triggers: new WeakMap(),

		add(trigger, callback) {
			if(!this.triggers.has(trigger)) {
				this.triggers.set(trigger, new Set());
			}
			const callbacks = this.triggers.get(trigger);
			callbacks.add(callback);
		},
		delete(trigger, callback) {
			if(!this.triggers.has(trigger)) return;
			const callbacks = this.triggers.get(trigger);
			callbacks.delete(callback);
			if (callbacks.size < 1) {
				this.triggers.delete(trigger);
			}
		},
		has(trigger) {
			return this.triggers.has(trigger);
		},
	    call(trigger, ...args) {
	        if (!this.triggers.has(trigger)) return;
	        const callbacks = this.triggers.get(trigger);
	        for (const callback of callbacks) {
	            try {
	                callback(...args);
	            } catch (error) {
	                console.error('Ошибка в колбэке для триггера:', error);
	            }
	        }
	    }
	};


	/**
	 * Объект для хранения глобальных CSS-правил режимов.
	 * @since 1.0.0
	 * @namespace jsse_reset_css
	 */
	const jsse_reset_css = {

		/**
		 * Внутреннее хранилище элементов `<style>` для каждого режима.
		 * @type {Object<string, {element: HTMLStyleElement, count: number}>}
		 */
		_list: {},

		/**
		 * Возвращает запись для заданного ключа.
		 * @since 1.0.0
		 * @param {string} key - Идентификатор режима (например, 'svg-layer').
		 * @returns {{element: HTMLStyleElement, count: number} | undefined}
		 */
		get(key) {
			return this._list[key];
		},

		/**
		 * Сохраняет элемент `<style>` для режима, удаляя предыдущий при необходимости.
		 * @since 1.0.0
		 * @param {string} key - Идентификатор режима.
		 * @param {HTMLStyleElement} el - Элемент стилей для добавления в `<head>`.
		 * @returns {void}
		 */
		set(key, el) {
			if (this.has(key)) {
				this.unset(key);
			}
			this._list[key] = {
				element: el,
				count: 1
			};
			/** Добавить элемент в конец <head> **/
			document.head.appendChild(el);
		},

		/**
		 * Удаляет запись и соответствующий элемент `<style>` из DOM.
		 * @since 1.0.0
		 * @param {string} key - Идентификатор режима.
		 * @returns {void}
		 */
		unset(key) {
			/** Удалить элемент **/
			this._list[key].element.remove();
			delete this._list[key];
		},

		/**
		 * Проверяет существование записи для указанного ключа.
		 * @since 1.0.0
		 * @param {string} key - Идентификатор режима.
		 * @returns {boolean}
		 */
		has(key) {
			return this._list[key] !== undefined;
		}
	};

	/**
	 * Счётчик для генерации уникальных идентификаторов контроллеров.
	 * @since 1.0.0
	 * @namespace jsse_counter
	 */
	const jsse_counter = {
		
		/**
		 * Текущее значение счётчика.
		 * @type {number}
		 */
		_value: 0,

		/**
		 * Увеличивает счётчик на 1.
		 * @returns {void}
		 */
		increment() { this._value++; },

		/**
		 * Уменьшает счётчик на 1.
		 * @returns {void}
		 */
		decrement() { this._value--; },

		/**
		 * Геттер, возвращающий текущее значение счётчика.
		 * @type {number}
		 */
		get value() { return this._value; }
	};

	/**
	 * @file src/core.js
	 * 
	 * @module js-superellipse/core
	 * @since 1.0.0
	 * @author f4n70m
	 * 
	 * @description
	 * Ядро математических расчётов суперэллипса. Содержит функцию `jsse_generateSuperellipsePath`,
	 * которая по заданным ширине, высоте, радиусу скругления и коэффициенту кривизны генерирует
	 * SVG-путь, аппроксимирующий суперэллипс с помощью кубических кривых Безье.
	 * 
	 * Также экспортирует вспомогательные функции:
	 * - `jsse_roundf` – округление чисел с заданной точностью,
	 * - `jsse_getBorderRadiusFactor` – возвращает константу (4/3)*(√2-1) для аппроксимации окружности.
	 * 
	 * @see {@link https://en.wikipedia.org/wiki/Superellipse|Суперэллипс}
	 * @see {@link https://github.com/f4n70m/js-superellipse|f4n70m/js-superellipse}
	 * 
	 * @example
	 * import { jsse_generateSuperellipsePath } from 'js-superellipse/core';
	 * const path = jsse_generateSuperellipsePath(200, 150, 30, 1.2);
	 * svgPathElement.setAttribute('d', path);
	 */

	/**
	 * Округляет число до заданного количества знаков после запятой.
	 *
	 * @since 1.0.0
	 * @param {number} value - Исходное число.
	 * @param {number} [precision=2] - Количество знаков после запятой (по умолчанию 2).
	 * @returns {number} Округлённое число.
	 */
	function jsse_roundf(value, precision = 2) {
		const factor = 10 ** precision;
		return (Math.round(value * factor) / factor).toFixed(precision);
	}

	/**
	 * Вычисляет параметр D2 для второй кривой Безье, обеспечивая касание
	 * центра первой кривой с центром второй.
	 *
	 * В контексте суперэллипса параметры L (размах) и D (отклонение контрольных точек)
	 * описывают форму кубической кривой Безье, используемой для построения углов.
	 * Зная эталонную пару (L1, D1) и желаемый размах L2, функция находит такое D2,
	 * при котором центральная точка второй кривой будет лежать на касательной,
	 * проведённой из центра первой кривой (обеспечивается гладкое соединение).
	 *
	 * @since 1.0.0
	 * @param {number} L1 - Размах эталонной кривой Безье.
	 * @param {number} D1 - Отклонение контрольных точек эталонной кривой.
	 * @param {number} L2 - Размах целевой кривой Безье.
	 * @returns {number} Вычисленное значение D2, ограниченное сверху 1.
	 * @throws {Error} Если L2 близко к нулю.
	 */
	function jsse_getD2FromL1D1L2(L1, D1, L2) {
		if (Math.abs(L2) < 1e-10) {
			throw new Error('L2 не может быть нулевым');
		}
		const D2 = (4 * L2 - L1 * (4 - 3 * D1)) / (3 * L2);
		return Math.min(D2, 1);
	}

	/**
	 * @since 1.0.0
	 */
	function jsse_getBorderRadiusFactor() {
		return (4 / 3) * (Math.sqrt(2) - 1);
	}

	/**
	 * 
	 * Основная функция генерации SVG path для суперэллипса с изменяемой формой углов.
	 * Форма углов определяется параметром curveFactor (от -2 до 2):
	 *   -2 : вогнутые прямоугольные углы
	 *   -G : вогнутые круглые углы (G = (4/3)*(√2-1) ≈ 0.5523)
	 *    0 : прямой скос
	 *    G : выпуклые круглые углы
	 *    1 : выгнутые суперэллипсные углы
	 *    2 : выгнутые прямоугольные углы
	 * 
	 * Функция генерирует непрерывный спектр форм от вогнутых прямоугольных (-2) до выгнутых прямоугольных (2), проходя через скос (0), круглые углы (±G) и суперэллипсные (1); 
	 * где G = (4/3)*(√2-1) ≈ 0.5522847498 — константа, при которой кривые Безье аппроксимируют четверть окружности.
	 * Благодаря использованию кубических кривых Безье и тщательно подобранной интерполяции достигается плавное изменение геометрии при любом curveFactor в заданном диапазоне.
	 * 
	 * @since 1.0.0
	 * @param {number} width  - Ширина фигуры.
	 * @param {number} height - Высота фигуры.
	 * @param {number} radius - Радиус скругления углов (будет автоматически ограничен).
	 * @param {number} curveFactor - Коэффициент формы углов, диапазон [-2, 2].
	 * @param {number} [precision=2] - Количество знаков после запятой в координатах.
	 * @returns {string} Строка с SVG-командами для элемента <path>.
	 * @throws {Error} Если при вычислениях возникает деление на ноль (маловероятно при корректных параметрах).
	 * 
	 */
	function jsse_generateSuperellipsePath(width, height, radius, curveFactor, precision = 2) {
		if (width <= 0 || height <= 0) {
			return "M0,0";  // или "M0,0" – пустой путь
		}
		if (typeof radius !== 'number' || isNaN(radius)) {
			radius = 0;
		}
		/** константа идеальной окружности **/
		const G = jsse_getBorderRadiusFactor();
		/** константа максимальной L при D == 1 **/
		const J = 8 - 4 * Math.sqrt(2);

		/** Множитель для нормализации координат **/
		let M = width >= height ? width : height;

		let kValue = Math.abs(curveFactor);
		let kSign  = curveFactor >= 0 ? 1 : -1;

		/** Ограничиваем радиус половиной меньшей стороны **/
		let rxMax = width / 2;
		let ryMax = height / 2;
		let rMax  = Math.min(rxMax, ryMax);
		let r = Math.min(radius, rMax);
		let rMaxSpan = Math.abs(rxMax - ryMax);
		if (rxMax >= ryMax) {
			rxMax = ryMax + Math.min(rMax / 4, rMaxSpan / 4);
		} else {
			ryMax = rxMax + Math.min(rMax / 4, rMaxSpan / 4);
		}
		let rx = Math.min(r, rxMax);
		let ry = Math.min(r, ryMax);

		let Dx = 0, Dy = 0;
		let Lx = 0, Ly = 0;
		let Sx = 0, Sy = 0;

		if (r !== 0) {
			let R = 1;

			/** Определить эллипсные (k=1) **/
			let Rk1x = rxMax / rx;
			let Rk1y = ryMax / ry;
			let Lk1x = (kSign > 0) ? Math.min(Rk1x, J) : 1;
			let Lk1y = (kSign > 0) ? Math.min(Rk1y, J) : 1;
			jsse_getD2FromL1D1L2(R, G, Lk1x);
			jsse_getD2FromL1D1L2(R, G, Lk1y);
			let Jk1x = (1 / J) * Lk1x;
			let Jk1y = (1 / J) * Lk1y;

			/** Относительное L (от 1 до Lk1, при k от G до 1) **/
			let Lk = Math.max((Math.min(kValue, 1) - G) / (1 - G), 0);
			let Lix = 1 + (Lk1x - 1) * Lk;
			let Liy = 1 + (Lk1y - 1) * Lk;

			/** Определить Di (от Li) **/
			let Six = 0, Siy = 0;
			let Dix, Diy;
			if (kValue <= G) {
				Dix = Diy = kValue;
			} else {
				let Dlix = jsse_getD2FromL1D1L2(R, G, Lix);
				let Dliy = jsse_getD2FromL1D1L2(R, G, Liy);
				if (kValue <= 1) {
					Dix = Dlix;
					Diy = Dliy;
				} else {
					Jk1x = G + (1 / (Lk1x / J)) * (1 - G);
					Jk1y = G + (1 / (Lk1y / J)) * (1 - G);
					let Jix = Math.min((kValue - 1) / (Jk1x - 1), 1);
					let Jiy = Math.min((kValue - 1) / (Jk1y - 1), 1);

					let Lsx = Lix + (J - Lix) * Jix;
					let Lsy = Liy + (J - Liy) * Jiy;
					let Dlsx = jsse_getD2FromL1D1L2(R, G, Lsx);
					let Dlsy = jsse_getD2FromL1D1L2(R, G, Lsy);
					Dix = Math.min(Dlsx, 1);
					Diy = Math.min(Dlsy, 1);

					if (kValue > Jk1x) {
						Six = (kValue - Jk1x) / (2 - Jk1x);
					}
					if (kValue > Jk1y) {
						Siy = (kValue - Jk1y) / (2 - Jk1y);
					}
				}
			}

			Lx = Lix * (1 - Six);
			Ly = Liy * (1 - Siy);
			Sx = Lix * Six;
			Sy = Liy * Siy;
			Dx = Lx * Dix;
			Dy = Ly * Diy;
		}

		let Qm = M;
		let Qw = width / M;
		let Qh = height / M;
		let Qr = r / M;
		let Q0 = { x: 0, y: 0 };
		let Q1 = { x: Qw, y: 0 };
		let Q2 = { x: Qw, y: Qh };
		let Q3 = { x: 0, y: Qh };

		let pathCommands;
		if (kSign >= 0) {
			pathCommands = [
				`M`, Q0.x, Q0.y + (Sy + Ly) * Qr,
				`L`, Q0.x, Q0.y + (Ly) * Qr,
				`C`, Q0.x, Q0.y + (Ly - Dy) * Qr, Q0.x + (Lx - Dx) * Qr, Q0.y, Q0.x + (Lx) * Qr, Q0.y,
				`L`, Q0.x + (Sx + Lx) * Qr, Q0.y,
				`L`, Q1.x - (Sx + Lx) * Qr, Q1.y,
				`L`, Q1.x - (Lx) * Qr, Q1.y,
				`C`, Q1.x - (Lx - Dx) * Qr, Q1.y, Q1.x, Q1.y + (Ly - Dy) * Qr, Q1.x, Q1.y + (Ly) * Qr,
				`L`, Q1.x, Q1.y + (Sy + Ly) * Qr,
				`L`, Q2.x, Q2.y - (Sy + Ly) * Qr,
				`L`, Q2.x, Q2.y - (Ly) * Qr,
				`C`, Q2.x, Q2.y - (Ly - Dy) * Qr, Q2.x - (Lx - Dx) * Qr, Q2.y, Q2.x - (Lx) * Qr, Q2.y,
				`L`, Q2.x - (Sx + Lx) * Qr, Q2.y,
				`L`, Q3.x + (Sx + Lx) * Qr, Q3.y,
				`L`, Q3.x + (Lx) * Qr, Q3.y,
				`C`, Q3.x + (Lx - Dx) * Qr, Q3.y, Q3.x, Q3.y - (Ly - Dy) * Qr, Q3.x, Q3.y - (Ly) * Qr,
				`L`, Q3.x, Q3.y - (Sy + Ly) * Qr,
				'Z'
			];
		} else {
			pathCommands = [
				`M`, Q0.x, Q0.y + (Sy + Ly) * Qr,
				`L`, Q0.x + (Sx) * Qr, Q0.y + (Sy + Ly) * Qr,
				`C`, Q0.x + (Sx + Dx) * Qr, Q0.y + (Sy + Ly) * Qr, Q0.x + (Sx + Lx) * Qr, Q0.y + (Sy + Dy) * Qr, Q0.x + (Sx + Lx) * Qr, Q0.y + (Sy) * Qr,
				`L`, Q0.x + (Sx + Lx) * Qr, Q0.y,
				`L`, Q1.x - (Sx + Lx) * Qr, Q1.y,
				`L`, Q1.x - (Sx + Lx) * Qr, Q1.y + (Sy) * Qr,
				`C`, Q1.x - (Sx + Lx) * Qr, Q1.y + (Sy + Dy) * Qr, Q1.x - (Sx + Dx) * Qr, Q1.y + (Sy + Ly) * Qr, Q1.x - (Sx) * Qr, Q1.y + (Sy + Ly) * Qr,
				`L`, Q1.x, Q1.y + (Sy + Ly) * Qr,
				`L`, Q2.x, Q2.y - (Sy + Ly) * Qr,
				`L`, Q2.x - Sx * Qr, Q2.y - (Sy + Ly) * Qr,
				`C`, Q2.x - (Sx + Dx) * Qr, Q2.y - (Sy + Ly) * Qr, Q2.x - (Sx + Lx) * Qr, Q2.y - (Sy + Dy) * Qr, Q2.x - (Sx + Lx) * Qr, Q2.y - (Sy) * Qr,
				`L`, Q2.x - (Sx + Lx) * Qr, Q2.y,
				`L`, Q3.x + (Sx + Lx) * Qr, Q3.y,
				`L`, Q3.x + (Sx + Lx) * Qr, Q3.y - Sy * Qr,
				`C`, Q3.x + (Sx + Lx) * Qr, Q3.y - (Sy + Dy) * Qr, Q3.x + (Sx + Dx) * Qr, Q3.y - (Sy + Ly) * Qr, Q3.x + Sx * Qr, Q3.y - (Sy + Ly) * Qr,
				`L`, Q3.x, Q3.y - (Sy + Ly) * Qr,
				'Z'
			];
		}

		/** Применяем масштабирование и округление **/
		const path = pathCommands.map(p => {
			if (typeof p === 'number') {
				return jsse_roundf(p * Qm, precision);
			}
			return p;
		}).join(' ');

		return path;
	}

	/**
	 * @file src/mode.js
	 * 
	 * @module js-superellipse/mode
	 * @since 1.0.0
	 * @author f4n70m
	 * 
	 * @description
	 * Базовый класс `SuperellipseMode`, от которого наследуются конкретные реализации режимов.
	 * Содержит общую логику захвата стилей и размеров элемента, пересчёта SVG-пути суперэллипса,
	 * применения/восстановления CSS-свойств (`clip-path`). Определяет защищённые методы, которые должны
	 * быть переопределены в дочерних классах.
	 * 
	 * @example
	 * class MyMode extends SuperellipseMode {
	 *   _getActivatedStyles() { return { /* стили активации *\}; }
	 *   _getModeName() { return 'my-mode'; }
	 *   _appendVirtualElements() { /* реализация *\/ }
	 *   _removeVirtualElements() { /* реализация *\/ }
	 * }
	 */


	/**
	 * Базовый класс для реализации режимов суперэллипса.
	 * @class SuperellipseMode
	 * @since 1.0.0
	 */
	class SuperellipseMode {

		_element;

		_isInitiated;
		_isActivated;
		// _isDebug;

		_size = {
			width:  0,
			height: 0
		};
		_curveFactor;
		_precision;

		_styles;

		_path;
		_resetPath;




		/**
		 * =============================================================
		 * PUBLIC
		 * =============================================================
		 */


		/**
		 * @since 1.0.0
		 * @param {Element} element - Целевой элемент.
		 * @param {boolean} [debug=false] - Флаг отладки.
		 */
		constructor(element) {

			this._element = element;

			// this._isDebug = debug;
			this._isActivated = false;

			this._curveFactor = jsse_getBorderRadiusFactor();
			this._precision = 2;

			this._init();
		}

		/**
		 * Активирует режим.
		 * @since 1.0.0
		 * @returns {void}
		 */
		activate() {
			if (this.isActivated()) return;
			jsse_console.debug({label:'MODE',element:this._element}, `activate(${this._getModeName()})`);
			/** Актуализировать данные захвата **/
			this._updateCaptured();
			/** Установить статус **/
			this._setStatus(true);
			/** Создать виртуальные элементы **/
			this._appendVirtualElements();
			/** Подготовить обновление **/
			this._prepareUpdate();
			/** Выполнить обновление **/
			this._executeUpdate();
		}

		/**
		 * Деактивирует режим.
		 * @since 1.0.0
		 * @returns {void}
		 */
		deactivate() {
			if (!this.isActivated()) return;
			jsse_console.debug({label:'MODE',element:this._element}, `deactivate(${this._getModeName()})`);
			/** Установить статус **/
			this._setStatus(false);
			/** Удалить элементы виртуальных слоев **/
			this._removeVirtualElements();
			/** Выполнить обновление **/
			this._executeUpdate();
		}

		/**
		 * Полное обновление (стили, размер, путь).
		 * @since 1.0.0
		 * @returns {void}
		 */
		update() {
			jsse_console.debug({label:'MODE',element:this._element}, 'update()');
			/** Актуализировать данные захвата **/
			this._updateCaptured();
			/** Подготовить обновление **/
			this._prepareUpdate();
			/** Выполнить обновление **/
			this._executeUpdate();
		}

		/**
		 * Обновление только размеров.
		 * @since 1.0.0
		 * @returns {void}
		 */
		updateSize() {
			/** Актуализировать размеры **/
			this._updateCapturedSize();
			/** Подготовить обновление **/
			this._prepareUpdate();
			/** Выполнить обновление **/
			this._executeUpdate();

		}

		/**
		 * Обновление только стилей.
		 * @since 1.0.0
		 * @returns {void}
		 */
		updateStyles() {
			jsse_console.debug({label:'MODE',element:this._element}, 'updateStyles()');
			/** Актуализировать стили **/
			this._updateCapturedStyles();
			/** Подготовить обновление **/
			this._prepareUpdate();
			/** Выполнить обновление **/
			this._executeUpdate();
		}

		/**
		 * Обновление коэффициента кривизны.
		 * @since 1.0.0
		 * @param {number} value - Новое значение коэффициента кривизны.
		 * @returns {void}
		 */
		updateCurveFactor(value) {
			this.setCurveFactor(value);
			/** Подготовить обновление **/
			this._prepareUpdate();
			/** Выполнить обновление **/
			this._executeUpdate();
		}

		/**
		 * Обновление точности округления.
		 * @since 1.0.0
		 * @param {number} value - Количество знаков после запятой.
		 * @returns {void}
		 */
		updatePrecision(value) {
			this.setPrecision(value);
			/** Подготовить обновление **/
			this._prepareUpdate();
			/** Выполнить обновление **/
			this._executeUpdate();
		}

		/**
		 * Устанавливает коэффициент кривизны.
		 * @since 1.0.0
		 * @param {number} value - Новое значение коэффициента кривизны.
		 * @returns {void}
		 */
		setCurveFactor(value) {
			this._curveFactor = value;
		}

		/**
		 * Устанавливает точность округления.
		 * @since 1.0.0
		 * @param {number} value - Количество знаков после запятой.
		 * @returns {void}
		 */
		setPrecision(value) {
			this._precision = value;
		}

		/**
		 * Возвращает текущий SVG-путь.
		 * @since 1.0.0
		 * @returns {string}
		 */
		getPath() {
			return this._path;
		}

		/**
		 * Проверяет, активирован ли режим.
		 * @since 1.0.0
		 * @returns {boolean}
		 */
		isActivated() {
			return this._isActivated;
		}

		/**
		 * Уничтожает режим, удаляет все артефакты.
		 * @since 1.0.0
		 * @returns {void}
		 */
		destroy() {
			this.deactivate();
			this._removeModeAttr();
			this._destroyResetStyles();
		}


		/**
		 * =============================================================
		 * PRIVATE
		 * =============================================================
		 */


		/**
		 * Инициализация режима.
		 * @since 1.0.0
		 * @private
		 * @returns {void}
		 */
		_init() {
			this._id = Math.random().toString(36).slice(2, 10);
			this._initStyles();
			this._setModeAttr();
			this._initSize();
			this._initCurve();
			this._isInitiated = true;
		}

		/**
		 * Устанавливает статус активации.
		 * @since 1.0.0
		 * @private
		 * @param {boolean} status - Статус активации.
		 * @returns {void}
		 */
		_setStatus(status) {
			this._isActivated = status;
			if (status) {
				this._setActivatedAttr();
			} else {
				this._removeActivatedAttr();
			}
		}

		/**
		 * Захватывает актуальные стили и размеры.
		 * @since 1.0.0
		 * @private
		 * @returns {void}
		 */
		_updateCaptured() {
			this._updateCapturedStyles();
			this._updateCapturedSize();
		}

		/**
		 * Подготавливает обновление (пересчёт кривой).
		 * @since 1.0.0
		 * @private
		 * @returns {void}
		 */
		_prepareUpdate() {
			this._recalculateCurve();
		}

		/**
		 * Выполняет обновление (применяет кривую).
		 * @since 1.0.0
		 * @private
		 * @returns {void}
		 */
		_executeUpdate() {
			this._applyCurrentCurve();
		}

		/**
		 * Возвращает имя режима.
		 * @since 1.0.0
		 * @protected
		 * @returns {string}
		 */
		_getModeName() {
			return 'clip-path';
		}

		/**
		 * Возвращает карту стилей, которые нужно временно применить для корректного чтения.
		 * @since 1.0.0
		 * @protected
		 * @returns {Object<string, string>}
		 */
		_getReadingStyles() {
			return {
				'transition': 'unset'
			};
		}

		/**
		 * Возвращает карту стилей, применяемых при активации режима.
		 * @since 1.0.0
		 * @protected
		 * @returns {Object<string, string>}
		 */
		_getActivatedStyles() {
			return {
				'border-radius': '0px'
			};
		}


		/**
		 * =============================================================
		 * VIRTUAL
		 * =============================================================
		 */


		/**
		 * Создаёт виртуальные элементы (если нужно).
		 * @since 1.0.0
		 * @protected
		 * @returns {void}
		 */
		_appendVirtualElements() {}

		/**
		 * Удаляет виртуальные элементы.
		 * @since 1.0.0
		 * @protected
		 * @returns {void}
		 */
		_removeVirtualElements() {}


		/**
		 * =============================================================
		 * ATTRIBUTES
		 * =============================================================
		 */


		/**
		 * Устанавливает атрибут `data-jsse-mode`.
		 * @since 1.0.0
		 * @protected
		 * @returns {void}
		 */
		_setModeAttr() {
			this._element.setAttribute('data-jsse-mode', this._getModeName());
		}

		/**
		 * Удаляет атрибут `data-jsse-mode`.
		 * @since 1.0.0
		 * @protected
		 * @returns {void}
		 */
		_removeModeAttr() {
			this._element.removeAttribute('data-jsse-mode');
		}

		/**
		 * Устанавливает атрибут `data-jsse-activated`.
		 * @since 1.0.0
		 * @protected
		 * @returns {void}
		 */
		_setActivatedAttr() {
			this._element.setAttribute('data-jsse-activated', true);
		}

		/**
		 * Удаляет атрибут `data-jsse-activated`.
		 * @since 1.0.0
		 * @protected
		 * @returns {void}
		 */
		_removeActivatedAttr() {
			this._element.removeAttribute('data-jsse-activated');
		}

		/**
		 * Устанавливает атрибут `data-jsse-reading`.
		 * @since 1.0.0
		 * @protected
		 * @returns {void}
		 */
		_setReadingAttr() {
			this._element.setAttribute('data-jsse-reading', true);
		}

		/**
		 * Удаляет атрибут `data-jsse-reading`.
		 * @since 1.0.0
		 * @protected
		 * @returns {void}
		 */
		_removeReadingAttr() {
			this._element.removeAttribute('data-jsse-reading');
		}


		/**
		 * =============================================================
		 * CSS
		 * =============================================================
		 */


		/**
		 * Инициализирует глобальные CSS-правила для режима.
		 * @since 1.0.0
		 * @protected
		 * @returns {void}
		 */
		_initResetStyles() {
			const modeName = this._getModeName();
			if (!jsse_reset_css.has(modeName)) {
				const styleElement = this._createModeCssStyleElement(modeName);
				jsse_reset_css.set(modeName, styleElement);
			} else {
				jsse_reset_css.get(modeName).count++;
			}

			jsse_console.debug({label:'MODE',element:this._element}, '[RESET STYLES]', 'INIT');
			// jsse_console.debug({label:'MODE'}, '[RESET STYLES]', '[INIT]', modeName, jsse_reset_css.get(modeName).count);
		}

		/**
		 * Уничтожает глобальные CSS-правила режима.
		 * @since 1.0.0
		 * @protected
		 * @returns {void}
		 */
		_destroyResetStyles() {
			const modeName = this._getModeName();
			if (!jsse_reset_css.has(modeName)) return;

			const modeResetStyle = jsse_reset_css.get(modeName);
			modeResetStyle.count--;

			jsse_console.debug({label:'MODE',element:this._element}, '[RESET STYLES]', '[DESTROY]');
			// jsse_console.debug({label:'MODE'}, '[RESET STYLES]', '[DESTROY]', modeName, jsse_reset_css.get(modeName).count);

			if (modeResetStyle.count <= 0) {
				jsse_reset_css.unset(modeName);
			}

		}

		/**
		 * Возвращает CSS-текст для сброса стилей режима.
		 * @since 1.0.0
		 * @protected
		 * @param {string} modeName - Имя режима.
		 * @returns {string}
		 */
		_getResetCssText(modeName) {
			let cssString = '';

			const activatedStyles = this._getActivatedStyles();
			// cssString += `*:hover [data-jsse-mode="${modeName}"][data-jsse-activated=true],`;
			// cssString += `[data-jsse-mode="${modeName}"][data-jsse-activated=true]:hover,`;
			cssString += `[data-jsse-mode="${modeName}"][data-jsse-activated=true]`;
			cssString += `{`;
			for (const prop in activatedStyles) {
				if (activatedStyles[prop] === '') continue;
				cssString += `\n\t${prop}: ${activatedStyles[prop]} !important;`;
			}
			cssString += `\n}`;

			cssString += `\n`;

			const readingStyles = this._getReadingStyles();
			// cssString += `*:hover [data-jsse-mode="${modeName}"][data-jsse-reading=true],`;
			// cssString += `[data-jsse-mode="${modeName}"][data-jsse-reading=true]:hover,`;
			cssString += `[data-jsse-mode="${modeName}"][data-jsse-reading=true]`;
			cssString += `{`;
			for (const prop in readingStyles) {
				if (readingStyles[prop] === '') continue;
				cssString += `\n\t${prop}: ${readingStyles[prop]} !important;`;
			}
			cssString += `\n}`;

			return cssString;
		}

		/**
		 * Создаёт элемент `<style>` для режима.
		 * @since 1.0.0
		 * @protected
		 * @param {string} modeName - Имя режима.
		 * @returns {HTMLStyleElement}
		 */
		_createModeCssStyleElement(modeName) {
			const textContent = this._getResetCssText(modeName);
			/** Создать элемент <style> **/
			const styleElement = document.createElement('style');
			styleElement.setAttribute('id', `jsse__css_${modeName}`);
			/** Заполнить элемент CSS-правилами **/
			styleElement.textContent = textContent;
			return styleElement;
		}


		/**
		 * =============================================================
		 * STYLES
		 * =============================================================
		 */


		/**
		 * Обновляет захваченные стили.
		 * @since 1.0.0
		 * @protected
		 * @returns {void}
		 */
		_updateCapturedStyles() {
			jsse_console.debug({label:'MODE',element:this._element}, '_updateCapturedStyles()');
			const capturedComputedStyles = this._getCapturedStyles();
			/** Сохранить computed-стили **/
			this._styles.computed = capturedComputedStyles;
		}

		/**
		 * Получает вычисленные стили с временным снятием атрибута активации.
		 * @since 1.0.0
		 * @protected
		 * @param {boolean} [clear=true] - Снимать ли атрибут активации перед чтением.
		 * @returns {Object<string, string>}
		 */
		_getCapturedStyles(clear = true) {
			const hasAttribute = this._element.hasAttribute('data-jsse-activated');

			if (hasAttribute && clear) {
				this._removeActivatedAttr();
			}
			this._setReadingAttr();

			const result = this._getManagedComputedStyle();

			if (hasAttribute && clear) {
				this._setActivatedAttr();
			}
			this._removeReadingAttr();
			return result;
		}

		/**
		 * Получает вычисленные стили для управляемых свойств.
		 * @since 1.0.0
		 * @protected
		 * @returns {Object<string, string>}
		 */
		_getManagedComputedStyle() {
			const result = {};
			const capturedStyles = getComputedStyle(this._element);
			for (const prop of this._getManagedProperties()) {
				result[prop] = capturedStyles.getPropertyValue(prop);
			}
			return result;
		}

		/**
		 * Возвращает значение захваченного вычисленного свойства.
		 * @since 1.0.0
		 * @protected
		 * @param {string} prop - Имя CSS-свойства.
		 * @returns {string|undefined}
		 */
		_getComputedProp(prop) {
			if ('computed' in this._styles && prop in this._styles.computed)
				return this._styles.computed[prop];
		}

		/**
		 * Возвращает массив свойств CSS, управляемых режимом.
		 * @since 1.0.0
		 * @protected
		 * @returns {string[]}
		 */
		_getManagedProperties() {
			return Object.keys(this._getActivatedStyles());
		}


		/**
		 * =============================================================
		 * CACHE
		 * =============================================================
		 */

		/**
		 * Инициализирует хранилище стилей.
		 * @since 1.0.0
		 * @protected
		 * @returns {void}
		 */
		_initStyles() {
			this._styles = jsse_styles.get(this._element);
			this._initResetStyles();
		}

		/**
		 * =============================================================
		 * SIZE
		 * =============================================================
		 */


		/**
		 * Инициализирует размеры.
		 * @since 1.0.0
		 * @protected
		 * @returns {void}
		 */
		_initSize() {
			this._updateCapturedSize();
		}

		/**
		 * Обновляет захваченные размеры.
		 * @since 1.0.0
		 * @protected
		 * @returns {void}
		 */
		_updateCapturedSize() {
			const rect = this._element.getBoundingClientRect();

			this._size.width = rect.width;
			this._size.height = rect.height;
		}


		/**
		 * =============================================================
		 * CURVE
		 * =============================================================
		 */


		/**
		 * Инициализирует кривую.
		 * @since 1.0.0
		 * @protected
		 * @returns {void}
		 */
		_initCurve() {
			this._initInlinePath();
		}

		/**
		 * Сохраняет исходный `clip-path`.
		 * @since 1.0.0
		 * @protected
		 * @returns {void}
		 */
		_initInlinePath() {
			this._resetPath = this._element.style.getPropertyValue('clip-path');
		}

		/**
		 * Пересчитывает путь на основе текущих размеров и радиуса.
		 * @since 1.0.0
		 * @protected
		 * @returns {void}
		 */
		_recalculateCurve() {
			this._recalculatePath();
		}

		/**
		 * Генерирует SVG-путь.
		 * @since 1.0.0
		 * @protected
		 * @returns {void}
		 */
		_recalculatePath() {
			if ( !( this._size.width > 0 && this._size.height > 0 ) ) {
				this._path = 'none'; // Сбрасываем путь
				return;
			}

			const radiusValue = this._getComputedProp('border-radius');
			const radiusNumber = radiusValue ? parseFloat(radiusValue) : 0;

			this._path  = jsse_generateSuperellipsePath(
				this._size.width,
				this._size.height,
				radiusNumber,
				this._curveFactor,
				this._precision
			);
		}

		/**
		 * Применяет текущий путь (если активирован) или восстанавливает исходный.
		 * @since 1.0.0
		 * @protected
		 * @returns {void}
		 */
		_applyCurrentCurve() {
			if (this.isActivated()) {
				this._applyCurve();
			} else {
				this._restoreCurve();
			}
		}

		/**
		 * Применяет суперэллипс через `clip-path`.
		 * @since 1.0.0
		 * @protected
		 * @returns {void}
		 */
		_applyCurve() {
			if (this._path && this._path !== 'none') {
				const newPath = `path("${this._path}")`;
				if (this._element.style.getPropertyValue('clip-path') !== newPath) {
					this._element.style.setProperty('clip-path', newPath);
				}
			} else {
				if (this._element.style.getPropertyValue('clip-path') !== 'none') {
					this._element.style.setProperty('clip-path', 'none');
				}
			}
		}

		/**
		 * Восстанавливает исходный `clip-path`.
		 * @since 1.0.0
		 * @protected
		 * @returns {void}
		 */
		_restoreCurve() {
			if (this._resetPath) {
				this._element.style.setProperty('clip-path', this._resetPath);
			} else {
				this._element.style.removeProperty('clip-path');
			}
		}


		/**
		 * =============================================================
		 * 
		 * =============================================================
		 */
	}

	/**
	 * @file src/mode-svg-layer.js
	 * 
	 * @module js-superellipse/mode-svg-layer
	 * @since 1.0.0
	 * @author f4n70m
	 * 
	 * @description
	 * Режим `svg-layer` – полнофункциональный режим, создающий наложенный SVG-слой для отрисовки
	 * суперэллипса. Позволяет корректно отображать `background`, `border`, `box-shadow` элемента.
	 * Переносит дочернее содержимое во внутренний div-контейнер, а поверх него размещает SVG,
	 * который повторяет геометрию суперэллипса с возможностью применения градиентов, теней и
	 * произвольных стилей обводки.
	 * 
	 * @extends SuperellipseMode
	 * @example
	 * const mode = new SuperellipseModeSvgLayer(element);
	 * mode.activate();
	 */



	/**
	 * Режим, создающий наложенный SVG-слой для отрисовки фона, границ и теней.
	 * @class SuperellipseModeSvgLayer
	 * @extends SuperellipseMode
	 */
	class SuperellipseModeSvgLayer extends SuperellipseMode {

		/**
		 * Хранилище ссылок на созданные виртуальные DOM-элементы (svg, div, path и т.д.).
		 * @since 1.0.0
		 * @type {Object<string, Element>}
		 * @protected
		 */
		_virtualElementList = {};

		/**
		 * Текущая строка viewBox для SVG.
		 * @since 1.0.0
		 * @type {string}
		 * @protected
		 */
		_viewbox;


		/**
		 * =============================================================
		 * PUBLIC
		 * =============================================================
		 */


		/**
		 * Создаёт экземпляр режима svg-layer.
		 * @since 1.0.0
		 * @param {Element} element - Целевой DOM-элемент.
		 * @param {boolean} [debug=false] - Флаг отладки.
		 */
		constructor(element, debug = false) {
			super(element, debug);

			this._initViewbox();
			this._initVirtualElementList();
		}


		/**
		 * =============================================================
		 * PRIVATE
		 * =============================================================
		 */


		/**
		 * Выполняет обновление: применяет стили к слою div и обновляет путь.
		 * @since 1.0.0
		 * @override
		 * @protected
		 * @returns {void}
		 */
		_executeUpdate() {
			this._applyCurrentInlineVirtualSvgLayerStyles();
			this._applyCurrentCurve();
		}

		/**
		 * Возвращает имя режима ('svg-layer').
		 * @since 1.0.0
		 * @override
		 * @protected
		 * @returns {string}
		 */
		_getModeName() {
			return 'svg-layer';
		}

		/**
		 * Возвращает стили, применяемые к основному элементу при активации.
		 * @since 1.0.0
		 * @override
		 * @protected
		 * @returns {Object<string, string>}
		 */
		_getActivatedStyles() {
			return {
				'background': 'none',
				'border-color': 'transparent',
				'border-width': '',
				'border-width': '0px',
				// 'border-style': 'none',
				// 'border': 'unset',
				'border-radius': '0px',
				'box-shadow': 'unset',
				'position': 'relative',
			};
		}

		/**
		 * Возвращает стили для SVG-контейнера.
		 * @since 1.0.0
		 * @protected
		 * @returns {Object<string, string>}
		 */
		_getSvgLayerStyles() {
			return {
				'position': 'absolute',
				'top': '0px',
				'left': '0px',
				'width': '100%',
				'height': '100%',
				'pointer-events': 'none'
			};
		}

		/**
		 * Возвращает список CSS-свойств, которые переносятся во внутренний div.
		 * @since 1.0.0
		 * @protected
		 * @returns {string[]}
		 */
		_getSvgLayerDivProps() {
			return [
				// 'color',
				'background',
				// 'background-size',
				// 'background-position',
				'box-shadow'
			];
		}


		/**
		 * =============================================================
		 * STYLES
		 * =============================================================
		 */


		/**
		 * Применяет инлайновые стили к указанному элементу.
		 * @since 1.0.0
		 * @protected
		 * @param {Object<string, string>} props - Объект стилей.
		 * @param {HTMLElement|SVGElement} element - Целевой элемент.
		 * @returns {void}
		 */
		_applyInlineStyles(props, element) {
			const managedProperties = this._getManagedProperties();
			for(const prop of managedProperties) {
				const inlineValue = props[prop];
				const currentValue = element.style.getPropertyValue(prop);
				if (inlineValue !== undefined) {
					if (currentValue !== inlineValue) {
						element.style.setProperty(prop, inlineValue);
					}
				} else {
					if (currentValue !== '') {
						element.style.removeProperty(prop);
					}
				}
			}
		}

		/**
		 * Применяет все стили (div, border, shadows) к виртуальным слоям, если режим активен.
		 * @since 1.0.0
		 * @protected
		 * @returns {void}
		 */
		_applyCurrentInlineVirtualSvgLayerStyles() {
			if ( this.isActivated() ) {
				this._applyCurrentInlineVirtualSvgLayerDivStyles();
				this._applyCurrentInlineVirtualSvgLayerBorderStyles();
				this._applyCurrentInlineVirtualSvgLayerShadowsStyles();
			}
		}


		/**
		 * Применяет стили к виртуальному div-слою.
		 * @since 1.0.0
		 * @protected
		 * @returns {void}
		 */
		_applyCurrentInlineVirtualSvgLayerDivStyles() {
			const inlineSvgLayerDivStyles = this._getCurrentInlineVirtualSvgLayerDivStyles();
			const svgLayerDiv = this._virtualElementList.svgLayerDiv;
			this._applyInlineStyles(inlineSvgLayerDivStyles, svgLayerDiv);
		}

		/**
		 * Возвращает стили для внутреннего div-слоя, извлечённые из вычисленных стилей элемента.
		 * @since 1.0.0
		 * @protected
		 * @returns {Object<string, string>}
		 */
		_getCurrentInlineVirtualSvgLayerDivStyles() {
			// jsse_console.debug(this._element, '[MODE SvgLayer]', '_getCurrentInlineVirtualSvgLayerDivStyles()');
			const result = {};
			const svgLayerDivProps = this._getSvgLayerDivProps();
			for (const prop of svgLayerDivProps) {
				const value = this._getComputedProp(prop);
				if (value !== undefined) {
					result[prop] = value;
				}
			}
			return result;
		}

		/**
		 * Применяет стили границы (цвет, толщину, стиль) к SVG-элементу `border`.
		 * @since 1.0.0
		 * @protected
		 * @returns {void}
		 */
		_applyCurrentInlineVirtualSvgLayerBorderStyles() {
			const svgLayerBorder = this._virtualElementList.svgLayerBorder;
			const borderColor = this._getComputedProp('border-color');
			svgLayerBorder.setAttribute('stroke', borderColor);
			const borderWidth = this._getComputedProp('border-width');
			const borderWidthNumber = borderWidth ? (parseFloat(borderWidth) * 2) : 0;
			svgLayerBorder.setAttribute('stroke-width', borderWidthNumber);
			const borderStyle = this._getComputedProp('border-style');
			this._applyBorderStyleToStroke(borderStyle, svgLayerBorder);
		}

		/**
		 * Устанавливает атрибут `stroke-dasharray` для элемента пути.
		 * @since 1.0.0
		 * @protected
		 * @param {SVGElement} pathElement - SVG-элемент (обычно path или use).
		 * @param {string} value - Значение dasharray.
		 * @returns {void}
		 */
		_setStrokeDasharray(pathElement, value) {
			pathElement.setAttribute('stroke-dasharray', value);
		}

		/**
		 * Устанавливает атрибут `stroke-linecap` для элемента пути.
		 * @since 1.0.0
		 * @protected
		 * @param {SVGElement} pathElement - SVG-элемент.
		 * @param {string} value - Значение linecap (butt, round, square).
		 * @returns {void}
		 */
		_setStrokeLinecap(pathElement, value) {
			pathElement.setAttribute('stroke-linecap', value);
		}

		/**
		 * Устанавливает атрибут `stroke-opacity` для элемента пути.
		 * @since 1.0.0
		 * @protected
		 * @param {SVGElement} pathElement - SVG-элемент.
		 * @param {string|number} value - Прозрачность (0..1).
		 * @returns {void}
		 */
		_setStrokeOpacity(pathElement, value) {
			pathElement.setAttribute('stroke-opacity', value);
		}

		/**
		 * Преобразует CSS-стиль границы в атрибуты SVG-элемента.
		 * @since 1.0.0
		 * @protected
		 * @param {string} borderStyle - Стиль границы (solid, dotted, dashed и т.д.).
		 * @param {SVGElement} pathElement - Элемент, к которому применяется обводка.
		 * @returns {void}
		 */
		_applyBorderStyleToStroke(borderStyle, pathElement) {
			/** Сброс атрибутов **/
			pathElement.removeAttribute('stroke-dasharray');
			pathElement.removeAttribute('stroke-linecap');
			pathElement.removeAttribute('stroke-linejoin');
			
			switch(borderStyle) {
				case 'solid':
					/** Сплошная линия (значения по умолчанию) **/
					break;
					
				case 'dotted':
					this._setStrokeDasharray(pathElement, '0, 8');
					this._setStrokeLinecap(pathElement, 'round');
					break;
					
				case 'dashed':
					this._setStrokeDasharray(pathElement, '10, 6');
					break;
					
				case 'double':
					/** Для double нужно два отдельных пути или фильтр **/
					jsse_console.warn({label:'MODE SVG LAYER',element:this._element}, '«border-style: double» is not supported');
					break;
					
				case 'groove':
					this._setStrokeDasharray(pathElement, '1, 2');
					this._setStrokeLinecap(pathElement, 'round');
					break;
					
				case 'ridge':
					this._setStrokeDasharray(pathElement, '3, 3');
					break;
					
				case 'inset':
					/** Имитация inset через полупрозрачность **/
					this._setStrokeOpacity(pathElement, '0.7');
					break;
					
				case 'outset':
					this._setStrokeOpacity(pathElement, '0.5');
					break;
					
				case 'dash-dot':
					/** Кастомный стиль **/
					this._setStrokeDasharray(pathElement, '15, 5, 5, 5');
					break;
					
				case 'dash-dot-dot':
					/** Кастомный стиль **/
					this._setStrokeDasharray(pathElement, '15, 5, 5, 5, 5, 5');
					break;
			}
		}

		/**
		 * Применяет тени (`box-shadow`) к SVG-слою, создавая фильтры.
		 * @since 1.0.0
		 * @protected
		 * @returns {void}
		 */
		_applyCurrentInlineVirtualSvgLayerShadowsStyles() {
			const boxShadowValue = this._getComputedProp('box-shadow');
			const shadows = this._parseBoxShadow(boxShadowValue);

			const svg = this._virtualElementList.svgLayer;
			const gFilters = this._virtualElementList.svgLayerGFilters;
			const gShadows = this._virtualElementList.svgLayerGShadows;
			const path = this._virtualElementList.svgLayerPath;

			gFilters.replaceChildren();
			gShadows.replaceChildren();

			const id = svg.getAttribute('id');
			const pathId = path.getAttribute('id');

			for (let i = 0; i < shadows.length; i++) {

				if (shadows[i].inset) continue;

				const shadowValues = shadows[i];
				shadowValues.spreadRadius;

				const filter = this._createVirtualSvgElement('filter');
					const feGaussianBlur = this._createVirtualSvgElement('feGaussianBlur');
					const feOffset = this._createVirtualSvgElement('feOffset');
					const feFlood = this._createVirtualSvgElement('feFlood');
					const feComposite = this._createVirtualSvgElement('feComposite');
				const shadow = this._createVirtualSvgElement('use');

				const filterId = `${id}__filter_${i}`;
					const filterBlurId = `${filterId}__blur`;
					const filterOffsetId = `${filterId}__offset`;
					const filterColorId = `${filterId}__color`;
					const filterShadowId = `${filterId}__shadow`;
				const shadowId = `${id}__shadow_${i}`;

				gFilters.appendChild(filter);
					filter.setAttribute('id', filterId);
					filter.setAttribute('x', '-100%');
					filter.setAttribute('y', '-100%');
					filter.setAttribute('width', '300%');
					filter.setAttribute('height', '300%');
					filter.appendChild(feGaussianBlur);
					filter.appendChild(feOffset);
					filter.appendChild(feFlood);
					filter.appendChild(feComposite);
						feGaussianBlur.setAttribute('in', 'SourceAlpha');
						feGaussianBlur.setAttribute('stdDeviation', shadowValues.blurRadius / 2);
						feGaussianBlur.setAttribute('result', filterBlurId);
						feOffset.setAttribute('dx', shadowValues.offsetX);
						feOffset.setAttribute('dy', shadowValues.offsetY);
						feOffset.setAttribute('in', filterBlurId);
						feOffset.setAttribute('result', filterOffsetId);
						feFlood.style.setProperty('flood-color', shadowValues.color);
						feFlood.setAttribute('result', filterColorId);
						feComposite.setAttribute('in', filterColorId);
						feComposite.setAttribute('in2', filterOffsetId);
						feComposite.setAttribute('operator', 'in');
						feComposite.setAttribute('result', filterShadowId);

				gShadows.appendChild(shadow);
					shadow.setAttribute('href', `#${pathId}`);
					shadow.setAttribute('id', shadowId);
					shadow.setAttribute('filter', `url(#${filterId})`);
			}
		}

		/**
		 * Разбирает значение `box-shadow` на массив объектов теней.
		 * @since 1.0.0
		 * @protected
		 * @param {string} boxShadowValue - Строка свойства `box-shadow`.
		 * @returns {Array<Object>} Массив теней с полями: inset, color, offsetX, offsetY, blurRadius, spreadRadius, originalColorFormat.
		 */
		_parseBoxShadow(boxShadowValue) {
			if (!boxShadowValue || boxShadowValue === 'none') return [];
			
			/** Разделяем тени **/
			const shadows = [];
			let current = '';
			let depth = 0;
			
			for (let char of boxShadowValue) {
				if (char === '(') depth++;
				if (char === ')') depth--;
				if (char === ',' && depth === 0) {
					shadows.push(current.trim());
					current = '';
				} else {
					current += char;
				}
			}
			shadows.push(current.trim());
			
			return shadows.map(shadow => {
				/** Парсим одну тень **/
				const parts = shadow.match(/(?:rgba?\([^)]+\)|\S+)/g);
				if (!parts) return null;
				
				const result = {
					inset: false,
					color: null,
					offsetX: 0,
					offsetY: 0,
					blurRadius: 0,
					spreadRadius: 0,
					originalColorFormat: null  // исходный формат (уже нормализован getComputedStyle)
				};
				
				/** Проверяем inset **/
				const insetIndex = parts.indexOf('inset');
				if (insetIndex !== -1) {
					result.inset = true;
					parts.splice(insetIndex, 1);
				}
				
				/** Цвет всегда будет в формате rgb/rgba после getComputedStyle **/
				const colorPart = parts.find(p => p.startsWith('rgb'));
				if (colorPart) {
					result.color = colorPart;
					result.originalColorFormat = colorPart;
					parts.splice(parts.indexOf(colorPart), 1);
				}
				
				/** Парсим числовые значения **/
				const numbers = parts
					.map(p => parseFloat(p))
					.filter(n => !isNaN(n));
				
				if (numbers[0] !== undefined) result.offsetX = numbers[0];
				if (numbers[1] !== undefined) result.offsetY = numbers[1];
				if (numbers[2] !== undefined) result.blurRadius = numbers[2];
				if (numbers[3] !== undefined) result.spreadRadius = numbers[3];
				
				return result;
			});
		}


		/**
		 * =============================================================
		 * VIRTUAL
		 * =============================================================
		 */


		/**
		 * Инициализирует список виртуальных элементов (div, svg и пр.).
		 * @since 1.0.0
		 * @protected
		 * @returns {void}
		 */
		_initVirtualElementList() {
			this._initVirtualInnerWrapper();
			this._initVirtualSvgLayer();
		}

		/**
		 * Создаёт SVG-элемент с указанным тегом в пространстве имён SVG.
		 * @since 1.0.0
		 * @protected
		 * @param {string} tag - Имя тега (например, 'svg', 'path', 'filter').
		 * @returns {SVGElement}
		 */
		_createVirtualSvgElement(tag) {
			return document.createElementNS('http://www.w3.org/2000/svg', tag);
		}

		/**
		 * Создаёт HTML-элемент с указанным тегом.
		 * @since 1.0.0
		 * @protected
		 * @param {string} tag - Имя тега (например, 'div').
		 * @returns {HTMLElement}
		 */
		_createVirtualHtmlElement(tag) {
			return document.createElement(tag);
		}

		/**
		 * Создаёт SVG-элементы для слоя.
		 * @since 1.0.0
		 * @protected
		 * @returns {void}
		 */
		_initVirtualSvgLayer() {
			if (this._virtualElementList.svgLayer) return;

			const id = this._id;
			const svgId		= `jsse_${id}`;
			const clipId	= `jsse_${id}__clip`;
			const pathId	= `jsse_${id}__path`;
			const filtersId	= `jsse_${id}__filters`;
			const shadowsId	= `jsse_${id}__shadows`;
			const divId		= `jsse_${id}__div`;
			const borderId	= `jsse_${id}__border`;

			const svg = this._createVirtualSvgElement('svg');
			const defs = this._createVirtualSvgElement('defs');
			const clipPath = this._createVirtualSvgElement('clipPath');
			const path = this._createVirtualSvgElement('path');
			const gFilters = this._createVirtualSvgElement('g');
			const gShadows = this._createVirtualSvgElement('g');
			const html = this._createVirtualSvgElement('foreignObject');
			const div = this._createVirtualHtmlElement('div');
			const border = this._createVirtualSvgElement('use');

			/** svg **/
			svg.setAttribute('id', svgId);
			svg.classList.add('jsse--svg-layer--bg');
			svg.setAttribute('viewBox', this._getViewbox());
			svg.setAttribute('preserveAspectRatio', 'none');
			const svgProps = this._getSvgLayerStyles();
			for (const prop in svgProps) {
				svg.style.setProperty(prop, svgProps[prop]);
			}
			svg.style.setProperty('overflow', 'visible');
			svg.appendChild(defs);
			svg.appendChild(gShadows);
			svg.appendChild(html);
			svg.appendChild(border);
			/** svg > defs **/
			defs.appendChild(clipPath);
			defs.appendChild(gFilters);
			/** svg > defs > clipPath **/
			clipPath.setAttribute('id', clipId);
			clipPath.appendChild(path);
			/** svg > defs > clipPath > path **/
			path.setAttribute('id', pathId);
			path.setAttribute('d', ''); // только создаем слой, не заполняем
			/** svg > defs > g **/
			gFilters.setAttribute('id', filtersId);
			/** svg > g **/
			gShadows.setAttribute('id', shadowsId);
			/** svg > foreignObject **/
			html.setAttribute('id', shadowsId);
			// html.setAttribute('width', '100%');
			// html.setAttribute('height', '100%');
			html.setAttribute('width', this._size.width);
			html.setAttribute('height', this._size.height);
			html.setAttribute('clip-path', `url(#${clipId})`);
			html.appendChild(div);
			/** svg > foreignObject > div **/
			div.setAttribute('id', divId);
			div.style.setProperty('width', '100%');
			div.style.setProperty('height', '100%');
			/** svg > border **/
			border.setAttribute('id', borderId);
			border.setAttribute('href', `#${pathId}`);
			border.setAttribute('fill', 'none');
			border.setAttribute('stroke', '');
			border.setAttribute('stroke-width', '0');
			border.setAttribute('clip-path', `url(#${clipId})`);


			this._virtualElementList.svgLayer = svg;
			this._virtualElementList.svgLayerPath = path;
			this._virtualElementList.svgLayerGFilters = gFilters;
			this._virtualElementList.svgLayerGShadows = gShadows;
			this._virtualElementList.svgLayerHtml = html;
			this._virtualElementList.svgLayerDiv = div;
			this._virtualElementList.svgLayerBorder = border;
		}

		/**
		 * Создаёт внутренний div-обёртку для контента.
		 * @since 1.0.0
		 * @protected
		 * @returns {void}
		 */
		_initVirtualInnerWrapper() {
			if (this._virtualElementList.innerWrapper) return;

			const innerWrapper = this._createVirtualHtmlElement('div');
			innerWrapper.className = 'jsse--svg-layer--content';
			innerWrapper.style.setProperty('position', 'relative');

			this._virtualElementList.innerWrapper = innerWrapper;
		}

		/**
		 * Добавляет виртуальные элементы в DOM.
		 * @override
		 * @since 1.0.0
		 * @protected
		 * @returns {void}
		 */
		_appendVirtualElements() {
			this._appendInnerWrapper();
			this._appendSvgLayer();
		}

		/**
		 * Удаляет виртуальные элементы из DOM.
		 * @override
		 * @since 1.0.0
		 * @protected
		 * @returns {void}
		 */
		_removeVirtualElements() {
			this._removeSvgLayer();
			this._removeInnerWrapper();
		}

		/**
		 * Добавляет SVG-слой в начало элемента.
		 * @since 1.0.0
		 * @protected
		 * @returns {void}
		 */
		_appendSvgLayer() {
			const svgLayer = this._virtualElementList.svgLayer;
			// TODO: нужна ли проверка на наличие svgLayer у this._element?
			this._element.insertBefore(svgLayer, this._element.firstChild);
		}

		/**
		 * Удаляет SVG-слой.
		 * @since 1.0.0
		 * @protected
		 * @returns {void}
		 */
		_removeSvgLayer() {
			const svgLayer = this._virtualElementList.svgLayer;
			if (svgLayer && svgLayer.parentNode === this._element) {
				this._element.removeChild(svgLayer);
			}
		}

		/**
		 * Перемещает дочерние элементы элемента во внутреннюю обёртку.
		 * @since 1.0.0
		 * @protected
		 * @returns {void}
		 */
		_appendInnerWrapper() {
			const innerWrapper = this._virtualElementList.innerWrapper;

			/** Перемещаем внутренние элемены this._element в innerWrapper **/
			const children = Array.from(this._element.childNodes);
			for (const child of children) {
				innerWrapper.appendChild(child);
			}

			this._element.appendChild(innerWrapper);
		}

		/**
		 * Возвращает дочерние элементы из обёртки обратно в элемент.
		 * @since 1.0.0
		 * @protected
		 * @returns {void}
		 */
		_removeInnerWrapper() {
			const innerWrapper = this._virtualElementList.innerWrapper;

			/** Перемещаем внутренние элемены innerWrapper в this._element **/
			const children = Array.from(innerWrapper.childNodes);
			for (const child of children) {
				this._element.appendChild(child);
			}

			this._element.removeChild(innerWrapper);
		}



		/**
		 * =============================================================
		 * CURVE
		 * =============================================================
		 */


		/**
		 * Инициализирует viewBox.
		 * @since 1.0.0
		 * @protected
		 * @returns {void}
		 */
		_initViewbox() {
			this._recalculateViewbox();
		}

		/**
		 * Пересчитывает viewBox при изменении размеров.
		 * @override
		 * @since 1.0.0
		 * @protected
		 * @returns {void}
		 */
		_recalculateCurve() {
			super._recalculateCurve();

			this._recalculateViewbox();
		}

		/**
		 * Обновляет viewBox на основе текущих размеров.
		 * @since 1.0.0
		 * @protected
		 * @returns {void}
		 */
		_recalculateViewbox() {
			if ( this._size.width > 0 && this._size.height > 0 ) {
				this._viewbox = `0 0 ${this._size.width} ${this._size.height}`;
			} else {
				this._viewbox = '0 0 0 0'; // Сбрасываем путь
			}
		}

		/**
		 * Возвращает строку viewBox.
		 * @since 1.0.0
		 * @protected
		 * @returns {string}
		 */
		_getViewbox() {
			return this._viewbox;
		}

		/**
		 * Применяет кривую, обновляя viewBox и d-атрибут пути.
		 * @override
		 * @since 1.0.0
		 * @protected
		 * @returns {void}
		 */
		_applyCurve() {
			const svgLayer = this._virtualElementList.svgLayer;
			svgLayer.setAttribute('viewBox', this._getViewbox());

			const svgLayerPath = this._virtualElementList.svgLayerPath;
			const svgLayerHtml = this._virtualElementList.svgLayerHtml;
			if (this._path) {
				svgLayerPath.setAttribute('d', this._path);
				svgLayerHtml.setAttribute('width', this._size.width);
				svgLayerHtml.setAttribute('height', this._size.height);
			} else {
				svgLayerPath.setAttribute('d', '');
			}
		}

		/**
		 * Восстанавливает исходный путь и очищает d-атрибут.
		 * @override
		 * @since 1.0.0
		 * @protected
		 * @returns {void}
		 */
		_restoreCurve() {
			const svgLayerPath = this._virtualElementList.svgLayerPath;

			svgLayerPath.setAttribute('d', '');

			super._restoreCurve();
		}


		/**
		 * =============================================================
		 * 
		 * =============================================================
		 */
	}

	/**
	 * @file src/mode-clip-path.js
	 * 
	 * @module js-superellipse/mode-clip-path
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



	/**
	 * Режим, использующий CSS-свойство `clip-path` для обрезки элемента.
	 * Не требует создания дополнительных DOM-узлов, но не поддерживает тени, границы и сложные фоны.
	 * @class SuperellipseModeClipPath
	 * @extends SuperellipseMode
	 * @since 1.0.0
	 */
	class SuperellipseModeClipPath extends SuperellipseMode {


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



	/**
	 * Контроллер, управляющий применением суперэллипса к DOM-элементу.
	 */
	class SuperellipseController
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
		// _hoverHandlers;
		_hoverOptions;

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
			};
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
			// this._registerTargetListeners();
			this._registerTargetHoverTrackers();

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
			// this._unregisterTargetListeners();
			this._unregisterTargetHoverTrackers();

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
			this._hoverOptions = null;
			jsse_console.debug({label:'STYLESHEET',element:this._element}, '[TARGET]', '[DESTROY]');
		}

		/**
		 * Регистрирует обработчики событий на элементах-триггерах.
		 * @since 1.4.0
		 * @protected
		 * @param {Object} triggers - Объект, где ключ – селектор, значение – массив элементов.
		 * @returns {void}
		 */
		_registerTargetHoverTrackers() {
			const triggers = this._targetTriggers;
			this._hoverOptions = {};
			for (const selector in triggers) {
				this._hoverOptions[selector] = {
					callback : (isHover) => this._hoverEventHandler(selector, isHover),
					triggers : new Set(),
					active : false,
				};
				triggers[selector].forEach((trigger) => {
					this._hoverOptions[selector].triggers.add(trigger);
					jsse_trigger_callbacks.add(trigger, this._hoverOptions[selector].callback);
					jsse_hover_tracker.observe(trigger, (trigger, isHover) => jsse_trigger_callbacks.call(trigger, isHover) );
				});
			}
			jsse_console.debug({label:'STYLESHEET',element:this._element}, '[TARGET]', '[TRACKER]', true);
		}

		/**
		 * Удаляет все зарегистрированные обработчики с триггеров.
		 * @since 1.4.0
		 * @protected
		 * @returns {void}
		 */
		_unregisterTargetHoverTrackers() {
			for (const selector in this._hoverOptions) {
				for (const trigger of this._hoverOptions[selector].triggers) {
					this._hoverOptions[selector].triggers.delete(trigger);
					jsse_trigger_callbacks.delete(trigger, this._hoverOptions[selector].callback);
					jsse_hover_tracker.unobserve(trigger, (trigger, isHover) => jsse_trigger_callbacks.call(trigger, isHover) );
					if (!jsse_trigger_callbacks.has(trigger))
						jsse_hover_tracker.unobserve(trigger);
				}
			}
			jsse_console.debug({label:'STYLESHEET',element:this._element}, '[TARGET]', '[TRACKER]', false);
		}

		_hoverEventHandler(selector, isHover) {
			if (isHover) {
				this._hoverEnterHandler(selector);
			}
			else {
				this._hoverLeaveHandler(selector);
			}
			jsse_console.debug({label:'STYLESHEET',element:this._element}, '[HOVER]', selector, isHover);
		}


		/**
		 * Обработчик события `hoverEnter` на триггере.
		 * @since 1.4.0
		 * @protected
		 * @param {string} selector - Селектор триггера.
		 * @returns {void}
		 */
		_hoverEnterHandler(selector) {
			if (this._hoverOptions[selector]?.active || !this._element.matches(selector)) return;
			this._hoverOptions[selector].active = true;
			this._mutationHandler();
		}

		/**
		 * Обработчик события `hoverLeave` на триггере.
		 * @since 1.4.0
		 * @protected
		 * @param {string} selector - Селектор триггера.
		 * @returns {void}
		 */
		_hoverLeaveHandler(selector) {
			if(!this._hoverOptions[selector]?.active) return;
			this._hoverOptions[selector].active = false;
			this._mutationHandler();
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
	function superellipseInit(target, options) {
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

	exports.SuperellipseController = SuperellipseController;
	exports.jsse_generateSuperellipsePath = jsse_generateSuperellipsePath;
	exports.superellipseInit = superellipseInit;

}));
//# sourceMappingURL=superellipse.js.map
