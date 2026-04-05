// src/mode.js
import { jsse_styles } from './styles-cache.js';
import { jsse_generateSuperellipsePath, jsse_getBorderRadiusFactor } from './core.js';

/**
 * 
 * 
 * 
 */
export class SuperellipseMode {

	_element;
	_isActivated;

	_size = {
		width:  0,
		height: 0
	};
	_curveFactor;
	_precision;

	_styles;

	_path;
	_resetPath;




	/**
	 * =============================================================
	 * PUBLIC
	 * =============================================================
	 */


	constructor(element) {
		this._element = element;
		this._curveFactor = jsse_getBorderRadiusFactor();
		this._precision = 2;
		this._isActivated = false;

		this._init();
	}

	activate() {
		if (this.isActivated()) return;

		// Установить статус
		this._isActivated = true;
		// Подготовить к активации
		this._captureStyles();
		this._recalculateCurve();
		// Применить Стили и кривую
		this._applyCurrentInlineStyles();
		this._applyCurrentCurve();
	}
	deactivate() {
		if (!this.isActivated()) return;

		// Установить статус
		this._isActivated = false;
		// Применить Стили и кривую
		this._applyCurrentInlineStyles();
		this._applyCurrentCurve();
	}

	update() {
		this.updatePrepare();
		this.updateExecute();
	}
	updatePrepare() {
		this._captureStyles();
		this._captureSize();
		this._recalculateCurve();
	}
	updateExecute() {
		this._applyCurrentInlineStyles();
		this._applyCurrentCurve();
	}


	updateSize(update = true) {
		this.updateSizePrepare();
		if (update) {
			this.updateSizeExecute();
		}
	}
	updateSizePrepare() {
		this._captureSize();
		this._recalculateCurve();
	}
	updateSizeExecute() {
		this._applyCurrentCurve();
	}


	updateStyles(update = true) {
		this.updateStylesPrepare();
		if (update) {
			this.updateStylesExecute();
		}
	}
	updateStylesPrepare() {
		this._captureStyles();
		this._recalculateCurve();
	}
	updateStylesExecute() {
		this._applyCurrentInlineStyles();
		this._applyCurrentCurve();
	}


	setCurveFactor(value, update = true) {
		this._curveFactor = value;
		if (update) {
			this._recalculateCurve();
			this._applyCurrentCurve();
		}
	}

	setPrecision(value, update = true) {
		this._precision = value;
		if (update) {
			this._recalculateCurve();
			this._applyCurrentCurve();
		}
	}

	getPath() {
		return this._path;
	}

	isActivated() {
		return this._isActivated;
	}


	/**
	 * =============================================================
	 * PRIVATE
	 * =============================================================
	 */


	_init() {
		this._initStyles();
		this._initSize();
		this._initCurve();
	}

	_getResetStyles() {
		return {
			'border-radius': '0px'
		};
	}

	/**
	 * =============================================================
	 * STYLES
	 * =============================================================
	 */

	_initStyles() {
		this._styles = jsse_styles.get(this._element);
		this._dropStyles();
	}

	_dropStyles() {
		this._styles.computed = {};	// вычисленные значения элемента
		this._styles.inline = {};	// inline значения элемента
		this._styles.reset = {}; 	// значения для расчета кривой и виртуальных элементов
	}

	_captureStyles() {
		/** 1. Получить актуальные inline-стили **/
		// Получить актуальные очищенные inline
		const capturedInlineStyles = this._getClearCapturedInlineStyles();
		// Сохранить inline-стили
		this._styles.inline = capturedInlineStyles;
		/** 2. Вычислить актуальные computed-стили **/
		// Восстановить inline-стили
		if (this.isActivated()) {
			this._clearResetStyles();
		}
		// получить текущие computed-стили
		const capturedComputedStyles = this._getCapturedComputedStyles();
		// Сохранить computed-стили
		this._styles.computed = capturedComputedStyles;
		/** 3. Обновить reset-стили **/
		this._recalculateResetStyles()
		/** 4. Возвращение исходных inline-стилей **/
		this._applyInlineStyles(capturedInlineStyles, this._element);

	}

	_recalculateResetStyles() {
		this._styles.reset = {};
		const resetStyles = this._getResetStyles();
		for (const prop in resetStyles) {
			const computedValue = this._styles.computed[prop];
			const inlineValue = this._styles.inline[prop]; 
			const resetValue = resetStyles[prop];

			// Запомнить необходимые inline для сброса
			if (resetValue !== computedValue && resetValue !== inlineValue) {
				this._styles.reset[prop] = resetValue;
			}
		}
	}

