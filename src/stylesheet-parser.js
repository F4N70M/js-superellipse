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

import { jsse_console, jsse_css_selector } from './support.js';


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
export class StylesheetParser {
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
			const selectorHasHover = fragments.hasTrigger();
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