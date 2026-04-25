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
export const jsse_animated_props = {
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
export class Transition {

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