	_applyInlineStyles(props, element) {
		const managedProperties = this._getManagedProperties();
		for(const prop of managedProperties) {
			const inlineValue = props[prop];
			const currentValue = element.style.getPropertyValue(prop);
			if (inlineValue !== undefined) {
				if (currentValue !== inlineValue) {
					// console.log(`[DEBUG] _applyInlineStyles: setting ${prop} from "${currentValue}" to "${inlineValue}"`);
					element.style.setProperty(prop, inlineValue);
				} else {
					// console.log(`[DEBUG] _applyInlineStyles: skipping ${prop}, already "${currentValue}"`);
				}
			} else {
				if (currentValue !== '') {
					// console.log(`[DEBUG] _applyInlineStyles: removing ${prop} (was "${currentValue}")`);
					element.style.removeProperty(prop);
				}
			}
		}
	}

	_getCurrentInlineStyles() {
		const managedProperties = this._getManagedProperties();
		const result = {};
		for (const prop of managedProperties) {
			let inlineValue = this._styles.inline[prop];
			if (this.isActivated() && prop in this._styles.reset) {
				inlineValue = this._styles.reset[prop];
			}
			if (inlineValue !== undefined) {
				result[prop] = inlineValue;
			}
		}
		return result;
	}

	_applyCurrentInlineStyles() {
		this._applyCurrentInlineElementStyles();
	}

	_applyCurrentInlineElementStyles() {
		const inlineProps = this._getCurrentInlineStyles();
		this._applyInlineStyles(inlineProps, this._element);
	}

	_applyResetStyles() {
		for(const prop in this._styles.reset) {
			const value = this._styles.reset[prop];
			this._element.style.setProperty(prop, value);
		}
	}
	_clearResetStyles() {
		for(const prop in this._styles.reset) {
			const inlineValue = this._styles.inline[prop];
			if (inlineValue !== undefined) {
				this._element.style.setProperty(prop, inlineValue);
			} else {
				this._element.style.removeProperty(prop);
			}
		}
	}

	_getClearCapturedInlineStyles() {
		// Получить текущие inline
		const result = this._getCapturedInlineStyles();
		// Очистить полученные inline от сброшенных режимом значений
		const managedProperties = this._getManagedProperties();
		for (const prop of managedProperties) {
			// если режим включен и значение совпадает с примененным reset
			if (this.isActivated() && prop in this._styles.reset && result[prop] === this._styles.reset[prop]) {
				if (prop in this._styles.inline) {
					result[prop] = this._styles.inline[prop];
				} else {
					delete result[prop];
				}
			}
			// иначе остается inline значение элемента
		}
		return result;
	}

	_getCapturedInlineStyles() {
		const result = {};
		const capturedStyles = this._element.style;
		for (const prop of this._getManagedProperties()) {
			const value = capturedStyles.getPropertyValue(prop);
			if (value !== '') result[prop] = value;
		}
		return result;
	}

	_getCapturedComputedStyles() {
		const result = {};
		const capturedStyles = getComputedStyle(this._element);
		for (const prop of this._getManagedProperties()) {
			result[prop] = capturedStyles.getPropertyValue(prop);
			// const value = capturedStyles.getPropertyValue(prop);
			// result[prop] = value !== '' ? value   : null;
		}
		return result;
	}

	_getManagedProperties() {
		return Object.keys(this._getResetStyles());
	}

	/**
	 * =============================================================
	 * SIZE
	 * =============================================================
	 */

	_initSize() {
		this._captureSize();
	}

	_captureSize() {
		const rect = this._element.getBoundingClientRect();

		this._size.width = rect.width;
		this._size.height = rect.height;
	}


	/**
	 * =============================================================
	 * CURVE
	 * =============================================================
	 */

	_initCurve() {
		this._initInlinePath();
	}

	_initInlinePath() {
		this._resetPath = this._element.style.getPropertyValue('clip-path');
	}

	_recalculateCurve() {
		this._recalculatePath();
	}

	_recalculatePath() {
		if ( !( this._size.width > 0 && this._size.height > 0 ) ) {
			this._path = 'none'; // Сбрасываем путь
			return;
		}

		const radiusValue = this._styles.computed['border-radius'];
		const radiusNumber = radiusValue ? parseFloat(radiusValue) : 0;

		this._path  = jsse_generateSuperellipsePath(
			this._size.width,
			this._size.height,
			radiusNumber,
			this._curveFactor,
			this._precision
		);
	}
	
	_applyCurrentCurve() {
		// console.log('[DEBUG]', '_applyCurrentCurve:', 'isActivated()', this.isActivated(), '_path', this._path);
		if (this.isActivated()) {
			this._applyCurve();
		} else {
			this._restoreCurve();
		}
	}
	
	_applyCurve() {
		if (this._path) {
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