// src/controller.js
import { generateSuperellipsePath } from './core.js';
import { controllers } from './api.js';

// Глобальный кэш отслеживания стилей
const styleTracking = new WeakMap();

// Управляемые свойства
const MANAGED_PROPERTIES = ['borderRadius', 'background', 'border', 'boxShadow', 'position'];

export class SuperellipseController {
    constructor(element, options = {}) {
        this.element = element;
        this.options = {
            radius: 0,
            curveFactor: 0.5522847498307933,
            mode: 'svg-layer',
            autoResize: true,
            precision: 2,
            ...options
        };
        this.svgLayer = null;
        this.contentWrapper = null;
        this.isActive = true;
        this.needsUpdate = false;
        this.lastPath = '';

        // Наблюдатели
        this.resizeObserver = null;
        this.mutationObserver = null;
        this.removalObserver = null;
        this.intersectionObserver = null;

        this.initLibrary();
    }

    // =============================================================
    // 1. Инициализация библиотеки
    // =============================================================
    initLibrary() {
        this.captureInitialStyles();
        this.setupObservers();
        this.applyInitialMode();
        this.update();
    }

    // =============================================================
    // 3. Уничтожение контроллера
    // =============================================================
    destroyController() {
        this.disconnectObservers();
        this.removeSvgLayer();
        this.restoreOriginalContent();
        this.restoreAllStyles();
        this.clearClipPath();
        this.deleteFromControllers();
        this.isActive = false;
    }

    // =============================================================
    // 4. Изменение режима
    // =============================================================
    changeMode(mode) {
        const currentMode = this.getCurrentMode();
        if (mode === currentMode) return;

        // Очищаем текущий слой и структуру
        this.removeSvgLayer();
        this.restoreOriginalContent();
        this.clearClipPath();

        // Устанавливаем новый режим
        this.setModeOption(mode);

        // Подготавливаем элемент и создаём слой для нового режима
        if (mode === 'svg-layer') {
            this.prepareForSvgLayer();
        } else {
            this.prepareForClipPath();
        }

        this.update();
    }

    // =============================================================
    // 5. Установка опций
    // =============================================================
    setOptions(options) {
        const newOptions = this.getNewOptions(options);
        this.updateOptions(newOptions);

        if (this.checkModeChanged(newOptions)) {
            this.changeMode(newOptions.mode);
        } else {
            this.update();
        }
    }

    // =============================================================
    // 6. Обработка изменений стилей пользователем
    // =============================================================
    handleUserStyleChange() {
        const computedStyles = this.getComputedStyles();
        const inlineStyles = this.getInlineStyles();
        const currentMode = this.getCurrentMode();

        this.iterateManagedProperties((prop) => {
            const newValue = computedStyles[prop];
            const oldTracking = this.getStyleTracking(prop);

            if (this.compareWithCurrent(newValue, oldTracking.current)) {
                const isNowInline = this.isPropertyInline(prop, inlineStyles);

                if (isNowInline) {
                    this.updateUserValue(prop, inlineStyles[prop]);
                    this.updateLastSource(prop, 'user');
                } else {
                    this.updateLastSource(prop, 'css');
                }

                this.updateCurrentValue(prop, newValue);

                // Особый случай: borderRadius в режиме clip-path
                if (this.isBorderRadius(prop) && this.isClipPathMode(currentMode)) {
                    this.setBorderRadiusToZero();
                }
            }
        });
    }

    // =============================================================
    // 7. Обработка событий наблюдателей
    // =============================================================
    handleObserverEvents() {
        // Логика обработки наблюдателей встроена в setupObservers
    }

    // =============================================================
    // 8. Отключение контроллера
    // =============================================================
    disableController() {
        this.disconnectObservers();
        this.removeSvgLayer();
        this.restoreOriginalContent();
        this.restoreAllStyles();
        this.clearClipPath();
        this.setInactiveFlag();
    }

