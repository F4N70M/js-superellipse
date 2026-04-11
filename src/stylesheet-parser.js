/**
 * @file src/support.js
 * 
 * @module sj-superellipse/css-parser
 * @since 1.0.0
 * @author f4n70m
 * 
 * @description
 * Модуль парсинга css стилей страницы.
 * - `StylesheetParser`
 * - `StylesheetParserSelectorList`
 * - `StylesheetParserSelector`
 * - `StylesheetParserFragmentList`
 * - `StylesheetParserFragment`
 */

import { jsse_console } from './support.js';
















class StylesheetParserFragment {
	_combinator;
	_full;
	_clean;
	_pseudo;

	constructor(options) {
		this._combinator = options.combinator;
		const isRoot = options.full === ':root';
		this._clean = isRoot||options.clean?options.clean:`*`;
		this._full = isRoot||options.clean?options.full:`*${options.full}`;
		this._pseudo = [...new Set(options.pseudo)];
	}

	getCombinator() { return this._combinator };
	getFull() { return this._full };
	getClean() { return this._clean };
	getPseudoList() { return this.pseudo };

	hasPseudo(pseudo) {
		return this._pseudo.includes(pseudo);
	}

	hasHover() {
		return this.hasPseudo(':hover');
	}

	getFull() {
		return this._full;
	}
}
















class StylesheetParserFragmentList extends Array {

	// _triggerList = null;
	// _triggerIndexList = null;


	/**
	 * =============================================================
	 * ARRAY
	 * =============================================================
	 */


	// Проверка валидности
	static #isValid(item) {
		return item instanceof StylesheetParserFragment;
	}

	// Переопределяем push - добавляем только валидные
	push(...items) {
		const valid = items.filter(item => StylesheetParserFragmentList.#isValid(item));
		return super.push(...valid);
	}

	// Переопределяем unshift
	unshift(...items) {
		const valid = items.filter(item => StylesheetParserFragmentList.#isValid(item));
		return super.unshift(...valid);
	}

	// Переопределяем splice
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

	getTarget() {
		return this[this.length-1];
	}

	getTriggerIndexList() {
		return this.reduce((indexes, element, index) => {
			if (element.hasHover()) {
				indexes.push(index);
			}
			return indexes;
		}, []);
	}

	hasTrigger() {
		return this.getTriggerIndexList().length > 0;
	}

	targetIsTriggered() {
		return this.getTarget().hasHover();
	}


	/**
	 * =============================================================
	 * PRIVATE
	 * =============================================================
	 */
}
















class StylesheetParserSelector {

	_media;
	_selector;
	_fragments = null;
	_styles;

	_triggerFragments = null;
	_triggerIndexList = null;
	_triggerParts = null;

	constructor(selector, styles, media) {
		this._selector = selector;
		this._styles = styles;
		this._media = media;

		const target = this.getFragments().getTarget();
		const targetHasHover = this.getFragments().targetIsTriggered();
	}

	/**
	 * =============================================================
	 * PUBLIC
	 * =============================================================
	 */

	getSelector() {
		return this._selector;
	}

	getStyles() {
		return this._styles;
	}

	getFragments() {
		if (this._fragments === null) {
			this._fragments = this._getSelectorFragments(this._selector);
		}
		return this._fragments;
	}

	matchMedia() {
		return !this._media || window.matchMedia(this._media).matches;
	}

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
								parts.neighbor = nextCombinator + nextFragment.getClean();
								// parts.neighbor = {
								// 	combinator: nextCombinator,
								// 	clean: nextFragment.getClean()
								// };
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
















class StylesheetParserSelectorList extends Array {


	/**
	 * =============================================================
	 * ARRAY
	 * =============================================================
	 */


	// Проверка валидности
	static #isValid(item) {
		return item instanceof StylesheetParserSelector;
	}

	// Переопределяем push - добавляем только валидные
	push(...items) {
		const valid = items.filter(item => StylesheetParserSelectorList.#isValid(item));
		return super.push(...valid);
	}

	// Переопределяем unshift
	unshift(...items) {
		const valid = items.filter(item => StylesheetParserSelectorList.#isValid(item));
		return super.unshift(...valid);
	}

	// Переопределяем splice
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


	getSelectorsWithHover() {
		return this.filter(item => item.getFragments().hasTrigger());
	}


	/**
	 * =============================================================
	 * PRIVATE
	 * =============================================================
	 */
}
















export class StylesheetParser {
	_selectors;

	constructor() {
		this._init();
	}
	
	/**
	 * =============================================================
	 * PUBLIC
	 * =============================================================
	 */

	getSelectors() {
		return this._selectors;
	}

	getSelectorsHasHover() {
		return this._selectors.getSelectorsWithHover();
	}

	getTargetSelectors(element, options={}) {
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
	 * =============================================================
	 * PRIVATE
	 * =============================================================
	 */

	_init() {
		this._selectors = this._createList();
		this._parseCssRules();
		jsse_console.debug({label:'STYLESHEET'}, '[LOADED]');
	}

	_createList() {
		return new StylesheetParserSelectorList();
	}

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
							console.warn(`[STYLESHEET] Ошибка при обработке @media правила из ${styleSheet.href || 'inline'}:`, e.message);
						}
					}
					// Можно добавить другие типы правил (CSSRule.IMPORT_RULE, CSSRule.SUPPORTS_RULE и т.д.)
				}
			} catch (e) {
				if (e.name === 'SecurityError') {
					console.warn(
						`[STYLESHEET] Нет доступа к правилам таблицы стилей:\n${styleSheet.href || 'inline / blob'}.\n` +
						`Причина: CORS или file:// протокол.\nЧтобы это исправить, используйте локальный сервер (http://) или добавьте crossorigin атрибут.`
					);
				} else if (e.name === 'InvalidAccessError') {
					console.warn(`[STYLESHEET] Таблица стилей ${styleSheet.href || 'inline'} ещё не загружена или имеет некорректный доступ.`);
				} else {
					console.warn(`[STYLESHEET] Неизвестная ошибка при чтении ${styleSheet.href || 'inline'}:`, e.message);
				}
				console.debug(e);
			}
		}
	}

	_getParsedCssRule(rule, media=false) {
		const result = [];
		const selectorGroup = rule.selectorText;
		const styles = this._getCssRuleStyles(rule);
		const selectorList = this._splitSelectorGroup(selectorGroup);
		const uniqueSelectorList = [...new Set(selectorList)];
		for (const selector of uniqueSelectorList) {
			result.push( new StylesheetParserSelector(selector, styles, media) );
		}
		return result;
	}

	_getCssRuleStyles(rule) {
		const styles = {};
		if (rule.style.cssText) {
			const declarations = rule.style.cssText.split(';');
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
	 * Разбивает группу селекторов по запятым, но не внутри скобок.
	 * Пример: ":not(.a, .b), .c" → [":not(.a, .b)", ".c"]
	 */
	_splitSelectorGroup(selectorText) {
		const result = [];
		let current = '';
		let depth = 0;          // глубина вложенности в круглые скобки
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