/* Escena de juego de Monocatron: una ronda (o el jefe) de un mundo. Construye el escenario
   desde el mapa, lanza las oleadas de estrellas y gestiona colisiones, poderes y efectos.
   El marcador lo pinta la escena HUD (interfaz.js). */

const Bus = new Phaser.Events.EventEmitter();

/** Progreso guardado en el navegador: mundos desbloqueados, estrellas y récord. */
const Progreso = {
    clave: 'monocatron-progreso',
    datos: { desbloqueado: 1, estrellas: [0, 0, 0], puntos: [0, 0, 0], record: 0 },
    cargar() {
        try { const d = JSON.parse(localStorage.getItem(this.clave)); if (d) Object.assign(this.datos, d); } catch (e) { /* sin almacenamiento */ }
    },
    guardar() {
        try { localStorage.setItem(this.clave, JSON.stringify(this.datos)); } catch (e) { /* sin almacenamiento */ }
    },
    completar(i, estrellas, puntos) {
        const d = this.datos;
        d.desbloqueado = Math.min(MUNDOS.length, Math.max(d.desbloqueado, i + 2));
        d.estrellas[i] = Math.max(d.estrellas[i] || 0, estrellas);
        d.puntos[i] = Math.max(d.puntos[i] || 0, puntos);
        this.guardar();
    },
    record(p) { if (p > this.datos.record) { this.datos.record = p; this.guardar(); } },
};
Progreso.cargar();

function estiloTexto(tam, color = '#ffffff', extra = {}) {
    return Object.assign({
        fontFamily: 'Fredoka, sans-serif', fontSize: tam + 'px', fontStyle: '600', color,
        stroke: '#2b2235', strokeThickness: Math.max(3, Math.round(tam / 5)),
    }, extra);
}

const TIPOS_PODER = ['iman', 'escudo', 'reloj', 'furia', 'botas'];

class Juego extends Phaser.Scene {
    constructor() { super('Juego'); }

    init(d) {
        this.mundo = (d && d.mundo) || 0;
        this.ronda = (d && d.ronda) || 0;
        this.def = MUNDOS[this.mundo];
        this.esJefe = this.ronda >= RONDAS_POR_MUNDO - 1;
        this.datosRonda = this.esJefe ? null : this.def.rondas[this.ronda];
        this.mapa = this.esJefe ? this.def.mapaJefe : this.datosRonda.mapa;
        // Lo que se arrastra de una ronda a la siguiente dentro de la partida
        this.herencia = (d && d.herencia) || { puntos: 0, vidas: 3, vidasPerdidas: 0, mejorCombo: 0, tiempo: 0 };
    }

    create() {
        this.reloj = 0;
        this.tRonda = 0;
        this.puntos = this.herencia.puntos;
        this.puntosInicio = this.herencia.puntos;
        this.combo = 0; this.tCombo = 0; this.mejorCombo = this.herencia.mejorCombo;
        this.vidasPerdidas = this.herencia.vidasPerdidas;
        this.ola = 0; this.estrellasPendientes = 0;
        this.congelado = 0;
        this.terminado = false;
        this.jefe = null;
        this.ondas = [];
        this.rayos = [];

        // Sin suelo en el borde inferior: los hoyos tienen que tragarse lo que cae en ellos
        this.physics.world.setBounds(0, -200, ANCHO, ALTO + 400);
        this.physics.world.setBoundsCollision(true, true, true, false);
        this.crearFondo();
        this.crearGrupos();
        this.crearMapa();
        this.crearEfectos();
        this.crearClima();
        this.crearColisiones();
        this.crearControles();

        this.scene.stop('HUD');
        this.scene.launch('HUD', { mundo: this.mundo, ronda: this.ronda });
        this.alPausar = () => this.pausar();
        Bus.on('pausar', this.alPausar);
        this.events.once('shutdown', () => { Bus.off('pausar', this.alPausar); this.tweens.killAll(); });
        this.cameras.main.fadeIn(450, 0, 0, 0);
        Sonido.musica(this.esJefe ? 'jefe' : this.def.musica);

        this.time.delayedCall(1300, () => {
            if (this.esJefe) this.empezarJefe();
            else {
                for (let i = 0; i < this.datosRonda.bombas; i++) this.time.delayedCall(i * 400, () => this.soltarBomba());
                this.siguienteOla();
            }
            for (const [i, clave] of (this.datosRonda ? this.datosRonda.pistas : []).entries()) this.time.delayedCall(i * 600, () => Bus.emit('hud:pista', pista(clave)));
        });
        Bus.emit('hud:todo');
    }

    /* ------------------------------------------------------------------ escenario */

