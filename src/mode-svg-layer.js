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


import { SuperellipseMode } from './mode.js';
import { jsse_console } from './support.js';
import { SvgBuilder } from './svg-builder.js';


/**
 * Режим, создающий наложенный SVG-слой для отрисовки фона, границ и теней.
 * @class SuperellipseModeSvgLayer
 * @extends SuperellipseMode
 * @since 1.0.0
 * @inheritdoc
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