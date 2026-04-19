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

import { jsse_console } from './support.js';

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
export class SvgBuilder {
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
			'height': '100%'
		});
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
		});
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
		});
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
				}),
				// Размываем на половину значения spread
				'spreadBlur': this._createSvgElement('feGaussianBlur', {
					'stdDeviation': 0, // feMorphology[radius] / 2
					'in': `${id}--spreadRadius`,
					'result': `${id}--spreadBlur`
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
				}),
				// Задаем цвет
				'color': this._createSvgElement('feFlood', {
					'flood-color': 'transparent',
					// 'flood-opacity задается альфа каналом flood-color
					'result': `${id}--color`
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
				})
			},
			// Добавляем
			'node': this._createSvgElement('feMergeNode', {
				'in': `${id}--glow`
			})

		};

		this._shadowsListOut[key] = filterLinks;

		const linkFilter = this._getLinkFilterShadowOut();
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
				}),
				// Размываем расширенную границу
				'blur': this._createSvgElement('feGaussianBlur', {
					'stdDeviation': 0,
					'in': `${id}--eroded`,
					'result': `${id}--blur`
				}),
				// Задаем цвет
				'color': this._createSvgElement('feFlood', {
					'flood-color': 'transparent',
					'result': `${id}--color`
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

		const linkFilter = this._getLinkFilterShadowIn();
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
		this._setBorderStyle(link, style)
	}

    /**
     * Устанавливает внешний контур (outline) вокруг фигуры.
     * @since 1.5.0
     * @param {string|number} width - Толщина контура.
     * @param {string} color - Цвет контура.
     * @param {string|number} offset - Смещение контура (может быть отрицательным).
     */
	setOutline(style, width, color, offset) {
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
	 * Разбирает значение `box-shadow` на массив объектов теней.
	 * @since 1.5.0 — перенесен из `SuperellipseModeSvgLayer::_parseBoxShadow` [1.0.0]
	 * @protected
	 * @param {string} boxShadowStr - Строка свойства `box-shadow`.
	 * @returns {Array<{inset: boolean, color: string|null, offsetX: number, offsetY: number, blurRadius: number, spreadRadius: number, originalColorFormat: string|null}>}
	 */
	_parseBoxShadow(boxShadowStr) {
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

		const sd = 'stroke-dasharray';
		const sl = 'stroke-linecap';
		const so = 'stroke-opacity';
		
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
				
			default:
				/** По умолчанию solid **/
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