    crearFondo() {
        const d = this.def;
        this.add.image(0, 0, d.cielo).setOrigin(0).setDisplaySize(ANCHO, ALTO).setDepth(-50);
        if (d.clave === 'tormenta') this.add.image(0, 0, 'cielo_estrellas').setOrigin(0).setDisplaySize(ANCHO, ALTO * 0.6).setAlpha(0.7).setDepth(-49);
        this.astro = this.add.image(d.astro === 'sol' ? (d.clave === 'canon' ? 300 : 900) : 880, d.clave === 'canon' ? 340 : 110, d.astro).setDepth(-48);
        if (d.clave === 'canon') this.astro.setScale(1.6).setTint(0xffd0a0);
        const sil = d.silueta;
        if (sil === 'colinas') {
            this.add.image(0, ALTO - 300, 'colinas_lejos').setOrigin(0).setTint(d.tintes.lejos).setDepth(-40);
            this.add.image(0, ALTO - 220, 'colinas_cerca').setOrigin(0).setTint(d.tintes.cerca).setDepth(-38);
        } else if (sil === 'mesas') {
            this.add.image(0, ALTO - 360, 'mesas').setOrigin(0).setTint(d.tintes.lejos).setDepth(-40);
            this.add.image(-200, ALTO - 260, 'mesas').setOrigin(0).setTint(d.tintes.cerca).setDepth(-38).setScale(1.2, 0.85);
        } else {
            this.add.image(0, ALTO - 340, 'montes').setOrigin(0).setTint(d.tintes.lejos).setDepth(-40);
            this.add.image(-140, ALTO - 250, 'montes').setOrigin(0).setTint(d.tintes.cerca).setDepth(-38).setScale(1.15, 0.8);
        }
        // Nubes que cruzan despacio
        this.nubesFondo = [];
        const n = d.clave === 'tormenta' ? 4 : 3;
        for (let i = 0; i < n; i++) {
            const nu = this.add.image(Phaser.Math.Between(0, ANCHO), Phaser.Math.Between(60, 230), 'nube_fondo').setDepth(-45)
                .setScale(Phaser.Math.FloatBetween(0.6, 1.1)).setAlpha(d.clave === 'tormenta' ? 0.35 : 0.85)
                .setTint(d.clave === 'tormenta' ? 0x4a5288 : d.clave === 'canon' ? 0xffc0a8 : 0xffffff);
            nu.vel = Phaser.Math.FloatBetween(6, 16);
            this.nubesFondo.push(nu);
        }
    }

    crearGrupos() {
        this.solidos = this.physics.add.staticGroup();
        this.finas = this.physics.add.staticGroup();
        this.pinchos = this.physics.add.staticGroup();
        this.estrellas = this.physics.add.group();
        this.capsulas = this.physics.add.group();
        this.bombas = this.add.group();
        this.enemigos = this.add.group();
        this.andarines = this.add.group();
    }

    celda(c, f) {
        if (f < 0 || f >= this.mapa.length || c < 0 || c >= 16) return '.';
        return this.mapa[f][c];
    }

    crearMapa() {
        const tinte = this.def.tintes.casillas;
        const img = (k, x, y) => this.add.image(x, y, k).setOrigin(0).setDepth(5).setTint(tinte);
        this.inicio = { x: 2 * CASILLA, y: 8 * CASILLA };
        for (let f = 0; f < this.mapa.length; f++) {
            for (let c = 0; c < 16; c++) {
                const ch = this.mapa[f][c];
                const x = c * CASILLA, y = f * CASILLA;
                if (ch === '#') {
                    const arriba = this.celda(c, f - 1) === '#';
                    const izq = this.celda(c - 1, f) === '#', der = this.celda(c + 1, f) === '#';
                    const ultimaFila = f === this.mapa.length - 1;
                    let k;
                    if (arriba) k = 'slice27_27';
                    else if (!izq && !der) k = ultimaFila ? 'slice05_05' : 'slice01_01';
                    else if (!izq) k = ultimaFila ? 'slice02_02' : 'slice02_02';
                    else if (!der) k = 'slice04_04';
                    else k = 'slice03_03';
                    img(k, x, y);
                    // Tierra hasta abajo del todo (la pantalla mide 9 casillas justas)
                    const z = this.add.zone(x + CASILLA / 2, y + CASILLA / 2, CASILLA, CASILLA);
                    this.physics.add.existing(z, true);
                    this.solidos.add(z);
                } else if (ch === '=') {
                    const izq = this.celda(c - 1, f) === '=', der = this.celda(c + 1, f) === '=';
                    const k = !izq && !der ? 'grassHalf' : !izq ? 'grassHalfLeft' : !der ? 'grassHalfRight' : 'grassHalfMid';
                    img(k, x, y);
                    const z = this.add.zone(x + CASILLA / 2, y + 8, CASILLA, 16);
                    this.physics.add.existing(z, true);
                    z.body.checkCollision.down = false; z.body.checkCollision.left = false; z.body.checkCollision.right = false;
                    this.finas.add(z);
                } else if (ch === '^') {
                    this.add.image(x, y + CASILLA, 'pinchos').setOrigin(0, 1).setDepth(6).setTint(tinte);
                    const z = this.add.zone(x + CASILLA / 2, y + CASILLA - 9, CASILLA - 10, 14);
                    this.physics.add.existing(z, true);
                    this.pinchos.add(z);
                } else if (ch === '@') {
                    this.inicio = { x: x + CASILLA / 2, y: y + CASILLA };
                } else if (ch === 'C' || ch === 'P') {
                    const e = new Andarin(this, x + CASILLA / 2, y + CASILLA - 2, ch === 'C' ? 'champi' : 'pinchoso');
                    this.enemigos.add(e); this.andarines.add(e);
                } else if (ch === 'M') {
                    this.enemigos.add(new MiniMono(this, x + CASILLA / 2, y + CASILLA / 2));
                } else if (ch === 'N') {
                    this.enemigos.add(new Nube(this, x + CASILLA / 2, y + CASILLA / 2));
                }
            }
        }
        this.heroe = new Heroe(this, this.inicio.x, this.inicio.y - 2);
        this.heroe.vidas = this.herencia.vidas;
        this.heroe.invuln = 1.5;
        this.seguro = { ...this.inicio };
    }

