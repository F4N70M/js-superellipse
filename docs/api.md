# API Reference

## Глобальная функция `superellipseInit`

Инициализирует один или несколько элементов суперэллипсом.

### Синтаксис

```js
superellipseInit(target, options)
```

### Параметры

| Параметр | Тип | Описание |
|----------|-----|----------|
| `target` | `string` \| `Element` \| `NodeList` \| `Array<Element>` | CSS-селектор, DOM-элемент или коллекция элементов |
| `options` | `Object` | Опции инициализации (см. ниже) |

### Опции `options`

| Свойство | Тип | По умолчанию | Описание |
|----------|-----|--------------|----------|
| `mode` | `string` | `'svg-layer'` | Режим работы: `'svg-layer'` или `'clip-path'` |
| `curveFactor` | `number` | `0.5523` | Коэффициент кривизны (диапазон -2 … 2) |
| `precision` | `number` | `2` | Количество знаков после запятой в координатах пути |
| `force` | `boolean` | `false` | Принудительное пересоздание контроллера, если элемент уже инициализирован |
| `debug` | `boolean` | `false` | Включить отладочный вывод в консоль |

### Возвращаемое значение

- Для одного элемента: `SuperellipseController`
- Для нескольких элементов: `Array<SuperellipseController>`

### Примеры

```js
// Инициализация одного элемента по селектору
const controllers = superellipseInit('.card', { curveFactor: 1.2 });

// Инициализация конкретного элемента
const el = document.querySelector('.box');
const controller = superellipseInit(el, { mode: 'clip-path' });

// Инициализация коллекции
const allDivs = document.querySelectorAll('div');
superellipseInit(allDivs, { precision: 3 });
```

---

## Методы элемента

### `element.superellipseInit(options)`

Инициализирует контроллер на конкретном элементе.

```js
const controller = element.superellipseInit({ curveFactor: 1.5 });
```

### `element.superellipse` (геттер)

Возвращает уже созданный контроллер для элемента (если есть).

```js
const controller = element.superellipse;
if (controller) {
  controller.setCurveFactor(0.7);
}
```

---

## Класс `SuperellipseController`

Основной контроллер, управляющий суперэллипсом для элемента.

### Конструктор

Обычно не вызывается напрямую – используйте фабричные методы (`superellipseInit` или `element.superellipseInit`).

```js
const controller = new SuperellipseController(element, options);
```

### Методы управления

#### `enable()`

Активирует суперэллипс.

```js
controller.enable();
```

#### `disable()`

Деактивирует суперэллипс, восстанавливая исходные стили элемента.

```js
controller.disable();
```

#### `isEnabled()`

Проверяет, активен ли эффект.

```js
if (controller.isEnabled()) {
  console.log('Активен');
}
```

#### `destroy()`

Полностью уничтожает контроллер и удаляет все связанные эффекты.

```js
controller.destroy();
```

#### `switchMode(modeName)`

Переключает режим работы.

| Параметр | Тип | Описание |
|----------|-----|----------|
| `modeName` | `string` | `'svg-layer'` или `'clip-path'` |

```js
controller.switchMode('clip-path');
```

---

### Настройки

#### `setCurveFactor(value)`

Устанавливает коэффициент кривизны углов.

| Параметр | Тип | Диапазон |
|----------|-----|----------|
| `value` | `number` | -2 … 2 |

```js
controller.setCurveFactor(0.8);
```

#### `setPrecision(value)`

Устанавливает точность округления координат пути.

| Параметр | Тип | Описание |
|----------|-----|----------|
| `value` | `number` | Количество знаков после запятой |

```js
controller.setPrecision(3);
```

#### `getPath()`

Возвращает текущий SVG-путь (строку с командами `d`).

```js
const path = controller.getPath();
console.log(path); // "M 0,50 C 10,50 ... Z"
```

---

### События

#### `on(event, callback)`

Подписывается на событие.

| Параметр | Тип | Описание |
|----------|-----|----------|
| `event` | `string` | `'update'`, `'activate'`, `'deactivate'`, `'error'` |
| `callback` | `Function` | Обработчик, получает объект события |

Объект события содержит:
- `type` – тип события
- `data` – дополнительные данные
- `timestamp` – время события (мс)
- `target` – целевой DOM-элемент

```js
controller.on('update', (e) => {
  console.log('Обновление:', e.type, e.data);
});

controller.on('activate', (e) => {
  console.log('Активирован режим:', e.data.mode);
});
```

#### `off(event, callback)`

Отписывается от события.

```js
const handler = (e) => console.log(e);
controller.on('update', handler);
// позже:
controller.off('update', handler);
```

---

## Вспомогательная функция `jsse_generateSuperellipsePath`

Генерирует SVG-путь суперэллипса без привязки к DOM.

### Синтаксис

```js
jsse_generateSuperellipsePath(width, height, radius, curveFactor, precision)
```

### Параметры

| Параметр | Тип | По умолчанию | Описание |
|----------|-----|--------------|----------|
| `width` | `number` | – | Ширина фигуры (px) |
| `height` | `number` | – | Высота фигуры (px) |
| `radius` | `number` | – | Радиус скругления (автоматически ограничивается) |
| `curveFactor` | `number` | – | Коэффициент кривизны (-2 … 2) |
| `precision` | `number` | `2` | Количество знаков после запятой |

### Возвращаемое значение

Строка с SVG-командами для атрибута `d` элемента `<path>`.

### Пример

```js
import { jsse_generateSuperellipsePath } from 'superellipse.js';

const pathData = jsse_generateSuperellipsePath(200, 150, 30, 1.2, 3);
document.querySelector('svg path').setAttribute('d', pathData);
```

---

## Константы

### `G` (Border Radius Factor)

Значение `(4/3)*(√2-1) ≈ 0.5522847498` – константа, при которой кривые Безье аппроксимируют четверть окружности.

Доступна через функцию `jsse_getBorderRadiusFactor()` (используется внутри библиотеки, но не экспортируется публично).

### Диапазон `curveFactor`

| Значение | Форма углов |
|----------|-------------|
| -2 | Вогнутые прямоугольные |
| -0.5523 | Вогнутые круглые |
| 0 | Прямой скос |
| 0.5523 | Выпуклые круглые |
| 1 | Классический суперэллипс |
| 2 | Выгнутые прямоугольные |

---

## Разделы

- [Введение](./index.md) – Основная информация
- [API Reference](./api.md) – все методы, классы и опции
- [Режимы работы](./modes.md) – `clip-path` vs `svg-layer`
- [Продвинутые возможности](./advanced.md) – hover-триггеры, события, отладка
- [Примеры использования](./examples.md) – готовые фрагменты кода
- [FAQ и ограничения](./faq.md) – известные проблемы и решения