// src/controller.js
import { jsse_styles } from './styles-cache.js';
import { jsse_getBorderRadiusFactor } from './core.js';
import { jsse_controllers } from './api.js';
import { SuperellipseModeSvgLayer } from './mode-svg-layer.js';
import { SuperellipseModeClipPath } from './mode-clip-path.js';

// const superellipseStyleTracking = new WeakMap();

export class SuperellipseController
{
	#mode;
	#element;

	#precision; // Количество знаков после запятой
	#curveFactor;

	#mutationFrame;
	#resizeFrame;
	#intersectionFrame;
	
	#resizeObserver;
	#mutationObserver;
	#removalObserver;
	#intersectionObserver;

	#needsUpdate;
	#isSelfApply;

	#debugCounter = 0;

	/**
	 * =============================================================
	 * PUBLIC
	 * =============================================================
	 */


	constructor(element, options = {}) {
		options = {
			mode: 'svg-layer',
			...options
		};
		this.#element = element;
		this.#curveFactor = options.curveFactor ?? jsse_getBorderRadiusFactor();
		this.#precision = options.precision ?? 2;

		this.#needsUpdate = false;
		this.#isSelfApply = false;

		// Слушатели
		this.#resizeObserver = null;
		this.#mutationObserver = null;
		this.#removalObserver = null;
		this.#intersectionObserver = null;

		// init
		this.#initCacheStyles();
		this.#setMode(options.mode);
		this.#connectObservers();
	}

	switchMode(modeName) {
		this.#unsetMode();
		this.#setMode(modeName);

		return this;
	}

	enable() {
		// this.#mode.activate();
		this.#isSelfApply = true;
		try {
			this.#mode.activate();
		} finally {
			this.#isSelfApply = false;
		}

		return this;
	}

	disable() {
		this.#mode.deactivate();

		return this._element;
	}

	setCurveFactor(value) {
		this.#curveFactor = value;
		this.#mode.setCurveFactor(value);

		return this;
	}

	setPrecision(value) {
		this.#precision = value;
		this.#mode.setPrecision(value);

		return this;
	}

	getPath() {
		return this.#mode.getPath();
	}

	destroy() {
		this.#destroyController();

		return this._element;
	}


	/**
	 * =============================================================
	 * PRIVATE
	 * =============================================================
	 */



	#isDisplay() {
		const capturedStyles = getComputedStyle(this.#element);
		return capturedStyles.getPropertyValue('display') !== 'none';
	}


	/**
	 * =============================================================
	 * CACHE
	 * =============================================================
	 */


	#initCacheStyles() {
		let cacheStyles = jsse_styles.get(this.#element);
		if (!cacheStyles) {
			cacheStyles = {};
			jsse_styles.set(this.#element, cacheStyles);
		}
	}

	#deleteCacheStyles() {
		jsse_styles.delete(this.#element);
	}


	/**
	 * =============================================================
	 * MODE
	 * =============================================================
	 */


	#setMode(modeName) {
		switch (modeName) {
			case 'svg-layer':
				this.#mode = new SuperellipseModeSvgLayer(this.#element);
				break;

			case 'clip-path':
			default:
				this.#mode = new SuperellipseModeClipPath(this.#element);
				break;
		}
		this.#mode.setCurveFactor(this.#curveFactor, false);
		this.#mode.setPrecision(this.#precision, false);

		this.#mode.activate();
	}

	#unsetMode() {
		this.#mode.deactivate();
		this.#mode = null;
	}


	/**
	 * =============================================================
	 * 
	 * =============================================================
	 */

	/**
	 * Метод уничтожения контроллера
	 */
	#destroyController() {
		this.#disconnectObservers();
		this.#unsetMode();

		this.#deleteCacheStyles();
		this.#deleteFromControllers();
	}
	
	#deleteFromControllers() {
		jsse_controllers.delete(this.#element);
	}


	/**
	 * =============================================================
	 * 
	 * =============================================================
	 */


	#connectObservers() {
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

		if (typeof ResizeObserver !== 'undefined') {
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
		// if (this.#mutationFrame) cancelAnimationFrame(this.#mutationFrame);
		// if (this.#resizeFrame) cancelAnimationFrame(this.#resizeFrame);
		// if (this.#intersectionFrame) cancelAnimationFrame(this.#intersectionFrame);
		// clearTimeout вместо cancelAnimationFrame
		if (this.#mutationFrame) clearTimeout(this.#mutationFrame);
		if (this.#resizeFrame) clearTimeout(this.#resizeFrame);
		if (this.#intersectionFrame) clearTimeout(this.#intersectionFrame);

		if (this.#resizeObserver) this.#resizeObserver.disconnect();
		if (this.#mutationObserver) this.#mutationObserver.disconnect();
		if (this.#intersectionObserver) this.#intersectionObserver.disconnect();
		if (this.#removalObserver) this.#removalObserver.disconnect();
	}


	/**
	 * =============================================================
	 * 
	 * =============================================================
	 */
	#mutationHandler() {

		const counter = this.#debugCounter++;
		console.log(`[DEBUG] "${this.#element.classList}" #mutationHandler(): start ${counter}"`);

		this.#mutationObserver.disconnect();
		try {
			if (this.#isDisplay() && this.#needsUpdate) {
				this.#mode.update();
				this.#needsUpdate = false;
			} else {
				this.#mode.updateStyles();
			}
		} finally {
			this.#mutationObserver.observe(this.#element, {
				attributes: true,
				attributeFilter: ['style', 'class']
			})
			console.log(`[DEBUG] #mutationHandler(): end ${counter}"`);
		}
	}

	#resizeHandler() {
		if (this.#isDisplay()) {
			try {
				this.#mode.updateSize();
			} finally {
			}
		} else {
			this.#needsUpdate = true;
		}
	}

	#intersectionHandler(entries) {
		if (entries[0].isIntersecting && this.#needsUpdate) {
			try {
				this.#mode.update();
				this.#needsUpdate = false;
			} finally {
			}
		}
	}

	#destroyHandler() {
		if (!document.body.contains(this.#element)) {
			this.#destroyController();
		}
	}
}