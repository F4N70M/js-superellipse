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


import { SuperellipseMode } from './mode.js';
import { jsse_console } from './support.js';


/**
 * Режим, создающий наложенный SVG-слой для отрисовки фона, границ и теней.
 * @class SuperellipseModeSvgLayer
 * @extends SuperellipseMode
 */
export class SuperellipseModeSvgLayer extends SuperellipseMode {

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
			'pointer-events': 'none',
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
				} else {
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

		const sd = 'stroke-dasharray';
		const sl = 'stroke-linecap';
		const so = 'stroke-opacity';
		
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
				
			default:
				/** По умолчанию solid **/
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
			const spreadValue = shadowValues.spreadRadius;

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