    /** Altura de la primera superficie (bloque o plataforma) bajo (x, y), o el fondo. */
    sueloDebajo(x, y) {
        const c = Math.floor(x / CASILLA);
        for (let f = Math.max(0, Math.floor(y / CASILLA)); f < this.mapa.length; f++) {
            const ch = this.celda(c, f);
            if ((ch === '#' || ch === '=') && f * CASILLA >= y - 2) return f * CASILLA;
        }
        return ALTO + 200;
    }

    haySuelo(x, y) {
        const ch = this.celda(Math.floor(x / CASILLA), Math.floor(y / CASILLA));
        return ch === '#' || ch === '=';
    }

    /** Columnas donde una estrella que cae aterriza en algo alcanzable (no en un hoyo). */
    columnasValidas() {
        const cols = [];
        for (let c = 0; c < 16; c++) if (this.sueloDebajo(c * CASILLA + 35, 0) < ALTO) cols.push(c);
        return cols;
    }

    sobreFina(h) {
        const pie = h.body.bottom;
        return this.finas.getChildren().some((z) => Math.abs(z.body.top - pie) < 6 && h.body.right > z.body.left && h.body.left < z.body.right);
    }

    /* ------------------------------------------------------------------ efectos y clima */

    crearEfectos() {
        this.emPolvo = this.add.particles(0, 0, 'humo', {
            lifespan: { min: 300, max: 600 }, speedX: { min: -70, max: 70 }, speedY: { min: -50, max: -5 },
            scale: { start: 0.8, end: 1.7 }, alpha: { start: 0.6, end: 0 }, tint: this.def.clave === 'tormenta' ? 0x9aa6d8 : 0xe8d0a8, emitting: false,
        }).setDepth(22);
        this.emChispas = this.add.particles(0, 0, 'chispa', {
            lifespan: 450, speed: { min: 80, max: 260 }, scale: { start: 1, end: 0 }, blendMode: 'ADD', emitting: false,
        }).setDepth(30);
        this.emConfeti = this.add.particles(0, 0, 'px', {
            lifespan: { min: 600, max: 1200 }, speed: { min: 120, max: 380 }, angle: { min: 200, max: 340 }, gravityY: 700,
            scale: { start: 1.3, end: 0.4 }, tint: [0xff5a6e, 0xffd23f, 0x7dff8a, 0x4fb4ff, 0xc08cff], emitting: false,
        }).setDepth(30);
        this.emHumo = this.add.particles(0, 0, 'humo', {
            lifespan: { min: 500, max: 900 }, speed: { min: 20, max: 120 }, scale: { start: 1.5, end: 3 }, alpha: { start: 0.5, end: 0 }, tint: 0x5a5f73, emitting: false,
        }).setDepth(28);
        this.emFuego = this.add.particles(0, 0, 'humo', {
            lifespan: { min: 250, max: 500 }, speed: { min: 60, max: 260 }, scale: { start: 1.4, end: 0 }, tint: [0xffd23f, 0xff8a3d, 0xff4f3d], blendMode: 'ADD', emitting: false,
        }).setDepth(29);
    }

    crearClima() {
        const c = this.def.clima;
        if (c === 'lluvia') {
            this.add.particles(0, -20, 'gota', {
                x: { min: -100, max: ANCHO + 100 }, lifespan: 900, speedY: { min: 700, max: 900 }, speedX: { min: -140, max: -100 },
                rotate: 10, alpha: { start: 0.7, end: 0.3 }, frequency: 12, quantity: 2,
            }).setDepth(25);
            // Relámpagos de ambiente
            const relampago = () => {
                if (!this.scene.isActive()) return;
                this.destello(0xc8d2ff, 0.22, 260);
                Sonido.sfx('temblor');
                this.time.delayedCall(Phaser.Math.Between(7000, 13000), relampago);
            };
            this.time.delayedCall(Phaser.Math.Between(4000, 8000), relampago);
        } else if (c === 'polvo') {
            this.add.particles(0, 0, 'px', {
                x: { min: -40, max: 0 }, y: { min: 100, max: ALTO - 80 }, lifespan: 9000, speedX: { min: 40, max: 90 }, speedY: { min: -10, max: 10 },
                scale: { min: 0.4, max: 0.9 }, alpha: { start: 0.6, end: 0 }, tint: 0xffe0b0, frequency: 160,
            }).setDepth(24);
        } else {
            this.add.particles(0, 0, 'px', {
                x: { min: 0, max: ANCHO }, y: ALTO + 10, lifespan: 8000, speedY: { min: -40, max: -20 }, speedX: { min: -15, max: 15 },
                scale: { min: 0.4, max: 0.8 }, alpha: { start: 0.8, end: 0 }, tint: [0xffffff, 0xfff3a0, 0xffd0e8], frequency: 260,
            }).setDepth(-30);
        }
    }

    /* ------------------------------------------------------------------ colisiones y controles */

