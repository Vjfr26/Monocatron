/* Interfaz de Monocatron: menú, selección de mundo, marcador, pausa, resumen del mundo,
   fin de partida y pantalla final. */

const ORO = '#ffd23f', CREMA = '#fff7e6', TINTA = '#2b2235';

/** Lista de opciones navegable con teclado (↑ ↓ ← → ENTER) y con ratón o dedo. */
function crearMenu(escena, x, y, opciones, opts = {}) {
    const sep = opts.separacion ?? 54;
    const tam = opts.tam || 28;
    let sel = 0;
    const items = opciones.map((op, i) => {
        const t = escena.add.text(x, y + i * sep, op.texto, estiloTexto(tam, CREMA)).setOrigin(0.5).setDepth(60)
            .setInteractive({ useHandCursor: true });
        t.on('pointerover', () => { if (sel !== i) { sel = i; pintar(); Sonido.sfx('menu'); } });
        t.on('pointerdown', () => { Sonido.iniciar(); elegir(i); });
        return t;
    });
    const marca = escena.add.image(0, 0, 'star').setScale(1.3).setDepth(60);
    escena.tweens.add({ targets: marca, angle: 360, duration: 2400, repeat: -1 });
    function pintar() {
        items.forEach((t, i) => t.setColor(i === sel ? ORO : CREMA).setScale(i === sel ? 1.1 : 1));
        const t = items[sel];
        marca.setPosition(t.x - t.displayWidth / 2 - 26, t.y);
    }
    function elegir(i) { sel = i; pintar(); Sonido.sfx('elegir'); opciones[i].accion(items[i]); }
    const teclado = escena.input.keyboard;
    const antes = () => { sel = (sel + items.length - 1) % items.length; pintar(); Sonido.sfx('menu'); };
    const despues = () => { sel = (sel + 1) % items.length; pintar(); Sonido.sfx('menu'); };
    const ok = () => { Sonido.iniciar(); elegir(sel); };
    const teclas = { UP: antes, W: antes, LEFT: antes, A: antes, DOWN: despues, S: despues, RIGHT: despues, D: despues, ENTER: ok, SPACE: ok };
    for (const [k, f] of Object.entries(teclas)) teclado.on('keydown-' + k, f);
    pintar();
    return {
        items,
        destruir() { for (const [k, f] of Object.entries(teclas)) teclado.off('keydown-' + k, f); items.forEach((t) => t.destroy()); marca.destroy(); },
        setTexto(i, texto) { items[i].setText(texto); pintar(); },
        recolocar() { pintar(); },
    };
}

function panel(escena, x, y, w, h) {
    return escena.add.nineslice(x, y, 'panel', 0, w, h, 22, 22, 22, 22).setDepth(55);
}

