import { SuperellipseController } from './controller.js';

const controllers = new WeakMap();

// Геттер для доступа к контроллеру через element.superellipse
Object.defineProperty(Element.prototype, 'superellipse', {
    get() {
        return controllers.get(this);
    }
});

// Метод инициализации на элементе
Element.prototype.superellipseInit = function(options) {
    let controller = controllers.get(this);
    if (controller) {
        controller.destroy();
    }
    controller = new SuperellipseController(this, options);
    controllers.set(this, controller);
    return this; // для цепочек
};

// Глобальная функция superellipseInit
export function superellipseInit(target, options) {
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