    crearColisiones() {
        const h = this.heroe, f = this.physics;
        f.add.collider(h, this.solidos);
        f.add.collider(h, this.finas, () => { h.sobrePlataforma = true; }, this.puedePisar, this);
        for (const g of [this.estrellas, this.capsulas]) {
            f.add.collider(g, this.solidos);
            f.add.collider(g, this.finas, null, this.puedePisar, this);
        }
        f.add.collider(this.andarines, this.solidos);
        f.add.collider(this.andarines, this.finas, null, this.puedePisar, this);
        f.add.collider(this.bombas, this.solidos, () => Sonido.sfx('rebote'));
        f.add.collider(this.bombas, this.finas);
        f.add.overlap(h, this.estrellas, this.recogerEstrella, null, this);
        f.add.overlap(h, this.capsulas, this.recogerPoder, null, this);
        f.add.overlap(h, this.bombas, this.tocarBomba, null, this);
        f.add.overlap(h, this.enemigos, this.tocarEnemigo, null, this);
        f.add.overlap(h, this.pinchos, () => h.herir(h.x - h.dir * 10), null, this);
    }

    puedePisar(cuerpo, p) {
        if (cuerpo.bajando > 0) return false;
        const b = cuerpo.body;
        return b.velocity.y >= -5 && b.prev.y + b.height <= p.body.top + 8;
    }

    crearControles() {
        this.teclas = this.input.keyboard.addKeys('LEFT,RIGHT,UP,DOWN,A,D,W,S,SPACE,Z,P,ESC,M');
        this.pulsos = new Set();
        this.input.keyboard.on('keydown', (ev) => { Sonido.iniciar(); if (!ev.repeat) this.pulsos.add(ev.keyCode); });
        this.input.on('pointerdown', () => Sonido.iniciar());
    }

    leerControles() {
        const k = this.teclas, t = TouchControls.state, p = this.pulsos;
        const pulsada = (...ts) => ts.some((x) => p.has(x.keyCode));
        return {
            izq: k.LEFT.isDown || k.A.isDown || !!t.left,
            der: k.RIGHT.isDown || k.D.isDown || !!t.right,
            abajo: k.DOWN.isDown || k.S.isDown,
            saltar: pulsada(k.UP, k.W, k.SPACE, k.Z) || TouchControls.consume('up'),
            saltarMantenido: k.UP.isDown || k.W.isDown || k.SPACE.isDown || k.Z.isDown || !!t.up,
            bajarYa: pulsada(k.DOWN, k.S) || TouchControls.consume('down'),
            pausa: pulsada(k.P, k.ESC),
            sonido: pulsada(k.M),
        };
    }

    /* ------------------------------------------------------------------ bucle */

    update(t, dtReal) {
        const seg = Math.min(dtReal, 50) / 1000;
        this.reloj += seg;
        if (!this.terminado) this.tRonda += seg;
        const c = this.leerControles();
        this.pulsos.clear();
        if (c.pausa && !this.terminado) { this.pausar(); return; }
        if (c.sonido) Bus.emit('hud:sonido', Sonido.alternar());

        const h = this.heroe;
        h.actualizar(seg, c);
        if (this.congelado > 0) {
            this.congelado -= seg;
            if (this.congelado <= 0) Bus.emit('hud:todo');
        }
        for (const e of [...this.enemigos.getChildren()]) if (e.active) e.actualizar(seg);
        for (const b of [...this.bombas.getChildren()]) if (b.active) b.actualizar(seg);
        if (this.jefe && this.jefe.active && !(this.congelado > 0)) this.jefe.actualizar(seg);
        this.actualizarEstrellas(seg);
        this.actualizarOndas(seg);

        // Caer por un hoyo: un corazón menos y vuelta al último sitio seguro
        if (!h.muerto && h.y > ALTO + 60) this.caerHoyo();
        if (h.enSuelo && !h.muerto && this.reloj % 0.25 < seg) {
            if (this.haySuelo(h.x - 16, h.y + 4) && this.haySuelo(h.x + 16, h.y + 4)) this.seguro = { x: h.x, y: h.y };
        }

        if (this.tCombo > 0) { this.tCombo -= seg; if (this.tCombo <= 0) this.combo = 0; }
        for (const n of this.nubesFondo) { n.x += n.vel * seg; if (n.x > ANCHO + 130) n.x = -130; }
    }

    /* ------------------------------------------------------------------ estrellas y oleadas */

    siguienteOla() {
        this.ola++;
        const n = this.datosRonda.estrellas;
        this.soltarEstrellas(n);
        this.estrellasPendientes = n;
        Bus.emit('hud:ola', this.ola, this.datosRonda.olas, n);
        if (this.ola > 1 || this.ronda > 0) this.time.delayedCall(Phaser.Math.Between(2500, 5000), () => !this.terminado && this.soltarPoder());
    }

    soltarEstrellas(n) {
        const cols = this.columnasValidas();
        for (let i = 0; i < n; i++) {
            const c = cols[Math.round((i / Math.max(1, n - 1)) * (cols.length - 1))];
            const x = c * CASILLA + 35 + Phaser.Math.Between(-12, 12);
            this.time.delayedCall(i * 70, () => {
                if (this.terminado) return;
                const s = this.estrellas.create(x, -20, 'star').setScale(1.45).setDepth(12);
                s.body.setSize(20, 18);
                s.body.setBounceY(Phaser.Math.FloatBetween(0.3, 0.6));
                s.body.setMaxVelocity(400, 700);
                s.giro = Phaser.Math.FloatBetween(-3, 3);
                s.brillo = this.add.image(x, -20, 'brillo').setTint(0xffe680).setBlendMode('ADD').setScale(0.55).setDepth(11).setAlpha(0.6);
            });
        }
    }

