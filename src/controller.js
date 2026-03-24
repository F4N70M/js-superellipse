import { generateSuperellipsePath } from './core.js';

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
        this.resizeObserver = null;
        this.mutationObserver = null;
        this.savedStyles = {
            background: null,
            border: null,
            borderRadius: null,
            boxShadow: null,
            position: null,
            childrenZIndex: new Map()
        };
        this.lastPath = '';
        this.needsUpdate = false;

        this.init();
    }

    init() {
        this.saveOriginalStyles();
        this.applyMode();
        this.setupResizeObserver();
        this.setupRemovalObserver();
        this.update();
    }

    saveOriginalStyles() {
        const computed = getComputedStyle(this.element);
        this.savedStyles.background = computed.background;
        this.savedStyles.border = computed.border;
        this.savedStyles.borderRadius = computed.borderRadius;
        this.savedStyles.boxShadow = computed.boxShadow;
        this.savedStyles.position = computed.position;
        for (let child of this.element.children) {
            const childComputed = getComputedStyle(child);
            this.savedStyles.childrenZIndex.set(child, {
                position: childComputed.position,
                zIndex: childComputed.zIndex
            });
        }
    }

    applyMode() {
        if (this.options.mode === 'svg-layer') {
            this.createSvgLayer();
        } else if (this.options.mode === 'clip-path') {
            this.removeSvgLayer();
            this.element.style.clipPath = '';
        }
    }

    createSvgLayer() {
        this.removeSvgLayer();

        const computed = getComputedStyle(this.element);
        const bgImage = computed.backgroundImage;
        const bgColor = computed.backgroundColor;

        if (computed.position === 'static') {
            this.element.style.position = 'relative';
        }

        for (let child of this.element.children) {
            const childComputed = getComputedStyle(child);
            if (childComputed.position === 'static') {
                child.style.position = 'relative';
            }
            child.style.zIndex = '1';
        }

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
        svg.style.zIndex = '0';
        svg.style.clipPath = `url(#${clipId})`;

        if (bgImage && bgImage !== 'none') {
            svg.style.backgroundImage = bgImage;
            svg.style.backgroundSize = 'cover';
            svg.style.backgroundPosition = 'center';
            svg.style.backgroundRepeat = 'no-repeat';
        } else if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
            svg.style.backgroundColor = bgColor;
        }

        const border = computed.border;
        const borderRadius = computed.borderRadius;
        const boxShadow = computed.boxShadow;
        if (border && border !== 'none') svg.style.border = border;
        // if (borderRadius && borderRadius !== '0px') svg.style.borderRadius = borderRadius;
        if (boxShadow && boxShadow !== 'none') svg.style.boxShadow = boxShadow;

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

        this.element.style.background = 'transparent';
        this.element.style.border = 'none';
        this.element.style.borderRadius = '0';
        this.element.style.boxShadow = 'none';
    }

    removeSvgLayer() {
        if (this.svgLayer && this.svgLayer.parentNode) {
            this.svgLayer.parentNode.removeChild(this.svgLayer);
            this.svgLayer = null;
        }
    }

    setupResizeObserver() {
        if (this.options.autoResize && typeof ResizeObserver !== 'undefined') {
            this.resizeObserver = new ResizeObserver(() => {
                this.update();
            });
            this.resizeObserver.observe(this.element);
        }
    }

    setupRemovalObserver() {
        this.mutationObserver = new MutationObserver((mutations) => {
            if (!document.body.contains(this.element)) {
                this.destroy();
            }
        });
        this.mutationObserver.observe(document.body, { childList: true, subtree: true });
    }

    update() {
        if (getComputedStyle(this.element).display === 'none') {
            this.needsUpdate = true;
            return;
        }
        this.needsUpdate = false;

        const rect = this.element.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) {
            return;
        }

        const width = rect.width;
        const height = rect.height;
        const path = generateSuperellipsePath(
            width,
            height,
            this.options.radius,
            this.options.curveFactor,
            this.options.precision
        );
        this.lastPath = path;

        if (this.options.mode === 'svg-layer' && this.svgLayer) {
            this.svgLayer.setAttribute('viewBox', `0 0 ${width} ${height}`);
            const clipPathElem = this.svgLayer.querySelector('clipPath path');
            if (clipPathElem) {
                clipPathElem.setAttribute('d', path);
            }
        } else if (this.options.mode === 'clip-path') {
            this.element.style.clipPath = `path('${path}')`;
        }
    }

    setRadius(value) {
        this.options.radius = value;
        this.update();
    }

    setCurveFactor(value) {
        this.options.curveFactor = value;
        this.update();
    }

    setMode(mode) {
        if (mode === this.options.mode) return;
        this.options.mode = mode;
        if (mode === 'svg-layer') {
            this.createSvgLayer();
            this.element.style.clipPath = '';
        } else {
            this.removeSvgLayer();
            this.element.style.clipPath = '';
        }
        this.update();
    }

    setOptions(options) {
        Object.assign(this.options, options);
        if (options.mode !== undefined) {
            this.setMode(options.mode);
        } else {
            this.update();
        }
    }

    getPath() {
        return this.lastPath;
    }

    destroy() {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }
        if (this.mutationObserver) {
            this.mutationObserver.disconnect();
            this.mutationObserver = null;
        }

        this.removeSvgLayer();

        if (this.savedStyles.background !== null) {
            this.element.style.background = this.savedStyles.background;
        }
        if (this.savedStyles.border !== null) {
            this.element.style.border = this.savedStyles.border;
        }
        if (this.savedStyles.borderRadius !== null) {
            this.element.style.borderRadius = this.savedStyles.borderRadius;
        }
        if (this.savedStyles.boxShadow !== null) {
            this.element.style.boxShadow = this.savedStyles.boxShadow;
        }
        if (this.savedStyles.position !== null) {
            this.element.style.position = this.savedStyles.position;
        }

        for (let [child, styles] of this.savedStyles.childrenZIndex) {
            if (styles.position !== null) child.style.position = styles.position;
            if (styles.zIndex !== null) child.style.zIndex = styles.zIndex;
        }

        this.element.style.clipPath = '';
        controllers.delete(this.element);
    }
}