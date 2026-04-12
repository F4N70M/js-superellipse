# Примеры использования

## 1. Базовый пример – карточка с суперэллипсом

```html
<div class="card">
  <img src="avatar.jpg" alt="Avatar">
  <h3>Иван Иванов</h3>
  <p>Разработчик</p>
</div>

<script>
  const card = document.querySelector('.card');
  const controller = card.superellipseInit({
    mode: 'svg-layer',
    curveFactor: 1.2,
    precision: 3
  });
</script>
```

```css
.card {
  width: 300px;
  background: white;
  border-radius: 20px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  overflow: hidden;
}
```

---

## 2. Анимация коэффициента кривизны (цикл от -2 до 2)

```js
const box = document.querySelector('.animated-box');
const controller = box.superellipseInit({ mode: 'clip-path' });

let factor = -2;
let direction = 0.02;

function animate() {
  factor += direction;
  if (factor >= 2) {
    factor = 2;
    direction = -0.02;
  } else if (factor <= -2) {
    factor = -2;
    direction = 0.02;
  }
  controller.setCurveFactor(factor);
  requestAnimationFrame(animate);
}

animate();
```

---

## 3. Реагирование на hover соседнего элемента

```css
/* CSS */
.button {
  padding: 10px 20px;
  background: #3498db;
  color: white;
  border: none;
  cursor: pointer;
}

.button:hover + .superellipse-target {
  border-radius: 40px; /* изменится форма суперэллипса */
}

.superellipse-target {
  width: 200px;
  height: 200px;
  background: #e74c3c;
  border-radius: 10px;
  margin-top: 20px;
}
```

```js
// Инициализация целевого элемента
const target = document.querySelector('.superellipse-target');
const controller = target.superellipseInit({ mode: 'svg-layer' });
```

При наведении на кнопку форма красного блока плавно изменится.

---

## 4. Переключение режимов по клику

```js
const element = document.querySelector('.mode-switch-demo');
const controller = element.superellipseInit({ mode: 'svg-layer' });

let currentMode = 'svg-layer';
document.getElementById('toggle-mode').addEventListener('click', () => {
  currentMode = currentMode === 'svg-layer' ? 'clip-path' : 'svg-layer';
  controller.switchMode(currentMode);
  console.log(`Режим переключён на ${currentMode}`);
});
```

---

## 5. Генерация только SVG-пути (без DOM-элемента)

```js
import { jsse_generateSuperellipsePath } from 'superellipse.js';

const svg = document.querySelector('svg');
const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');

function updatePath() {
  const width = 400;
  const height = 300;
  const radius = 50;
  const curve = parseFloat(document.getElementById('curve-slider').value);
  const d = jsse_generateSuperellipsePath(width, height, radius, curve, 2);
  path.setAttribute('d', d);
}

svg.appendChild(path);
updatePath();

document.getElementById('curve-slider').addEventListener('input', updatePath);
```

---

## 6. Использование событий контроллера

```js
const controller = element.superellipseInit({ curveFactor: 0.8 });

controller.on('activate', (e) => {
  console.log(`Активирован режим: ${e.data.mode}`);
});

controller.on('update', (e) => {
  if (e.data.type === 'curveFactor') {
    console.log(`Коэффициент изменён на ${controller.getCurveFactor()}`);
  } else if (e.data.type === 'size') {
    console.log('Размер элемента изменился');
  }
});

controller.on('deactivate', () => {
  console.log('Суперэллипс выключен');
});

// Через некоторое время
setTimeout(() => controller.disable(), 5000);
```

---

## 7. Адаптация под размер окна (ресайз)

Библиотека автоматически отслеживает изменения размера элемента через `ResizeObserver`, поэтому отдельно обрабатывать `window.resize` не нужно. Но если элемент зависит от размеров окна (например, `width: 100vw`), достаточно инициализировать контроллер один раз:

```js
const hero = document.querySelector('.hero');
hero.superellipseInit({ mode: 'svg-layer', curveFactor: 1.5 });
// при любом ресайзе форма пересчитается автоматически
```

---

## 8. Массовая инициализация с разными настройками