    actualizarEstrellas(seg) {
        const h = this.heroe, iman = h.poderes.iman > 0;
        for (const s of this.estrellas.getChildren()) {
            if (!s.active) continue;
            s.brillo.setPosition(s.x, s.y);
            if (!s.body.blocked.down) s.rotation += s.giro * seg; else s.rotation *= 0.9;
            if (iman && !h.muerto) {
                const d = Phaser.Math.Distance.Between(s.x, s.y, h.x, h.y - 30);
                if (d < 340) {
                    const a = Phaser.Math.Angle.Between(s.x, s.y, h.x, h.y - 30);
                    s.body.allowGravity = false;
                    s.body.setVelocity(Math.cos(a) * 520, Math.sin(a) * 520);
                }
            } else if (!s.body.allowGravity) s.body.allowGravity = true;
            if (s.y > ALTO + 40) { s.brillo.destroy(); s.destroy(); this.estrellaPerdida(); }
        }
        for (const p of this.capsulas.getChildren()) if (p.active && p.y > ALTO + 40) p.destroy();
    }

    estrellaPerdida() {
        // Una estrella que se cae por un hoyo vuelve a caer desde arriba
        this.soltarEstrellas(1);
    }

    recogerEstrella(h, s) {
        if (!s.active || h.muerto) return;
        s.brillo.destroy();
        s.destroy();
        this.combo++;
        this.tCombo = 1.6;
        this.mejorCombo = Math.max(this.mejorCombo, this.combo);
        const mult = Math.min(5, 1 + Math.floor(this.combo / 4));
        this.sumar(10 * mult, s.x, s.y - 10, mult > 1);
        Sonido.sfx('estrella', this.combo);
        this.emChispas.setParticleTint(0xffe680);
        this.emChispas.explode(6, s.x, s.y);
        if (this.combo > 0 && this.combo % 4 === 0) Bus.emit('hud:combo', mult);
        if (this.esJefe) return;
        this.estrellasPendientes--;
        Bus.emit('hud:estrellas', this.estrellasPendientes);
        if (this.estrellasPendientes <= 0) this.olaSuperada();
    }

    olaSuperada() {
        const ultima = this.ola >= this.datosRonda.olas;
        this.sumar(100 * this.ola, this.heroe.x, this.heroe.y - 80, true);
        Sonido.sfx('oleada');
        if (ultima) { this.rondaSuperada(); return; }
        Bus.emit('hud:aviso', TXT.oleadaSuperada, '', 1000);
        // Como en el juego original: cada oleada superada trae una bomba más
        this.time.delayedCall(500, () => this.soltarBomba());
        this.time.delayedCall(1100, () => !this.terminado && this.siguienteOla());
    }

    rondaSuperada() {
        this.terminado = true;
        const bono = Math.max(0, Math.round(90 - this.tRonda)) * 10;
        this.heroe.celebrando = true;
        for (const b of [...this.bombas.getChildren()]) this.time.delayedCall(Phaser.Math.Between(100, 700), () => b.active && b.explotar());
        this.time.delayedCall(800, () => {
            this.sumar(bono);
            Bus.emit('hud:aviso', TXT.rondaSuperada, `${TXT.bonoTiempo} +${bono}`, 1600);
            Sonido.sfx('victoria');
            this.emConfeti.explode(60, this.heroe.x, this.heroe.y - 40);
        });
        this.time.delayedCall(3000, () => this.cameras.main.fadeOut(400, 0, 0, 0));
        this.time.delayedCall(3450, () => this.scene.restart({ mundo: this.mundo, ronda: this.ronda + 1, herencia: this.herenciaSiguiente() }));
    }

    herenciaSiguiente() {
        return {
            puntos: this.puntos, vidas: Math.max(1, this.heroe.vidas), vidasPerdidas: this.vidasPerdidas,
            mejorCombo: this.mejorCombo, tiempo: this.herencia.tiempo + this.tRonda,
        };
    }

    sumar(n, x, y, grande) {
        this.puntos += n;
        Bus.emit('hud:puntos', this.puntos);
        if (x === undefined) return;
        const t = this.add.text(x, y, '+' + n, estiloTexto(grande ? 24 : 18, grande ? '#ffd23f' : '#ffffff')).setOrigin(0.5).setDepth(40);
        this.tweens.add({ targets: t, y: y - 40, alpha: 0, duration: 800, ease: 'Quad.easeOut', onComplete: () => t.destroy() });
    }

    /* ------------------------------------------------------------------ bombas y enemigos */

    soltarBomba(x, y) {
        const h = this.heroe;
        // Nace lejos del héroe
        if (x === undefined) x = h.x < ANCHO / 2 ? Phaser.Math.Between(ANCHO / 2 + 120, ANCHO - 80) : Phaser.Math.Between(80, ANCHO / 2 - 120);
        if (y === undefined) y = 40;
        const vel = [190, 215, 240][this.mundo];
        const b = new Bomba(this, x, y, vel);
        this.bombas.add(b);
        this.anilloExpansivo(x, y, 0xff5a3d, 1);
        return b;
    }

