/**
 * @file src/global-cache.js
 * 
 * @module sj-superellipse/global-cache
 * @since 1.0.0
 * @author f4n70m
 * 
 * @description
 * Глобальные хранилища для кэширования данных между экземплярами контроллеров и режимов.
 * - `jsse_styles` (WeakMap) – кэш захваченных стилей для каждого элемента.
 * - `jsse_css` – хранилище глобально добавленных элементов `<style>` для режимов.
 * - `jsse_counter` – счётчик для генерации уникальных идентификаторов контроллеров.
 */


/**
 * Карта для хранения контроллеров суперэллипса, связанных с DOM-элементами.
 * @type {WeakMap<Element, SuperellipseController>}
 */
export const jsse_controllers = new WeakMap(); // экспортируем


/**
 * WeakMap для кэширования стилей элементов.
 * @type {WeakMap<Element, Object>}
 */
export const jsse_styles = new WeakMap();


/**
 * Объект для хранения глобальных CSS-правил режимов.
 * @namespace jsse_css
 */
export const jsse_css = {
    _list: {},
    get(key) {
        return this._list[key];
    },
    set(key, el) {
        this._list[key] = el;
    },
    isset(key) {
        return this._list[key] !== undefined;
    }
};

/**
 * Счётчик для генерации уникальных идентификаторов контроллеров.
 * @namespace jsse_counter
 */
export const jsse_counter = {
	_value: 0,
	increment() { this._value++; },
	decrement() { this._value--; },
	get value() { return this._value; }
};