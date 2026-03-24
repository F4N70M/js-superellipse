# Superellipse

Придаёт DOM-элементам форму суперэллипса с регулируемой кривизной.

## Установка

```bash
npm install superellipse
```

---

## Полная инструкция по созданию и запуску библиотеки superellipse

### 1. Подготовка окружения

Убедитесь, что у вас установлены [Node.js](https://nodejs.org/) (версия 12 или выше) и npm (поставляется с Node.js).

### 2. Создание папки проекта и инициализация npm

Откройте терминал (командную строку) и выполните:

```bash
mkdir superellipse
cd superellipse
npm init -y
```

### 3. Установка зависимостей для сборки

Установим rollup и необходимые плагины как dev-зависимости:

```bash
npm install --save-dev rollup @rollup/plugin-node-resolve @rollup/plugin-commonjs rollup-plugin-terser
```

### 4. Создание структуры папок

```bash
mkdir src dist examples
```

### 5. Создание файлов исходного кода

В папке `src` создайте следующие файлы (скопируйте содержимое из соответствующих блоков ниже).

#### `src/core.js` – генерация path
Создайте файл и вставьте код из предыдущего сообщения (раздел "Файлы исходного кода" -> `src/core.js`).

#### `src/controller.js` – класс контроллера
Вставьте код из раздела `src/controller.js`.

#### `src/api.js` – API (глобальная функция и метод на Element.prototype)
Вставьте код из раздела `src/api.js`.

#### `src/index.js` – точка входа
Вставьте код:

```javascript
export { superellipseInit } from './api.js';
export { SuperellipseController } from './controller.js';
export { generateSuperellipsePath } from './core.js';
```

### 6. Создание конфигурации rollup

В корневой папке (`superellipse`) создайте файл `rollup.config.js`:

```javascript
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { terser } from 'rollup-plugin-terser';

export default {
    input: 'src/index.js',
    output: [
        {
            file: 'dist/superellipse.js',
            format: 'umd',
            name: 'Superellipse',
            sourcemap: true
        },
        {
            file: 'dist/superellipse.min.js',
            format: 'umd',
            name: 'Superellipse',
            plugins: [terser()],
            sourcemap: true
        }
    ],
    plugins: [resolve(), commonjs()]
};
```

### 7. Настройка скриптов в `package.json`

Откройте `package.json` и добавьте в секцию `"scripts"`:

```json
"scripts": {
  "build": "rollup -c",
  "dev": "rollup -c -w"
}
```

### 8. Создание демо-примера

#### `examples/index.html`
Создайте файл и вставьте HTML-код из предыдущего ответа (раздел "Демо-пример" -> `examples/index.html`).

#### `examples/demo.js`
Создайте файл и вставьте JavaScript-код из предыдущего ответа (раздел "Демо-пример" -> `examples/demo.js`).

### 9. Сборка библиотеки

В терминале выполните:

```bash
npm run build
```

После успешной сборки в папке `dist` появятся файлы `superellipse.js` и `superellipse.min.js`.

### 10. Запуск демо-примера

Существует несколько способов открыть `examples/index.html`:

- **Простой способ**: дважды кликните по файлу `examples/index.html` в файловом менеджере – он откроется в браузере. Но некоторые браузеры могут блокировать доступ к локальным файлам (CORS), хотя в данном случае всё должно работать, так как мы используем UMD-сборку и не делаем запросов.

- **С помощью live-server** (рекомендуется для более реалистичного окружения):
  Установите live-server глобально или как dev-зависимость:
  ```bash
  npm install --save-dev live-server
  ```
  Затем в корне проекта выполните:
  ```bash
  npx live-server examples
  ```
  Откроется браузер с адресом `http://127.0.0.1:8080`, где вы увидите демо.

### 11. Проверка работы

На открывшейся странице вы увидите кнопку, ползунки для радиуса и коэффициента кривизны, переключатель режимов. Изменяйте параметры – форма кнопки должна меняться. В нижней части отображается текущий path.

### 12. Дополнительные команды

- **Запуск сборки в режиме наблюдения** (автоматическая пересборка при изменении исходников):
  ```bash
  npm run dev
  ```

- **Очистка** (можно добавить скрипт для удаления `dist`):
  ```json
  "clean": "rm -rf dist"
  ```

### Примечания

- Если вы используете Windows, команды `mkdir`, `rm` могут отличаться. Вместо `rm -rf dist` используйте `rd /s /q dist`.
- Для работы `ResizeObserver` требуется браузер с поддержкой (все современные браузеры его поддерживают). В старых браузерах можно добавить полифилл, но это выходит за рамки инструкции.
- Для корректной работы `clip-path` с `path()` также нужен современный браузер (Chrome 64+, Firefox 61+, Edge 79+).

Теперь вы можете загрузить всю папку на GitHub и использовать библиотеку в своих проектах.