    // =============================================================
    // 9. Включение контроллера
    // =============================================================
    enableController() {
        if (this.checkIsActive()) return;

        this.setupObservers();
        const currentMode = this.getCurrentMode();
        if (currentMode === 'svg-layer') {
            this.prepareForSvgLayer();
        } else {
            this.prepareForClipPath();
        }
        this.update();
        this.setActiveFlag();
    }

    // =============================================================
    // ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ
    // =============================================================

    // --- Сохранение стилей ---
    captureInitialStyles() {
        if (styleTracking.has(this.element)) return;

        const computed = getComputedStyle(this.element);
        const inline = this.element.style;
        const tracking = {};

        for (const prop of MANAGED_PROPERTIES) {
            const inlineValue = inline[prop];
            tracking[prop] = {
                originalInline: inlineValue !== '' ? inlineValue : null,
                userValue: null,
                lastSource: inlineValue !== '' ? 'inline' : 'css',
                current: computed[prop]
            };
        }

        tracking.children = new Map();
        for (let child of this.element.children) {
            const childComputed = getComputedStyle(child);
            const childInline = child.style.position;
            tracking.children.set(child, {
                originalPosition: childComputed.position,
                wasStatic: childComputed.position === 'static',
                originalInline: childInline !== '' ? childInline : null,
                source: childInline !== '' ? 'inline' : 'css'
            });
        }

        tracking.originalContent = Array.from(this.element.childNodes);
        styleTracking.set(this.element, tracking);
    }

    // --- Настройка наблюдателей ---
    setupObservers() {
        this.mutationObserver = new MutationObserver(() => {
            this.handleUserStyleChange();
        });
        this.mutationObserver.observe(this.element, {
            attributes: true,
            attributeFilter: ['style', 'class']
        });

        if (typeof IntersectionObserver !== 'undefined') {
            this.intersectionObserver = new IntersectionObserver((entries) => {
                if (entries[0].isIntersecting && this.needsUpdate) {
                    this.needsUpdate = false;
                    this.update();
                }
            });
            this.intersectionObserver.observe(this.element);
        }

        if (this.options.autoResize && typeof ResizeObserver !== 'undefined') {
            this.resizeObserver = new ResizeObserver(() => {
                if (getComputedStyle(this.element).display !== 'none') {
                    this.update();
                } else {
                    this.needsUpdate = true;
                }
            });
            this.resizeObserver.observe(this.element);
        }

        this.removalObserver = new MutationObserver(() => {
            if (!document.body.contains(this.element)) {
                this.destroyController();
            }
        });
        this.removalObserver.observe(document.body, { childList: true, subtree: true });
    }

    disconnectObservers() {
        if (this.resizeObserver) this.resizeObserver.disconnect();
        if (this.mutationObserver) this.mutationObserver.disconnect();
        if (this.intersectionObserver) this.intersectionObserver.disconnect();
        if (this.removalObserver) this.removalObserver.disconnect();
    }

    // --- Подготовка перед созданием слоя ---
    prepareForSvgLayer() {
        // Временно восстанавливаем background, border, boxShadow из tracking
        const tracking = styleTracking.get(this.element);
        if (tracking) {
            for (const prop of ['background', 'border', 'boxShadow']) {
                const data = tracking[prop];
                if (data.originalInline !== null) {
                    this.element.style[prop] = data.originalInline;
                } else {
                    this.element.style.removeProperty(prop);
                }
            }
        }
        this.createSvgLayer();
    }

    prepareForClipPath() {
        // Восстанавливаем background, border, boxShadow из tracking
        const tracking = styleTracking.get(this.element);
        if (tracking) {
            for (const prop of ['background', 'border', 'boxShadow']) {
                const data = tracking[prop];
                if (data.originalInline !== null) {
                    this.element.style[prop] = data.originalInline;
                } else {
                    this.element.style.removeProperty(prop);
                }
            }
        }
        this.createClipPathMode();
    }

    // --- Применение режима (для начальной инициализации) ---
    applyInitialMode() {
        if (this.options.mode === 'svg-layer') {
            this.prepareForSvgLayer();
        } else {
            this.prepareForClipPath();
        }
    }

