/* Arte generado por código para Monocatron: fondos de cada mundo, bombas, Monocatrones,
   enemigos, cápsulas de poder e interfaz. Estilo de dibujo animado plano con contorno oscuro,
   a juego con las casillas de Kenney del juego original. */
const Arte = (() => {
    const BORDE = '#2b2235';

    function lienzo(w, h) {
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        return [c, c.getContext('2d')];
    }

    function registrar(escena, clave, canvas, fw, fh) {
        if (escena.textures.exists(clave)) escena.textures.remove(clave);
        const tex = escena.textures.addCanvas(clave, canvas);
        if (fw) {
            let i = 0;
            for (let y = 0; y + fh <= canvas.height; y += fh) for (let x = 0; x + fw <= canvas.width; x += fw) tex.add(i++, 0, x, y, fw, fh);
        }
        return tex;
    }

    function trazo(g, relleno, borde = BORDE, ancho = 3) {
        g.fillStyle = relleno; g.fill();
        if (borde) { g.lineJoin = 'round'; g.lineWidth = ancho; g.strokeStyle = borde; g.stroke(); }
    }

    function circulo(g, x, y, r, relleno, borde = BORDE, ancho = 3) {
        g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); trazo(g, relleno, borde, ancho);
    }

    function redondeado(g, x, y, w, h, r, relleno, borde = BORDE, ancho = 3) {
        g.beginPath(); g.roundRect(x, y, w, h, r); trazo(g, relleno, borde, ancho);
    }

    function degradado(g, x0, y0, x1, y1, paradas) {
        const gr = g.createLinearGradient(x0, y0, x1, y1);
        paradas.forEach(([p, c]) => gr.addColorStop(p, c));
        return gr;
    }

    function brilloSuave(g, x, y, r, color) {
        const gr = g.createRadialGradient(x, y, 0, x, y, r);
        gr.addColorStop(0, color); gr.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
    }

    /* ======================= Fondos ======================= */

    /** Cielo de cada mundo (degradado vertical a pantalla completa). */
    function cielos(escena) {
        const paletas = {
            cielo_dia: [[0, '#4aa8e8'], [0.6, '#8fd4f5'], [1, '#d9f3ff']],
            cielo_ocaso: [[0, '#4b2a6e'], [0.45, '#d9536a'], [0.75, '#ffa45c'], [1, '#ffd98a']],
            cielo_noche: [[0, '#0b0f26'], [0.6, '#1d2552'], [1, '#34407a']],
        };
        for (const [clave, paradas] of Object.entries(paletas)) {
            const [c, g] = lienzo(8, 630);
            g.fillStyle = degradado(g, 0, 0, 0, 630, paradas); g.fillRect(0, 0, 8, 630);
            registrar(escena, clave, c);
        }
    }

    /** Siluetas repetibles: colinas, mesas de cañón y montañas. */
    function siluetas(escena) {
        const capa = (clave, w, h, color, perfil) => {
            const [c, g] = lienzo(w, h);
            g.fillStyle = color;
            g.beginPath(); g.moveTo(0, h);
            for (let x = 0; x <= w; x += 4) g.lineTo(x, perfil(x, w, h));
            g.lineTo(w, h); g.closePath(); g.fill();
            registrar(escena, clave, c);
        };
        const ondas = (a, b, c) => (x, w, h) => h * a + Math.sin((x / w) * Math.PI * 2 * b) * h * c + Math.sin((x / w) * Math.PI * 2 * (b * 2 + 1)) * h * c * 0.4;
        capa('colinas_lejos', 1120, 260, '#ffffff', ondas(0.45, 2, 0.16));
        capa('colinas_cerca', 1120, 220, '#ffffff', ondas(0.4, 3, 0.14));
        // Mesas: mesetas con laderas rectas
        capa('mesas', 1120, 300, '#ffffff', (x) => {
            const tramos = [[0, 140, 120], [140, 330, 40], [330, 520, 150], [520, 760, 70], [760, 900, 170], [900, 1120, 60]];
            for (const [a, b, alto] of tramos) {
                if (x >= a && x < b) {
                    const borde = Math.min(x - a, b - x);
                    return borde < 22 ? alto + (22 - borde) * 4 : alto;
                }
            }
            return 120;
        });
        // Montañas de picos para la noche
        capa('montes', 1120, 280, '#ffffff', (x) => {
            const p = (x % 280) / 280;
            return 60 + Math.abs(p - 0.5) * 2 * 170 + Math.sin(x * 0.05) * 6;
        });
    }

    function nubes(escena) {
        const [c, g] = lienzo(220, 110);
        g.fillStyle = '#ffffff';
        for (const [x, y, r] of [[60, 70, 36], [100, 50, 44], [148, 64, 38], [178, 78, 26], [36, 84, 22], [120, 84, 34]]) {
            g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
        }
        g.fillRect(36, 78, 150, 28);
        registrar(escena, 'nube_fondo', c);
    }

    function astros(escena) {
        let [c, g] = lienzo(200, 200);
        brilloSuave(g, 100, 100, 100, 'rgba(255,240,170,0.6)');
        circulo(g, 100, 100, 42, '#fff3b0', null);
        registrar(escena, 'sol', c);
        [c, g] = lienzo(200, 200);
        brilloSuave(g, 100, 100, 100, 'rgba(190,210,255,0.45)');
        circulo(g, 100, 100, 38, '#eef2ff', null);
        g.fillStyle = 'rgba(160,170,210,0.5)';
        for (const [x, y, r] of [[88, 90, 8], [112, 112, 6], [104, 84, 4]]) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
        registrar(escena, 'luna', c);
        [c, g] = lienzo(640, 360);
        for (let i = 0; i < 160; i++) {
            const x = Math.random() * 640, y = Math.random() * 360, r = Math.random() < 0.1 ? 1.6 : 0.8;
            g.fillStyle = `rgba(255,255,255,${0.4 + Math.random() * 0.6})`; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
        }
        registrar(escena, 'cielo_estrellas', c);
    }

    /* ======================= Bomba ======================= */

    function bomba(escena) {
        const [c, g] = lienzo(96, 48);
        for (let f = 0; f < 2; f++) {
            const ox = f * 48;
            // Mecha
            g.strokeStyle = '#8a6a3a'; g.lineWidth = 3; g.lineCap = 'round';
            g.beginPath(); g.moveTo(ox + 30, 14); g.quadraticCurveTo(ox + 36, 6, ox + 40, 8); g.stroke();
            brilloSuave(g, ox + 40, 7, 8, f ? 'rgba(255,220,80,0.95)' : 'rgba(255,140,40,0.9)');
            g.fillStyle = '#ffffff'; g.beginPath(); g.arc(ox + 40, 7, f ? 2.5 : 1.8, 0, Math.PI * 2); g.fill();
            // Boca de la mecha
            redondeado(g, ox + 23, 10, 12, 8, 2, '#5a5f73', BORDE, 2.5);
            // Cuerpo
            g.beginPath(); g.arc(ox + 24, 29, 15, 0, Math.PI * 2);
            trazo(g, degradado(g, ox + 10, 14, ox + 38, 44, [[0, '#4a4f63'], [1, '#14151d']]));
            g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.ellipse(ox + 18, 23, 5, 3, -0.6, 0, Math.PI * 2); g.fill();
            // Ojos enfadados
            for (const s of [-1, 1]) {
                g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(ox + 24 + s * 6, 30, 3.6, 4.2, 0, 0, Math.PI * 2); g.fill();
                g.fillStyle = '#ff3b4f'; g.beginPath(); g.arc(ox + 24 + s * 6, 31, 2, 0, Math.PI * 2); g.fill();
                g.strokeStyle = '#ffffff'; g.lineWidth = 2; g.beginPath(); g.moveTo(ox + 24 + s * 10, 23); g.lineTo(ox + 24 + s * 2, 26); g.stroke();
            }
        }
        registrar(escena, 'bomba', c, 48, 48);
    }

    /* ======================= Monocatrón (bloque de metal con cara) ======================= */

    /** Dibuja un Monocatrón de lado `t`. estado: 0 normal, 1 furioso, 2 aturdido. */
    function dibujarMono(g, ox, oy, t, estado, pal) {
        const r = t * 0.14, b = Math.max(3, t * 0.045);
        // Cuerpo con biseles
        g.beginPath(); g.roundRect(ox + b, oy + b, t - b * 2, t - b * 2, r);
        trazo(g, degradado(g, ox, oy, ox + t, oy + t, [[0, pal.claro], [1, pal.oscuro]]), BORDE, b);
        g.beginPath(); g.roundRect(ox + t * 0.12, oy + t * 0.12, t * 0.76, t * 0.76, r * 0.6);
        trazo(g, pal.medio, 'rgba(0,0,0,0.25)', b * 0.6);
        // Remaches
        for (const [x, y] of [[0.13, 0.13], [0.87, 0.13], [0.13, 0.87], [0.87, 0.87]]) circulo(g, ox + t * x, oy + t * y, t * 0.045, pal.claro, BORDE, b * 0.5);
        // Pinchos arriba (solo en los grandes) para que se lea como peligroso
        const cx = ox + t / 2;
        // Cejas, ojos y boca
        const ojoY = oy + t * 0.42, sep = t * 0.17, ro = t * 0.09;
        for (const s of [-1, 1]) {
            const x = cx + s * sep;
            if (estado === 2) {
                g.strokeStyle = BORDE; g.lineWidth = b * 0.9; g.lineCap = 'round';
                g.beginPath(); g.moveTo(x - ro, ojoY - ro); g.lineTo(x + ro, ojoY + ro); g.moveTo(x + ro, ojoY - ro); g.lineTo(x - ro, ojoY + ro); g.stroke();
            } else {
                circulo(g, x, ojoY, ro, '#ffffff', BORDE, b * 0.6);
                circulo(g, x + s * -ro * 0.25, ojoY + ro * 0.15, ro * 0.48, estado === 1 ? '#ff2a3f' : '#2b2235', null);
                g.fillStyle = BORDE;
                g.beginPath(); g.moveTo(x - s * ro * 1.3, ojoY - ro * (estado === 1 ? 1.9 : 1.5)); g.lineTo(x + s * ro * 1.2, ojoY - ro * 0.95);
                g.lineTo(x + s * ro * 1.2, ojoY - ro * 1.45); g.lineTo(x - s * ro * 1.3, ojoY - ro * (estado === 1 ? 2.5 : 2.0)); g.closePath(); g.fill();
            }
        }
        // Boca con dientes
        const by = oy + t * 0.66, bw = t * 0.42, bh = t * 0.13;
        if (estado === 2) {
            g.strokeStyle = BORDE; g.lineWidth = b * 0.8;
            g.beginPath();
            for (let i = 0; i <= 6; i++) g.lineTo(cx - bw / 2 + (bw / 6) * i, by + (i % 2 ? -bh * 0.3 : bh * 0.3));
            g.stroke();
        } else {
            g.beginPath(); g.roundRect(cx - bw / 2, by - bh / 2, bw, bh, bh * 0.3); trazo(g, '#3a1020', BORDE, b * 0.6);
            g.fillStyle = '#ffffff';
            const n = 5;
            for (let i = 0; i < n; i++) {
                const x = cx - bw / 2 + (bw / n) * i + 1;
                g.beginPath(); g.moveTo(x, by - bh / 2 + 1); g.lineTo(x + bw / n - 2, by - bh / 2 + 1); g.lineTo(x + (bw / n) / 2, by + (estado === 1 ? bh * 0.15 : 0)); g.closePath(); g.fill();
            }
        }
        if (pal.marca) pal.marca(g, ox, oy, t, b);
    }

    const PALETAS = {
        acero: { claro: '#c7cedb', medio: '#9aa3b6', oscuro: '#5c6478' },
        arena: {
            claro: '#f2d29a', medio: '#d9a95f', oscuro: '#9a6a32',
            marca: (g, ox, oy, t, b) => { g.strokeStyle = 'rgba(120,70,20,0.45)'; g.lineWidth = b * 0.6; g.beginPath(); g.moveTo(ox + t * 0.2, oy + t * 0.25); g.lineTo(ox + t * 0.32, oy + t * 0.2); g.moveTo(ox + t * 0.7, oy + t * 0.8); g.lineTo(ox + t * 0.82, oy + t * 0.74); g.stroke(); },
        },
        tormenta: {
            claro: '#6b7bd0', medio: '#3e4a99', oscuro: '#1d2456',
            marca: (g, ox, oy, t, b) => {
                g.fillStyle = '#ffe14a'; g.strokeStyle = BORDE; g.lineWidth = b * 0.5;
                g.beginPath();
                // Rayo en la frente, entre las cejas y el borde
                [[0.55, 0.05], [0.45, 0.17], [0.51, 0.17], [0.44, 0.27], [0.58, 0.13], [0.52, 0.13]].forEach(([x, y], i) => (i ? g.lineTo(ox + t * x, oy + t * y) : g.moveTo(ox + t * x, oy + t * y)));
                g.closePath(); g.fill(); g.stroke();
            },
        },
    };

    function monocatrones(escena) {
        for (const [nombre, pal] of Object.entries(PALETAS)) {
            for (const [sufijo, t] of [['mini', 64], ['jefe', 160]]) {
                if (sufijo === 'mini' && nombre !== 'acero') continue;
                const pad = Math.round(t * 0.06);
                const [c, g] = lienzo((t + pad * 2) * 3, t + pad * 2);
                for (let e = 0; e < 3; e++) dibujarMono(g, e * (t + pad * 2) + pad, pad, t, e, pal);
                registrar(escena, `mono_${sufijo}${sufijo === 'jefe' ? '_' + nombre : ''}`, c, t + pad * 2, t + pad * 2);
            }
        }
    }

    /* ======================= Enemigos ======================= */

    function champi(escena) {
        const W = 48, H = 44;
        const [c, g] = lienzo(W * 3, H);
        for (let f = 0; f < 3; f++) {
            const ox = f * W;
            const aplastado = f === 2;
            const piesY = 40;
            // Pies
            if (!aplastado) for (const s of [-1, 1]) {
                const paso = f === 0 ? s * 3 : -s * 3;
                g.beginPath(); g.ellipse(ox + 24 + s * 9 + paso, piesY, 7, 4.5, 0, 0, Math.PI * 2); trazo(g, '#5a3a2a', BORDE, 2.5);
            }
            // Tallo con cara
            const ty = aplastado ? 32 : 22, th = aplastado ? 9 : 16;
            g.beginPath(); g.roundRect(ox + 13, ty, 22, th, 6); trazo(g, '#fff1d8', BORDE, 2.5);
            if (!aplastado) {
                for (const s of [-1, 1]) { g.fillStyle = BORDE; g.beginPath(); g.ellipse(ox + 24 + s * 5, ty + 7, 2, 3, 0, 0, Math.PI * 2); g.fill(); }
                g.strokeStyle = BORDE; g.lineWidth = 2; g.beginPath(); g.moveTo(ox + 20, ty + 4); g.lineTo(ox + 23, ty + 5); g.moveTo(ox + 28, ty + 4); g.lineTo(ox + 25, ty + 5); g.stroke();
            } else {
                g.strokeStyle = BORDE; g.lineWidth = 2;
                for (const s of [-1, 1]) { g.beginPath(); g.moveTo(ox + 24 + s * 7 - 2, ty + 2); g.lineTo(ox + 24 + s * 7 + 2, ty + 6); g.moveTo(ox + 24 + s * 7 + 2, ty + 2); g.lineTo(ox + 24 + s * 7 - 2, ty + 6); g.stroke(); }
            }
            // Sombrero
            const cy = aplastado ? 34 : 22, alto = aplastado ? 10 : 17;
            g.beginPath(); g.ellipse(ox + 24, cy, 21, alto, 0, Math.PI, 0); g.closePath();
            trazo(g, degradado(g, 0, cy - alto, 0, cy, [[0, '#ff6a5a'], [1, '#c8283a']]), BORDE, 2.5);
            g.fillStyle = '#ffffff';
            for (const [dx, dy, r] of [[-9, -0.55, 4], [6, -0.75, 5], [14, -0.3, 3], [-2, -0.25, 2.5]]) { g.beginPath(); g.arc(ox + 24 + dx, cy + dy * alto, r * (aplastado ? 0.7 : 1), 0, Math.PI * 2); g.fill(); }
        }
        registrar(escena, 'champi', c, W, H);
    }

    function pinchoso(escena) {
        const W = 54, H = 44;
        const [c, g] = lienzo(W * 2, H);
        for (let f = 0; f < 2; f++) {
            const ox = f * W;
            // Púas
            g.beginPath();
            for (let i = 0; i <= 10; i++) {
                const a = Math.PI + (i / 10) * Math.PI, r = i % 2 ? 26 : 16;
                g.lineTo(ox + 27 + Math.cos(a) * r, 32 + Math.sin(a) * r * 0.95);
            }
            g.closePath(); trazo(g, degradado(g, 0, 6, 0, 32, [[0, '#9b7bd9'], [1, '#5b3a99']]), BORDE, 2.5);
            // Cuerpo
            g.beginPath(); g.ellipse(ox + 27, 32, 17, 10, 0, 0, Math.PI * 2); trazo(g, '#e8c9a0', BORDE, 2.5);
            // Hocico y ojo
            circulo(g, ox + 12, 32, 3, BORDE, null);
            g.fillStyle = '#ffffff'; g.beginPath(); g.arc(ox + 20, 27, 3.5, 0, Math.PI * 2); g.fill();
            g.fillStyle = BORDE; g.beginPath(); g.arc(ox + 19, 27.5, 1.8, 0, Math.PI * 2); g.fill();
            // Patas
            for (const s of [-1, 1]) { g.beginPath(); g.ellipse(ox + 27 + s * 9 + (f ? -s * 3 : s * 2), 41, 5, 3, 0, 0, Math.PI * 2); trazo(g, '#5a3a2a', BORDE, 2); }
        }
        registrar(escena, 'pinchoso', c, W, H);
    }

    function nubeTormenta(escena) {
        const W = 120, H = 76;
        const [c, g] = lienzo(W * 2, H);
        for (let f = 0; f < 2; f++) {
            const ox = f * W;
            g.beginPath();
            for (const [x, y, r] of [[34, 40, 22], [58, 28, 26], [84, 38, 22], [100, 48, 14], [20, 50, 14]]) { g.moveTo(ox + x + r, y); g.arc(ox + x, y, r, 0, Math.PI * 2); }
            g.rect(ox + 20, 44, 82, 18);
            const col = f ? ['#6b6f9a', '#3a3d63'] : ['#8a8fb8', '#4c5080'];
            g.fillStyle = degradado(g, 0, 0, 0, H, [[0, col[0]], [1, col[1]]]); g.fill();
            g.lineWidth = 3; g.strokeStyle = BORDE; g.stroke();
            // Cara
            for (const s of [-1, 1]) {
                g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(ox + 60 + s * 12, 44, 4.5, 5, 0, 0, Math.PI * 2); g.fill();
                g.fillStyle = f ? '#ffe14a' : BORDE; g.beginPath(); g.arc(ox + 60 + s * 12, 45, 2.4, 0, Math.PI * 2); g.fill();
            }
            g.strokeStyle = BORDE; g.lineWidth = 2.5; g.beginPath(); g.arc(ox + 60, 56, 6, Math.PI * 1.15, Math.PI * 1.85); g.stroke();
            if (f) brilloSuave(g, ox + 60, 66, 18, 'rgba(255,230,90,0.6)');
        }
        registrar(escena, 'nube', c, W, H);
    }

    /* ======================= Poderes ======================= */

    const PODERES = {
        iman: '#ff5a6e', escudo: '#4fb4ff', reloj: '#7ff3ff', furia: '#ffd23f', botas: '#7dff8a', corazon: '#ff7aa8',
    };

    function poderes(escena) {
        for (const [tipo, color] of Object.entries(PODERES)) {
            const [c, g] = lienzo(52, 52);
            brilloSuave(g, 26, 26, 26, color + '88');
            circulo(g, 26, 26, 19, degradado(g, 0, 7, 0, 45, [[0, '#ffffff'], [0.3, color], [1, color]]), BORDE, 3);
            g.fillStyle = 'rgba(255,255,255,0.55)'; g.beginPath(); g.ellipse(20, 16, 8, 4, -0.5, 0, Math.PI * 2); g.fill();
            g.save(); g.translate(26, 27);
            g.lineJoin = 'round'; g.lineCap = 'round';
            if (tipo === 'iman') {
                g.lineWidth = 7; g.strokeStyle = BORDE; g.beginPath(); g.arc(0, -1, 8, Math.PI, 0); g.lineTo(8, 7); g.moveTo(-8, -1); g.lineTo(-8, 7); g.stroke();
                g.lineWidth = 4; g.strokeStyle = '#ffffff'; g.beginPath(); g.arc(0, -1, 8, Math.PI, 0); g.lineTo(8, 7); g.moveTo(-8, -1); g.lineTo(-8, 7); g.stroke();
            } else if (tipo === 'escudo') {
                g.beginPath(); g.moveTo(0, -11); g.lineTo(10, -6); g.lineTo(8, 5); g.lineTo(0, 11); g.lineTo(-8, 5); g.lineTo(-10, -6); g.closePath(); trazo(g, '#ffffff', BORDE, 2.5);
                g.fillStyle = color; g.fillRect(-2, -7, 4, 14); g.fillRect(-6, -2, 12, 4);
            } else if (tipo === 'reloj') {
                circulo(g, 0, 0, 11, '#ffffff', BORDE, 2.5);
                g.strokeStyle = BORDE; g.lineWidth = 2.5; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -7); g.moveTo(0, 0); g.lineTo(5, 3); g.stroke();
            } else if (tipo === 'furia') {
                g.beginPath();
                for (let i = 0; i < 10; i++) { const r = i % 2 ? 5 : 12, a = -Math.PI / 2 + i * Math.PI / 5; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
                g.closePath(); trazo(g, '#ffffff', BORDE, 2.5);
                g.fillStyle = '#ff5a6e'; g.beginPath(); g.arc(0, 1, 3, 0, Math.PI * 2); g.fill();
            } else if (tipo === 'botas') {
                g.beginPath(); g.moveTo(-6, -10); g.lineTo(2, -10); g.lineTo(2, 2); g.lineTo(10, 4); g.lineTo(10, 9); g.lineTo(-6, 9); g.closePath(); trazo(g, '#ffffff', BORDE, 2.5);
                g.fillStyle = color; g.fillRect(-5, 4, 14, 4);
                g.beginPath(); g.moveTo(-6, -6); g.quadraticCurveTo(-14, -12, -13, -2); g.quadraticCurveTo(-9, -4, -6, -2); g.closePath(); trazo(g, '#ffffff', BORDE, 2);
            } else {
                g.beginPath(); g.moveTo(0, 10); g.bezierCurveTo(-14, 0, -9, -12, 0, -5); g.bezierCurveTo(9, -12, 14, 0, 0, 10); trazo(g, '#ffffff', BORDE, 2.5);
            }
            g.restore();
            registrar(escena, 'poder_' + tipo, c);
        }
        // Burbuja del escudo alrededor del personaje
        const [c2, g2] = lienzo(110, 110);
        const gr = g2.createRadialGradient(55, 55, 22, 55, 55, 54);
        gr.addColorStop(0, 'rgba(120,200,255,0)'); gr.addColorStop(0.8, 'rgba(120,200,255,0.2)'); gr.addColorStop(1, 'rgba(200,235,255,0.8)');
        g2.fillStyle = gr; g2.beginPath(); g2.arc(55, 55, 54, 0, Math.PI * 2); g2.fill();
        g2.strokeStyle = 'rgba(255,255,255,0.85)'; g2.lineWidth = 3; g2.beginPath(); g2.arc(55, 55, 44, Math.PI * 1.1, Math.PI * 1.4); g2.stroke();
        registrar(escena, 'burbuja', c2);
    }

    /* ======================= Interfaz y efectos ======================= */

    function interfaz(escena) {
        // Corazones (lleno / vacío)
        let [c, g] = lienzo(80, 36);
        [['#ff4f6e', '#ffd0d8'], ['#4a3a55', '#6a5a75']].forEach(([cu, br], f) => {
            g.save(); g.translate(f * 40 + 20, 18);
            g.beginPath(); g.moveTo(0, 13); g.bezierCurveTo(-20, 0, -12, -17, 0, -7); g.bezierCurveTo(12, -17, 20, 0, 0, 13); trazo(g, cu, BORDE, 3);
            g.fillStyle = br; g.beginPath(); g.ellipse(-7, -5, 4, 2.5, -0.6, 0, Math.PI * 2); g.fill();
            g.restore();
        });
        registrar(escena, 'corazon', c, 40, 36);

        // Panel redondeado tipo caramelo (NineSlice, esquinas de 20 px)
        [c, g] = lienzo(80, 80);
        g.beginPath(); g.roundRect(2, 2, 76, 76, 18); trazo(g, '#fff7e6', BORDE, 4);
        g.beginPath(); g.roundRect(9, 9, 62, 62, 12); g.fillStyle = '#ffe9c2'; g.fill();
        registrar(escena, 'panel', c);

        // Iconos: pausa, sonido sí, sonido no, candado
        [c, g] = lienzo(160, 40);
        const icono = (i, fn) => { g.save(); g.translate(i * 40 + 20, 20); fn(); g.restore(); };
        const fondoIcono = () => circulo(g, 0, 0, 17, '#ffffff', BORDE, 3);
        icono(0, () => { fondoIcono(); g.fillStyle = BORDE; g.fillRect(-7, -8, 5, 16); g.fillRect(2, -8, 5, 16); });
        const altavoz = () => { g.fillStyle = BORDE; g.beginPath(); g.moveTo(-10, -4); g.lineTo(-5, -4); g.lineTo(1, -9); g.lineTo(1, 9); g.lineTo(-5, 4); g.lineTo(-10, 4); g.closePath(); g.fill(); };
        icono(1, () => { fondoIcono(); altavoz(); g.strokeStyle = BORDE; g.lineWidth = 2.5; g.beginPath(); g.arc(2, 0, 5, -0.9, 0.9); g.stroke(); g.beginPath(); g.arc(2, 0, 9, -0.9, 0.9); g.stroke(); });
        icono(2, () => { fondoIcono(); altavoz(); g.strokeStyle = '#ff4f6e'; g.lineWidth = 3; g.beginPath(); g.moveTo(4, -5); g.lineTo(11, 5); g.moveTo(11, -5); g.lineTo(4, 5); g.stroke(); });
        icono(3, () => { redondeado(g, -10, -3, 20, 15, 3, '#c9a24a', BORDE, 3); g.strokeStyle = BORDE; g.lineWidth = 3; g.beginPath(); g.arc(0, -3, 6, Math.PI, 0); g.stroke(); });
        registrar(escena, 'iconos', c, 40, 40);

        // Estrellas del resumen (llena / vacía)
        [c, g] = lienzo(96, 48);
        [['#ffd23f', '#fff3a6'], ['#4a3a55', '#6a5a75']].forEach(([cu, br], f) => {
            g.save(); g.translate(f * 48 + 24, 25);
            g.beginPath();
            for (let i = 0; i < 10; i++) { const r = i % 2 ? 9 : 21, a = -Math.PI / 2 + i * Math.PI / 5; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
            g.closePath(); trazo(g, cu, BORDE, 3);
            g.fillStyle = br; g.beginPath(); g.ellipse(-6, -6, 5, 3, -0.6, 0, Math.PI * 2); g.fill();
            g.restore();
        });
        registrar(escena, 'estrella_grande', c, 48, 48);
    }

    function efectos(escena) {
        const suave = (clave, tam, paradas) => {
            const [c, g] = lienzo(tam, tam);
            const gr = g.createRadialGradient(tam / 2, tam / 2, 0, tam / 2, tam / 2, tam / 2);
            paradas.forEach(([p, col]) => gr.addColorStop(p, col));
            g.fillStyle = gr; g.fillRect(0, 0, tam, tam);
            registrar(escena, clave, c);
        };
        suave('brillo', 64, [[0, 'rgba(255,255,255,1)'], [0.3, 'rgba(255,255,255,0.5)'], [1, 'rgba(255,255,255,0)']]);
        suave('humo', 24, [[0, 'rgba(255,255,255,0.9)'], [0.6, 'rgba(255,255,255,0.45)'], [1, 'rgba(255,255,255,0)']]);
        let [c, g] = lienzo(6, 6); g.fillStyle = '#fff'; g.beginPath(); g.arc(3, 3, 3, 0, Math.PI * 2); g.fill(); registrar(escena, 'px', c);
        [c, g] = lienzo(14, 14);
        g.fillStyle = '#fff'; g.beginPath();
        for (let i = 0; i < 8; i++) { const r = i % 2 ? 2 : 7, a = -Math.PI / 2 + i * Math.PI / 4; g.lineTo(7 + Math.cos(a) * r, 7 + Math.sin(a) * r); }
        g.closePath(); g.fill();
        registrar(escena, 'chispa', c);
        [c, g] = lienzo(80, 80);
        g.strokeStyle = '#ffffff'; g.lineWidth = 5; g.beginPath(); g.arc(40, 40, 36, 0, Math.PI * 2); g.stroke();
        registrar(escena, 'anillo', c);
        [c, g] = lienzo(3, 18);
        g.fillStyle = degradado(g, 0, 0, 0, 18, [[0, 'rgba(200,220,255,0)'], [1, 'rgba(200,220,255,0.8)']]); g.fillRect(0, 0, 3, 18);
        registrar(escena, 'gota', c);
        // Onda de choque del jefe
        [c, g] = lienzo(60, 34);
        g.beginPath(); g.moveTo(0, 34); g.quadraticCurveTo(30, -10, 60, 34); g.closePath();
        g.fillStyle = degradado(g, 0, 0, 0, 34, [[0, 'rgba(255,255,255,0.95)'], [1, 'rgba(255,255,255,0.2)']]); g.fill();
        registrar(escena, 'onda', c);
        // Segmento de rayo (se estira en vertical)
        [c, g] = lienzo(40, 64);
        brilloSuave(g, 20, 32, 20, 'rgba(255,240,140,0.6)');
        g.strokeStyle = '#fff8c8'; g.lineWidth = 6; g.lineJoin = 'miter';
        g.beginPath(); g.moveTo(22, 0); g.lineTo(14, 22); g.lineTo(26, 34); g.lineTo(16, 64); g.stroke();
        g.strokeStyle = '#ffffff'; g.lineWidth = 2.5; g.stroke();
        registrar(escena, 'rayo', c);
        // Pinchos de suelo (70 px, una casilla)
        [c, g] = lienzo(70, 26);
        for (let i = 0; i < 5; i++) {
            g.beginPath(); g.moveTo(i * 14, 26); g.lineTo(i * 14 + 7, 2); g.lineTo(i * 14 + 14, 26); g.closePath();
            trazo(g, degradado(g, 0, 2, 0, 26, [[0, '#ffffff'], [1, '#9aa3b8']]), BORDE, 2.5);
        }
        registrar(escena, 'pinchos', c);
    }

    /** Sombra en el suelo (dónde va a caer el jefe) y flecha que señala su cabeza. */
    function senales(escena) {
        let [c, g] = lienzo(200, 40);
        const gr = g.createRadialGradient(100, 20, 4, 100, 20, 100);
        gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
        g.save(); g.scale(1, 0.2); g.fillStyle = gr; g.beginPath(); g.arc(100, 100, 100, 0, Math.PI * 2); g.fill(); g.restore();
        registrar(escena, 'sombra', c);
        [c, g] = lienzo(60, 64);
        g.beginPath(); g.moveTo(18, 4); g.lineTo(42, 4); g.lineTo(42, 32); g.lineTo(56, 32); g.lineTo(30, 60); g.lineTo(4, 32); g.lineTo(18, 32); g.closePath();
        trazo(g, degradado(g, 0, 4, 0, 60, [[0, '#fff3a0'], [1, '#ffd23f']]), BORDE, 4);
        registrar(escena, 'flecha', c);
    }

    return {
        PODERES,
        generar(escena) {
            cielos(escena); siluetas(escena); nubes(escena); astros(escena);
            bomba(escena); monocatrones(escena); champi(escena); pinchoso(escena); nubeTormenta(escena);
            poderes(escena); interfaz(escena); efectos(escena); senales(escena);
        },
    };
})();
