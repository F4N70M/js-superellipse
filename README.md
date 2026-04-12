# Superellipse Shape Engine

[![Лицензия: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
![Версия](https://img.shields.io/badge/version-1.0.0-blue)

**Суперэллипс для любых DOM-элементов** – плавное изменение формы углов от вогнутых прямоугольных до выгнутых прямоугольных, включая скос, круглые углы и классический суперэллипс.

## Возможности

- Два режима работы:
  - `clip-path` – лёгкий, только CSS
  - `svg-layer` – полнофункциональный с поддержкой `background`, `border`, `box-shadow`
- Автоматическое отслеживание изменений размеров, стилей, видимости и атрибутов (`ResizeObserver`, `MutationObserver`, `IntersectionObserver`)
- Умное кэширование вычисленных стилей для минимизации перерисовок
- Несколько способов инициализации: селектор, элемент, коллекция, глобальная функция
- Поддержка `:hover`-триггеров (включая соседние комбинаторы `+` и `~`)
- Fallback для браузеров без поддержки `:has()`

## Установка

### Прямая загрузка
Скачайте [последний релиз](https://github.com/f4n70m/js-superellipse/releases) и подключите скрипт:

```html
<script src="dist/superellipse.min.js"></script>
```

### Через npm (из GitHub)
```bash
npm install git+https://github.com/f4n70m/js-superellipse.git
```

### Как ES-модуль
```js
import { superellipseInit, SuperellipseController, jsse_generateSuperellipsePath } from 'js-superellipse';
```

## Быстрый старт

```js
// Инициализация элемента
const element = document.querySelector('.my-element');
const controller = element.superellipseInit({
  mode: 'svg-layer',
  curveFactor: 1.2,
  precision: 3
});

// Изменение коэффициента кривизны
controller.setCurveFactor(0.8);

// Переключение режима
controller.switchMode('clip-path');

// Инициализация всех элементов с классом
superellipseInit('.rounded', { mode: 'clip-path' });
```

## API

| Метод | Описание |
|-------|----------|
| `superellipseInit(target, options)` | Инициализирует один или несколько элементов |
| `element.superellipseInit(options)` | Инициализирует один элемент |
| `element.superellipse` | Геттер контроллера |
| `controller.enable()` / `.disable()` | Активация / деактивация |
| `controller.setCurveFactor(value)` | Установить коэффициент кривизны (-2 … 2) |
| `controller.setPrecision(value)` | Установить точность пути |
| `controller.switchMode(mode)` | Переключить режим (`'svg-layer'` / `'clip-path'`) |
| `controller.on(event, callback)` | Подписка на события `update`, `activate`, `deactivate`, `error` |

Полная документация по API находится в папке [`docs/`](./docs/).

## Режимы работы

| Режим | Производительность | `background` / `border` / `box-shadow` | Лишние DOM-узлы |
|-------|-------------------|----------------------------------------|-----------------|
| `clip-path` | Высокая | ❌ | Нет |
| `svg-layer` | Средняя | ✅ | Да (SVG + div) |

В большинстве случаев рекомендуется `svg-layer`, так как он сохраняет все визуальные стили. Используйте `clip-path` для изображений или когда важна производительность.

## Примеры

Живые демо находятся в папке [`examples/`](./examples/).  
Чтобы запустить их локально, запустите статический сервер (например, `npx http-server`) и откройте `examples/index.html`.

## Документация

Полная документация находится в папке [`docs/`](./docs/):

- [Введение](./docs/00-index.md) – Основная информация
- [API Reference](./docs/01-api.md) – все методы, классы и опции
- [Режимы работы](./docs/02-modes.md) – `clip-path` vs `svg-layer`
- [Продвинутые возможности](./docs/03-advanced.md) – hover-триггеры, события, отладка
- [Примеры использования](./docs/04-examples.md) – готовые фрагменты кода
- [FAQ и ограничения](./docs/05-faq.md) – известные проблемы и решения

## Поддержка браузеров

Современные браузеры с поддержкой:
- `ResizeObserver`, `MutationObserver`, `IntersectionObserver`
- `CSS.supports()`
- ES6+

Работает в Chrome 64+, Firefox 69+, Safari 12.1+, Edge 79+.

## Лицензия

MIT © [f4n70m](https://github.com/f4n70m)