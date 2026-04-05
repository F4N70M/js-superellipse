// src/mode-svg-layer.js
import { SuperellipseMode } from './mode.js';

/**
 * 
 * 
 * 
 */
export class SuperellipseModeSvgLayer extends SuperellipseMode {

	_virtualElementList = {};

	_viewbox;




	/**
	 * =============================================================
	 * PUBLIC
	 * =============================================================
	 */

	constructor(element) {
		super(element);

		this._initViewbox();
		this._initVirtualElementList();
	}

	activate() {
		if (this.isActivated()) return;

		// Установить статус
		this._isActivated = true;
		// Подготовить к активации
		this._captureStyles();
		this._recalculateCurve();
		// Создать элементы виртуальных слоев
		this._createInnerWrapper();
		this._createSvgLayer();
		// Применить Стили и кривую
		this._applyCurrentInlineStyles();
		this._applyCurrentCurve();
	}
	deactivate() {
		if (!this.isActivated()) return;

		// Установить статус
		this._isActivated = false;
		// Удалить элементы виртуальных слоев
		this._removeInnerWrapper();
		this._removeSvgLayer();
		// Применить Стили и кривую
		this._applyCurrentInlineStyles();
		this._applyCurrentCurve();
	}


	/**
	 * =============================================================
	 * PRIVATE
	 * =============================================================
	 */


	_getResetStyles() {
		return {
			'background': 'unset',
			'border-color': '',
			'border-width': '0px',
			'border-style': '',
			// 'border': 'unset',
			'border-radius': '0px',
			'box-shadow': 'unset',
			'position': 'relative',
		};
	}


	_getInliteSvgLayerStyles() {
		return {
				// 'border' : '',
				// 'border-radius' : '',
				// 'background': '',
				// 'box-shadow': '',
			'position': 'absolute',
			'top': '0px',
			'left': '0px',
			'width': '100%',
			'height': '100%',
			'pointer-events': 'none',
			// TODO: 
			// 'clip-path': `url(#${clipId})`
		};
	}