    escupirBomba(x, y) {
        Sonido.sfx('escupir');
        const b = this.soltarBomba(x, y);
        b.body.setVelocity(Phaser.Math.Between(-170, 170), 220);
        // Las del jefe estallan solas al rato (parpadean antes): si no, se acumularían
        this.time.delayedCall(4500, () => b.active && this.tweens.add({ targets: b, alpha: 0.35, duration: 120, yoyo: true, repeat: 5 }));
        this.time.delayedCall(6000, () => b.active && b.explotar());
    }

    tocarBomba(h, b) {
        if (!b.vivo || h.muerto) return;
        if (h.poderes.furia > 0) { b.explotar(); this.sumar(50, b.x, b.y - 20); return; }
        if (b.peligroso && h.herir(b.x)) b.explotar();
    }

    tocarEnemigo(h, e) {
        if (!e.vivo || h.muerto || (e.ignorarHasta && this.time.now < e.ignorarHasta)) return;
        if (h.poderes.furia > 0 && e.tipo !== 'jefe') { e.morir(); return; }
        // ¿Viene cayendo desde arriba? Se mira también la posición del paso anterior: a pocos
        // fotogramas por segundo, el pie puede pasar el borde de golpe
        const piePrevio = h.body.prev.y + h.body.height;
        const cae = h.body.velocity.y > 0 && (piePrevio <= e.body.top + 10 || h.body.bottom <= e.body.top + 22);
        if (cae) {
            if (e.tipo === 'jefe') {
                if (e.pisado()) { h.rebotar(780, true); h.invuln = Math.max(h.invuln, 0.6); this.polvo(h.x, h.y, 6); e.ignorarHasta = this.time.now + 400; return; }
                // Caer sobre su cabeza nunca hace daño: si no está clavado, solo rebota
                h.rebotar(this.leerSaltoMantenido() ? 640 : 520, true); Sonido.sfx('rebote'); e.ignorarHasta = this.time.now + 300; return;
            } else if (e.tipo === 'champi' && !e.congelado) {
                e.pisado(); h.rebotar(this.leerSaltoMantenido() ? 620 : 460, true); Sonido.sfx('pisar'); this.polvo(h.x, h.y, 5); return;
            } else if (e.tipo === 'mini' || (e.congelado && e.tipo !== 'pinchoso')) {
                // Cabeza de un Monocatrón o enemigo congelado: se puede usar de trampolín
                h.rebotar(520, true); Sonido.sfx('rebote'); e.ignorarHasta = this.time.now + 250; return;
            }
        }
        if (e.peligroso) h.herir(e.x);
    }

    leerSaltoMantenido() {
        const k = this.teclas;
        return k.UP.isDown || k.W.isDown || k.SPACE.isDown || k.Z.isDown || !!TouchControls.state.up;
    }

    alMatar(e) {
        this.sumar(e.puntos, e.x, e.y - 50, true);
        this.emChispas.setParticleTint(e.color);
        this.emChispas.explode(10, e.x, e.y - 20);
        this.emConfeti.explode(10, e.x, e.y - 20);
        Sonido.sfx('golpe');
    }

    /* ------------------------------------------------------------------ poderes */

    soltarPoder() {
        const h = this.heroe;
        const opciones = [...TIPOS_PODER];
        if (h.vidas < h.vidasMax) opciones.push('corazon', 'corazon');
        if (this.def.clave === 'pradera' && this.ronda === 0) opciones.splice(opciones.indexOf('furia'), 1);
        const tipo = Phaser.Utils.Array.GetRandom(opciones);
        const cols = this.columnasValidas();
        const x = Phaser.Utils.Array.GetRandom(cols) * CASILLA + 35;
        const p = this.capsulas.create(x, -30, 'poder_' + tipo).setDepth(13);
        p.tipo = tipo;
        p.body.setCircle(18, 8, 8);
        p.body.setBounceY(0.45);
        this.tweens.add({ targets: p, scale: 1.12, duration: 400, yoyo: true, repeat: -1 });
        // Parpadea y desaparece si nadie la recoge
        this.time.delayedCall(9000, () => p.active && this.tweens.add({ targets: p, alpha: 0.2, duration: 120, yoyo: true, repeat: 8, onComplete: () => p.active && p.destroy() }));
    }

    recogerPoder(h, p) {
        if (!p.active || h.muerto) return;
        const t = p.tipo;
        p.destroy();
        this.emChispas.setParticleTint(Phaser.Display.Color.HexStringToColor(Arte.PODERES[t]).color);
        this.emChispas.explode(16, p.x, p.y);
        this.anilloExpansivo(p.x, p.y, Phaser.Display.Color.HexStringToColor(Arte.PODERES[t]).color, 1.4);
        if (t === 'iman') h.poderes.iman = 9;
        else if (t === 'escudo') { h.escudo = true; Sonido.sfx('escudo'); }
        else if (t === 'reloj') { this.congelado = 5; Sonido.sfx('congelar'); this.destello(0xa0e6ff, 0.3, 400); }
        else if (t === 'furia') h.poderes.furia = 7;
        else if (t === 'botas') h.poderes.botas = 14;
        else if (t === 'corazon') { h.vidas = Math.min(h.vidasMax, h.vidas + 1); Sonido.sfx('corazon'); }
        if (t !== 'corazon' && t !== 'escudo' && t !== 'reloj') Sonido.sfx('poder');
        this.sumar(50, p.x, p.y - 20);
        Bus.emit('hud:poder', t);
        Bus.emit('hud:todo');
    }

