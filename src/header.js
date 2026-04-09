/**
 * 
 * @module sj-superellipse
 * @version 1.0.0
 * @author f4n70m
 * @license MIT
 * 
 * @description
 * Библиотека для применения суперэллипсов к произвольным DOM-элементам.
 * Позволяет плавно изменять форму углов от вогнутых прямоугольных (-2) до выгнутых прямоугольных (2),
 * проходя через скос (0), круглые углы (±G) и классический суперэллипс (1).
 * 
 * Особенности:
 * - Два режима работы: `clip-path` (легковесный) и `svg-layer` (полнофункциональный с поддержкой границ и теней).
 * - Автоматическое отслеживание изменений размеров, стилей, видимости и атрибутов элемента.
 * - Поддержка `border-radius`, `border`, `box-shadow`, `background` в режиме `svg-layer`.
 * - Несколько способов инициализации: через селектор, элемент, коллекцию или глобальную функцию.
 * - Умное кэширование стилей для минимизации перерисовок.
 * 
 * @typicalname superellipse
 * 
 * @example
 * // Инициализация элемента с режимом svg-layer (по умолчанию)
 * const element = document.querySelector('.my-element');
 * const controller = element.superellipseInit({
 *   curveFactor: 1.2,
 *   precision: 3
 * });
 * 
 * // Изменение коэффициента кривизны
 * controller.setCurveFactor(0.8);
 * 
 * // Переключение режима
 * controller.switchMode('clip-path');
 * 
 * // Инициализация всех элементов с классом .rounded
 * superellipseInit('.rounded', { mode: 'clip-path' });
 * 
 * @example
 * // Генерация только SVG-пути без привязки к DOM
 * import { jsse_generateSuperellipsePath } from 'js-superellipse';
 * const path = jsse_generateSuperellipsePath(200, 150, 20, 1.5);
 * document.querySelector('path').setAttribute('d', path);
 */

/**
 * Глобальная функция для инициализации суперэллипса на одном или нескольких элементах.
 * @function superellipseInit
 * @memberof module:js-superellipse
 * @param {string|Element|NodeList|Array<Element>} target - CSS-селектор, DOM-элемент или коллекция.
 * @param {Object} [options] - Опции инициализации.
 * @param {string} [options.mode='svg-layer'] - Режим: `'svg-layer'` (полная поддержка стилей) или `'clip-path'` (только обрезка).
 * @param {number} [options.curveFactor] - Коэффициент кривизны (от -2 до 2). По умолчанию `(4/3)*(√2-1) ≈ 0.5523`.
 * @param {number} [options.precision=2] - Количество знаков после запятой в координатах пути.
 * @param {boolean} [options.force=false] - Принудительное пересоздание контроллера, если элемент уже инициализирован.
 * @returns {SuperellipseController|Array<SuperellipseController>} Контроллер для одного элемента или массив контроллеров.
 * @throws {Error} Если target не является селектором, элементом или коллекцией.
 */

/**
 * Класс контроллера, управляющего жизненным циклом суперэллипса для конкретного элемента.
 * @class SuperellipseController
 * @memberof module:js-superellipse
 * @hideconstructor
 * @example
 * const controller = new SuperellipseController(element, options);
 * // или через фабрику: element.superellipseInit(options)
 */