    applyMode() {
        // Не используется напрямую, логика в prepareFor... и changeMode
    }

    createSvgLayer() {
        this.removeSvgLayer();
        this.restoreOriginalContent();

        const computed = getComputedStyle(this.element);

        // Позиционирование элемента
        if (computed.position === 'static') {
            this.setLibraryStyle('position', 'relative');
        }

        // Обёртка содержимого
        this.wrapContent();

        // Позиционирование дочерних элементов
        const tracking = styleTracking.get(this.element);
        for (let child of this.element.children) {
            if (child === this.contentWrapper) continue;
            const childComputed = getComputedStyle(child);
            if (childComputed.position === 'static') {
                child.style.position = 'relative';
                const childData = tracking?.children.get(child);
                if (childData && childData.wasStatic) childData.wasStatic = true;
            }
        }

        // Создание SVG
        const clipId = 'superellipseClip_' + Math.random().toString(36).substr(2, 8);
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.classList.add('superellipse-svg-bg');
        svg.setAttribute('viewBox', `0 0 ${this.element.clientWidth} ${this.element.clientHeight}`);
        svg.setAttribute('preserveAspectRatio', 'none');
        svg.style.position = 'absolute';
        svg.style.top = '0';
        svg.style.left = '0';
        svg.style.width = '100%';
        svg.style.height = '100%';
        svg.style.pointerEvents = 'none';
        svg.style.clipPath = `url(#${clipId})`;

        // Копирование стилей
        svg.style.background = computed.background;
        svg.style.border = computed.border;
        svg.style.boxShadow = computed.boxShadow;

        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        const clipPath = document.createElementNS('http://www.w3.org/2000/svg', 'clipPath');
        clipPath.setAttribute('id', clipId);
        const clipShape = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        clipShape.setAttribute('d', this.lastPath || '');
        clipPath.appendChild(clipShape);
        defs.appendChild(clipPath);
        svg.appendChild(defs);

        this.element.insertBefore(svg, this.element.firstChild);
        this.svgLayer = svg;

        // Обнуление стилей элемента
        this.setLibraryStyle('background', 'transparent');
        this.setLibraryStyle('border', 'none');
        this.setLibraryStyle('borderRadius', '0');
        this.setLibraryStyle('boxShadow', 'none');
    }

    createClipPathMode() {
        // После подготовки стили уже восстановлены, осталось только обнулить borderRadius
        this.setLibraryStyle('borderRadius', '0');
    }

    removeSvgLayer() {
        if (this.svgLayer && this.svgLayer.parentNode) {
            this.svgLayer.parentNode.removeChild(this.svgLayer);
            this.svgLayer = null;
        }
    }

    wrapContent() {
        if (this.contentWrapper) return;

        const wrapper = document.createElement('div');
        wrapper.className = 'superellipse-content';
        wrapper.style.position = 'relative';
        wrapper.style.width = '100%';
        wrapper.style.height = '100%';
        wrapper.style.display = 'flex';
        wrapper.style.alignItems = 'center';
        wrapper.style.justifyContent = 'center';
        wrapper.style.textAlign = getComputedStyle(this.element).textAlign;

        const children = Array.from(this.element.childNodes);
        for (let child of children) {
            wrapper.appendChild(child);
        }
        this.element.appendChild(wrapper);
        this.contentWrapper = wrapper;
    }

    restoreOriginalContent() {
        const tracking = styleTracking.get(this.element);
        if (this.contentWrapper && this.contentWrapper.parentNode === this.element) {
            const children = Array.from(this.contentWrapper.childNodes);
            for (let child of children) {
                this.element.appendChild(child);
            }
            this.element.removeChild(this.contentWrapper);
            this.contentWrapper = null;
        } else if (tracking?.originalContent) {
            this.element.innerHTML = '';
            for (let node of tracking.originalContent) {
                this.element.appendChild(node.cloneNode(true));
            }
            this.contentWrapper = null;
        }
    }