```js
// Все элементы с классом .rounded
const roundedElements = document.querySelectorAll('.rounded');
roundedElements.forEach(el => {
  el.superellipseInit({
    mode: 'clip-path',
    curveFactor: 0.7,
    precision: 2
  });
});

// Элементы с классом .super-ellipse – более детальная форма
const superElements = document.querySelectorAll('.super-ellipse');
superElements.forEach(el => {
  el.superellipseInit({
    mode: 'svg-layer',
    curveFactor: 1.3,
    precision: 4
  });
});
```

---

## 9. Интеграция с библиотекой анимации (GSAP)

```js
import gsap from 'gsap';

const box = document.querySelector('.gsap-box');
const controller = box.superellipseInit({ curveFactor: -1 });

gsap.to(controller, {
  duration: 3,
  curveFactor: 2,
  repeat: -1,
  yoyo: true,
  ease: 'power1.inOut',
  onUpdate: function() {
    // setCurveFactor вызывается автоматически благодаря gsap.to
    // но нужно передать значение
    controller.setCurveFactor(this.targets()[0].curveFactor);
  }
});
```

> **Примечание:** `curveFactor` – не обычное свойство, поэтому в `gsap.to` нужно передавать объект-обёртку или использовать `onUpdate`.

---

## 10. Создание собственного режима (расширение)

```js
import { SuperellipseMode } from 'superellipse.js';

class MyCustomMode extends SuperellipseMode {
  _getModeName() {
    return 'my-mode';
  }

  _getActivatedStyles() {
    return {
      ...super._getActivatedStyles(),
      'filter': 'drop-shadow(0 0 5px red)'
    };
  }

  _appendVirtualElements() {
    // Создать свои виртуальные элементы
    console.log('Добавляю свой слой');
  }

  _removeVirtualElements() {
    // Удалить
    console.log('Удаляю свой слой');
  }

  _applyCurve() {
    // Переопределить применение кривой
    console.log('Применяю кривую по-своему');
  }
}

// Использование (требует модификации контроллера, не поддерживается из коробки)
```

---

## 11. Пример с динамическим добавлением элементов

```js
function addNewCard() {
  const container = document.querySelector('.cards-container');
  const newCard = document.createElement('div');
  newCard.className = 'card';
  newCard.textContent = 'Новая карточка';
  container.appendChild(newCard);
  
  // Инициализируем суперэллипс для нового элемента
  newCard.superellipseInit({ mode: 'clip-path', curveFactor: 0.9 });
}

document.getElementById('add-card').addEventListener('click', addNewCard);
```

---

## 12. Отключение/включение эффекта по условию

```js
const controller = element.superellipseInit({ curveFactor: 1 });

// При фокусе на поле ввода – отключаем суперэллипс (мешает чтению)
input.addEventListener('focus', () => controller.disable());
input.addEventListener('blur', () => controller.enable());
```

---

## 13. Комбинирование с CSS-переходами

```css
.superellipse-element {
  transition: border-radius 0.2s ease;
}
```

```js
const el = document.querySelector('.superellipse-element');
const controller = el.superellipseInit({ mode: 'clip-path' });

// При изменении border-radius через класс
el.classList.add('large-radius');
```

```css
.superellipse-element.large-radius {
  border-radius: 60px;
}
```

Библиотека пересчитает суперэллипс при изменении класса.

---

## 14. Получение текущего пути для кастомной отрисовки

```js
const controller = element.superellipseInit();
const pathData = controller.getPath();
console.log(pathData); // "M 0,50 C 10,50 ... Z"

// Использовать в другом SVG
document.querySelector('#another-svg path').setAttribute('d', pathData);
```

---

## 15. Пример с адаптивным радиусом

```js
function updateRadius() {
  const width = element.clientWidth;
  const radius = Math.min(width * 0.1, 40);
  element.style.borderRadius = `${radius}px`;
}

window.addEventListener('resize', updateRadius);
updateRadius();

const controller = element.superellipseInit({ curveFactor: 1.2 });
// При каждом ресайзе будет меняться border-radius, суперэллипс обновится автоматически
```

---

## Разделы

- [Введение](./00-index.md) – Основная информация
- [API Reference](./01-api.md) – все методы, классы и опции
- [Режимы работы](./02-modes.md) – `clip-path` vs `svg-layer`
- [Продвинутые возможности](./03-advanced.md) – hover-триггеры, события, отладка
- [Примеры использования](./04-examples.md) – готовые фрагменты кода
- [FAQ и ограничения](./05-faq.md) – известные проблемы и решения