function formatoTiempo(seg) {
    const m = Math.floor(seg / 60), s = Math.floor(seg % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
}

function formatoPuntos(n) { return String(Math.floor(n)).padStart(6, '0'); }

/** Escenario de fondo del menú: pradera con colinas, nubes, el héroe y bombas rebotando. */
function fondoPradera(escena) {
    escena.add.image(0, 0, 'cielo_dia').setOrigin(0).setDisplaySize(ANCHO, ALTO);
    escena.add.image(900, 110, 'sol');
    escena.add.image(0, ALTO - 300, 'colinas_lejos').setOrigin(0).setTint(0x8fd18a);
    escena.add.image(0, ALTO - 220, 'colinas_cerca').setOrigin(0).setTint(0x5cae5a);
    const nubes = [];
    for (let i = 0; i < 3; i++) nubes.push(escena.add.image(i * 400 + 100, 80 + i * 50, 'nube_fondo').setScale(0.8 + i * 0.15).setAlpha(0.9));
    for (let c = 0; c < 16; c++) {
        escena.add.image(c * CASILLA, 8 * CASILLA, c === 0 ? 'slice02_02' : c === 15 ? 'slice04_04' : 'slice03_03').setOrigin(0);
    }
    return (dt) => nubes.forEach((n, i) => { n.x += (8 + i * 4) * dt; if (n.x > ANCHO + 130) n.x = -130; });
}

/* ===================================================================== */
class Menu extends Phaser.Scene {
    constructor() { super('Menu'); }

    create() {
        this.scene.stop('HUD');
        this.cameras.main.fadeIn(600, 0, 0, 0);
        this.moverFondo = fondoPradera(this);
        // El héroe y unas bombas rebotando de adorno
        const heroe = this.add.sprite(170, 560, 'dude', 4).setOrigin(0.5, 1).setScale(1.6);
        this.tweens.add({ targets: heroe, y: 470, duration: 420, yoyo: true, repeat: -1, repeatDelay: 900, ease: 'Quad.easeOut' });
        for (const [x, d] of [[880, 0], [1000, 600]]) {
            const b = this.add.sprite(x, 520, 'bomba').play('bomba_mecha').setScale(1.2);
            this.tweens.add({ targets: b, y: 360, duration: 520, yoyo: true, repeat: -1, delay: d, ease: 'Quad.easeOut' });
        }
        this.add.image(960, 380, 'mono_jefe_acero', 0).setScale(0.75).setAngle(-6);
        for (let i = 0; i < 10; i++) {
            const s = this.add.image(Phaser.Math.Between(60, ANCHO - 60), Phaser.Math.Between(170, 440), 'star').setScale(1.3).setAlpha(0.9);
            this.tweens.add({ targets: s, y: s.y - 12, angle: 20, duration: Phaser.Math.Between(900, 1500), yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        }

        // Título con letras que botan
        const letras = 'MONOCATRON'.split('');
        letras.forEach((l, i) => {
            const colores = ['#ff5a6e', '#ffd23f', '#7dff8a', '#4fb4ff', '#c08cff'];
            const t = this.add.text(ANCHO / 2 + (i - (letras.length - 1) / 2) * 62, 96, l, estiloTexto(86, colores[i % colores.length], { fontStyle: '700', strokeThickness: 14 })).setOrigin(0.5);
            this.tweens.add({ targets: t, y: 84, duration: 520, yoyo: true, repeat: -1, delay: i * 70, ease: 'Sine.easeInOut' });
        });
        this.add.text(ANCHO / 2, 166, TXT.lema, estiloTexto(20, '#ffffff')).setOrigin(0.5);
        if (Progreso.datos.record) this.add.text(ANCHO / 2, 196, `${TXT.hud.record}  ${formatoPuntos(Progreso.datos.record)}`, estiloTexto(16, ORO)).setOrigin(0.5);

        this.mostrarPrincipal();
        Sonido.musica('menu');
        this.input.keyboard.on('keydown', () => Sonido.iniciar());
        this.input.on('pointerdown', () => Sonido.iniciar());
    }

    update(t, dt) { this.moverFondo(dt / 1000); }

    limpiarSub() {
        if (this.menu) this.menu.destruir();
        this.menu = null;
        (this.sub || []).forEach((o) => o.destroy());
        this.sub = [];
    }

    mostrarPrincipal() {
        this.limpiarSub();
        const d = Progreso.datos;
        const hayProgreso = d.desbloqueado > 1 || d.estrellas.some((e) => e > 0);
        this.sub = [panel(this, ANCHO / 2, 360, 380, 270).setTint(0xffffff)];
        this.menu = crearMenu(this, ANCHO / 2, 276, [
            { texto: hayProgreso ? TXT.continuar : TXT.jugar, accion: () => this.empezar(hayProgreso ? d.desbloqueado - 1 : 0) },
            { texto: TXT.mundos, accion: () => this.mostrarMundos() },
            { texto: TXT.controles, accion: () => this.mostrarControles() },
            { texto: Sonido.activo ? TXT.sonidoSi : TXT.sonidoNo, accion: () => this.menu.setTexto(3, Sonido.alternar() ? TXT.sonidoSi : TXT.sonidoNo) },
        ], { separacion: 56 });
        this.menu.items.forEach((t) => t.setColor(TINTA).setStroke('#ffffff', 0));
        this.recolorear();
        this.sub.push(this.add.text(ANCHO / 2, 518, TouchControls.enabled ? TXT.toca : TXT.pulsa, estiloTexto(16, '#ffffff')).setOrigin(0.5).setDepth(60));
    }

    /** Sobre el panel claro, el texto va en tinta y la opción elegida en rosa. */
    recolorear() {
        const m = this.menu;
        const pintarOriginal = m.recolocar;
        const aplicar = () => m.items.forEach((t) => { const sel = t.scale > 1.05; t.setColor(sel ? '#ff4f6e' : TINTA).setStroke('#ffffff', 0); });
        aplicar();
        for (const t of m.items) { t.on('pointerover', aplicar); t.on('pointerdown', aplicar); }
        this.input.keyboard.on('keydown', () => this.menu === m && aplicar());
        m.recolocar = () => { pintarOriginal(); aplicar(); };
    }

    mostrarMundos() {
        this.limpiarSub();
        const d = Progreso.datos;
        MUNDOS.forEach((m, i) => {
            const x = ANCHO / 2 + (i - 1) * 300, y = 380;
            const abierto = i < d.desbloqueado;
            const tarjeta = panel(this, x, y, 270, 250).setAlpha(abierto ? 1 : 0.6);
            const ventana = this.add.image(x, y - 54, m.cielo).setDisplaySize(220, 110).setDepth(56).setTint(abierto ? 0xffffff : 0x555566);
            const jefe = this.add.image(x, y - 54, 'mono_jefe_' + m.jefe.paleta, 0).setScale(0.5).setDepth(57).setTint(abierto ? 0xffffff : 0x555566);
            this.sub.push(tarjeta, ventana, jefe,
                this.add.text(x, y + 26, `${TXT.mundo} ${i + 1}`.toUpperCase(), estiloTexto(16, '#ff4f6e', { strokeThickness: 0 })).setOrigin(0.5).setDepth(56),
                this.add.text(x, y + 52, TXT.nombres[i], estiloTexto(20, TINTA, { strokeThickness: 0 })).setOrigin(0.5).setDepth(56));
            if (abierto) {
                for (let k = 0; k < 3; k++) this.sub.push(this.add.image(x - 40 + k * 40, y + 92, 'estrella_grande', k < d.estrellas[i] ? 0 : 1).setScale(0.7).setDepth(56));
                tarjeta.setInteractive({ useHandCursor: true }).on('pointerdown', () => { Sonido.iniciar(); Sonido.sfx('elegir'); this.empezar(i); });
            } else {
                this.sub.push(this.add.image(x, y - 54, 'iconos', 3).setScale(1.6).setDepth(58));
                this.sub.push(this.add.text(x, y + 92, TXT.bloqueado, estiloTexto(15, '#8a7a95', { strokeThickness: 0 })).setOrigin(0.5).setDepth(56));
            }
        });
        this.menu = crearMenu(this, ANCHO / 2, 548, [
            ...MUNDOS.slice(0, d.desbloqueado).map((m, i) => ({ texto: `${TXT.mundo} ${i + 1}`, accion: () => this.empezar(i) })),
            { texto: TXT.volver, accion: () => this.mostrarPrincipal() },
        ], { separacion: 0, tam: 22 });
        const n = this.menu.items.length;
        this.menu.items.forEach((t, i) => t.setPosition(ANCHO / 2 + (i - (n - 1) / 2) * 200, 548));
        this.menu.recolocar();
    }

    mostrarControles() {
        this.limpiarSub();
        this.sub = [panel(this, ANCHO / 2, 380, 700, 300)];
        TXT.listaControles.forEach(([tecla, accion], i) => {
            this.sub.push(this.add.text(ANCHO / 2 - 30, 278 + i * 40, tecla, estiloTexto(19, '#ff4f6e', { strokeThickness: 0 })).setOrigin(1, 0.5).setDepth(56));
            this.sub.push(this.add.text(ANCHO / 2 - 10, 278 + i * 40, accion, estiloTexto(19, TINTA, { strokeThickness: 0 })).setOrigin(0, 0.5).setDepth(56));
        });
        this.menu = crearMenu(this, ANCHO / 2, 556, [{ texto: TXT.volver, accion: () => this.mostrarPrincipal() }], { tam: 24 });
    }

    empezar(mundo) {
        if (this.saliendo) return;
        this.saliendo = true;
        Sonido.iniciar();
        this.cameras.main.fadeOut(400, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Juego', { mundo, ronda: 0 }));
    }
}

/* ===================================================================== */
class HUD extends Phaser.Scene {
    constructor() { super('HUD'); }

    create(d) {
        this.mundo = d.mundo; this.ronda = d.ronda;
        const juego = this.juego = this.scene.get('Juego');
        // Barra superior translúcida
        this.add.rectangle(0, 0, ANCHO, 58, 0x1a1428, 0.35).setOrigin(0);
        this.corazones = [];
        // Ronda y oleada (centro)
        const etiqueta = this.ronda >= RONDAS_POR_MUNDO - 1 ? `${this.mundo + 1} · ${TXT.jefe.toUpperCase()}` : `${this.mundo + 1}-${this.ronda + 1}`;
        this.add.text(ANCHO / 2, 18, `${TXT.mundo.toUpperCase()} ${etiqueta}`, estiloTexto(20, '#ffffff')).setOrigin(0.5);
        this.puntosOla = this.add.container(ANCHO / 2, 42);
        this.tEstrellas = this.add.text(ANCHO / 2 + 90, 42, '', estiloTexto(16, ORO)).setOrigin(0, 0.5);
        this.iconoEstrella = this.add.image(ANCHO / 2 + 78, 42, 'star').setScale(0.8).setVisible(false);
        // Puntos y combo (derecha)
        this.tPuntos = this.add.text(ANCHO - 130, 20, formatoPuntos(juego.puntos), estiloTexto(26, '#ffffff')).setOrigin(1, 0.5);
        this.tCombo = this.add.text(ANCHO - 130, 46, '', estiloTexto(15, ORO)).setOrigin(1, 0.5);
        // Poderes activos (bajo los corazones)
        this.iconosPoder = {};
        const boton = (x, frame, accion) => this.add.image(x, 29, 'iconos', frame).setScale(0.95).setInteractive({ useHandCursor: true })
            .on('pointerdown', (p, lx, ly, ev) => { ev.stopPropagation(); accion(); });
        this.botonSonido = boton(ANCHO - 84, Sonido.activo ? 1 : 2, () => Bus.emit('hud:sonido', Sonido.alternar()));
        boton(ANCHO - 36, 0, () => Bus.emit('pausar'));
        // Barra del jefe
        // Bajo la barra superior: abajo coincidiría con las pistas
        this.barraJefe = this.add.container(ANCHO / 2, 84).setVisible(false);
        this.tJefe = this.add.text(0, -12, '', estiloTexto(16, '#ffffff')).setOrigin(0.5);
        this.rellenoJefe = this.add.rectangle(-240, 6, 480, 14, 0xff4f6e).setOrigin(0, 0.5);
        this.barraJefe.add([this.tJefe, this.add.rectangle(0, 6, 488, 22, 0x2b2235).setStrokeStyle(3, 0xffffff), this.rellenoJefe]);
        this.vineta = this.add.rectangle(0, 0, ANCHO, ALTO, 0xff2040, 0).setOrigin(0).setStrokeStyle(30, 0xff2040, 0);

        this.mostrarTitulo();
        this.actualizarTodo();
        const escuchar = {
            'hud:todo': () => this.actualizarTodo(),
            'hud:puntos': (p) => this.tPuntos.setText(formatoPuntos(p)),
            'hud:ola': (ola, total, n) => this.mostrarOla(ola, total, n),
            'hud:estrellas': (n) => { this.tEstrellas.setText(String(n)); this.tweens.add({ targets: this.tEstrellas, scale: 1.3, duration: 80, yoyo: true }); },
            'hud:combo': (m) => this.tweens.add({ targets: this.tCombo, scale: 1.5, duration: 120, yoyo: true }),
            'hud:poder': (t) => this.anuncioPoder(t),
            'hud:pista': (t) => this.pista(t),
            'hud:aviso': (a, b, ms) => this.aviso(a, b, ms),
            'hud:alerta': () => this.alerta(),
            'hud:jefe': (nombre, p) => this.actualizarJefe(nombre, p),
            'hud:sonido': (activo) => this.botonSonido.setFrame(activo ? 1 : 2),
            'hud:danio': () => this.danio(),
        };
        for (const [ev, fn] of Object.entries(escuchar)) Bus.on(ev, fn);
        this.events.once('shutdown', () => { for (const [ev, fn] of Object.entries(escuchar)) Bus.off(ev, fn); });
    }

    update() {
        const j = this.juego;
        if (!j || !j.heroe) return;
        const mult = Math.min(5, 1 + Math.floor(j.combo / 4));
        this.tCombo.setText(j.combo > 1 ? `COMBO ${j.combo}  x${mult}` : '');
        const h = j.heroe;
        const activos = { iman: h.poderes.iman, furia: h.poderes.furia, botas: h.poderes.botas, reloj: Math.max(0, j.congelado), escudo: h.escudo ? 1 : 0 };
        let x = 24;
        for (const [t, v] of Object.entries(activos)) {
            let ic = this.iconosPoder[t];
            if (v > 0) {
                if (!ic) {
                    ic = this.iconosPoder[t] = { img: this.add.image(0, 84, 'poder_' + t).setScale(0.75), barra: this.add.rectangle(0, 106, 30, 4, 0xffffff).setOrigin(0, 0.5) };
                }
                ic.img.setPosition(x + 14, 84).setAlpha(v < 2 && t !== 'escudo' ? (Math.floor(v * 6) % 2 ? 0.4 : 1) : 1);
                const max = { iman: 9, furia: 7, botas: 14, reloj: 5, escudo: 1 }[t];
                ic.barra.setPosition(x - 1, 106).setSize(30 * Math.min(1, v / max), 4);
                x += 42;
            } else if (ic) {
                ic.img.destroy(); ic.barra.destroy(); delete this.iconosPoder[t];
            }
        }
    }

    actualizarTodo() {
        const h = this.juego.heroe;
        if (!h) return;
        this.corazones.forEach((c) => c.destroy());
        // Tres huecos como mínimo; con corazones extra, uno más por cada uno
        this.corazones = Array.from({ length: Math.max(3, h.vidas) }, (_, i) => this.add.image(26 + i * 38, 29, 'corazon', i < h.vidas ? 0 : 1).setScale(0.85));
    }

    mostrarOla(ola, total, n) {
        this.puntosOla.removeAll(true);
        for (let i = 0; i < total; i++) {
            const lleno = i < ola;
            this.puntosOla.add(this.add.circle((i - (total - 1) / 2) * 20 - 30, 0, 6, lleno ? 0xffd23f : 0xffffff, lleno ? 1 : 0.35).setStrokeStyle(2, 0x2b2235));
        }
        this.iconoEstrella.setVisible(true);
        this.tEstrellas.setText(String(n));
        if (ola > 1) return;
        this.aviso(`${TXT.oleada} ${ola}`, TXT.objetivo, 1100);
    }

    mostrarTitulo() {
        const esJefe = this.ronda >= RONDAS_POR_MUNDO - 1;
        const c = this.add.container(ANCHO / 2, ALTO / 2 - 60).setAlpha(0);
        c.add([
            this.add.text(0, -36, `${TXT.mundo} ${this.mundo + 1} · ${esJefe ? TXT.jefe : `${TXT.ronda} ${this.ronda + 1}`}`.toUpperCase(), estiloTexto(24, ORO)).setOrigin(0.5),
            this.add.text(0, 12, TXT.nombres[this.mundo], estiloTexto(52, '#ffffff', { fontStyle: '700', strokeThickness: 10 })).setOrigin(0.5),
        ]);
        this.tweens.chain({
            targets: c,
            tweens: [{ alpha: 1, y: ALTO / 2 - 70, duration: 400 }, { alpha: 0, y: ALTO / 2 - 90, duration: 400, delay: 900 }],
            onComplete: () => c.destroy(),
        });
    }

    anuncioPoder(t) {
        const [titulo, desc] = TXT.poderes[t];
        if (this.cPoder) this.cPoder.destroy();
        const c = this.cPoder = this.add.container(ANCHO / 2, ALTO - 120).setAlpha(0).setScale(0.6);
        c.add(this.add.text(0, 0, titulo, estiloTexto(32, Arte.PODERES[t], { fontStyle: '700', strokeThickness: 7 })).setOrigin(0.5));
        if (desc) c.add(this.add.text(0, 34, desc, estiloTexto(17, '#ffffff')).setOrigin(0.5));
        this.tweens.chain({
            targets: c,
            tweens: [{ alpha: 1, scale: 1, duration: 220, ease: 'Back.easeOut' }, { alpha: 0, y: ALTO - 150, duration: 400, delay: 1200 }],
            onComplete: () => c.destroy(),
        });
    }

    pista(texto) {
        this.cola = this.cola || [];
        this.cola.push(texto);
        if (!this.pistaActiva) this.siguientePista();
    }

    siguientePista() {
        const texto = this.cola.shift();
        if (!texto) { this.pistaActiva = false; return; }
        this.pistaActiva = true;
        const t = this.add.text(0, 0, texto, estiloTexto(17, TINTA, { strokeThickness: 0 })).setOrigin(0.5);
        const fondo = this.add.rectangle(0, 0, t.width + 40, 40, 0xfff7e6, 0.95).setStrokeStyle(3, 0x2b2235);
        // Abajo, sobre el suelo: arriba taparía a los Monocatrones y a las nubes
        const c = this.add.container(ANCHO / 2, ALTO - 26, [fondo, t]).setAlpha(0);
        this.tweens.chain({
            targets: c,
            tweens: [{ alpha: 1, y: ALTO - 34, duration: 250 }, { alpha: 0, duration: 300, delay: this.cola.length ? 2400 : 3400 }],
            onComplete: () => { c.destroy(); this.siguientePista(); },
        });
    }

    aviso(titulo, sub, ms = 1500) {
        if (this.cAviso) this.cAviso.destroy();
        const c = this.cAviso = this.add.container(ANCHO / 2, ALTO / 2 - 80).setScale(0.5).setAlpha(0);
        c.add(this.add.text(0, 0, titulo, estiloTexto(48, ORO, { fontStyle: '700', strokeThickness: 10 })).setOrigin(0.5));
        if (sub) c.add(this.add.text(0, 46, sub, estiloTexto(22, '#ffffff')).setOrigin(0.5));
        this.tweens.chain({
            targets: c,
            tweens: [{ alpha: 1, scale: 1, duration: 260, ease: 'Back.easeOut' }, { alpha: 0, duration: 350, delay: ms }],
            onComplete: () => c.destroy(),
        });
    }

    alerta() {
        const c = this.add.container(ANCHO / 2, ALTO / 2 - 60);
        const fondo = this.add.rectangle(0, 0, ANCHO, 130, 0x2b2235, 0.8);
        const t = this.add.text(0, -12, '¡!', estiloTexto(20, '#ffffff')).setOrigin(0.5).setVisible(false);
        const titulo = this.add.text(0, -8, TXT.jefes[this.mundo], estiloTexto(54, '#ff4f6e', { fontStyle: '700', strokeThickness: 10 })).setOrigin(0.5);
        const sub = this.add.text(0, 40, TXT.nombres[this.mundo], estiloTexto(20, '#ffffff')).setOrigin(0.5);
        c.add([fondo, t, titulo, sub]);
        c.setScale(1, 0);
        this.tweens.add({ targets: c, scaleY: 1, duration: 220 });
        this.tweens.add({ targets: titulo, scale: 1.08, duration: 160, yoyo: true, repeat: 5 });
        this.tweens.add({ targets: c, scaleY: 0, duration: 220, delay: 1700, onComplete: () => c.destroy() });
    }

    actualizarJefe(nombre, p) {
        if (nombre === null) { this.tweens.add({ targets: this.barraJefe, alpha: 0, duration: 400, onComplete: () => this.barraJefe.setVisible(false) }); return; }
        if (!this.barraJefe.visible) { this.barraJefe.setVisible(true).setAlpha(0); this.tweens.add({ targets: this.barraJefe, alpha: 1, duration: 300 }); }
        this.tJefe.setText(nombre);
        this.tweens.add({ targets: this.rellenoJefe, width: 480 * p, duration: 250 });
    }

    danio() {
        const o = { a: 0.5 };
        this.tweens.add({ targets: o, a: 0, duration: 450, onUpdate: () => this.vineta.setStrokeStyle(30, 0xff2040, o.a) });
        this.actualizarTodo();
    }
}

/* ===================================================================== */
class Pausa extends Phaser.Scene {
    constructor() { super('Pausa'); }

    create(d) {
        this.add.rectangle(0, 0, ANCHO, ALTO, 0x1a1428, 0.55).setOrigin(0);
        panel(this, ANCHO / 2, ALTO / 2, 420, 310);
        this.add.text(ANCHO / 2, ALTO / 2 - 104, TXT.pausa, estiloTexto(40, '#ff4f6e', { strokeThickness: 0 })).setOrigin(0.5).setDepth(60);
        const reanudar = () => { this.scene.stop(); this.scene.resume('Juego'); };
        this.menu = crearMenu(this, ANCHO / 2, ALTO / 2 - 32, [
            { texto: TXT.reanudar, accion: reanudar },
            { texto: TXT.reiniciar, accion: () => { this.scene.stop('Juego'); this.scene.start('Juego', { mundo: d.mundo, ronda: d.ronda, herencia: d.herencia }); } },
            { texto: TXT.salir, accion: () => { this.scene.stop('Juego'); this.scene.stop('HUD'); this.scene.start('Menu'); } },
        ], { separacion: 56, tam: 26 });
        this.menu.items.forEach((t) => t.setStroke('#ffffff', 0));
        const tinta = () => this.menu.items.forEach((t) => t.setColor(t.scale > 1.05 ? '#ff4f6e' : TINTA));
        tinta();
        this.input.keyboard.on('keydown', tinta);
        this.menu.items.forEach((t) => t.on('pointerover', tinta));
        this.input.keyboard.on('keydown-P', reanudar);
        this.input.keyboard.on('keydown-ESC', reanudar);
    }
}

/* ===================================================================== */
class Resumen extends Phaser.Scene {
    constructor() { super('Resumen'); }

    create(d) {
        this.add.rectangle(0, 0, ANCHO, ALTO, 0x1a1428, 0.5).setOrigin(0);
        const p = panel(this, ANCHO / 2, ALTO / 2 + 6, 640, 520).setScale(0.5).setAlpha(0);
        this.tweens.add({ targets: p, scale: 1, alpha: 1, duration: 320, ease: 'Back.easeOut' });
        const t = (x, y, s, tam, color, origen = 0.5) => this.add.text(x, y, s, estiloTexto(tam, color, { strokeThickness: 0 })).setOrigin(origen, 0.5).setDepth(60);
        t(ANCHO / 2, 106, TXT.mundoSuperado, 40, '#ff4f6e');
        t(ANCHO / 2, 146, `${TXT.mundo} ${d.mundo + 1} · ${TXT.nombres[d.mundo]}`, 20, TINTA);
        d.estrellas.forEach((ok, i) => {
            const x = ANCHO / 2 + (i - 1) * 130;
            const e = this.add.image(x, 216, 'estrella_grande', ok ? 0 : 1).setScale(0).setDepth(60);
            const et = t(x, 262, TXT.estrellas[i], 14, ok ? TINTA : '#9a8aa5');
            et.setWordWrapWidth(120).setAlign('center').setAlpha(0);
            this.tweens.add({ targets: e, scale: 1.4, duration: 380, delay: 450 + i * 380, ease: 'Back.easeOut', onStart: () => ok && Sonido.sfx('estrellaResumen') });
            this.tweens.add({ targets: et, alpha: 1, duration: 300, delay: 450 + i * 380 });
        });
        const filas = [[TXT.mejorCombo, String(d.mejorCombo)], [TXT.vidasPerdidas, String(d.vidasPerdidas)], [TXT.tiempo, formatoTiempo(d.tiempo)]];
        filas.forEach(([k, v], i) => { t(ANCHO / 2 - 240, 318 + i * 36, k, 19, '#6a5a75', 0); t(ANCHO / 2 + 240, 318 + i * 36, v, 19, TINTA, 1); });
        t(ANCHO / 2 - 240, 444, TXT.puntos, 24, '#ff4f6e', 0);
        const total = t(ANCHO / 2 + 240, 444, '0', 28, '#ff4f6e', 1);
        const cont = { n: 0 };
        this.tweens.add({ targets: cont, n: d.puntos, duration: 1200, delay: 1500, onUpdate: () => total.setText(formatoPuntos(cont.n)) });
        const ultimo = d.mundo >= MUNDOS.length - 1;
        this.time.delayedCall(900, () => {
            this.menu = crearMenu(this, ANCHO / 2, 526, [
                ultimo ? { texto: TXT.verFinal, accion: () => this.irA('Final', { puntos: d.puntos }) }
                    : { texto: TXT.siguiente, accion: () => this.irA('Juego', { mundo: d.mundo + 1, ronda: 0, herencia: d.herencia }) },
                { texto: TXT.reintentar, accion: () => this.irA('Juego', { mundo: d.mundo, ronda: 0 }) },
                { texto: TXT.menu, accion: () => this.irA('Menu') },
            ], { separacion: 0, tam: 21 });
            const n = this.menu.items.length;
            this.menu.items.forEach((it, i) => it.setPosition(ANCHO / 2 + (i - (n - 1) / 2) * 200, 526).setStroke('#ffffff', 0));
            this.menu.recolocar();
            const tinta = () => this.menu.items.forEach((x) => x.setColor(x.scale > 1.05 ? '#ff4f6e' : TINTA));
            tinta();
            this.input.keyboard.on('keydown', tinta);
            this.menu.items.forEach((x) => x.on('pointerover', tinta));
        });
    }

    irA(escena, datos) {
        this.scene.stop('Juego');
        this.scene.stop('HUD');
        this.scene.start(escena, datos);
    }
}

/* ===================================================================== */
class FinPartida extends Phaser.Scene {
    constructor() { super('FinPartida'); }

    create(d) {
        this.add.rectangle(0, 0, ANCHO, ALTO, 0x1a1428, 0.6).setOrigin(0);
        panel(this, ANCHO / 2, ALTO / 2, 480, 300);
        const tit = this.add.text(ANCHO / 2, ALTO / 2 - 96, TXT.finPartida, estiloTexto(42, '#ff4f6e', { strokeThickness: 0 })).setOrigin(0.5).setDepth(60);
        this.tweens.add({ targets: tit, scale: 1.06, duration: 400, yoyo: true, repeat: -1 });
        Sonido.musica('menu');
        // Se reintenta la ronda con los puntos y las vidas con las que se empezó
        const herencia = { ...d.herencia, vidas: 3 };
        this.menu = crearMenu(this, ANCHO / 2, ALTO / 2 - 10, [
            { texto: TXT.reintentarRonda, accion: () => this.irA('Juego', { mundo: d.mundo, ronda: d.ronda, herencia }) },
            { texto: TXT.salir, accion: () => this.irA('Menu') },
        ], { separacion: 60, tam: 26 });
        this.menu.items.forEach((t) => t.setStroke('#ffffff', 0));
        const tinta = () => this.menu.items.forEach((x) => x.setColor(x.scale > 1.05 ? '#ff4f6e' : TINTA));
        tinta();
        this.input.keyboard.on('keydown', tinta);
        this.menu.items.forEach((x) => x.on('pointerover', tinta));
    }

    irA(escena, datos) {
        this.scene.stop('Juego');
        this.scene.stop('HUD');
        this.scene.start(escena, datos);
    }
}

/* ===================================================================== */
class Final extends Phaser.Scene {
    constructor() { super('Final'); }

    create(d) {
        this.cameras.main.fadeIn(800, 0, 0, 0);
        this.moverFondo = fondoPradera(this);
        const heroe = this.add.sprite(ANCHO / 2, 560, 'dude', 4).setOrigin(0.5, 1).setScale(1.8);
        this.tweens.add({ targets: heroe, y: 470, duration: 380, yoyo: true, repeat: -1, repeatDelay: 300, ease: 'Quad.easeOut' });
        const fuegos = this.add.particles(0, 0, 'chispa', { lifespan: { min: 700, max: 1300 }, speed: { min: 60, max: 280 }, gravityY: 140, scale: { start: 1, end: 0 }, blendMode: 'ADD', emitting: false });
        this.time.addEvent({
            delay: 600, loop: true, callback: () => {
                fuegos.setParticleTint(Phaser.Utils.Array.GetRandom([0xffd23f, 0xff5a6e, 0x4fb4ff, 0x7dff8a, 0xc08cff]));
                fuegos.explode(46, Phaser.Math.Between(150, ANCHO - 150), Phaser.Math.Between(90, 280));
                Sonido.sfx('explosion');
            },
        });
        const total = d && d.puntos ? d.puntos : Progreso.datos.record;
        const estrellas = Progreso.datos.estrellas.reduce((a, b) => a + b, 0);
        const t = (y, s, tam, color) => this.add.text(ANCHO / 2, y, s, estiloTexto(tam, color)).setOrigin(0.5);
        const tit = t(110, TXT.finTitulo, 50, ORO).setScale(0.4).setAlpha(0);
        this.tweens.add({ targets: tit, scale: 1, alpha: 1, duration: 800, ease: 'Back.easeOut' });
        t(170, TXT.finTexto, 22, '#ffffff');
        t(236, `${TXT.totalPuntos}: ${formatoPuntos(total)}`, 28, ORO);
        t(276, `${TXT.totalEstrellas}: ${estrellas} / ${MUNDOS.length * 3}`, 22, '#ffffff');
        t(326, TXT.gracias, 22, '#ffffff');
        t(ALTO - 22, TXT.creditos, 13, '#ffffff');
        Sonido.musica('fin');
        this.time.delayedCall(1300, () => {
            this.menu = crearMenu(this, ANCHO / 2, 390, [{ texto: TXT.menu, accion: () => this.scene.start('Menu') }], { tam: 26 });
        });
    }

    update(tt, dt) { this.moverFondo(dt / 1000); }
}