    // --- Управление стилями ---
    setLibraryStyle(property, value) {
        const tracking = styleTracking.get(this.element);
        if (!tracking) return;

        if (tracking[property].lastSource !== 'library') {
            tracking[property].originalValue = getComputedStyle(this.element)[property];
        }
        this.element.style[property] = value;
        tracking[property].lastSource = 'library';
        tracking[property].current = value;
    }

    restoreAllStyles() {
        const tracking = styleTracking.get(this.element);
        if (!tracking) return;

        for (const prop of MANAGED_PROPERTIES) {
            const data = tracking[prop];
            if (data.originalInline !== null) {
                this.element.style[prop] = data.originalInline;
            } else {
                this.element.style.removeProperty(prop);
            }
        }

        for (let [child, childData] of tracking.children) {
            if (childData.originalInline !== null) {
                child.style.position = childData.originalInline;
            } else {
                child.style.removeProperty('position');
            }
        }

        styleTracking.delete(this.element);
    }

    clearClipPath() {
        this.element.style.clipPath = '';
    }

    // --- Обновление path ---
    update() {
        const display = getComputedStyle(this.element).display;
        if (display === 'none') {
            this.needsUpdate = true;
            return;
        }
        this.needsUpdate = false;

        const rect = this.element.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;

        const path = generateSuperellipsePath(
            rect.width,
            rect.height,
            this.options.radius,
            this.options.curveFactor,
            this.options.precision
        );
        this.lastPath = path;

        if (this.options.mode === 'svg-layer' && this.svgLayer) {
            this.svgLayer.setAttribute('viewBox', `0 0 ${rect.width} ${rect.height}`);
            const clipPathElem = this.svgLayer.querySelector('clipPath path');
            if (clipPathElem) clipPathElem.setAttribute('d', path);
        } else if (this.options.mode === 'clip-path') {
            this.element.style.clipPath = `path('${path}')`;
        }
    }

    // --- Публичные методы (обёртки) ---
    setRadius(value) {
        this.options.radius = value;
        this.update();
    }

    setCurveFactor(value) {
        this.options.curveFactor = value;
        this.update();
    }

    setMode(mode) {
        this.changeMode(mode);
    }

    getPath() {
        return this.lastPath;
    }

    destroy() {
        this.destroyController();
    }

    // --- Геттеры и вспомогательные методы ---
    getCurrentMode() { return this.options.mode; }
    setModeOption(mode) { this.options.mode = mode; }
    getNewOptions(options) { return options; }
    updateOptions(newOptions) { Object.assign(this.options, newOptions); }
    checkModeChanged(newOptions) { return newOptions.mode !== undefined && newOptions.mode !== this.options.mode; }
    getComputedStyles() { return getComputedStyle(this.element); }
    getInlineStyles() { return this.element.style; }
    getStyleTracking(prop) { return styleTracking.get(this.element)?.[prop]; }
    compareWithCurrent(newValue, current) { return newValue !== current; }
    isPropertyInline(prop, inlineStyles) { return inlineStyles[prop] !== ''; }
    updateUserValue(prop, value) { const t = styleTracking.get(this.element); if (t) t[prop].userValue = value; }
    updateLastSource(prop, source) { const t = styleTracking.get(this.element); if (t) t[prop].lastSource = source; }
    updateCurrentValue(prop, value) { const t = styleTracking.get(this.element); if (t) t[prop].current = value; }
    isBorderRadius(prop) { return prop === 'borderRadius'; }
    isClipPathMode(mode) { return mode === 'clip-path'; }
    setBorderRadiusToZero() { this.setLibraryStyle('borderRadius', '0'); }
    iterateManagedProperties(callback) { for (const prop of MANAGED_PROPERTIES) callback(prop); }
    deleteFromControllers() { controllers.delete(this.element); }
    setInactiveFlag() { this.isActive = false; }
    setActiveFlag() { this.isActive = true; }
    checkIsActive() { return this.isActive; }
}