/**
 * Генерация пути для суперэллипса (v4)
 */

/**
 * Округление числа с заданной точностью
 */
export function round(value, precision = 2) {
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
export function generateSuperellipsePath(width, height, radius, curveFactor, precision = 2) {
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
        let Dk1x = getD2FromL1D1L2(R, G, Lk1x);
        Dk1x = Math.min(Dk1x, 1);
        let Dk1y = getD2FromL1D1L2(R, G, Lk1y);
        Dk1y = Math.min(Dk1y, 1);
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