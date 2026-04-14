# Superellipse Shape Engine

**Библиотека для применения суперэллипсов к произвольным DOM-элементам.**

Позволяет плавно изменять форму углов от вогнутых прямоугольных (-2) до выгнутых прямоугольных (2), проходя через скос (0), круглые углы (±G) и классический суперэллипс (1).

![Пример формы углов при разных curveFactor](https://via.placeholder.com/800x200?text=superellipse+demo)

## Особенности

- Два режима работы:
  - `clip-path` – лёгкий, использует CSS `clip-path`
  - `svg-layer` – полнофункциональный с поддержкой границ, теней и фонов
- Автоматическое отслеживание изменений размеров, стилей, видимости и атрибутов элемента
- Поддержка `border-radius`, `border`, `box-shadow`, `background` в режиме `svg-layer`
- Несколько способов инициализации: через селектор, элемент, коллекцию или глобальную функцию
- Умное кэширование стилей для минимизации перерисовок
- Поддержка hover-триггеров (включая соседние селекторы `+` и `~`)

## Установка

```html
<script src="path/to/superellipse.js"></script>
```

### Через npm (рекомендуется):
```bash
npm install js-superellipse
```

### Через npm (из GitHub)
```bash
npm install git+https://github.com/f4n70m/js-superellipse.git
```

### Скачать файл

Скачайте `superellipse.js` и подключите через тег `<script>`:

### Как ES-модуль

```js
import { superellipseInit, SuperellipseController, jsse_generateSuperellipsePath } from 'superellipse.js';
```

## Быстрый старт

### 1. Инициализация элемента

```js
const element = document.querySelector('.my-element');
const controller = element.superellipseInit({
  mode: 'svg-layer',
  curveFactor: 0.75,
  precision: 3
});
```

### 2. Изменение коэффициента кривизны

```js
controller.setCurveFactor(0.75);
```

### 3. Переключение режима

```js
controller.switchMode('clip-path');
```

### 4. Инициализация всех элементов с классом

```js
superellipseInit('.rounded', { mode: 'clip-path' });
```

### 5. Генерация только SVG-пути (без привязки к DOM)

```js
import { jsse_generateSuperellipsePath } from 'superellipse.js';
const path = jsse_generateSuperellipsePath(200, 150, 20, 1.5);
document.querySelector('path').setAttribute('d', path);
```

## Требования

- Современные браузеры с поддержкой:
  - `ResizeObserver`, `MutationObserver`, `IntersectionObserver`
  - `CSS.supports` (для проверки селекторов)
  - (опционально) `:has()` для оптимальной работы hover-триггеров
- ES6+ (классы, модули, стрелочные функции)

## Лицензия

MIT License © f4n70m

---

## Разделы

- [Введение](./00-index.md) – Основная информация
- [API Reference](./01-api.md) – все методы, классы и опции
- [Режимы работы](./02-modes.md) – `clip-path` vs `svg-layer`
- [Продвинутые возможности](./03-advanced.md) – hover-триггеры, события, отладка
- [Примеры использования](./04-examples.md) – готовые фрагменты кода
- [FAQ и ограничения](./05-faq.md) – известные проблемы и решения