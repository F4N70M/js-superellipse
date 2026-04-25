/**
 * 
 * @module js-superellipse
 * @version 1.5.3
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
	 * @file src/stylesheet-parser.js
	 * 
	 * @module js-superellipse/stylesheet-parser
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
		getPseudoList() { return this._pseudo; };

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
		 * @returns {Array<{parent: string, neighbor: {combinator: string, clean: string}|null, child: string}>}
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
				let isMatch;
				try {
					isMatch = element.matches(clean);
				} catch (e) {
					isMatch = false;
					jsse_console.warn({label:'STYLESHEET'}, `last fragment`,clean, ` in `, selector.getSelector(), `not supported`, e, element);
				}
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
	    /**
	     * @type {WeakMap<Element, Set<Function>>}
	     */
		triggers: new WeakMap(),

	    /**
	     * @param {Element} trigger
	     * @param {Function} callback
	     * @returns {void}
	     */
		add(trigger, callback) {
			if(!this.triggers.has(trigger)) {
				this.triggers.set(trigger, new Set());
			}
			const callbacks = this.triggers.get(trigger);
			callbacks.add(callback);
		},
		
	    /**
	     * @param {Element} trigger
	     * @param {Function} callback
	     * @returns {void}
	     */
		delete(trigger, callback) {
			if(!this.triggers.has(trigger)) return;
			const callbacks = this.triggers.get(trigger);
			callbacks.delete(callback);
			if (callbacks.size < 1) {
				this.triggers.delete(trigger);
			}
		},

	    /**
	     * @param {Element} trigger
	     * @returns {boolean}
	     */
		has(trigger) {
			return this.triggers.has(trigger);
		},

	    /**
	     * @param {Element} trigger
	     * @param {...any} args
	     * @returns {void}
	     */
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
	 * @param {number} radius - Радиус скругления углов (будет автоматически ограничен, NaN преобразуется в 0).
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
	 * @file src/transition-parser.js
	 * 
	 * @module js-superellipse/transition-parser
	 * @since 1.5.3
	 * @author f4n70m
	 * 
	 * @description
	 * Модуль парсинга css ссвойства transition.
	 */


	/**
	 * Возвращает список свойств, отслеживаемых для анимаций.
	 * @since 1.5.3
	 * @protected
	 * @returns {Object<Object<Array<string>>>}
	 */
	const jsse_animated_props = {
		_src: {
			"accent-color": true,
			"aspect-ratio": true,
			"backdrop-filter": true,
			"backface-visibility": true,

			"background-color": ["background"],
			"background-position": ["background"],
			"background-size": ["background"],

			"block-step-size": true,

			"border-top": ["border"],
			"border-bottom": ["border"],
			"border-left": ["border"],
			"border-right": ["border"],
			"border-width": ["border"],
			"border-color": ["border"],

				"border-top-width": ["border-width", "border-top"],
				"border-bottom-width": ["border-width", "border-bottom"],
				"border-left-width": ["border-width", "border-left"],
				"border-right-width": ["border-width", "border-right"],
				"border-top-color": ["border-color", "border-top"],
				"border-bottom-color": ["border-color", "border-bottom"],
				"border-left-color": ["border-color", "border-left"],
				"border-right-color": ["border-color", "border-right"],

			"border-image-outset": ["border-image"],
			"border-image-width": ["border-image"],

			"border-bottom-left-radius": ["border-radius"],
			"border-bottom-right-radius": ["border-radius"],
			"border-top-left-radius": ["border-radius"],
			"border-top-right-radius": ["border-radius"],

			"border-spacing": true,
			"bottom": true,
			"box-shadow": true,
			"caret-color": true,
			"clip": true,
			"clip-path": true,
			"color": true,

			"column-rule-color": ["column-rule"],
			"column-rule-width": ["column-rule"],

			"column-count": ["columns"],
			"column-width": ["columns"],

			"filter": true,

			"flex-basis": ["flex"],
			"flex-grow": ["flex"],
			"flex-shrink": ["flex"],

			"font-size": ["font"],
			"font-stretch": ["font"],
			"font-weight": ["font"],
			"line-height": ["font"],

			"font-size-adjust": true,

			"column-gap": ["gap"],
			"row-gap": ["gap"],

			"grid-template-columns": ["grid"],
			"grid-template-rows": ["grid"],

			"height": true,
			"inline-size": true,

			"bottom": ["inset"],
			"left": ["inset"],
			"right": ["inset"],
			"top": ["inset"],

			"letter-spacing": true,

			"margin-bottom": ["margin"],
			"margin-left": ["margin"],
			"margin-right": ["margin"],
			"margin-top": ["margin"],

			"mask-position": ["mask"],
			"mask-size": ["mask"],

			"max-height": true,
			"max-width": true,
			"min-height": true,
			"min-width": true,
			"object-position": true,

			"offset-distance": ["offset"],
			"offset-position": ["offset"],

			"opacity": true,
			"order": true,

			"outline-color": ["outline"],
			"outline-width": ["outline"],

			"outline-offset": true,

			"padding-bottom": ["padding"],
			"padding-left": ["padding"],
			"padding-right": ["padding"],
			"padding-top": ["padding"],

			"perspective": true,
			"perspective-origin": true,
			"rotate": true,
			"scale": true,

			"scroll-margin-bottom": ["scroll-margin"],
			"scroll-margin-left": ["scroll-margin"],
			"scroll-margin-right": ["scroll-margin"],
			"scroll-margin-top": ["scroll-margin"],

			"scroll-padding": ["scroll-padding"],
			"scroll-padding-bottom": ["scroll-padding"],
			"scroll-padding-left": ["scroll-padding"],
			"scroll-padding-right": ["scroll-padding"],
			"scroll-padding-top": ["scroll-padding"],

			"shape-outside": true,
			"tab-size": true,

			"text-decoration-color": ["text-decoration"],
			"text-decoration-thickness": ["text-decoration"],
			"text-underline-offset": ["text-decoration"],
			
			"text-emphasis-color": ["text-emphasis"],
			
			"text-indent": true,
			"text-shadow": true,
			"transform": true,
			"transform-origin": true,
			"translate": true,
			"visibility": true,
			"width": true,
			"word-spacing": true,
			"z-index": true
		},
		_list: null,

		/**
		 * Возвращает список родительских свойств (редукций) для указанного CSS-свойства.
		 * Например, для 'border-top-color' вернёт ['border-color', 'border-top'].
		 * @since 1.5.3
		 * @param {string} prop - Имя CSS-свойства.
		 * @returns {string[]} Массив имён родительских свойств (может быть пустым).
		 */
		getReductions(prop) {
			return (typeof this._src[prop] === 'object')
				? this._src[prop]
				: [];
		},

		/**
		 * Возвращает полный список всех CSS-свойств, которые могут участвовать в анимации
		 * (учитываются как конкретные, так и групповые свойства).
		 * @since 1.5.3
		 * @returns {string[]} Массив имён свойств.
		 */
		getList() {
			if (this._list === null) {
				this._list = this._extract();
			}
			return this._list;
		},

		/**
		 * Извлекает и возвращает массив всех отслеживаемых свойств из внутреннего хранилища.
		 * @since 1.5.3
		 * @protected
		 * @returns {string[]} Массив имён свойств.
		 */
		_extract() {
			const result = {};
			let list = this._src;
			for (const prop in list) {
				if (typeof list[prop] === 'object') {
					for (const subProp of list[prop]) {
						result[subProp] = true;
					}
				}
				result[prop] = true;
			}
			return Object.keys(result);
		}
	};


	/**
	 * Парсер css ссвойства transition.
	 * @class StylesheetParser
	 * @since 1.5.3
	 */
	class Transition {

		_original;

		_list = null;
		_cache = null;
		_propSting = {};

		_default = {
			duration: '0s',
			timingFunction: 'ease',
			delay: '0s'
		};

		/**
		 * Создаёт экземпляр парсера переходов.
		 * @since 1.5.3
		 * @constructor
		 */
		constructor() {
			// this._original = transitionString;
			// this._init();
		}

		/**
		 * Устанавливает исходную строку transition для парсинга.
		 * Сбрасывает все кешированные данные.
		 * @since 1.5.3
		 * @param {string} transitionString - Строка свойства `transition` (например, "all 0.3s ease").
		 * @returns {void}
		 */
		setStyleString(transitionString) {
			this._original = transitionString;
			this._list = null;
			this._cache = null;
			this._propSting = {};
		}

		/**
		 * Возвращает строку transition для указанного свойства, собранную из распарсенных значений.
		 * @since 1.5.3
		 * @param {string} propName - Имя свойства (например, 'background-color').
		 * @param {boolean} [name=true] - Включать ли имя свойства в результирующую строку.
		 * @param {boolean} [short=true] - Убирать ли значения по умолчанию (`ease`, `0s`) для сокращения.
		 * @returns {string} Строка вида "property duration timing-function delay".
		 */
		getPropString(propName, name = true, short = true) {
			const prop = this._getPropValues(propName);
			const parts = [];
			if (name && !(short && propName === 'all')) parts.push(propName);
			parts.push(prop.duration);
			if (!short || prop.timingFunction !== this._default.timingFunction)
				parts.push(prop.timingFunction);
			if (!short || prop.delay !== this._default.delay)
				parts.push(prop.delay);
			return parts.join(' ');
		}

		/**
		 * Возвращает объект с параметрами перехода (duration, timingFunction, delay) для указанного свойства.
		 * Использует кеш и учитывает наследование от родительских свойств.
		 * @since 1.5.3
		 * @protected
		 * @param {string} prop - Имя CSS-свойства.
		 * @returns {{ duration: string, timingFunction: string, delay: string }}
		 */
		_getPropValues(prop) {
			const cacheList = this._getCacheList();

			if (cacheList[prop]) return cacheList[prop];

			let values;
			const parentList = jsse_animated_props.getReductions(prop);

			for (const parentProp of parentList) {
				values = cacheList[parentProp];
				if (values) {
					cacheList[prop] = {...values};
					break;
				}
			}

			if (!values) {
				for (const parentProp of parentList) {
					values = this._getPropValues(parentProp);
					if (values) {
						cacheList[prop] = {...values};
						break;
					}
				}
			}

			
			if (!values) {
				cacheList[prop] = this._getAllPropValues();
			}
			
			return cacheList[prop];
		}

		/**
		 * Возвращает значения перехода для неспецифицированных свойств (по умолчанию берутся из `all`).
		 * @since 1.5.3
		 * @protected
		 * @returns {{ duration: string, timingFunction: string, delay: string }}
		 */
		_getAllPropValues() {
			const allProp = this._getAllProp();
			const values = {
				duration: allProp.duration,
				timingFunction: allProp.timingFunction,
				delay: allProp.delay
			};
			return values;
		}

		/**
		 * Возвращает объект параметров перехода для псевдосвойства `all`.
		 * @since 1.5.3
		 * @protected
		 * @returns {{ duration: string, timingFunction: string, delay: string }}
		 */
		_getAllProp() {
			const cacheList = this._getCacheList();
			if (!cacheList['all']) {
				cacheList['all'] = this._getDefaultPropValues();
			}
			return cacheList['all'];
		}

		/**
		 * Возвращает полный распарсенный список переходов (свойство → объект параметров).
		 * @since 1.5.3
		 * @protected
		 * @returns {Object<string, { duration: string, timingFunction: string, delay: string }>}
		 */
		_getList() {
			if (this._list === null) {
				this._list = this._parseComputedTransition(this._original);
			}
			return this._list;
		}

		/**
		 * Возвращает кешированную копию распарсенного списка переходов (глубокое клонирование).
		 * @since 1.5.3
		 * @protected
		 * @returns {Object<string, { duration: string, timingFunction: string, delay: string }>}
		 */
		_getCacheList() {
			if (this._cache === null) {
				this._cache = structuredClone(this._getList());
			}
			return this._cache;
		}

		/**
		 * Возвращает объект с объединёнными CSS-строками для `transition-property`, `transition-duration`,
		 * `transition-timing-function` и `transition-delay`, с возможностью сброса указанных свойств.
		 * @since 1.5.3
		 * @param {string[]} [resetProps=[]] - Массив свойств, для которых следует применить дефолтные значения.
		 * @returns {{ property: string, duration: string, 'timing-function': string, delay: string }}
		 */
		getStyleString(resetProps=[]) {

			const splitProperty = new Set();
			const splitDuration = [];
			const splitTimingFunction = [];
			const splitDelay = [];

			const list = this._getList();
			const reSet = new Set(resetProps);

			for (const prop in list) {
				const has = reSet.has(prop);
				if (has) reSet.delete(prop);
				splitProperty.add(prop);
				splitDuration.push( has ? this._default.duration : list[prop].duration );
				splitTimingFunction.push( has ? this._default.timingFunction : list[prop].timingFunction );
				splitDelay.push( has ? this._default.delay : list[prop].delay );
			}

			for (const prop of reSet) {
				splitProperty.add(prop);
				splitDuration.push( this._default.duration );
				splitTimingFunction.push( this._default.timingFunction );
				splitDelay.push( this._default.delay );
			}

			const durationEqual = (new Set(splitDuration).size) === 1;
			const timingFunctionEqual = (new Set(splitTimingFunction).size) === 1;
			const delayEqual = (new Set(splitDelay).size) === 1;
			const fullEqual = durationEqual && timingFunctionEqual && delayEqual && (
				splitProperty.has('all') ||
				(!splitProperty.has('all') && splitDuration[0] === this._default.duration)
			);

			return {
				'property':  fullEqual ? 'all' : Array.from(splitProperty).join(', '),
				'duration': durationEqual ? splitDuration[0] : splitDuration.join(', '),
				'timing-function': timingFunctionEqual ? splitTimingFunction[0] : splitTimingFunction.join(', '),
				'delay': delayEqual ? splitDelay[0] : splitDelay.join(', ')
			}
		}

		/**
		 * Возвращает объект со значениями перехода по умолчанию.
		 * @since 1.5.3
		 * @protected
		 * @returns {{ duration: string, timingFunction: string, delay: string }}
		 */
		_getDefaultPropValues() {
			return {
				duration: this._default.duration,
				timingFunction: this._default.timingFunction,
				delay: this._default.delay
			}
		}

		/**
		 * Парсит строку `transition` (полученную из `getComputedStyle`) и возвращает объект,
		 * где ключи — имена свойств, значения — параметры перехода.
		 * @since 1.5.3
		 * @protected
		 * @param {string} computedStr - Строка transition из computed стилей.
		 * @returns {Object<string, { duration: string, timingFunction: string, delay: string }>}
		 */
		_parseComputedTransition(computedStr) {
			// if (!computedStr || computedStr === 'none') return {};
			if (!computedStr) return {};

			const segmentsTokens = this._parseTransitionIntoTokens(computedStr);
			const result = {};

			const isTime = (token) => /^(\d+(?:\.\d+)?)(?:s|ms)$/.test(token);
			const isTimingFunction = (token) => {
				return /^(ease|linear|ease-in|ease-out|ease-in-out|step-start|step-end)$/i.test(token) ||
					   /^(cubic-bezier|steps)\(.*\)$/i.test(token);
			};

			for (const tokens of segmentsTokens) {
				let property = null;
				let duration = null;
				let timingFunction = null;
				let delay = null;

				for (const token of tokens) {
					if (isTime(token)) {
						if (duration === null) duration = token;
						else if (delay === null) delay = token;
					} else if (isTimingFunction(token)) {
						if (timingFunction === null) timingFunction = token;
					} else {
						property = token;
					}
				}

				if (property === 'none') continue;

				if (property === null) property = 'all';
				if (duration === null) duration = '0s';
				if (property === 'all' && duration === '0s') continue;

				if (timingFunction === null) timingFunction = 'ease';
				if (delay === null) delay = '0s';

				result[property] = { duration, timingFunction, delay };
			}
			return result;
		}

		/**
		 * Разбивает строку `transition` на токены и группирует их по сегментам (каждый сегмент — одно свойство со значениями).
		 * @since 1.5.3
		 * @protected
		 * @param {string} computedStr - Исходная строка transition.
		 * @returns {string[][]} Массив массивов токенов (каждый внутренний массив — токены одного сегмента).
		 */
		_parseTransitionIntoTokens(computedStr) {
			const segmentsTokens = [];
			let currentSegmentTokens = [];
			let currentToken = '';
			let inParen = false;      // внутри скобок (cubic-bezier/steps)
			let parenDepth = 0;       // глубина вложенности скобок

			const flushToken = () => {
				if (currentToken) {
					currentSegmentTokens.push(currentToken);
					currentToken = '';
				}
			};

			const flushSegment = () => {
				flushToken();
				if (currentSegmentTokens.length > 0) {
					segmentsTokens.push(currentSegmentTokens);
					currentSegmentTokens = [];
				}
			};

			for (let i = 0; i < computedStr.length; i++) {
				const ch = computedStr[i];
				if (ch === '(') {
					inParen = true;
					parenDepth++;
					currentToken += ch;
				} else if (ch === ')') {
					parenDepth--;
					if (parenDepth === 0) inParen = false;
					currentToken += ch;
				} else if (ch === ',' && !inParen && parenDepth === 0) {
					// запятая на нулевом уровне – разделитель сегментов
					flushSegment();
				} else if (ch === ' ' && !inParen && parenDepth === 0) {
					// пробел вне скобок – разделитель токенов внутри сегмента
					flushToken();
				} else {
					currentToken += ch;
				}
			}
			flushSegment(); // последний сегмент
			return segmentsTokens;
		}
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
	 */


	/**
	 * Базовый класс для реализации режимов суперэллипса.
	 * @class SuperellipseMode
	 * @since 1.0.0
	 */
	class SuperellipseMode {

		_id;

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
		_transition = null;

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
			/** Отменить анимацию перехода возвращения сброшеннных стилей **/
			this._cancelTransition();
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
			if (!this.isActivated()) return;
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
			if (!this.isActivated()) return;
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
			if (!this.isActivated()) return;
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
			if (!this.isActivated()) return;
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
			if (!this.isActivated()) return;
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
		 * @protected
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
		 * @protected
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
		 * @protected
		 * @returns {void}
		 */
		_updateCaptured() {
			this._updateCapturedStyles();
			this._updateCapturedSize();
		}

		/**
		 * Подготавливает обновление (пересчёт кривой).
		 * @since 1.0.0
		 * @protected
		 * @returns {void}
		 */
		_prepareUpdate() {
			this._recalculateCurve();
		}

		/**
		 * Выполняет обновление (применяет кривую).
		 * @since 1.0.0
		 * @protected
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
		 * Возвращает список свойств, отслеживаемых для анимаций.
		 * @since 1.5.3
		 * @protected
		 * @returns {Array<string>}
		 */
		_getTransitionProperties() {
			return [
				'border-radius',
			];
		}


		/**
		 * =============================================================
		 * VIRTUAL
		 * =============================================================
		 */



		/**
		 * Создаёт HTML-элемент с указанным тегом.
		 * @since 1.5.0 – Перенесен из `SuperellipseModeSvgLayer::_createVirtualHtmlElement` [1.0.0]
		 * @protected
		 * @param {string} tag - Имя тега (например, 'div').
		 * @returns {HTMLElement}
		 */
		_createVirtualHtmlElement(tag) {
			return document.createElement(tag);
		}


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

			const transitionStyles = {
				'transition-property': 'all',
				'transition-duration': '0s',
				'transition-timing-function': 'ease',
				'transition-delay': '0s',
			};

			const activatedStyles = this._getActivatedStyles();
			jsse_console.debug({label:'ResetCssText',element:this._element}, activatedStyles, this._styles.computed);
			cssString += `[data-jsse-mode="${modeName}"][data-jsse-activated=true]:not([data-jsse-reading=true])`;
			cssString += `{`;
			for (const prop in activatedStyles) {
				if (activatedStyles[prop] === '') continue;
				cssString += `\n\t${prop}: ${activatedStyles[prop]} !important;`;
			}
			for (const prop in transitionStyles) {
				cssString += `\n\t${prop}: var(--jsse-${prop}, ${transitionStyles[prop]});`;
			}

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
		 * Обновляет захваченные стили и переходы.
		 * @since 1.5.3
		 * @protected
		 * @returns {void}
		 */
		_updateCapturedStyles() {
			/** Сохранить computed-стили **/
			const captured = this._getCapturedStyles();
			this._styles.computed = captured.computed;
			this._styles.transition = captured.transition;
			this._updateTransitionStyles();
			jsse_console.debug({label:'MODE',element:this._element}, '[STYLES]', '[CAPTURED]');
		}

		/**
		 * Получает вычисленные стили с временным снятием атрибута активации.
		 * @since 1.0.0
		 * @protected
		 * @returns {{ computed: Object<string, string>, transition: Object<string, string> }}
		 *          Объект с вычисленными стилями (computed) и параметрами перехода (transition).
		 */
		_getCapturedStyles() {
			return this._getManagedComputedStyle();
		}

		/**
		 * Получает вычисленные стили применяя принудительный reflow.
		 * @since 1.5.3
		 * @protected
		 * @returns {CSSStyleDeclaration}
		 */
		_getComputedStyle() {
			this._reflow();
			return getComputedStyle(this._element);
		}

		/**
		 * Вызывает принудительный reflow элемента для синхронизации стилей.
		 * @since 1.5.3
		 * @protected
		 * @returns {void}
		 */
		_reflow() {
			jsse_console.debug({label:'MODE',element:this._element}, '[REFLOW]');
			this._element.offsetHeight;
		}

		/**
		 * Возвращает объект управления переходами (`Transition`).
		 * Если объект ещё не создан, инициализирует новый экземпляр.
		 * @since 1.5.3
		 * @protected
		 * @returns {Transition} Экземпляр класса `Transition`.
		 */
		_getTransition() {
			if (this._transition === null) {
				this._transition = new Transition();
			}
			return this._transition;
		}

		/**
		 * Получает вычисленные стили для управляемых свойств.
		 * @since 1.5.3
		 * @protected
		 * @returns {{ computed: Object<string, string>, transition: Object<string, string> }}
		 *          Объект, содержащий захваченные значения управляемых свойств (computed)
		 *          и распарсенные компоненты CSS-перехода (transition).
		 */
		_getManagedComputedStyle() {

			const managed = this._getManagedProperties();
			const animatedPropList = jsse_animated_props.getList();

			performance.now(); 

			/**  **/
			const computed = getComputedStyle(this._element);
			const current = {
				computed: {},
				transition: {}
			};
			const diff = {};
			const before = {
				/** Сохранить начальные значения стилей **/
				computed: (()=>{
					const result = {};
					for (const prop of animatedPropList) {
						result[prop] = computed.getPropertyValue(prop);
					}
					return result;
				})(),
				/** Получить все inline значения **/
				inline: (()=>{
					const result = {};
					for (let i = 0; i < this._element.style.length; i++) {
						const prop = this._element.style[i];
						result[prop] = {
							value: this._element.style.getPropertyValue(prop),
							priority: this._element.style.getPropertyPriority(prop)
						};
					}
					return result;
				})(),
				transition: {
					inline: this._element.style.getPropertyValue('transition'),
					priority: this._element.style.getPropertyPriority('transition'),
				}
			};

			/** Включить режим чтения стилей **/
			this._setReadingAttr();

			/** Получить оригинальное значение transition – Вынужденный reflow при чтении значений свойств стилей – фиксирует значения стилей как начальные **/
			const transitionValue = computed.getPropertyValue('transition');

				const transition = this._getTransition();
				transition.setStyleString(transitionValue);
				const resetTransitionProps = this._getTransitionProperties();
				current.transition = transition.getStyleString(resetTransitionProps);

			/** Установить временный transition: none – для мгновенного применения стилей **/
			this._element.style.setProperty('transition', 'none', 'important');

			/** Получить конечные значения стилей – Вынужденный reflow при чтении значений свойств стилей – фиксирует значения стилей как начальные (инициализирует скачек при анимации) **/
			for (const prop of managed) {
				if (prop === 'transition') continue;
				current.computed[prop] = computed.getPropertyValue(prop);
			}

			/** Установить временный transition: 0s – для отмены мгновенного применения стилей **/
			this._element.style.setProperty('transition', '0s', 'important');

			/** Установить временно в inline начальные значения стилей **/
			for (const prop in before.computed) {
				const beforeValue = before.computed[prop];
				const value = computed.getPropertyValue(prop);
				if (value !== beforeValue) {
					/** сохранить конечное значение расхождения **/
					diff[prop] = value;
					/** сбросить начальное значение через установку временного inline **/
					this._element.style.setProperty(prop, beforeValue, 'important');
				}
			}

			/** Вызвать reflow – фиксирует значения стилей как начальные (отменяет скачек при анимации) **/
			this._reflow();

			/** Сбросить временный transition **/
			this._element.style.setProperty('transition', before.transition.inline, before.transition.priority);

			/** Сбросить временные inline **/
			for (const prop in diff) {
				this._element.style.setProperty(prop, before.inline[prop]?.value??'', before.inline[prop]?.priority??'');
			}

			/** Выключить режим чтения стилей **/
			this._removeReadingAttr();

			return current;
		}

		/**
		 * Обновляет CSS-переменные элемента, отвечающие за параметры перехода, на основе захваченных стилей transition.
		 * Устанавливает переменные:
		 * - `--jsse-transition-property`
		 * - `--jsse-transition-duration`
		 * - `--jsse-transition-timing-function`
		 * - `--jsse-transition-delay`
		 * @since 1.5.3
		 * @protected
		 * @returns {void}
		 */
		_updateTransitionStyles() {
			jsse_console.debug({label:'MODE',element:this._element}, '[TRANSITION]', '[PARTS]', this._styles.transition);
			this._element.style.setProperty('--jsse-transition-property', this._styles.transition['property']);
			this._element.style.setProperty('--jsse-transition-duration', this._styles.transition['duration']);
			this._element.style.setProperty('--jsse-transition-timing-function', this._styles.transition['timing-function']);
			this._element.style.setProperty('--jsse-transition-delay', this._styles.transition['delay']);
		}

		/**
		 * Отменяет CSS-переход при деактивации режима для предотвращения нежелательных анимаций.
		 * @since 1.5.3
		 * @protected
		 * @returns {void}
		 */
		_cancelTransition() {
			const before = {
				value: this._element.style.getPropertyValue('transition'),
				priority: this._element.style.getPropertyPriority('transition')
			};
			this._element.style.setProperty('transition', 'none', 'important');
			this._element.style.setProperty('transition', '0s', 'important');
			this._reflow();
			this._element.style.setProperty('transition', before.value, before.priority);
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
	 	 * Возвращает массив свойств CSS, управляемых режимом для переходов.
		 * @since 1.5.3
		 * @protected
		 * @returns {string[]}
		 */
		_getManagedTransitionProperties() {
			return ['transition-property', 'transition-duration', 'transition-timing-function', 'transition-delay'];
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
	 * @file src/svg-builder.js
	 * 
	 * @module js-superellipse/svg-builder
	 * @since 1.5.0
	 * @author f4n70m
	 * 
	 * @description
	 * `SvgBuilder` – вспомогательный класс для динамического создания SVG-слоя, который повторяет
	 * геометрию заданного пути (`<path>`). Позволяет накладывать фоновое содержимое (через `foreignObject`),
	 * обрабатывать `box-shadow` (внешние и внутренние тени с использованием фильтров), рисовать обводку
	 * (`border`) с поддержкой различных стилей, а также создавать внешний контур (`outline`).
	 * 
	 * Класс автоматически строит древовидную структуру SVG с элементами `<defs>`, масками, клипами,
	 * фильтрами для теней и управляет их обновлением при изменении параметров.
	 * 
	 * @example
	 * const builder = new SvgBuilder('myShape', {
	 *   width: 300,
	 *   height: 200,
	 *   path: 'M10 10 L100 10 L100 100 Z',
	 *   classes: ['shape', 'rounded'],
	 *   styles: { 'display': 'block' }
	 * });
	 * 
	 * builder.setBackground('linear-gradient(red, blue)');
	 * builder.setBoxShadow('5px 5px 10px rgba(0,0,0,0.5), inset 2px 2px 4px white');
	 * builder.setBorder('solid', '2px', '#333');
	 * 
	 * const svgElement = builder.getSvg();
	 * document.body.appendChild(svgElement);
	 */


	/**
	 * Строитель SVG-графики с поддержкой теней, обводок, фона и клиппинга.
	 * Класс создаёт иерархию SVG-элементов для отображения фигуры, заданной путём (path).
	 * Управляет фильтрами для внешних и внутренних теней, масками для контуров и адаптацией под CSS-стили.
	 *
	 * @class SvgBuilder
	 * @since 1.5.0
	 * @property {string} _id - Уникальный идентификатор экземпляра.
	 * @property {{width: number, height: number}} _size - Размеры SVG (ширина, высота).
	 * @property {string} _path - Строка d для элемента path.
	 * @property {SVGSVGElement|null} _link - Корневой SVG-элемент.
	 * @property {SVGDefsElement|null} _linkDefs - Контейнер определений (defs).
	 * @property {SVGClipPathElement|null} _linkClipPath - Элемент clipPath.
	 * @property {SVGPathElement|null} _linkPath - Элемент path внутри clipPath.
	 * @property {SVGFilterElement|null} _linkFilterShadowOut - Фильтр для внешних теней.
	 * @property {Object<string, Object>} _shadowsListOut - Хранилище примитивов внешних теней.
	 * @property {SVGFEMergeElement|null} _linkFilterShadowOutMerge - Контейнер merge для внешних теней.
	 * @property {SVGFilterElement|null} _linkFilterShadowIn - Фильтр для внутренних теней.
	 * @property {Object<string, Object>} _shadowsListIn - Хранилище примитивов внутренних теней.
	 * @property {SVGFEMergeElement|null} _linkFilterShadowInMerge - Контейнер merge для внутренних теней.
	 * @property {SVGMaskElement|null} _linkMaskOutline - Элемент маски для контура (outline).
	 * @property {Object<string, SVGRectElement|SVGUseElement>} _outlineMaskLinks - Элементы маски (show/hide).
	 * @property {SVGUseElement|null} _linkShadowOut - Элемент use для отображения внешней тени.
	 * @property {SVGForeignObjectElement|null} _linkBackgroundWrapper - Обёртка для фона (foreignObject).
	 * @property {HTMLDivElement|null} _linkBackground - Фоновый div-элемент.
	 * @property {SVGUseElement|null} _linkShadowIn - Элемент use для отображения внутренней тени.
	 * @property {SVGUseElement|null} _linkBorder - Элемент use для обводки.
	 * @property {SVGUseElement|null} _linkOutline - Элемент use для контура (outline).
	 */
	class SvgBuilder {
		_id;

		_size;
		_path = null;

		_link = null;
		_linkDefs = null;
			_linkClipPath = null;
				_linkPath = null;
			_linkFilterShadowOut = null;
				_shadowsListOut = {};
				_linkFilterShadowOutMerge = null;
			_linkFilterShadowIn = null;
				_shadowsListIn = {};
				_linkFilterShadowInMerge = null;
			_linkMaskOutline = null;
				_outlineMaskLinks = {};
		_linkShadowOut = null;
		_linkBackgroundWrapper = null;
		_linkBackground = null;
		_linkShadowIn = null;
		_linkBorder = null;
		_linkOutline = null;


	    /**
	     * Создаёт экземпляр построителя SVG.
	     * @since 1.5.0
	     * @param {string} id - Уникальный идентификатор (используется в id элементов).
	     * @param {object} [options] - Опции конфигурации.
	     * @param {number} [options.width=0] - Ширина SVG.
	     * @param {number} [options.height=0] - Высота SVG.
	     * @param {string} [options.path=''] - Строка d для path.
	     * @param {string[]} [options.classes=[]] - Список CSS-классов для корневого SVG.
	     * @param {object<string, string>} [options.styles={}] - Инлайновые стили для корневого SVG.
	     */
		constructor(id, options={}) {
			this._id = id;
			this._size = {
				width: options.width??0,
				height: options.height??0
			};
			this._path = options.path??'';
			this._classes = options.classes??[];
			this._styles = options.styles??{};
			this._initSvg();
		}

	    /**
	     * Возвращает корневой SVG-элемент, при необходимости инициализируя его.
	     * @since 1.5.0
	     * @returns {SVGSVGElement} Корневой элемент SVG.
	     */
		getSvg() {
			if (this._link === null) {
				this._initSvg();
			}
			return this._link;
		}

	    /**
	     * Инициализирует структуру SVG: создаёт корневой элемент и вложенные компоненты.
	     * @since 1.5.0
	     * @protected
	     */
		_initSvg() {
			const svg = this._createSvgElement('svg', {
				'id': this._getLinkId(),
				'width': this._size.width,
				'height': this._size.height,
				'viewbox': this._getViewbox(),
				'preserveAspectRatio': 'none'
			});

			const styles = this._styles;
			for (const prop in styles) {
				svg.style.setProperty(prop, styles[prop]);
			}
			svg.style.setProperty('overflow', 'visible');

			for (const classname of this._classes) {
				svg.classList.add(classname);
			}

			const linkDefs = this._getLinkDefs();
			const linkShadowOut = this._getLinkShadowOut();
			const linkBackgroud = this._getLinkBackgroundWrapper();
			const linkShadowIn = this._getLinkShadowIn();
			const linkBorder = this._getLinkBorder();
			const linkOutline = this._getLinkOutline();

			svg.appendChild(linkDefs);
			svg.appendChild(linkShadowOut);
			svg.appendChild(linkBackgroud);
			svg.appendChild(linkShadowIn);
			svg.appendChild(linkBorder);
			svg.appendChild(linkOutline);

			this._link = svg;
		}

	    /**
	     * Формирует идентификатор для внутренних элементов на основе базового id.
	     * @since 1.5.0
	     * @param {string|null} [name=null] - Дополнительный суффикс.
	     * @returns {string} Идентификатор вида `jsse_${this._id}--svg${prefix}${name}`.
	     * @protected
	     */
		_getLinkId(name=null) {
			const prefix = name?'__':'';
			return `jsse_${this._id}--svg${prefix}${name??''}`;
		}

		/**
		 * Возвращает имя CSS-переменной для transition указанного свойства.
		 * @since 1.5.3
		 * @protected
		 * @param {string} prop - Имя свойства (например, 'background', 'border').
		 * @returns {string}.
		 */
		_getTransitionVar(prop) {
			return `--jsse_${this._id}--transition--${prop}`;
		}

		/**
		 * Возвращает ID clipPath элемента для использования в CSS или SVG.
		 * @since 1.5.0
		 * @returns {string} ID clipPath (например, "jsse_xxx--svg__clip").
		 */
		getClipId() {
			return this._getLinkId('clip');
		}

	    /**
	     * Возвращает элемент `svg` > `defs`, создавая его при необходимости.
	     * @since 1.5.0
	     * @returns {SVGDefsElement}
	     * @protected
	     */
		_getLinkDefs() {
			if (this._linkDefs === null) this._initLinkDefs();
			return this._linkDefs;
		}

	    /**
	     * Инициализирует элемент `svg` > `defs` и добавляет в него `clipPath`, фильтры и маску.
	     * @since 1.5.0
	     * @protected
	     */
		_initLinkDefs() {
			const link = this._createSvgElement('defs');
			const linkClipPath = this._getLinkClipPath();
			const linkFilterShadowOut = this._getLinkFilterShadowOut();
			const linkFilterShadowIn = this._getLinkFilterShadowIn();
			const linkMaskOutline = this._getLinkMaskOutline();
			link.appendChild(linkClipPath);
			link.appendChild(linkFilterShadowOut);
			link.appendChild(linkFilterShadowIn);
			link.appendChild(linkMaskOutline);
			this._linkDefs = link;
		}

	    /**
	     * Возвращает элемент `svg` > `defs` > `clipPath`, создавая при необходимости.
	     * @since 1.5.0
	     * @returns {SVGClipPathElement}
	     * @protected
	     */
		_getLinkClipPath() {
			if (this._linkClipPath === null) this._initLinkClipPath();
			return this._linkClipPath;
		}

	    /**
	     * Инициализирует элемент `svg` > `defs` > `clipPath` с вложенным path.
	     * @since 1.5.0
	     * @protected
	     */
		_initLinkClipPath() {
			const link = this._createSvgElement('clipPath', {
				'id': this._getLinkId('clip')
			});
			const linkPath = this._getLinkPath();
			link.appendChild(linkPath);
			this._linkClipPath = link;
		}

	    /**
	     * Возвращает элемент `svg` > `defs` > `clipPath` > `path` внутри clipPath, создавая при необходимости.
	     * @since 1.5.0
	     * @returns {SVGPathElement}
	     * @protected
	     */
		_getLinkPath() {
			if (this._linkPath === null) this._initLinkPath();
			return this._linkPath;
		}

	    /**
	     * Инициализирует элемент `svg` > `defs` > `clipPath` > `path` с атрибутом d из this._path.
	     * @since 1.5.0
	     * @protected
	     */
		_initLinkPath() {
			const link = this._createSvgElement('path', {
				'id': this._getLinkId('path'),
				'd': this._path
			});
			this._linkPath = link;
		}

	    /**
	     * Возвращает элемент `svg` > `defs` > `filter` для внешних теней, создавая при необходимости.
	     * @since 1.5.0
	     * @returns {SVGFilterElement}
	     * @protected
	     */
		_getLinkFilterShadowOut() {
			if (this._linkFilterShadowOut === null) this._initLinkFilterShadowOut();
			return this._linkFilterShadowOut;
		}

	    /**
	     * Инициализирует элемент `svg` > `defs` > `filter` внешних теней и его контейнер merge.
	     * @since 1.5.0
	     * @protected
	     */
		_initLinkFilterShadowOut() {
			const link = this._createSvgElement('filter', {
				'id': this._getLinkId('filter_shadow_out'),
				'x': '-100%',
				'y': '-100%',
				'width': '300%',
				'height': '300%',
			});
			const linkMerge = this._getLinkFilterShadowOutMerge();
			link.appendChild(linkMerge);
			this._linkFilterShadowOut = link;
		}

	    /**
	     * Возвращает элемент `svg` > `defs` > `filter` для внутренних теней, создавая при необходимости.
	     * @since 1.5.0
	     * @returns {SVGFilterElement}
	     * @protected
	     */
		_getLinkFilterShadowIn() {
			if (this._linkFilterShadowIn === null) this._initLinkFilterShadowIn();
			return this._linkFilterShadowIn;
		}

	    /**
	     * Инициализирует элемент `svg` > `defs` > `filter` внутренних теней и его контейнер merge.
	     * @since 1.5.0
	     * @protected
	     */
		_initLinkFilterShadowIn() {
			const link = this._createSvgElement('filter', {
				'id': this._getLinkId('filter_shadow_in'),
				'x': '-200%',
				'y': '-200%',
				'width': '500%',
				'height': '500%',
			});
			const linkMerge = this._getLinkFilterShadowInMerge();
			link.appendChild(linkMerge);
			this._linkFilterShadowIn = link;
		}

	    /**
	     * Возвращает контейнер `svg` > `defs` > `filter` > `merge` фильтра внешних теней, создавая при необходимости.
	     * @since 1.5.0
	     * @returns {SVGFEMergeElement}
	     * @protected
	     */
		_getLinkFilterShadowOutMerge() {
			if (this._linkFilterShadowOutMerge === null) this._initLinkFilterShadowOutMerge();
			return this._linkFilterShadowOutMerge;
		}

	    /**
	     * Инициализирует контейнер `svg` > `defs` > `filter` > `merge` merge для внешних теней.
	     * @since 1.5.0
	     * @protected
	     */
		_initLinkFilterShadowOutMerge() {
			const link = this._createSvgElement('feMerge', {
				'id': this._getLinkId('filter_shadow_out__merge')
			});
			this._linkFilterShadowOutMerge = link;
		}

	    /**
	     * Возвращает контейнер `svg` > `defs` > `filter` > `merge` фильтра внутренних теней, создавая при необходимости.
	     * @since 1.5.0
	     * @returns {SVGFEMergeElement}
	     * @protected
	     */
		_getLinkFilterShadowInMerge() {
			if (this._linkFilterShadowInMerge === null) this._initLinkFilterShadowInMerge();
			return this._linkFilterShadowInMerge;
		}

	    /**
	     * Инициализирует контейнер `svg` > `defs` > `filter` > `merge` для внутренних теней.
	     * @since 1.5.0
	     * @protected
	     */
		_initLinkFilterShadowInMerge() {
			const link = this._createSvgElement('feMerge', {
				'id': this._getLinkId('filter_shadow_in__merge')
			});
			this._linkFilterShadowInMerge = link;
		}

	    /**
	     * Возвращает элемент маски `svg` > `defs` > `mask` для контура outline, создавая при необходимости.
	     * @since 1.5.0
	     * @returns {SVGMaskElement}
	     * @protected
	     */
		_getLinkMaskOutline() {
			if (this._linkMaskOutline === null) this._initLinkMaskOutline();
			return this._linkMaskOutline;
		}

	    /**
	     * Инициализирует маску `svg` > `defs` > `mask` для контура outline.
	     * @since 1.5.0
	     * @protected
	     */
		_initLinkMaskOutline() {
			const id = this._getLinkId('mask_outline');
			const link = this._createSvgElement('mask', {
				'id': id,
				'maskUnits': 'userSpaceOnUse',
				'x': '-200%',
				'y': '-200%',
				'width': '500%',
				'height': '500%',
			});
			const maskLinks = {
				'show': this._createSvgElement('rect', {
					'x': '-200%',
					'y': '-200%',
					'width': '500%',
					'height': '500%',
					'fill': 'white'
				}),
				'hide': this._createSvgElement('use', {
					'href': `#${this._getLinkId('path')}`,
					'stroke': 'black',
					'stroke-width': 0,
					'fill': 'black'
				}, {
						'transition':`var(${this._getTransitionVar('outline')}, 0s)`
				})
			};
			this._outlineMaskLinks = maskLinks;

			link.appendChild(maskLinks.show);
			link.appendChild(maskLinks.hide);

			this._linkMaskOutline = link;
		}

	    /**
	     * Возвращает обёртку фона `svg` > `backgroundWrapper`, создавая при необходимости.
	     * @since 1.5.0
	     * @returns {SVGForeignObjectElement}
	     * @protected
	     */
		_getLinkBackgroundWrapper() {
			if (this._linkBackgroundWrapper === null) this._initLinkBackgroundWrapper();
			return this._linkBackgroundWrapper;
		}

	    /**
	     * Инициализирует `svg` > `backgroundWrapper` с clip-path и вкладывает в него фон.
	     * @since 1.5.0
	     * @protected
	     */
		_initLinkBackgroundWrapper() {
			const linkBackgroundWrapper = this._createSvgElement('foreignObject', {
				'id': this._getLinkId('background-wrapper'),
				'width': this._size.width,
				'height': this._size.height,
				'clip-path': `url(#${this._getLinkId('clip')})`
			});
			const linkBackground = this._getLinkBackground();
			linkBackgroundWrapper.appendChild(linkBackground);
			this._linkBackgroundWrapper = linkBackgroundWrapper;
		}

	    /**
	     * Возвращает элемент `svg` > `backgroundWrapper` > `background` для фона, создавая при необходимости.
	     * @since 1.5.0
	     * @returns {HTMLDivElement}
	     * @protected
	     */
		_getLinkBackground() {
			if (this._linkBackground === null) this._initLinkBackground();
			return this._linkBackground;
		}

	    /**
	     * Инициализирует элемент `svg` > `backgroundWrapper` > `background` для фона.
	     * @since 1.5.0
	     * @protected
	     */
		_initLinkBackground() {
			const linkBackground = this._createHtmlElement('div', {
					'id': this._getLinkId('background')
				}, {
					'width': '100%',
					'height': '100%',
					'transition': `var(${this._getTransitionVar('background')}, 0s)`
				}
			);
			this._linkBackground = linkBackground;
		}

	    /**
	     * Возвращает элемент обводки `svg` > `border`, создавая при необходимости.
	     * @since 1.5.0
	     * @returns {SVGUseElement}
	     * @protected
	     */
		_getLinkBorder() {
			if (this._linkBorder === null) this._initLinkBorder();
			return this._linkBorder;
		}

	    /**
	     * Инициализирует use-элемент обводки `svg` > `border`, ссылающийся на path.
	     * @since 1.5.0
	     * @protected
	     */
		_initLinkBorder() {
			const link = this._createSvgElement('use', {
					'id': this._getLinkId('border'),
					'href': `#${this._getLinkId('path')}`,
					'fill': 'none',
					'stroke': '',
					'stroke-width': '0',
					'clip-path': `url(#${this._getLinkId('clip')})`
				}, {
					'transition':`var(${this._getTransitionVar('border')}, 0s)`
				}
			);
			this._linkBorder = link;
		}

	    /**
	     * Возвращает элемент `svg` > `shadow` для внешней тени, создавая при необходимости.
	     * @since 1.5.0
	     * @returns {SVGUseElement}
	     * @protected
	     */
		_getLinkShadowOut() {
			if (this._linkShadowOut === null) this._initLinkShadowOut();
			return this._linkShadowOut;
		}

	    /**
	     * Инициализирует use-элемент `svg` > `shadow` для внешней тени с фильтром.
	     * @since 1.5.0
	     * @protected
	     */
		_initLinkShadowOut() {
			const link = this._createSvgElement('use', {
				'id': this._getLinkId('shadow_out'),
				'href': `#${this._getLinkId('path')}`,
				'filter': `url(#${this._getLinkId('filter_shadow_out')})`
			});
			this._linkShadowOut = link;
		}

	    /**
	     * Возвращает элемент `svg` > `shadow` для внутренней тени, создавая при необходимости.
	     * @since 1.5.0
	     * @returns {SVGUseElement}
	     * @protected
	     */
		_getLinkShadowIn() {
			if (this._linkShadowIn === null) this._initLinkShadowIn();
			return this._linkShadowIn;
		}

	    /**
	     * Инициализирует use-элемент `svg` > `shadow` для внутренней тени с фильтром.
	     * @since 1.5.0
	     * @protected
	     */
		_initLinkShadowIn() {
			const link = this._createSvgElement('use', {
				'id': this._getLinkId('shadow_in'),
				'href': `#${this._getLinkId('path')}`,
				'filter': `url(#${this._getLinkId('filter_shadow_in')})`
			});
			this._linkShadowIn = link;
		}

	    /**
	     * Возвращает элемент `svg` > `outline` для контура outline, создавая при необходимости.
	     * @since 1.5.0
	     * @returns {SVGUseElement}
	     * @protected
	     */
		_getLinkOutline() {
			if (this._linkOutline === null) this._initLinkOutline();
			return this._linkOutline;
		}

	    /**
	     * Инициализирует use-элемент `svg` > `outline` для контура с маской.
	     * @since 1.5.0
	     * @protected
	     */
		_initLinkOutline() {
			const link = this._createSvgElement('use', {
					'id': this._getLinkId('outline'),
					'href': `#${this._getLinkId('path')}`,
					'stroke': 'transparent',
					'stroke-width': 0,
					'mask': `url(#${this._getLinkId('mask_outline')})`,
					'fill': 'none'
				}, {
					'transition':`var(${this._getTransitionVar('outline')}, 0s)`
				}
			);
			this._linkOutline = link;
		}

	    /**
	     * Устанавливает тени на основе CSS-значения box-shadow.
	     * Разбирает строку, создаёт или обновляет внешние и внутренние тени.
	     * @since 1.5.0
	     * @param {string} boxShadowValue - Значение CSS свойства `box-shadow` (например, "2px 2px 4px rgba(0,0,0,0.5)").
	     */
		setBoxShadow(boxShadowValue) {
			const shadowList = this._parseBoxShadow(boxShadowValue);

			let iIn = 0;
			let iOut = 0;

			// Потенциально лишние ключи
			const keysToDeleteIn = new Set(Object.keys(this._shadowsListIn));
			const keysToDeleteOut = new Set(Object.keys(this._shadowsListOut));

			for(const shadow of shadowList) {
				if (shadow.inset) {
					const keyIn = String(iIn);
					this._setFilterShadowIn(keyIn, shadow);
					// если ключ был в keysToDeleteIn, он больше не подлежит удалению
					keysToDeleteIn.delete(keyIn);
					iIn++;
				} else {
					const keyOut = String(iOut);
					this._setFilterShadowOut(keyOut, shadow);
					// если ключ был в keysToDeleteOut, он больше не подлежит удалению
					keysToDeleteOut.delete(keyOut);
					iOut++;
				}
			}
			// Очистить лишние
			for (const key of keysToDeleteIn) {
				this._unsetFilterShadowIn(key);
			}
			for (const key of keysToDeleteOut) {
				this._unsetFilterShadowOut(key);
			}
		}

		/**
		 * Устанавливает CSS-переменную для transition свойства box-shadow.
		 * @since 1.5.3
		 * @param {string} [transition='0s'] - Значение перехода (например, "0.2s ease").
		 * @returns {void}
		 */
		setBoxShadowTransition(transition = '0s') {
			this.getSvg().style.setProperty(this._getTransitionVar('box-shadow'), transition);
		}

	    /**
	     * Настраивает примитивы фильтра для одной внешней тени.
	     * @since 1.5.0
	     * @param {string} key - Ключ тени (индекс).
	     * @param {object} options - Параметры тени.
	     * @param {number} options.offsetX - Смещение по X.
	     * @param {number} options.offsetY - Смещение по Y.
	     * @param {number} options.spreadRadius - Радиус расширения.
	     * @param {number} options.blurRadius - Радиус размытия.
	     * @param {string} options.color - Цвет тени (в формате CSS).
	     * @protected
	     */
		_setFilterShadowOut(key, options) {
			const filterLinks = this._getFilterShadowOut(key);
			filterLinks.primitives.spreadRadius.setAttribute('radius', options.spreadRadius);
			filterLinks.primitives.spreadBlur.setAttribute('stdDeviation', options.spreadRadius);
			filterLinks.primitives.blur.setAttribute('stdDeviation', options.blurRadius / 2);
			filterLinks.primitives.color.setAttribute('flood-color', options.color);
			filterLinks.primitives.offsetBlur.setAttribute('dx', options.offsetX);
			filterLinks.primitives.offsetBlur.setAttribute('dy', options.offsetY);
		}

	    /**
	     * Настраивает примитивы фильтра для одной внутренней тени.
	     * @since 1.5.0
	     * @param {string} key - Ключ тени (индекс).
	     * @param {object} options - Параметры тени (аналогично _setFilterShadowOut).
	     * @protected
	     */
		_setFilterShadowIn(key, options) {
			const filterLinks = this._getFilterShadowIn(key);
			filterLinks.primitives.eroded.setAttribute('radius', options.spreadRadius);
			filterLinks.primitives.blur.setAttribute('stdDeviation', options.blurRadius / 2);
			filterLinks.primitives.color.setAttribute('flood-color', options.color);
			filterLinks.primitives.offsetBlur.setAttribute('dx', options.offsetX);
			filterLinks.primitives.offsetBlur.setAttribute('dy', options.offsetY);
		}

	    /**
	     * Сбрасывает внешнюю тень (устанавливает нулевые параметры и прозрачный цвет).
	     * @since 1.5.0
	     * @param {string} key - Ключ тени.
	     * @protected
	     */
		_unsetFilterShadowOut(key) {
			this._setFilterShadowOut(key, {
				'offsetX': 0,
				'offsetY': 0,
				'spreadRadius': 0,
				'blurRadius': 0,
				'color': 'transparent'
			});
		}

	    /**
	     * Сбрасывает внутреннюю тень (устанавливает нулевые параметры и прозрачный цвет).
	     * @since 1.5.0
	     * @param {string} key - Ключ тени.
	     * @protected
	     */
		_unsetFilterShadowIn(key) {
			this._setFilterShadowIn(key, {
				'offsetX': 0,
				'offsetY': 0,
				'spreadRadius': 0,
				'blurRadius': 0,
				'color': 'transparent'
			});
		}

	    /**
	     * Возвращает объект с примитивами для внешней тени по ключу, создавая при отсутствии.
	     * @since 1.5.0
	     * @param {string} key - Ключ тени.
	     * @returns {object} Объект, содержащий `primitives`, `functions`, `node`.
	     * @protected
	     */
		_getFilterShadowOut(key) {
			if ( !(key in this._shadowsListOut) ) {
				this._createFilterShadowOut(key);
			}
			return this._shadowsListOut[key];
		}

	    /**
	     * Создаёт и добавляет в фильтр все необходимые fe-примитивы для внешней тени.
	     * @since 1.5.0
	     * @param {string} key - Ключ (индекс) тени.
	     * @protected
	     */
		_createFilterShadowOut(key) {
			const id = `${this._getLinkId('filter_shadow_out')}_${key}`;
			const filterLinks = {
				'primitives': {
					// Расширяем на значение spread
					'spreadRadius': this._createSvgElement('feMorphology', {
						'operator': 'dilate',
						'radius': 0,
						'in': 'SourceAlpha',
						'result': `${id}--spreadRadius`
					}, {
						'transition':`var(${this._getTransitionVar('box-shadow')}, 0s)`
					}),
					// Размываем на половину значения spread
					'spreadBlur': this._createSvgElement('feGaussianBlur', {
						'stdDeviation': 0, // feMorphology[radius] / 2
						'in': `${id}--spreadRadius`,
						'result': `${id}--spreadBlur`
					}, {
						'transition':`var(${this._getTransitionVar('box-shadow')}, 0s)`
					}),
					// Возвращаем четкость границы контрастом
					'spread': this._createSvgElement('feComponentTransfer', {
						'in': `${id}--spreadBlur`,
						'result': `${id}--spread`
					}),
					// Размываем расширенную границу
					'blur': this._createSvgElement('feGaussianBlur', {
						'stdDeviation': 0,
						'in': `${id}--spread`,
						'result': `${id}--blur`
					}, {
						'transition':`var(${this._getTransitionVar('box-shadow')}, 0s)`
					}),
					// Задаем цвет
					'color': this._createSvgElement('feFlood', {
						'flood-color': 'transparent',
						// 'flood-opacity задается альфа каналом flood-color
						'result': `${id}--color`
					}, {
						'transition':`var(${this._getTransitionVar('box-shadow')}, 0s)`
					}),
					// Красим
					'coloredBlur': this._createSvgElement('feComposite', {
						'operator': 'in',
						'in': `${id}--color`,
						'in2': `${id}--blur`,
						'result': `${id}--coloredBlur`
					}),
					// Сдвигаем
					'offsetBlur': this._createSvgElement('feOffset', {
						'dx': 0,
						'dy': 0,
						'in': `${id}--coloredBlur`,
						'result': `${id}--offsetBlur`
					}, {
						'transition':`var(${this._getTransitionVar('box-shadow')}, 0s)`
					}),
					// После offsetBlur вычитаем SourceAlpha
					'glow': this._createSvgElement('feComposite', {
						'operator': 'out',
						'in': `${id}--offsetBlur`,
						'in2': 'SourceAlpha',
						'result': `${id}--glow`
					})
				},
				'functions': {
					'spreadFunc': this._createSvgElement('feFuncA', {
						'type': 'discrete',
						'tableValues': '0 0 0 0 0 1 1 1 1 1'
					}),
				},
				// Добавляем
				'node': this._createSvgElement('feMergeNode', {
					'in': `${id}--glow`
				})

			};

			this._shadowsListOut[key] = filterLinks;

			this._getLinkFilterShadowOut();
			const linkMerge = this._getLinkFilterShadowOutMerge();
			linkMerge.before(filterLinks.primitives.spreadRadius);
			linkMerge.before(filterLinks.primitives.spreadBlur);
			linkMerge.before(filterLinks.primitives.spread);
			filterLinks.primitives.spread.appendChild(filterLinks.functions.spreadFunc);
			linkMerge.before(filterLinks.primitives.blur);
			linkMerge.before(filterLinks.primitives.color);
			linkMerge.before(filterLinks.primitives.coloredBlur);
			linkMerge.before(filterLinks.primitives.offsetBlur);
			linkMerge.before(filterLinks.primitives.glow);

			linkMerge.prepend(filterLinks.node);
		}

	    /**
	     * Возвращает объект с примитивами для внутренней тени по ключу, создавая при отсутствии.
	     * @since 1.5.0
	     * @param {string} key - Ключ тени.
	     * @returns {object} Объект, содержащий `primitives` и `node`.
	     * @protected
	     */
		_getFilterShadowIn(key) {
			if ( !(key in this._shadowsListIn) ) {
				this._createFilterShadowIn(key);
			}
			return this._shadowsListIn[key];
		}

	    /**
	     * Создаёт и добавляет в фильтр все необходимые fe-примитивы для внутренней тени.
	     * @since 1.5.0
	     * @param {string} key - Ключ (индекс) тени.
	     * @protected
	     */
		_createFilterShadowIn(key) {
			const id = `${this._getLinkId('filter_shadow_in')}_${key}`;
			const filterLinks = {
				'primitives': {
					// Инвертируем
					'invertedAlpha': this._createSvgElement('feColorMatrix', {
						'type': 'matrix',
						// R, G, B остаются без изменений, Alpha: -1 * A + 1
						'values': '1 0 0 0 0   0 1 0 0 0   0 0 1 0 0   0 0 0 -1 1',
						'in': 'SourceAlpha',
						'result': `${id}--invertedAlpha`
					}),
					// Расширяем на значение spread
					'eroded': this._createSvgElement('feMorphology', {
						'operator': 'dilate',
						'radius': 0,
						'in': `${id}--invertedAlpha`,
						'result': `${id}--eroded`
					}, {
						'transition':`var(${this._getTransitionVar('box-shadow')}, 0s)`
					}),
					// Размываем расширенную границу
					'blur': this._createSvgElement('feGaussianBlur', {
						'stdDeviation': 0,
						'in': `${id}--eroded`,
						'result': `${id}--blur`
					}, {
						'transition':`var(${this._getTransitionVar('box-shadow')}, 0s)`
					}),
					// Задаем цвет
					'color': this._createSvgElement('feFlood', {
						'flood-color': 'transparent',
						'result': `${id}--color`
					}, {
						'transition':`var(${this._getTransitionVar('box-shadow')}, 0s)`
					}),
					// Красим
					'coloredBlur': this._createSvgElement('feComposite', {
						'operator': 'in',
						'in': `${id}--color`,
						'in2': `${id}--blur`,
						'result': `${id}--coloredBlur`
					}),
					// Сдвигаем
					'offsetBlur': this._createSvgElement('feOffset', {
						'dx': 0,
						'dy': 0,
						'in': `${id}--coloredBlur`,
						'result': `${id}--offsetBlur`
					}, {
						'transition':`var(${this._getTransitionVar('box-shadow')}, 0s)`
					}),
					// После offsetBlur вычитаем SourceAlpha
					'inside': this._createSvgElement('feComposite', {
						'operator': 'in',
						'in': `${id}--offsetBlur`,
						'in2': 'SourceAlpha',
						'result': `${id}--inside`
					}),
				},
				// Добавляем
				'node': this._createSvgElement('feMergeNode', {
					'in': `${id}--inside`
				})

			};

			this._shadowsListIn[key] = filterLinks;

			this._getLinkFilterShadowIn();
			const linkMerge = this._getLinkFilterShadowInMerge();
			linkMerge.before(filterLinks.primitives.invertedAlpha);
			linkMerge.before(filterLinks.primitives.eroded);
			linkMerge.before(filterLinks.primitives.blur);
			linkMerge.before(filterLinks.primitives.color);
			linkMerge.before(filterLinks.primitives.coloredBlur);
			linkMerge.before(filterLinks.primitives.offsetBlur);
			linkMerge.before(filterLinks.primitives.inside);

			linkMerge.prepend(filterLinks.node);
		}

	    /**
	     * Добавляет CSS-класс корневому SVG-элементу.
	     * @since 1.5.0
	     * @param {string} classname - Имя класса.
	     */
		addClass(classname) {
			const link = this.getSvg();
			link.classList.add(classname);
		}

	    /**
	     * Изменяет размеры SVG и обновляет viewBox.
	     * @since 1.5.0
	     * @param {number} width - Новая ширина.
	     * @param {number} height - Новая высота.
	     */
		setSize(width, height) {
			this._size.width = width;
			this._size.height = height;
			this._updateViewbox();
			const link = this.getSvg();
			const linkBackgroundWrapper = this._getLinkBackgroundWrapper();
			link.setAttribute('width', this._size.width);
			link.setAttribute('height', this._size.height);
			linkBackgroundWrapper.setAttribute('width', this._size.width);
			linkBackgroundWrapper.setAttribute('height', this._size.height);
		}

	    /**
	     * Обновляет атрибут viewBox корневого SVG на основе текущих размеров.
	     * @since 1.5.0
	     * @protected
	     */
		_updateViewbox() {
			const svg = this.getSvg();
			const viewbox = this._getViewbox();
			svg.setAttribute('viewbox', viewbox);
		}

	    /**
	     * Возвращает строку viewBox для текущих размеров.
	     * @since 1.5.0
	     * @returns {string} Например "0 0 100 100".
	     * @protected
	     */
		_getViewbox() {
			return ( this._size.width > 0 && this._size.height > 0 ) 
				? `0 0 ${this._size.width} ${this._size.height}`
				: '0 0 0 0'; // Сбрасываем путь
		}

	    /**
	     * Устанавливает новый путь (d) для фигуры.
	     * @since 1.5.0
	     * @param {string} path - Строка d для path.
	     */
		setPath(path) {
			this._path = path;
			this._updatePath();
		}

	    /**
	     * Обновляет атрибут d у path внутри clipPath.
	     * @since 1.5.0
	     * @protected
	     */
		_updatePath() {
			const link = this._getLinkPath();
			link.setAttribute('d', this._path);
		}

	    /**
	     * Устанавливает фон через CSS-свойство `background` на фоновом div-элементе.
	     * @since 1.5.0
	     * @param {string} value - Значение CSS background (цвет, градиент, изображение и т.п.).
	     */
		setBackground(value) {
			const link = this._getLinkBackground();
			link.style.setProperty('background', value);
		}
		setBackgroundTransition(transition = '0s') {
			this.getSvg().style.setProperty(this._getTransitionVar('background'), transition);
		}

	    /**
	     * Устанавливает обводку (border) фигуры.
	     * @since 1.5.0
	     * @param {string} style - Стиль обводки (solid, dotted, dashed и др.).
	     * @param {string|number} width - Толщина обводки (в пикселях).
	     * @param {string} color - Цвет обводки (CSS-формат).
	     */
		setBorder(style, width, color) {
			const numWidth = parseFloat(width);
			const link = this._getLinkBorder();
			link.setAttribute('stroke', color);
			link.setAttribute('stroke-width', (numWidth * 2));
			this._setBorderStyle(link, style);
		}

		/**
		 * Устанавливает CSS-переменные для transition свойств border (stroke-width и stroke).
		 * @since 1.5.3
		 * @param {string} [width='0s'] - Переход для толщины обводки.
		 * @param {string} [color='0s'] - Переход для цвета обводки.
		 * @returns {void}
		 */
		setBorderTransition(width = '0s', color = '0s') {
			this.getSvg().style.setProperty(this._getTransitionVar('border'), `stroke-width ${width}, stroke ${color}`);
		}

	    /**
	     * Устанавливает внешний контур (outline) вокруг фигуры.
	     * @since 1.5.0
	     * @param {string|number} width - Толщина контура.
	     * @param {string} color - Цвет контура.
	     * @param {string|number} offset - Смещение контура (может быть отрицательным).
	     */
		setOutline(style, width, color, offset, transition = '0s') {
			const link = this._getLinkOutline();
			const numOffset = parseFloat(offset);
			const numWidth = parseFloat(width);

			if (style == "none" || numWidth === 0) {
				link.setAttribute('stroke', 'transparent');
				return;
			}

			// Защита от NaN
			if (isNaN(numOffset) || isNaN(numWidth)) return;

			const absWidth = Math.abs(numWidth);
			const absOffset = Math.abs(numOffset);
			const isAbs = absWidth < absOffset;

			let showFill, hideFill, hideStroke, thisFill, thisStrokeWidth, maskStrokeWidth;

			if (numOffset < 0 && isAbs) {
				// Особый случай: отрицательный offset и ширина меньше offset по модулю
				showFill = 'black';
				hideFill = 'white';
				hideStroke = 'black';
				thisFill = 'transparent';
				thisStrokeWidth = absOffset * 2;
				maskStrokeWidth = (absOffset - absWidth) * 2;
			} else {
				// Обычный случай
				showFill = 'white';
				hideFill = 'black';
				hideStroke = numOffset >= 0 ? 'black' : 'white';
				thisFill = color;
				thisStrokeWidth = absWidth * 2 + numOffset * 2;
				maskStrokeWidth = absOffset * 2;
			}

			this._outlineMaskLinks.show.setAttribute('fill', showFill);
			this._outlineMaskLinks.hide.setAttribute('fill', hideFill);
			this._outlineMaskLinks.hide.setAttribute('stroke', hideStroke);
			this._outlineMaskLinks.hide.setAttribute('stroke-width', maskStrokeWidth);
			link.setAttribute('stroke-width', thisStrokeWidth);
			link.setAttribute('stroke', color);
			link.setAttribute('fill', thisFill);
		}

		/**
		 * Устанавливает CSS-переменные для transition свойств outline (stroke-width и stroke).
		 * @since 1.5.3
		 * @param {string} [width='0s'] - Переход для толщины контура.
		 * @param {string} [color='0s'] - Переход для цвета контура.
		 * @returns {void}
		 */
		setOutlineTransition(width = '0s', color = '0s') {
			this.getSvg().style.setProperty(this._getTransitionVar('outline'), `stroke-width ${width}, stroke ${color}`);
		}

		/**
		 * Разбирает значение `box-shadow` на массив объектов теней.
		 * @since 1.5.0
		 * @protected
		 * @param {string} boxShadowStr - Строка свойства `box-shadow`.
		 * @returns {Array<{inset: boolean, color: string|null, offsetX: number, offsetY: number, blurRadius: number, spreadRadius: number, originalColorFormat: string|null}>}
		 */
		_parseBoxShadow(boxShadowStr, transition = '0s') {
			if (!boxShadowStr || boxShadowStr === 'none') return [];
			
			/** Разделяем тени **/
			const shadows = [];
			let current = '';
			let depth = 0;
			
			for (let char of boxShadowStr) {
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
		 * Устанавливает атрибут `stroke-dasharray` для элемента пути.
		 * @since 1.5.0 — перенесен из `SuperellipseModeSvgLayer::_setStrokeDasharray` [1.0.0]
		 * @protected
		 * @param {SVGElement} element - SVG-элемент (обычно path или use).
		 * @param {string} value - Значение dasharray.
		 * @returns {void}
		 */
		_setStrokeDasharray(element, value) {
			element.setAttribute('stroke-dasharray', value);
		}

		/**
		 * Устанавливает атрибут `stroke-linecap` для элемента пути.
		 * @since 1.5.0 — перенесен из `SuperellipseModeSvgLayer::_setStrokeLinecap` [1.0.0]
		 * @protected
		 * @param {SVGElement} element - SVG-элемент.
		 * @param {string} value - Значение linecap (butt, round, square).
		 * @returns {void}
		 */
		_setStrokeLinecap(element, value) {
			element.setAttribute('stroke-linecap', value);
		}

		/**
		 * Устанавливает атрибут `stroke-opacity` для элемента пути.
		 * @since 1.5.0 — перенесен из `SuperellipseModeSvgLayer::_setStrokeOpacity` [1.0.0]
		 * @protected
		 * @param {SVGElement} element - SVG-элемент.
		 * @param {string|number} value - Прозрачность (0..1).
		 * @returns {void}
		 */
		_setStrokeOpacity(element, value) {
			element.setAttribute('stroke-opacity', value);
		}

		/**
		 * Преобразует CSS-стиль границы в атрибуты SVG-элемента.
		 * @since 1.5.0 — перенесен из `SuperellipseModeSvgLayer::_applyBorderStyleToStroke` [1.0.0]
		 * @protected
		 * @param {SVGElement} element - SVG-элемент.
		 * @param {string} borderStyle - Стиль границы (solid, dotted, dashed и т.д.).
		 * @returns {void}
		 */
		_setBorderStyle(element, borderStyle) {
			/** Сброс атрибутов **/
			element.removeAttribute('stroke-dasharray');
			element.removeAttribute('stroke-linecap');
			element.removeAttribute('stroke-linejoin');
			
			switch(borderStyle) {
				case 'solid':
					/** Сплошная линия (значения по умолчанию) **/
					break;
					
				case 'dotted':
					this._setStrokeDasharray(element, '0, 8');
					this._setStrokeLinecap(element, 'round');
					break;
					
				case 'dashed':
					this._setStrokeDasharray(element, '10, 6');
					break;
					
				case 'double':
					/** Для double нужно два отдельных пути или фильтр **/
					jsse_console.warn({label:'MODE SVG LAYER',element: element}, '«border-style: double» is not supported');
					break;
					
				case 'groove':
					this._setStrokeDasharray(element, '1, 2');
					this._setStrokeLinecap(element, 'round');
					break;
					
				case 'ridge':
					this._setStrokeDasharray(element, '3, 3');
					break;
					
				case 'inset':
					/** Имитация inset через полупрозрачность **/
					this._setStrokeOpacity(element, '0.7');
					break;
					
				case 'outset':
					this._setStrokeOpacity(element, '0.5');
					break;
					
				case 'dash-dot':
					/** Кастомный стиль **/
					this._setStrokeDasharray(element, '15, 5, 5, 5');
					break;
					
				case 'dash-dot-dot':
					/** Кастомный стиль **/
					this._setStrokeDasharray(element, '15, 5, 5, 5, 5, 5');
					break;
			}
		}

		/**
		 * Создаёт SVG-элемент с указанным тегом в пространстве имён SVG.
		 * @since 1.5.0 — перенесен из `SuperellipseModeSvgLayer::_createSvgElement` [1.0.0]
		 * @protected
		 * @param {string} tag - Имя тега (например, 'svg', 'path', 'filter').
		 * @returns {SVGElement}
		 */
		_createSvgElement(tag, attrs = {}, styles={}) {
			const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
			Object.entries(attrs).forEach(([key, val]) => el.setAttribute(key, val));
			Object.entries(styles).forEach(([key, val]) => el.style.setProperty(key, val));
			return el;
		}

		/**
		 * Создаёт HTML-элемент с указанным тегом.
		 * @since 1.5.0 — перенесен из `SuperellipseModeSvgLayer::_createHtmlElement` [1.0.0]
		 * @protected
		 * @param {string} tag - Имя тега (например, 'div').
		 * @returns {HTMLElement}
		 */
		_createHtmlElement(tag, attrs = {}, styles={}) {
			const el = document.createElement(tag);
			Object.entries(attrs).forEach(([key, val]) => el.setAttribute(key, val));
			Object.entries(styles).forEach(([key, val]) => el.style.setProperty(key, val));
			return el;
		}
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
	 * @example
	 * const mode = new SuperellipseModeSvgLayer(element);
	 * mode.activate();
	 */



	/**
	 * Режим, создающий наложенный SVG-слой для отрисовки фона, границ и теней.
	 * @class SuperellipseModeSvgLayer
	 * @extends SuperellipseMode
	 * @since 1.0.0
	 * @inheritdoc
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
		 * Экземпляр SvgBuilder для управления SVG-элементами.
		 * @since 1.5.0
		 * @type {SvgBuilder}
		 * @protected
		 */
		_svgBuilder;


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
		constructor(element) {
			super(element);

			// this._initViewbox();
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
				'overflow-x' : 'visible',
				'overflow-y' : 'visible',
				'position': 'relative',
				'background': 'none',
				'border-style': 'none',
				'border-color': '',
				'border-width': '',
				'border-radius': '0px',
				'padding': '0px',
				'outline-style': 'none',
				'outline-width': '',
				'outline-color': '',
				'outline-offset': '',
				'box-shadow': 'unset',
			};
		}

		/**
		 * Возвращает список свойств, отслеживаемых для переходов.
		 * @since 1.5.3
		 * @protected
		 * @returns {Array<string>}
		 */
		_getTransitionProperties() {
			return [
				'border-radius',
				'border-width',
				'border-color',
				// 'background',
				'background-size',
				'background-color',
				'background-image',
				'background-position',
				'padding',
				'box-shadow',
				'outline-width',
				'outline-color',
				'outline-offset',
			];
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
				'pointer-events': 'none',
			};
		}


		/**
		 * =============================================================
		 * STYLES
		 * =============================================================
		 */

		/**
	 	 * Применяет все стили (background, border, box-shadow, outline) к виртуальным слоям, если режим активен.
		 * @since 1.5.0
		 * @requires SvgBuilder#setBackground
		 * @requires SvgBuilder#setBoxShadow
		 * @requires SvgBuilder#setBorder
		 * @requires SvgBuilder#setOutline
		 * @protected
		 * @returns {void}
		 */
		_applyCurrentInlineVirtualSvgLayerStyles() {
			if ( this.isActivated() ) {
				/** overflow **/
				this._applyCurrentVirtualSvgLayerStyleOverflow();
				/** background **/
				this._applyCurrentVirtualSvgLayerStyleBackground();
				/** box-shadow **/
				this._applyCurrentVirtualSvgLayerStyleBoxShadow();
				/** border **/
				this._applyCurrentVirtualSvgLayerStyleBorder();
				/** padding **/
				this._applyCurrentVirtualSvgLayerStylePadding();
				/** outline **/
				this._applyCurrentVirtualSvgLayerStyleOutline();
			}
		}


		/**
		 * Применяет стили overflow к SVG-слою.
		 * @since 1.5.2
		 * @protected
		 * @returns {void}
		 */
		_applyCurrentVirtualSvgLayerStyleOverflow() {
			const overflowX = this._getComputedProp('overflow-x');
			const overflowY = this._getComputedProp('overflow-y');
			// this._svgBuilder.setOverflow( overflowX, overflowY );

			/** если overflow равен visible+visible или visible+clip в любом порядке */
			const clipValue = (overflowY === 'visible' && overflowX === 'clip') || (overflowX === 'visible' && (overflowY === 'visible' || overflowY === 'clip'))
				?``
				:`url(#${this._svgBuilder.getClipId()})`;
				// jsse_console.warn({element: this._element}, {clipValue});
			this._virtualElementList.innerWrapper.style.setProperty('clip-path', clipValue);
			this._virtualElementList.innerWrapper.style.setProperty('overflow-x', overflowX);
			this._virtualElementList.innerWrapper.style.setProperty('overflow-y', overflowY);
		}


		/**
		 * Применяет стили и анимацию background к SVG-слою.
		 * @since 1.5.3
		 * @protected
		 * @returns {void}
		 */
		_applyCurrentVirtualSvgLayerStyleBackground() {
			this._svgBuilder.setBackground( this._getComputedProp('background') );

			const transition = this._getTransition();
			const propValueShort = transition.getPropString('background', false);
			this._svgBuilder.setBackgroundTransition( propValueShort );
		}


		/**
		 * Применяет стили и анимацию box-shadow к SVG-слою.
		 * @since 1.5.3
		 * @protected
		 * @returns {void}
		 */
		_applyCurrentVirtualSvgLayerStyleBoxShadow() {
			this._svgBuilder.setBoxShadow( this._getComputedProp('box-shadow') );
			/** transition **/
			const transition = this._getTransition();
			const propValueShort = transition.getPropString('box-shadow', false);
			this._svgBuilder.setBoxShadowTransition( propValueShort );
		}

		/**
		 * Применяет стили и анимацию border к SVG-слою.
		 * @since 1.5.3
		 * @protected
		 * @returns {void}
		 */
		_applyCurrentVirtualSvgLayerStyleBorder() {
			const borderStyle = this._getComputedProp('border-style');
			const borderWidth = this._getComputedProp('border-width');
			const borderColor = this._getComputedProp('border-color');
			this._svgBuilder.setBorder(borderStyle, borderWidth, borderColor);
			this._virtualElementList.innerWrapper.style.setProperty('border-style', borderStyle);
			this._virtualElementList.innerWrapper.style.setProperty('border-width', borderWidth);
			this._virtualElementList.innerWrapper.style.setProperty('border-color', 'transparent');
			/** transition **/
			const transition = this._getTransition();
			const bwValueShort = transition.getPropString('border-width', false);
			const bcValueShort = transition.getPropString('border-color', false);
			this._svgBuilder.setBorderTransition( bwValueShort, bcValueShort );
		}

		/**
		 * Применяет стили padding к SVG-слою.
		 * @since 1.5.2
		 * @protected
		 * @returns {void}
		 */
		_applyCurrentVirtualSvgLayerStylePadding() {
			const padding = this._getComputedProp('padding');
			this._virtualElementList.innerWrapper.style.setProperty('padding', padding);
		}

		/**
		 * Применяет стили и анимацию outline к SVG-слою.
		 * @since 1.5.3
		 * @protected
		 * @returns {void}
		 */
		_applyCurrentVirtualSvgLayerStyleOutline() {
			const style = this._getComputedProp('outline-style');
			const width = this._getComputedProp('outline-width');
			const color = this._getComputedProp('outline-color');
			const offset = this._getComputedProp('outline-offset');
			this._svgBuilder.setOutline(style, width, color, offset);
			/** transition **/
			const transition = this._getTransition();
			const owValueShort = transition.getPropString('outline-width', false);
			const ocValueShort = transition.getPropString('outline-color', false);
			this._svgBuilder.setOutlineTransition( owValueShort, ocValueShort );
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
		 * Создаёт SVG-слой через SvgBuilder.
		 * @since 1.5.0
		 * @protected
		 * @returns {void}
		 */
		_initVirtualSvgLayer() {
			const options = {
				width: this._size.width??null,
				height: this._size.height??null,
				styles: this._getSvgLayerStyles(),
				classes: ['jsse--svg-layer--bg']
			};
			const svgBuilder = new SvgBuilder(this._id, options);
			this._svgBuilder = svgBuilder;
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
			innerWrapper.style.setProperty('max-width', '100%');
			innerWrapper.style.setProperty('max-height', '100%');

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
		 * @since 1.5.0
		 * @requires SvgBuilder#getSvg
		 * @protected
		 * @returns {void}
		 */
		_appendSvgLayer() {
			const svgLayer = this._svgBuilder.getSvg();
			this._element.insertBefore(svgLayer, this._element.firstChild);
		}

		/**
		 * Удаляет SVG-слой.
		 * @since 1.5.0
		 * @requires SvgBuilder#getSvg
		 * @protected
		 * @returns {void}
		 */
		_removeSvgLayer() {
			const svgLayer = this._svgBuilder.getSvg();
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
		 * Применяет кривую, обновляя размеры SVG и путь.
		 * @override
		 * @since 1.5.0
		 * @requires SvgBuilder#setSize
		 * @requires SvgBuilder#setPath
		 * @protected
		 * @returns {void}
		 */
		_applyCurve() {
			this._svgBuilder.setSize(this._size.width, this._size.height);
			const path = this._path ? this._path : '';
			this._svgBuilder.setPath(path);
		}

		/**
		 * Восстанавливает исходный путь и очищает d-атрибут.
		 * @override
		 * @since 1.5.0
		 * @requires SvgBuilder#setPath
		 * @protected
		 * @returns {void}
		 */
		_restoreCurve() {
			this._svgBuilder.setPath('');
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
	 * @inheritdoc
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
		 */
		constructor(element) {
			super(element);
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
	 * Класс контроллера, управляющего жизненным циклом суперэллипса для конкретного элемента.
	 * 
	 * const controller = new SuperellipseController(element, options);
	 * // или через фабрику: element.superellipseInit(options)
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
		 * @returns {SuperellipseController} this.
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
		
		/**
		 * Обработчик события наведения на триггер.
		 * @since 1.4.0
		 * @protected
		 * @param {string} selector - Селектор триггера.
		 * @param {boolean} isHover - Состояние наведения (true – курсор вошёл, false – вышел).
		 * @returns {void}
		 */
		_hoverEventHandler(selector, isHover) {
			if (isHover) {
				this._hoverEnterHandler(selector);
			}
			else {
				this._hoverLeaveHandler(selector);
			}
			jsse_console.debug({label:'STYLESHEET',element:this._element}, '[HOVER]', {[selector]: isHover});
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
			if (this._isSelfMutation) return;

			this._isSelfMutation = true;
			jsse_console.debug({label:'MUTATION', element:this._element}, '[START]');
			requestAnimationFrame(()=>{
				jsse_console.debug({label:'MODE',element:this._element}, '[FRAME]', '[NEXT]');
			});
			try {
				// jsse_console.debug({label:'MUTATION', element:this._element}, '[UPDATE]');
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
