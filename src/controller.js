// src/controller.js
import { jsse_generateSuperellipsePath, jsse_getBorderRadiusFactor } from './core.js';
import { jsse_controllers } from './api.js';

// Глобальный кэш отслеживания стилей
const superellipseStyleTracking = new WeakMap();

// Управляемые свойства
// const JSSE_MANAGED_PROPERTIES = ['border-radius', 'background', 'background-color', 'background-image', 'border', 'box-shadow', 'position'];
// const JSSE_MANAGED_PROPERTIES = ['border-radius', 'background', 'border', 'box-shadow', 'position'];
// const JSSE_MANAGED_PROPERTIES = ['borderRadius', 'background', 'backgroundColor', 'backgroundImage', 'border', 'boxShadow', 'position'];

export class SuperellipseController
{
	#mode;
	#precision; // Количество знаков после запятой
	#curveFactor;
	#status;	// current mode is enabled
	#autoResize;
	#sizes;
	#path;
	
	#options

	#element;
	#svgLayer;
	#contentWrapper;
	
	#needsUpdate;
	
	#resizeObserver;
	#mutationObserver;
	#removalObserver;
	#intersectionObserver;

	#resetStyles = {
		'border-radius': '0',
		'background': 'unset',
		'border': 'unset',
		'box-shadow': 'unset',
	};

	/**
	 * =============================================================
	 * Основные методы
	 * =============================================================
	 */

	/**
	 * public switchMode
	 * 
	 * @return {bool}
	 */
	switchMode(mode) {
		if (mode === this.getCurrentMode())
			return true;

		this.#disableMode();

		this.#setCurrentMode(mode);
		return this.#enableMode();
	}

	/**
	 * public destroy
	 */
	destroy() {
		this.#destroyController();
	}

	/**
	 * public setCurveFactor
	 * 
	 * @return {bool}
	 */
	setCurveFactor(value) {
		this.#curveFactor = value;
		this.#applyModeStyles();
		this.#applyCurve();
	}

	/**
	 * public setCurveFactor
	 * 
	 * @return {bool}
	 */
	setPrecision(value) {
		this.#precision = value;
		this.#applyModeStyles();
		this.#applyCurve();
	}

	
	

	/**
	 * =============================================================
	 * Controller
	 * =============================================================
	 */

	constructor(element, options = {}) {
		this.#element = element;
		this.#options = {
			mode: 'svg-layer',
			...options
		};
		this.#mode = this.#options.mode;
		this.#curveFactor = this.#options.curveFactor ?? jsse_getBorderRadiusFactor();
		this.#precision = this.#options.precision ?? 2;
		this.#autoResize = this.#options.autoResize ?? true;

		this.#status = false;
		this.#needsUpdate = false;
		this.#svgLayer = null;
		this.#contentWrapper = null;
		// this.#lastPath = '';

		// Слушатели
		this.#resizeObserver = null;
		this.#mutationObserver = null;
		this.#removalObserver = null;
		this.#intersectionObserver = null;

		this.#init();
	}

	/**
	 * 
	 */
	#init() {
		this.#captureSizes();
		this.#initStyles();
		this.#recalculatePath();
		this.#setupObservers();
		this.#initMode();
		// this.#applyModeStyles();
	}

	/**
	 * Метод уничтожения контроллера
	 */
	#destroyController() {
		this.#disconnectObservers();
		this.#disableMode();
			// this.#restoreOriginalContent(); // в #disableMode()
			// this.#restoreElementStyles(); // в #disableMode()
			// this.#clearClipPath(); // в #disableMode()
		this.#deleteFromControllers();
		this.#setModeStatus(false);
	}
	

	/**
	 * =============================================================
	 * Change Mode
	 * =============================================================
	 */

	#initMode() {
		this.#enableMode();
	}

	#disableMode() {
		this.#setModeStatus(false);

		switch ( this.	getCurrentMode() ) {
			case 'svg-layer':
				this.#disableSvgLayerMode();
				break;

			case 'clip-path':
				this.#disableClipPathMode();
					// this.#clearClipPath();
				break;

			default:
				return false;
		}
		this.#restoreElementStyles();
		this.#resetCurve()
	}

	#enableMode() {
		this.#setModeStatus(true);

		const mode = this.getCurrentMode();
		switch (mode) {
			case 'svg-layer':
				this.#enableSvgLayerMode();
				break;
			case 'clip-path':
				this.#enableClipPathMode();
				break;
			default:
				throw new Error(`Режима ${mode} не существует`);
				return false;
		}
		this.#applyModeStyles();
		this.#applyCurve();
		return true;
	}

	#enableSvgLayerMode() {
		this.#wrapInner();
		this.#createSvgLayer();
		// this.#updateSvgLayerStyles();
		// this.#applySvgLayerModeStyles();
	}

	#disableSvgLayerMode() {
		this.#removeSvgLayer();
		this.#unwrapInner();
	}

	#enableClipPathMode() {
		// На будущее
		// сейчас ничего дополнительного не делает
	}

	#disableClipPathMode() {
		// На будущее
		// сейчас ничего дополнительного не делает
	}

	#applyModeStyles(fromHandler = false) {
		/** isNeedsUpdate **/
		const display = this.#getCapturedComputedStyles().display;
		if (display === 'none') {
			this.#needsUpdate = true;
			return;
		}
		this.#needsUpdate = false;

		if ( this.#getModeStatus() ) {			
			switch (this.getCurrentMode()) {
				case 'svg-layer':
					this.#applySvgLayerModeStyles();
					break;

				case 'clip-path':
					this.#applyClipPathModeStyles();
					break;

				default:
					return false;
			}
		}
	}

	#applySvgLayerModeStyles() {
		this.#resetElementStyles();

		for (const prop of this.#getManagedProperties()) {
			const value = this.#getTrackedStyleCurrent(prop)?.computed;
			if (value !== null && value !== undefined) {
				this.#svgLayer.style.setProperty(prop, value);
			}
			else {
				this.#svgLayer.style.removeProperty(prop);
			}
		}
	}

	#applyClipPathModeStyles() {
		this.#applyCurrentElementStyles();
	}

	#wrapInner() {
		if (this.#contentWrapper) return;

		const wrapper = document.createElement('div');
		wrapper.className = 'jsse--svg-layer--content';
		wrapper.style.setProperty('position', 'relative');

		const children = Array.from(this.#element.childNodes);
		for (let child of children) {
			wrapper.appendChild(child);
			// this.#element.removeChild(child);
		}
		this.#element.appendChild(wrapper);
		this.#contentWrapper = wrapper;
	}

	#unwrapInner() {
		if (this.#contentWrapper === null) return;

		const children = Array.from(this.#contentWrapper.childNodes);
		for (let child of children) {
			this.#element.appendChild(child);
		}
		this.#element.removeChild(this.#contentWrapper);
		this.#contentWrapper = null;
	}

	#createSvgLayer() {
		const clipId = 'jsse_Clip_' + Math.random().toString(36).substr(2, 8);
		const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		svg.classList.add('jsse--svg-layer--bg');
		svg.setAttribute('viewBox', this.#getViewbox());
		svg.setAttribute('preserveAspectRatio', 'none');
		svg.style.setProperty('position', 'absolute');
		svg.style.setProperty('top', '0');
		svg.style.setProperty('left', '0');
		svg.style.setProperty('width', '100%');
		svg.style.setProperty('height', '100%');
		svg.style.setProperty('pointer-events', 'none');
		svg.style.setProperty('clip-path', `url(#${clipId})`);

		const clipShape = document.createElementNS('http://www.w3.org/2000/svg', 'path');
		clipShape.setAttribute('d', ''); // только создаем слой, не заполняем
		const clipPath = document.createElementNS('http://www.w3.org/2000/svg', 'clipPath');
		clipPath.setAttribute('id', clipId);
		clipPath.appendChild(clipShape);
		const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
		defs.appendChild(clipPath);
		svg.appendChild(defs);

		this.#element.insertBefore(svg, this.#element.firstChild);
		this.#svgLayer = svg;
	}

	#removeSvgLayer() {
		if (this.#svgLayer && this.#svgLayer.parentNode === this.#element) {
			this.#element.removeChild(this.#svgLayer);
		}
		this.#svgLayer = null;
	}
	

	/**
	 * =============================================================
	 * Change path params
	 * =============================================================
	 */

	#captureSizes() {
		const rect = this.#element.getBoundingClientRect();
		this.#sizes = {
			width: rect.width,
			height: rect.height
		}
	}

	#getSizes() {
		return this.#sizes;
	}


	#getCurrentBorderRadius() {
		let borderRadius = this.#getTrackedStyleCurrent('border-radius')?.computed;
		borderRadius = borderRadius ? parseFloat(borderRadius) : 0;
		return borderRadius;
	}

	#getCurveFactor() {
		return this.#curveFactor;
	}

	#getPrecision() {
		return this.#precision;
	}

	#recalculatePath() {
		const sizes = this.#getSizes();
		if (!sizes.width || !sizes.height) {
			this.#setPath(''); // Сбрасываем путь
			return false;
		}

		const path  = jsse_generateSuperellipsePath(
			sizes.width,
			sizes.height,
			this.#getCurrentBorderRadius(),
			this.#getCurveFactor(),
			this.#getPrecision()
		);
		this.#setPath(path);
	}

	getPath() {
		return this.#path;
	}

	#setPath(path) {
		this.#path = path;
	}

	#getViewbox() {
		const sizes = this.#getSizes();
		if (!sizes.width || !sizes.height) {
			console.warn('js-superellipse: Нет размеров для viewbox.');
			return null;
		}
		return `0 0 ${sizes.width} ${sizes.height}`;
	}

	#applyCurve() {
		const path = this.getPath();
		if (!path) {
			console.warn('js-superellipse: Получен пустой path.');
			return;
		}

		switch ( this.getCurrentMode() ) {
			case 'svg-layer':
				const viewbox = this.#getViewbox();
            	if (!viewbox) {
            		console.warn('js-superellipse: Получен пустой viewbox.');
            		return; // если viewbox невалидный — выходим
            	}
				this.#svgLayer.setAttribute('viewBox', viewbox);
				const clipPathElem = this.#svgLayer.querySelector('clipPath path');
				if (clipPathElem) clipPathElem.setAttribute('d', path);
				break;

			case 'clip-path':
				this.#element.style.setProperty('clipPath', `path('${path}')`);
				break;

			default:
				throw new Error(`Метод обновления кривой не найден`);
				break;
		}
	}

	#resetCurve() {
		const mode = this.getCurrentMode();

		switch (mode) {
			case 'svg-layer':
				// this.#svgLayer.removeAttribute('viewBox');
				// const clipPathElem = this.#svgLayer.querySelector('clipPath path');
				// if (clipPathElem) clipPathElem.removeAttribute('d');
				break;

			case 'clip-path':
				this.#element.style.removeProperty('clipPath');
				break;

			default:
				throw new Error(`Метод сброса кривой не найден`);
				break;
		}
	}
	

	/**
	 * =============================================================
	 * Styles
	 * =============================================================
	 */

	#getTrackedStyleOriginal(prop) {
		return this.#getTrackingProp('style')?.original?.[prop];
	}

	#getTrackedStyleCurrent(prop) {
		return this.#getTrackingProp('style')?.current?.[prop];
	}

	#getResetStyles() {
		return this.#resetStyles;
	}

	#initStyles() {
		if (this.#hasTrackingProp('style')) return;

		this.#captureStyles(true);
	}

	/**
	 * styles.original.prop.computed
	 * styles.original.prop.inline
	 * styles.current.prop.computed
	 * styles.current.prop.inline 
	 */
	#captureStyles(isOriginal = false) {
		if (isOriginal) {
			this.#setOriginalStyles( this.#getFormatCapturedProperties() );
		}
		this.#setCurrentStyles( this.#getFormatCapturedProperties() );
	}

	#setOriginalStyles(formatCapturedProperties) {
		const tracking = this.#getTracking();
		if (!tracking.style) tracking.style = {};
		tracking.style.original = formatCapturedProperties;
	}
	#setCurrentStyles(formatCapturedProperties) {
		const tracking = this.#getTracking();
		if (!tracking.style) tracking.style = {};
		tracking.style.current = formatCapturedProperties;
	}

	#getFormatCapturedProperties() {
		return this.#formatCapturedProperties(
			this.#getCaptureStyles(),
			this.#getManagedProperties()
		);
	}

	#formatCapturedProperties(captureStyles, managedProperties) {
		const formatCapturedProperties = {};
		for (const prop of managedProperties) {
			formatCapturedProperties[prop] = this.#formatPropValue(
				captureStyles.inline.getPropertyValue(prop),
				captureStyles.computed.getPropertyValue(prop)
			);
		}
		return formatCapturedProperties;
	}

	#formatPropValue(inlineValue, computedValue) {
		return {
			computed: computedValue,
			inline:   inlineValue !== '' ? inlineValue   : null
		}
	}

	#getCaptureStyles() {
		return {
			computed: this.#getCapturedComputedStyles(),
			inline: this.#getCapturedInlineStyles()
		}
	}

	#getCapturedComputedStyles() {
		return getComputedStyle(this.#element);
	}

	#getCapturedInlineStyles() {
		return this.#element.style;
	}

	// #applyStyles()

	#applyCurrentElementStyles() {
		const tracking = this.#getTrackingProp('style');
		if (!tracking) return;

		for (const prop of this.#getManagedProperties()) {
			const value = this.#getTrackedStyleCurrent(prop)?.inline;
			if (value !== null && value !== undefined) {
				this.#element.style.setProperty(prop, value);
			} else {
				this.#element.style.removeProperty(prop);
			}
		}
	}

	#resetElementStyles() {
		const tracking = this.#getTrackingProp('style');
		if (!tracking) return;

		for (const prop of this.#getManagedProperties()) {
			const value = this.#getResetStyles()?.[prop];
			if (value !== null && value !== undefined) {
				this.#element.style.setProperty(prop, value);
			}
		}
	}

	#restoreElementStyles() {
		this.#applyCurrentElementStyles();

		// this.#unsetTrackingProp('style');
	}

	// #updateSvgLayerStyles() {
	// 	if (!this.#svgLayer) return;

	// 	for (const prop of this.#getManagedProperties()) {
	// 		const value = this.#getTrackedStyleCurrent(prop)?.computed;
	// 		this.#svgLayer.style.setProperty(prop, value);
	// 	}
	// }

	/**
	 * =============================================================
	 * Tracking
	 * =============================================================
	 */

	#hasTracking() {
		return superellipseStyleTracking.has(this.#element)
	}

	#getTracking() {
		let tracking = superellipseStyleTracking.get(this.#element);
		if (!tracking) {
			tracking = {};
			superellipseStyleTracking.set(this.#element, tracking);
		}
		return tracking;
	}

	#hasTrackingProp(key) {
		return !! this.#getTrackingProp(key);
	}

	#getTrackingProp(key) {
		return this.#getTracking()[key];
	}

	#setTrackingProp(key, value) {
		let tracking = this.#getTracking();
		tracking[key] = value;
	}

	#unsetTrackingProp(key) {
		const tracking = this.#getTracking();
		delete tracking[key];
	}

	#unsetTracking() {
		superellipseStyleTracking.delete(this.#element);
	}

	/**
	 * =============================================================
	 * Observers
	 * =============================================================
	 */

	#setupObservers() {
		this.#mutationObserver = new MutationObserver(() => {
			this.#mutationHandler();
		});
		this.#mutationObserver.observe(this.#element, {
			attributes: true,
			attributeFilter: ['style', 'class']
		});

		if (typeof IntersectionObserver !== 'undefined') {
			this.#intersectionObserver = new IntersectionObserver((entries) => {
				this.#intersectionHandler(entries);
			});
			this.#intersectionObserver.observe(this.#element);
		}

		if (this.#autoResize && typeof ResizeObserver !== 'undefined') {
			this.#resizeObserver = new ResizeObserver(() => {
				this.#resizeHandler();
			});
			this.#resizeObserver.observe(this.#element);
		}

		this.#removalObserver = new MutationObserver(() => {
			this.#destroyHandler();
		});
		this.#removalObserver.observe(document.body, {
			childList: true,
			subtree: true
		});
	}

	#disconnectObservers() {
		if (this.#resizeObserver) this.#resizeObserver.disconnect();
		if (this.#mutationObserver) this.#mutationObserver.disconnect();
		if (this.#intersectionObserver) this.#intersectionObserver.disconnect();
		if (this.#removalObserver) this.#removalObserver.disconnect();
	}

	

	/**
	 * =============================================================
	 * Изменение при обновлениях
	 * =============================================================
	 */

	#mutationHandler() {
		// beforeStyles = this.#getTrackingProp('style')?.current;
		console.log('#mutationHandler', this.#getCurrentBorderRadius(), this.#getTrackingProp('style')?.current);

		this.#captureStyles();
		this.#recalculatePath();

		this.#applyModeStyles();
		this.#applyCurve();
	}

	#resizeHandler() {
		if (this.#getCapturedComputedStyles().display !== 'none') {

			this.#captureSizes();
			this.#recalculatePath();

			this.#applyModeStyles();
			this.#applyCurve();

		} else {
			this.#needsUpdate = true;
		}
	}

	#intersectionHandler(entries) {
		if (entries[0].isIntersecting && this.#needsUpdate) {
			this.#needsUpdate = false;

			this.#captureStyles();
			this.#captureSizes();
			this.#recalculatePath();

			this.#applyModeStyles();
			this.#applyCurve();
		}
	}

	#destroyHandler() {
		if (!document.body.contains(this.#element)) {
			this.#destroyController();
		}
	}

	/**
	 * =============================================================
	 * =============================================================
	 */

	/**
	 * =============================================================
	 * ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ
	 * =============================================================
	 */

	#getManagedProperties() {
		return Object.keys(this.#resetStyles);
	}

	// --- Геттеры и вспомогательные методы ---
	#setCurrentMode(mode) { this.#mode = mode; }
	getCurrentMode() { return this.#mode; }
	#setModeStatus(bool) { this.#status = bool; }
	#getModeStatus() { return this.#status; }

	#deleteFromControllers() { jsse_controllers.delete(this.#element); }
}