    romperEscudo() {
        Sonido.sfx('escudo');
        this.emChispas.setParticleTint(0x9fdcff);
        this.emChispas.explode(16, this.heroe.x, this.heroe.y - 30);
        this.temblor(120, 0.006);
        Bus.emit('hud:todo');
    }

    /* ------------------------------------------------------------------ daño y vidas */

    alHerir(h) {
        this.vidasPerdidas++;
        this.combo = 0; this.tCombo = 0;
        Sonido.sfx('dano');
        this.temblor(220, 0.012);
        Bus.emit('hud:danio');
        Bus.emit('hud:todo');
        this.emChispas.setParticleTint(0xff5a6e);
        this.emChispas.explode(10, h.x, h.y - 30);
    }

    caerHoyo() {
        const h = this.heroe;
        if (this.cayendo) return;
        this.cayendo = true;
        // Caer siempre cuesta un corazón (ni el escudo ni la furia salvan de un hoyo)
        h.vidas--;
        this.alHerir(h);
        if (h.vidas <= 0) { h.morir(); return; }
        this.time.delayedCall(400, () => {
            h.body.reset(this.seguro.x, this.seguro.y - 4);
            h.body.setVelocity(0, 0);
            h.invuln = 1.6;
            this.cayendo = false;
            this.polvo(h.x, h.y, 6);
        });
    }

    alMorir() {
        this.terminado = true;
        Sonido.sfx('muerte');
        Sonido.parar();
        this.temblor(400, 0.02);
        Progreso.record(this.puntos);
        this.time.delayedCall(1800, () => {
            this.scene.pause();
            this.scene.launch('FinPartida', { mundo: this.mundo, ronda: this.ronda, herencia: { ...this.herencia } });
        });
    }

    /* ------------------------------------------------------------------ jefe */

    empezarJefe() {
        Sonido.sfx('alerta');
        Bus.emit('hud:alerta');
        this.time.delayedCall(1800, () => {
            this.jefe = new Jefe(this, this.mundo);
            this.enemigos.add(this.jefe);
        });
        // Durante el combate siguen cayendo estrellas (puntos y combos) y algún poder
        this.time.addEvent({ delay: 6500, loop: true, callback: () => !this.terminado && this.soltarEstrellas(4) });
        this.time.addEvent({ delay: 15000, loop: true, callback: () => !this.terminado && this.soltarPoder() });
    }

    golpeSuelo(x, y, fuerza) {
        this.temblor(260 * fuerza, 0.012 * fuerza);
        Sonido.sfx('temblor');
        for (const s of [-1, 1]) this.emPolvo.explode(Math.round(8 * fuerza), x + s * 50 * fuerza, y - 4);
    }

    /** Ondas de choque que corren por el suelo desde el golpe del jefe: hay que saltarlas. */
    ondasChoque(x, y) {
        // Salen un instante después del golpe, para que dé tiempo a verlas venir
        this.time.delayedCall(300, () => {
            if (this.terminado) return;
            for (const dir of [-1, 1]) {
                const o = this.add.image(x + dir * 90, y, 'onda').setOrigin(0.5, 1).setDepth(18).setTint(this.jefe ? this.jefe.color : 0xffffff).setBlendMode('ADD');
                o.dir = dir;
                this.ondas.push(o);
            }
        });
    }

    actualizarOndas(seg) {
        const h = this.heroe;
        for (const o of this.ondas) {
            o.x += o.dir * 330 * seg;
            if (Math.random() < 0.4) this.polvo(o.x, o.y, 1);
            if (!h.muerto && Math.abs(h.x - o.x) < 22 && h.body.bottom > o.y - 24) h.herir(o.x);
            if (o.x < -40 || o.x > ANCHO + 40) o.destroy();
        }
        this.ondas = this.ondas.filter((o) => o.active);
    }

    /** Rayo en la columna x: aviso parpadeante y descarga un instante después. */
    rayoEn(x, desdeY = 0, alTerminar) {
        const suelo = this.sueloDebajo(x, desdeY + 10);
        const alto = Math.min(suelo, ALTO) - desdeY;
        const aviso = this.add.rectangle(x, desdeY, 34, alto, 0xffe14a, 0.18).setOrigin(0.5, 0).setDepth(17);
        this.tweens.add({ targets: aviso, alpha: 0.45, duration: 110, yoyo: true, repeat: 3 });
        Sonido.sfx('aviso');
        this.time.delayedCall(850, () => {
            aviso.destroy();
            if (this.terminado && !this.jefe) { if (alTerminar) alTerminar(); return; }
            Sonido.sfx('rayo');
            this.destello(0xfff6c8, 0.16, 200);
            const piezas = [];
            for (let y = desdeY; y < desdeY + alto; y += 60) piezas.push(this.add.image(x + Phaser.Math.Between(-4, 4), y, 'rayo').setOrigin(0.5, 0).setDepth(26).setBlendMode('ADD').setFlipX(Math.random() < 0.5));
            this.emChispas.setParticleTint(0xfff3a0);
            this.emChispas.explode(14, x, desdeY + alto);
            const h = this.heroe;
            const tocar = () => { if (!h.muerto && Math.abs(h.x - x) < 26 && h.y > desdeY && h.y - 60 < desdeY + alto) h.herir(x); };
            tocar();
            this.time.delayedCall(120, tocar);
            this.time.delayedCall(260, () => { piezas.forEach((p) => p.destroy()); if (alTerminar) alTerminar(); });
        });
    }

