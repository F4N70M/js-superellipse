(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.Superellipse = {}));
})(this, (function (exports) { 'use strict';

    /**
     * Генерация пути для суперэллипса (v4)
     */

    /**
     * Округление числа с заданной точностью
     */
    function round(value, precision = 2) {
        const factor = 10 ** precision;
        return Math.round(value * factor) / factor;
    }

    /**
     * Вычисляет D2 второй кривой по размахам и D1
     */
    function getD2FromL1D1L2(L1, D1, L2) {
        if (Math.abs(L2) < 1e-10) {
            throw new Error('L2 не может быть нулевым');
        }
        const D2 = (4 * L2 - L1 * (4 - 3 * D1)) / (3 * L2);
        return Math.min(D2, 1);
    }

    /**
     * Основная функция генерации path
     */
    function generateSuperellipsePath(width, height, radius, curveFactor, precision = 2) {
        // константа идеальной окружности
        const G = (4 / 3) * (Math.sqrt(2) - 1);
        // константа максимальной L при D == 1
        const J = 8 - 4 * Math.sqrt(2);

        // Множитель для нормализации координат
        let M = width >= height ? width : height;

        let kValue = Math.abs(curveFactor);
        let kSign  = curveFactor >= 0 ? 1 : -1;

        // Ограничиваем радиус половиной меньшей стороны
        let rxMax = width / 2;
        let ryMax = height / 2;
        let rMax  = Math.min(rxMax, ryMax);
        let r = Math.min(radius, rMax);
        let rMaxSpan = Math.abs(rxMax - ryMax);
        if (rxMax >= ryMax) {
            rxMax = ryMax + Math.min(rMax / 4, rMaxSpan / 4);
        } else {
            ryMax = rxMax + Math.min(rMax / 4, rMaxSpan / 4);
        }
        let rx = Math.min(r, rxMax);
        let ry = Math.min(r, ryMax);

        let Dx = 0, Dy = 0;
        let Lx = 0, Ly = 0;
        let Sx = 0, Sy = 0;

        if (r !== 0) {
            let R = 1;

            // Определить эллипсные (k=1)
            let Rk1x = rxMax / rx;
            let Rk1y = ryMax / ry;
            let Lk1x = (kSign > 0) ? Math.min(Rk1x, J) : 1;
            let Lk1y = (kSign > 0) ? Math.min(Rk1y, J) : 1;
            getD2FromL1D1L2(R, G, Lk1x);
            getD2FromL1D1L2(R, G, Lk1y);
            let Jk1x = (1 / J) * Lk1x;
            let Jk1y = (1 / J) * Lk1y;

            // Относительное L (от 1 до Lk1, при k от G до 1)
            let Lk = Math.max((Math.min(kValue, 1) - G) / (1 - G), 0);
            let Lix = 1 + (Lk1x - 1) * Lk;
            let Liy = 1 + (Lk1y - 1) * Lk;

            // Определить Di (от Li)
            let Six = 0, Siy = 0;
            let Dix, Diy;
            if (kValue <= G) {
                Dix = Diy = kValue;
            } else {
                let Dlix = getD2FromL1D1L2(R, G, Lix);
                let Dliy = getD2FromL1D1L2(R, G, Liy);
                if (kValue <= 1) {
                    Dix = Dlix;
                    Diy = Dliy;
                } else {
                    Jk1x = G + (1 / (Lk1x / J)) * (1 - G);
                    Jk1y = G + (1 / (Lk1y / J)) * (1 - G);
                    let Jix = Math.min((kValue - 1) / (Jk1x - 1), 1);
                    let Jiy = Math.min((kValue - 1) / (Jk1y - 1), 1);

                    let Lsx = Lix + (J - Lix) * Jix;
                    let Lsy = Liy + (J - Liy) * Jiy;
                    let Dlsx = getD2FromL1D1L2(R, G, Lsx);
                    let Dlsy = getD2FromL1D1L2(R, G, Lsy);
                    Dix = Math.min(Dlsx, 1);
                    Diy = Math.min(Dlsy, 1);

                    if (kValue > Jk1x) {
                        Six = (kValue - Jk1x) / (2 - Jk1x);
                    }
                    if (kValue > Jk1y) {
                        Siy = (kValue - Jk1y) / (2 - Jk1y);
                    }
                }
            }

            Lx = Lix * (1 - Six);
            Ly = Liy * (1 - Siy);
            Sx = Lix * Six;
            Sy = Liy * Siy;
            Dx = Lx * Dix;
            Dy = Ly * Diy;
        }

        let Qm = M;
        let Qw = width / M;
        let Qh = height / M;
        let Qr = r / M;
        let Q0 = { x: 0, y: 0 };
        let Q1 = { x: Qw, y: 0 };
        let Q2 = { x: Qw, y: Qh };
        let Q3 = { x: 0, y: Qh };

        let pathCommands;
        if (kSign >= 0) {
            pathCommands = [
                `M`, Q0.x, Q0.y + (Sy + Ly) * Qr,
                `L`, Q0.x, Q0.y + (Ly) * Qr,
                `C`, Q0.x, Q0.y + (Ly - Dy) * Qr, Q0.x + (Lx - Dx) * Qr, Q0.y, Q0.x + (Lx) * Qr, Q0.y,
                `L`, Q0.x + (Sx + Lx) * Qr, Q0.y,
                `L`, Q1.x - (Sx + Lx) * Qr, Q1.y,
                `L`, Q1.x - (Lx) * Qr, Q1.y,
                `C`, Q1.x - (Lx - Dx) * Qr, Q1.y, Q1.x, Q1.y + (Ly - Dy) * Qr, Q1.x, Q1.y + (Ly) * Qr,
                `L`, Q1.x, Q1.y + (Sy + Ly) * Qr,
                `L`, Q2.x, Q2.y - (Sy + Ly) * Qr,
                `L`, Q2.x, Q2.y - (Ly) * Qr,
                `C`, Q2.x, Q2.y - (Ly - Dy) * Qr, Q2.x - (Lx - Dx) * Qr, Q2.y, Q2.x - (Lx) * Qr, Q2.y,
                `L`, Q2.x - (Sx + Lx) * Qr, Q2.y,
                `L`, Q3.x + (Sx + Lx) * Qr, Q3.y,
                `L`, Q3.x + (Lx) * Qr, Q3.y,
                `C`, Q3.x + (Lx - Dx) * Qr, Q3.y, Q3.x, Q3.y - (Ly - Dy) * Qr, Q3.x, Q3.y - (Ly) * Qr,
                `L`, Q3.x, Q3.y - (Sy + Ly) * Qr,
                'Z'
            ];
        } else {
            pathCommands = [
                `M`, Q0.x, Q0.y + (Sy + Ly) * Qr,
                `L`, Q0.x + (Sx) * Qr, Q0.y + (Sy + Ly) * Qr,
                `C`, Q0.x + (Sx + Dx) * Qr, Q0.y + (Sy + Ly) * Qr, Q0.x + (Sx + Lx) * Qr, Q0.y + (Sy + Dy) * Qr, Q0.x + (Sx + Lx) * Qr, Q0.y + (Sy) * Qr,
                `L`, Q0.x + (Sx + Lx) * Qr, Q0.y,
                `L`, Q1.x - (Sx + Lx) * Qr, Q1.y,
                `L`, Q1.x - (Sx + Lx) * Qr, Q1.y + (Sy) * Qr,
                `C`, Q1.x - (Sx + Lx) * Qr, Q1.y + (Sy + Dy) * Qr, Q1.x - (Sx + Dx) * Qr, Q1.y + (Sy + Ly) * Qr, Q1.x - (Sx) * Qr, Q1.y + (Sy + Ly) * Qr,
                `L`, Q1.x, Q1.y + (Sy + Ly) * Qr,
                `L`, Q2.x, Q2.y - (Sy + Ly) * Qr,
                `L`, Q2.x - Sx * Qr, Q2.y - (Sy + Ly) * Qr,
                `C`, Q2.x - (Sx + Dx) * Qr, Q2.y - (Sy + Ly) * Qr, Q2.x - (Sx + Lx) * Qr, Q2.y - (Sy + Dy) * Qr, Q2.x - (Sx + Lx) * Qr, Q2.y - (Sy) * Qr,
                `L`, Q2.x - (Sx + Lx) * Qr, Q2.y,
                `L`, Q3.x + (Sx + Lx) * Qr, Q3.y,
                `L`, Q3.x + (Sx + Lx) * Qr, Q3.y - Sy * Qr,
                `C`, Q3.x + (Sx + Lx) * Qr, Q3.y - (Sy + Dy) * Qr, Q3.x + (Sx + Dx) * Qr, Q3.y - (Sy + Ly) * Qr, Q3.x + Sx * Qr, Q3.y - (Sy + Ly) * Qr,
                `L`, Q3.x, Q3.y - (Sy + Ly) * Qr,
                'Z'
            ];
        }

        // Применяем масштабирование и округление
        const path = pathCommands.map(p => {
            if (typeof p === 'number') {
                return round(p * Qm, precision);
            }
            return p;
        }).join(' ');

        return path;
    }

    class SuperellipseController {
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
            computed.borderRadius;
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

    const controllers$1 = new WeakMap();

    // Геттер для доступа к контроллеру через element.superellipse
    Object.defineProperty(Element.prototype, 'superellipse', {
        get() {
            return controllers$1.get(this);
        }
    });

    // Метод инициализации на элементе
    Element.prototype.superellipseInit = function(options) {
        let controller = controllers$1.get(this);
        if (controller) {
            controller.destroy();
        }
        controller = new SuperellipseController(this, options);
        controllers$1.set(this, controller);
        return this; // для цепочек
    };

    // Глобальная функция superellipseInit
    function superellipseInit(target, options) {
        if (typeof target === 'string') {
            const elements = document.querySelectorAll(target);
            const controllersList = [];
            elements.forEach(el => {
                el.superellipseInit(options);
                controllersList.push(el.superellipse);
            });
            return controllersList;
        } else if (target instanceof Element) {
            target.superellipseInit(options);
            return target.superellipse;
        } else if (target instanceof NodeList || Array.isArray(target)) {
            const controllersList = [];
            for (let i = 0; i < target.length; i++) {
                const el = target[i];
                if (el instanceof Element) {
                    el.superellipseInit(options);
                    controllersList.push(el.superellipse);
                }
            }
            return controllersList;
        } else {
            throw new Error('superellipseInit: первый аргумент должен быть селектором, элементом или коллекцией элементов');
        }
    }

    exports.SuperellipseController = SuperellipseController;
    exports.generateSuperellipsePath = generateSuperellipsePath;
    exports.superellipseInit = superellipseInit;

}));
//# sourceMappingURL=superellipse.js.map