	_getInliteSvgLayerDivProps() {
		return [
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

	_applyCurrentInlineStyles() {
		this._applyCurrentInlineElementStyles();
		this._applyCurrentInlineVirtualSvgLayerStyles();
	}

	_applyCurrentInlineVirtualSvgLayerStyles() {
		if ( this.isActivated() ) {
			this._applyCurrentInlineVirtualSvgLayerDivStyles();
			this._applyCurrentInlineVirtualSvgLayerBorderStyles();
			this._applyCurrentInlineVirtualSvgLayerShadowsStyles();
		}
	}
	_applyCurrentInlineVirtualSvgLayerDivStyles() {
		const inlineSvgLayerDivStyles = this._getCurrentInlineVirtualSvgLayerDivStyles();
		const svgLayerDiv = this._virtualElementList.svgLayerDiv;
		this._applyInlineStyles(inlineSvgLayerDivStyles, svgLayerDiv);
	}
	_getCurrentInlineVirtualSvgLayerDivStyles() {
		const result = {};
		const svgLayerDivProps = this._getInliteSvgLayerDivProps();
		for (const prop of svgLayerDivProps) {
			// Если есть общее свойство reset
			if (prop in this._styles.computed) {
				result[prop] = this._styles.computed[prop];
			}
		}
		return result;
	}

	_applyCurrentInlineVirtualSvgLayerBorderStyles() {
		const svgLayerBorder = this._virtualElementList.svgLayerBorder;
		// this._applyInlineStyles(inlineSvgLayerDivStyles, svgLayerBorder);
		const borderColor = this._styles.computed['border-color'];
		svgLayerBorder.setAttribute('stroke', borderColor);
		const borderWidth = this._styles.computed['border-width'];
		const borderWidthNumber = borderWidth ? (parseFloat(borderWidth) * 2) : 0;
		svgLayerBorder.setAttribute('stroke-width', borderWidthNumber);
		const borderStyle = this._styles.computed['border-style'];
		this._applyBorderStyleToStroke(borderStyle, svgLayerBorder);
	}

	_applyBorderStyleToStroke(borderStyle, pathElement) {
		// Сброс атрибутов
		pathElement.removeAttribute('stroke-dasharray');
		pathElement.removeAttribute('stroke-linecap');
		pathElement.removeAttribute('stroke-linejoin');
		
		switch(borderStyle) {
			case 'solid':
				// Сплошная линия (значения по умолчанию)
				break;
				
			case 'dotted':
				pathElement.setAttribute('stroke-dasharray', '0, 8');
				pathElement.setAttribute('stroke-linecap', 'round');
				break;
				
			case 'dashed':
				pathElement.setAttribute('stroke-dasharray', '10, 6');
				break;
				
			case 'double':
				// Для double нужно два отдельных пути или фильтр
				console.warn('double требует два отдельных элемента');
				break;
				
			case 'groove':
				pathElement.setAttribute('stroke-dasharray', '1, 2');
				pathElement.setAttribute('stroke-linecap', 'round');
				break;
				
			case 'ridge':
				pathElement.setAttribute('stroke-dasharray', '3, 3');
				break;
				
			case 'inset':
				// Имитация inset через полупрозрачность
				pathElement.setAttribute('stroke-opacity', '0.7');
				break;
				
			case 'outset':
				pathElement.setAttribute('stroke-opacity', '0.5');
				break;
				
			case 'dash-dot':
				// Кастомный стиль
				pathElement.setAttribute('stroke-dasharray', '15, 5, 5, 5');
				break;
				
			case 'dash-dot-dot':
				// Кастомный стиль
				pathElement.setAttribute('stroke-dasharray', '15, 5, 5, 5, 5, 5');
				break;
				
			default:
				// По умолчанию solid
				break;
		}
	}

	_applyCurrentInlineVirtualSvgLayerShadowsStyles() {
		const boxShadowValue = this._styles.computed['box-shadow'];
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

			const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
				const feGaussianBlur = document.createElementNS('http://www.w3.org/2000/svg', 'feGaussianBlur');
				const feOffset = document.createElementNS('http://www.w3.org/2000/svg', 'feOffset');
				const feFlood = document.createElementNS('http://www.w3.org/2000/svg', 'feFlood');
				const feComposite = document.createElementNS('http://www.w3.org/2000/svg', 'feComposite');
			const shadow = document.createElementNS('http://www.w3.org/2000/svg', 'use');

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

	_parseBoxShadow(boxShadowValue) {
	    if (!boxShadowValue || boxShadowValue === 'none') return [];
	    
	    // Разделяем тени
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
	        // Парсим одну тень
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
	        
	        // Проверяем inset
	        const insetIndex = parts.indexOf('inset');
	        if (insetIndex !== -1) {
	            result.inset = true;
	            parts.splice(insetIndex, 1);
	        }
	        
	        // Цвет всегда будет в формате rgb/rgba после getComputedStyle
	        const colorPart = parts.find(p => p.startsWith('rgb'));
	        if (colorPart) {
	            result.color = colorPart;
	            result.originalColorFormat = colorPart;
	            parts.splice(parts.indexOf(colorPart), 1);
	        }
	        
	        // Парсим числовые значения
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



	_initVirtualElementList() {
		this._initVirtualInnerWrapper();
		this._initVirtualSvgLayer();
	}




	_initVirtualSvgLayer() {
		if (this._virtualElementList.svgLayer) return;

		const id = Math.random().toString(36).slice(2, 10);
		const svgId		= `jsse_${id}`;
		const clipId	= `jsse_${id}__clip`;
		const pathId	= `jsse_${id}__path`;
		const filtersId	= `jsse_${id}__filters`;
		const shadowsId	= `jsse_${id}__shadows`;
		const divId		= `jsse_${id}__div`;
		const borderId	= `jsse_${id}__border`;

		const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
		const clipPath = document.createElementNS('http://www.w3.org/2000/svg', 'clipPath');
		const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
		const gFilters = document.createElementNS('http://www.w3.org/2000/svg', 'g');
		const gShadows = document.createElementNS('http://www.w3.org/2000/svg', 'g');
		const html = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
		const div = document.createElementNS('http://www.w3.org/1999/xhtml', 'div');
		const border = document.createElementNS('http://www.w3.org/2000/svg', 'use');

		/** svg **/
		svg.setAttribute('id', svgId);
		svg.classList.add('jsse--svg-layer--bg');
		svg.setAttribute('viewBox', this._getViewbox());
		svg.setAttribute('preserveAspectRatio', 'none');
		const svgProps = this._getInliteSvgLayerStyles();
		for (const prop in svgProps) {
			svg.style.setProperty(prop, svgProps[prop]);
		}
		// svg.style.setProperty('clip-path', `url(#${clipId})`);
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
		html.setAttribute('width', '100%');
		html.setAttribute('height', '100%');
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
		this._virtualElementList.svgLayerDiv = div;
		this._virtualElementList.svgLayerBorder = border;
	}

	_initVirtualInnerWrapper() {
		if (this._virtualElementList.innerWrapper) return;

		const innerWrapper = document.createElement('div');
		innerWrapper.className = 'jsse--svg-layer--content';
		innerWrapper.style.setProperty('position', 'relative');

		this._virtualElementList.innerWrapper = innerWrapper;
	}




	_createSvgLayer() {
		const svgLayer = this._virtualElementList.svgLayer;
		// TODO: нужна ли проверка на наличие svgLayer у this._element?
		this._element.insertBefore(svgLayer, this._element.firstChild);
	}

	_removeSvgLayer() {
		const svgLayer = this._virtualElementList.svgLayer;
		if (svgLayer && svgLayer.parentNode === this._element) {
			this._element.removeChild(svgLayer);
		}
	}

	_createInnerWrapper() {
		const innerWrapper = this._virtualElementList.innerWrapper;

		// Перемещаем внутренние элемены this._element в innerWrapper
		const children = Array.from(this._element.childNodes);
		for (const child of children) {
			innerWrapper.appendChild(child);
		}

		this._element.appendChild(innerWrapper);
	}

	_removeInnerWrapper() {
		const innerWrapper = this._virtualElementList.innerWrapper;

		// Перемещаем внутренние элемены innerWrapper в this._element
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

	_initViewbox() {
		this._recalculateViewbox();
	}

	_recalculateCurve() {
		super._recalculateCurve();

		this._recalculateViewbox();
	}

	_recalculateViewbox() {
		if ( this._size.width > 0 && this._size.height > 0 ) {
			this._viewbox = `0 0 ${this._size.width} ${this._size.height}`;
		} else {
			this._viewbox = '0 0 0 0'; // Сбрасываем путь
		}
	}

	_getViewbox() {
		return this._viewbox;
	}
	
	_applyCurve() {
		// Избегаем лишних мутаций
		const currentClipPath = this._element.style.getPropertyValue('clip-path');
		if (currentClipPath !== 'none') {
			this._element.style.setProperty('clip-path', 'none');
		}
		// if (!(currentClipPath === '' || currentClipPath === undefined )) {
		// 	this._element.style.setProperty('clip-path', '');
		// }
			// this._element.style.setProperty('clip-path', 'none');

		const svgLayer = this._virtualElementList.svgLayer;
		svgLayer.setAttribute('viewBox', this._getViewbox());

		const svgLayerPath = this._virtualElementList.svgLayerPath;
		if (this._path) {
			svgLayerPath.setAttribute('d', this._path);
		} else {
			svgLayerPath.setAttribute('d', '');
			// svgLayerPath.removeAttribute('d');
		}
	}
	
	_restoreCurve() {
		const svgLayerPath = this._virtualElementList.svgLayerPath;

		svgLayerPath.setAttribute('d', '');
		// svgLayerPath.removeAttribute('d');

		super._restoreCurve();
	}


	/**
	 * =============================================================
	 * 
	 * =============================================================
	 */
}