    avisoRayo(x, y, alTerminar) { this.rayoEn(x, y, alTerminar); }

    chispasCabeza(x, y) {
        this.emChispas.setParticleTint(0xffe14a);
        this.emChispas.emitParticleAt(x + Phaser.Math.Between(-50, 50), y, 1);
    }

    derrotarJefe(j) {
        this.terminado = true;
        Bus.emit('hud:jefe', null);
        Sonido.parar();
        this.heroe.celebrando = true;
        for (const b of [...this.bombas.getChildren()]) b.explotar();
        for (const o of this.ondas) o.destroy();
        this.ondas = [];
        this.time.addEvent({
            delay: 140, repeat: 12, callback: () => {
                const x = j.x + Phaser.Math.Between(-70, 70), y = j.y + Phaser.Math.Between(-70, 60);
                this.explosion(x, y, j.color);
                j.setTintFill(Math.random() < 0.5 ? 0xffffff : 0xff8a8a);
                j.x += Phaser.Math.Between(-5, 5);
            },
        });
        this.time.delayedCall(1900, () => {
            this.emConfeti.explode(120, j.x, j.y);
            this.emChispas.setParticleTint(0xffe680);
            this.emChispas.explode(40, j.x, j.y);
            this.anilloExpansivo(j.x, j.y, 0xffffff, 5);
            this.destello(0xffffff, 0.6, 500);
            this.temblor(700, 0.025);
            Sonido.sfx('muerte');
            // Lluvia de estrellas para celebrarlo
            for (let i = 0; i < 14; i++) {
                const s = this.add.image(j.x, j.y, 'star').setScale(1.5).setDepth(30);
                this.tweens.add({ targets: s, x: j.x + Phaser.Math.Between(-300, 300), y: j.y - Phaser.Math.Between(80, 260), angle: 360, duration: 700, ease: 'Quad.easeOut' });
                this.tweens.add({ targets: s, alpha: 0, delay: 900, duration: 400, onComplete: () => s.destroy() });
            }
            this.sumar(2000 * (this.mundo + 1), j.x, j.y - 60, true);
            j.destroy();
            this.jefe = null;
            Sonido.musica('fin');
            Bus.emit('hud:aviso', TXT.mundoSuperado, TXT.nombres[this.mundo], 2000);
        });
        this.time.delayedCall(4600, () => this.completarMundo());
    }

    completarMundo() {
        const tiempo = this.herencia.tiempo + this.tRonda;
        const estrellas = [true, this.vidasPerdidas === 0, this.mejorCombo >= 15];
        Progreso.completar(this.mundo, estrellas.filter(Boolean).length, this.puntos);
        Progreso.record(this.puntos);
        this.scene.pause();
        this.scene.launch('Resumen', {
            mundo: this.mundo, estrellas, puntos: this.puntos, tiempo, mejorCombo: this.mejorCombo, vidasPerdidas: this.vidasPerdidas,
            herencia: { puntos: this.puntos, vidas: Math.max(3, this.heroe.vidas), vidasPerdidas: 0, mejorCombo: 0, tiempo: 0 },
        });
    }

    /* ------------------------------------------------------------------ efectos */

    polvo(x, y, n) { this.emPolvo.explode(n, x, y - 2); }

    explosion(x, y, color) {
        this.emFuego.explode(12, x, y);
        this.emHumo.explode(6, x, y);
        this.emChispas.setParticleTint(color);
        this.emChispas.explode(6, x, y);
        Sonido.sfx('explosion');
    }

    anilloExpansivo(x, y, color, escala = 1) {
        const a = this.add.image(x, y, 'anillo').setTint(color).setBlendMode('ADD').setScale(0.15).setDepth(31);
        this.tweens.add({ targets: a, scale: escala, alpha: 0, duration: 420, ease: 'Quad.easeOut', onComplete: () => a.destroy() });
    }

    temblor(ms, intensidad) { this.cameras.main.shake(ms, intensidad); }

    textoFlotante(x, y, texto) {
        const t = this.add.text(x, y, texto, estiloTexto(30, '#ffffff', { fontStyle: '700', strokeThickness: 7 })).setOrigin(0.5).setDepth(40);
        this.tweens.add({ targets: t, y: y - 50, alpha: 0, duration: 1000, ease: 'Quad.easeOut', onComplete: () => t.destroy() });
    }

    /** Destello suave a pantalla completa (sin llegar a cegar: nada de blancos totales seguidos). */
    destello(color, alfa, ms) {
        const r = this.add.rectangle(0, 0, ANCHO, ALTO, color, alfa).setOrigin(0).setDepth(45).setBlendMode('ADD');
        this.tweens.add({ targets: r, alpha: 0, duration: ms, ease: 'Quad.easeOut', onComplete: () => r.destroy() });
    }

    pausar() {
        Sonido.sfx('menu');
        this.scene.pause();
        this.scene.launch('Pausa', { mundo: this.mundo, ronda: this.ronda, herencia: this.herencia });
    }
}
