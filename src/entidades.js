/* Personaje, bombas, enemigos y jefes de Monocatron. Cada entidad decide su movimiento en
   actualizar(seg); la escena (juego.js) gestiona colisiones, puntos y efectos. */

const FISICA = {
    gravedad: 1500, salto: 740, dobleSalto: 640, corte: 280,
    velocidad: 270, aceleracion: 2300, aceleracionAire: 1600, frenado: 2700, frenadoAire: 1100,
    caidaMax: 900, coyote: 0.1, bufferSalto: 0.13,
};

const azar = Phaser.Math.FloatBetween;
const ESCALA_HEROE = 1.4;

/* ===================================================================== */
class Heroe extends Phaser.Physics.Arcade.Sprite {
    constructor(escena, x, y) {
        super(escena, x, y, 'dude', 4);
        escena.add.existing(this);
        escena.physics.add.existing(this);
        this.escena = escena;
        this.setScale(ESCALA_HEROE).setDepth(20).setOrigin(0.5, 1);
        // Cuerpo: la gota sin las piernas abiertas (todos los fotogramas miden 32 × 48)
        this.body.setSize(18, 36).setOffset(7, 12);
        this.body.setMaxVelocity(500, FISICA.caidaMax);
        this.body.setCollideWorldBounds(true);
        this.vidas = 3; this.vidasMax = 5;
        this.dir = 1; this.enSuelo = false; this.estabaEnSuelo = false;
        this.tCoyote = 0; this.tBuffer = 0; this.cortable = false; this.saltosAereos = 0;
        this.invuln = 0; this.bajando = 0; this.bloqueo = 0; this.muerto = false; this.celebrando = false;
        this.poderes = { iman: 0, furia: 0, botas: 0 }; this.escudo = false;
        this.burbuja = escena.add.image(x, y, 'burbuja').setDepth(21).setVisible(false).setScale(0.82);
        this.estela = escena.add.particles(0, 0, 'chispa', {
            follow: this, followOffset: { x: 0, y: -30 }, lifespan: 420, speed: { min: 10, max: 60 },
            scale: { start: 0.9, end: 0 }, tint: [0xff5a6e, 0xffd23f, 0x7dff8a, 0x4fb4ff, 0xc08cff], blendMode: 'ADD', frequency: 30, emitting: false,
        }).setDepth(19);
    }

    actualizar(seg, c) {
        const b = this.body;
        this.estabaEnSuelo = this.enSuelo;
        this.enSuelo = b.blocked.down || (b.touching.down && this.sobrePlataforma);
        this.sobrePlataforma = false;
        for (const k of ['invuln', 'bajando', 'bloqueo']) this[k] = Math.max(0, this[k] - seg);
        for (const k of Object.keys(this.poderes)) this.poderes[k] = Math.max(0, this.poderes[k] - seg);
        this.burbuja.setVisible(this.escudo && !this.muerto).setPosition(this.x, this.y - 34);
        const furia = this.poderes.furia > 0;
        if (furia) this.estela.start(); else this.estela.stop();
        if (furia) this.setTint(Phaser.Display.Color.HSVToRGB((this.escena.reloj * 2) % 1, 0.55, 1).color);
        else if (this.poderes.furia === 0 && this.isTinted) this.clearTint();
        this.setAlpha(this.invuln > 0 && !this.muerto && !furia ? (Math.floor(this.invuln * 14) % 2 ? 0.35 : 1) : 1);

        if (this.muerto || this.celebrando) {
            b.setVelocityX(b.velocity.x * 0.85);
            return;
        }

        if (this.enSuelo) {
            this.tCoyote = FISICA.coyote;
            this.saltosAereos = 0;
            if (!this.estabaEnSuelo && b.velocity.y >= 0) this.aterrizar();
        } else this.tCoyote -= seg;

        const libre = this.bloqueo <= 0;
        if (libre && c.saltar) this.tBuffer = FISICA.bufferSalto; else this.tBuffer -= seg;

        const eje = libre ? (c.der ? 1 : 0) - (c.izq ? 1 : 0) : 0;
        const objetivo = eje * FISICA.velocidad;
        const acel = eje !== 0 ? (this.enSuelo ? FISICA.aceleracion : FISICA.aceleracionAire) : (this.enSuelo ? FISICA.frenado : FISICA.frenadoAire);
        const vx = b.velocity.x;
        const paso = Math.abs(vx) > FISICA.velocidad + 5 ? FISICA.frenadoAire * seg : acel * seg;
        b.setVelocityX(vx < objetivo ? Math.min(objetivo, vx + paso) : Math.max(objetivo, vx - paso));
        if (eje !== 0) this.dir = eje;

        if (this.tBuffer > 0) {
            if (c.abajo && this.enSuelo && this.escena.sobreFina(this)) {
                this.bajando = 0.25; this.tBuffer = 0;
                b.setVelocityY(60);
            } else if (this.tCoyote > 0) {
                this.saltar(FISICA.salto);
                Sonido.sfx('salto');
                this.escena.polvo(this.x, this.y, 6);
            } else if (this.poderes.botas > 0 && this.saltosAereos < 1) {
                this.saltosAereos++;
                this.saltar(FISICA.dobleSalto);
                Sonido.sfx('doble');
                this.escena.anilloExpansivo(this.x, this.y - 10, 0x7dff8a, 1);
            }
        }
        if (c.bajarYa && this.enSuelo && this.escena.sobreFina(this)) { this.bajando = 0.25; b.setVelocityY(60); }
        if (this.cortable && !c.saltarMantenido && b.velocity.y < -FISICA.corte) {
            b.setVelocityY(-FISICA.corte);
            this.cortable = false;
        }
        if (b.velocity.y >= 0) this.cortable = false;
        this.animar();
    }

    saltar(v) {
        this.body.setVelocityY(-v);
        this.tCoyote = 0; this.tBuffer = 0;
        this.cortable = true;
        // Estirarse al saltar
        this.escena.tweens.killTweensOf(this);
        this.setScale(ESCALA_HEROE * 0.82, ESCALA_HEROE * 1.2);
        this.escena.tweens.add({ targets: this, scaleX: ESCALA_HEROE, scaleY: ESCALA_HEROE, duration: 220, ease: 'Quad.easeOut' });
    }

    rebotar(v, mantener) {
        this.body.setVelocityY(-v);
        this.cortable = !!mantener;
        this.saltosAereos = 0;
    }

    aterrizar() {
        this.escena.polvo(this.x, this.y, 4);
        // Aplastarse al caer
        this.escena.tweens.killTweensOf(this);
        this.setScale(ESCALA_HEROE * 1.22, ESCALA_HEROE * 0.78);
        this.escena.tweens.add({ targets: this, scaleX: ESCALA_HEROE, scaleY: ESCALA_HEROE, duration: 200, ease: 'Back.easeOut' });
    }

    animar() {
        const vx = this.body.velocity.x;
        if (!this.enSuelo) {
            this.anims.stop();
            this.setFrame(this.dir < 0 ? 1 : 6);
            return;
        }
        if (Math.abs(vx) > 30) {
            const clave = vx < 0 ? 'izquierda' : 'derecha';
            if (this.anims.currentAnim?.key !== clave || !this.anims.isPlaying) this.play(clave, true);
            this.anims.timeScale = Phaser.Math.Clamp(Math.abs(vx) / 200, 0.6, 1.4);
        } else {
            this.anims.stop();
            this.setFrame(4);
        }
    }

    /** Devuelve true si el golpe quitó un corazón. */
    herir(desdeX) {
        if (this.invuln > 0 || this.muerto || this.celebrando || this.poderes.furia > 0) return false;
        const dir = this.x < desdeX ? -1 : 1;
        this.body.setVelocity(dir * 300, -380);
        this.cortable = false;
        if (this.escudo) {
            this.escudo = false;
            this.invuln = 1;
            this.escena.romperEscudo();
            return false;
        }
        this.vidas--;
        this.invuln = 1.6;
        this.bloqueo = 0.2;
        this.escena.alHerir(this);
        if (this.vidas <= 0) this.morir();
        return true;
    }

    morir() {
        this.muerto = true;
        this.anims.stop();
        this.setFrame(4);
        this.body.setVelocity(0, -520);
        this.body.checkCollision.none = true;
        this.setTint(0xff7a8a);
        this.escena.tweens.add({ targets: this, angle: 540, duration: 1300 });
        this.escena.alMorir();
    }
}

/* ===================================================================== */
/* Bomba: rebota en línea recta como en el juego original. Al recoger una oleada, una más. */
class Bomba extends Phaser.Physics.Arcade.Sprite {
    constructor(escena, x, y, vel) {
        super(escena, x, y, 'bomba', 0);
        escena.add.existing(this);
        escena.physics.add.existing(this);
        this.escena = escena;
        this.tipo = 'bomba';
        this.setDepth(15).setScale(1.05);
        this.body.setCircle(14, 10, 15);
        this.body.allowGravity = false;
        this.body.setBounce(1, 1).setCollideWorldBounds(true);
        this.vel = vel;
        const a = azar(0.35, 1.2) * (Math.random() < 0.5 ? 1 : -1);
        this.body.setVelocity(Math.sin(a) * vel, Math.abs(Math.cos(a)) * vel);
        this.play('bomba_mecha');
        this.vivo = true;
    }

    actualizar(seg) {
        if (!this.vivo) return;
        const b = this.body;
        const congelada = this.escena.congelado > 0;
        if (congelada) {
            if (!this.guardada) { this.guardada = { x: b.velocity.x, y: b.velocity.y }; b.setVelocity(0, 0); this.setTint(0x9fe8ff); this.anims.pause(); }
            return;
        }
        if (this.guardada) { b.setVelocity(this.guardada.x, this.guardada.y); this.guardada = null; this.clearTint(); this.anims.resume(); }
        // Nunca demasiado horizontal ni demasiado lenta: si no, se queda pegada a un suelo
        const v = Math.hypot(b.velocity.x, b.velocity.y) || 1;
        if (Math.abs(b.velocity.y) < this.vel * 0.3) b.velocity.y = (b.velocity.y < 0 ? -1 : 1) * this.vel * 0.3;
        if (Math.abs(v - this.vel) > 5) { const k = this.vel / Math.hypot(b.velocity.x, b.velocity.y); b.velocity.x *= k; b.velocity.y *= k; }
        // Rebota en el fondo de la pantalla (el mundo no tiene suelo, para que los hoyos funcionen)
        if (this.y > ALTO - 18 && b.velocity.y > 0) b.velocity.y = -b.velocity.y;
        if (this.y < 76 && b.velocity.y < 0) b.velocity.y = -b.velocity.y;
        this.rotation += b.velocity.x * seg * 0.02;
    }

    get peligroso() { return this.vivo && !(this.escena.congelado > 0); }

    explotar() {
        if (!this.vivo) return;
        this.vivo = false;
        this.escena.explosion(this.x, this.y, 0x4a4f63);
        this.destroy();
    }
}

/* ===================================================================== */
class Enemigo extends Phaser.Physics.Arcade.Sprite {
    constructor(escena, x, y, tex, o) {
        super(escena, x, y, tex, 0);
        escena.add.existing(this);
        escena.physics.add.existing(this);
        this.escena = escena;
        this.tipo = o.tipo;
        this.puntos = o.puntos;
        this.color = o.color;
        this.pisable = o.pisable;
        this.vivo = true;
        this.setDepth(14).setOrigin(0.5, 1);
    }

    get congelado() { return this.escena.congelado > 0; }
    get peligroso() { return this.vivo && !this.congelado; }

    congelar() {
        if (this.congelado) {
            if (!this.estabaCongelado) { this.estabaCongelado = true; this.setTint(0x9fe8ff); this.anims.pause(); if (this.body.allowGravity) this.body.setVelocityX(0); }
            return true;
        }
        if (this.estabaCongelado) { this.estabaCongelado = false; this.clearTint(); this.anims.resume(); }
        return false;
    }

    morir() {
        if (!this.vivo) return;
        this.vivo = false;
        this.body.enable = false;
        this.escena.alMatar(this);
        this.escena.tweens.add({ targets: this, alpha: 0, y: this.y - 10, duration: 300, delay: 250, onComplete: () => this.destroy() });
    }
}

/** Andarín: patrulla su suelo y se da la vuelta en los bordes y en las paredes. */
class Andarin extends Enemigo {
    constructor(escena, x, y, tipo) {
        const o = tipo === 'champi'
            ? { tipo, puntos: 100, color: 0xff6a5a, pisable: true }
            : { tipo, puntos: 200, color: 0x9b7bd9, pisable: false };
        super(escena, x, y, tipo, o);
        this.vel = tipo === 'champi' ? 70 : 105;
        this.dir = Math.random() < 0.5 ? -1 : 1;
        if (tipo === 'champi') this.body.setSize(34, 30).setOffset(7, 14);
        else this.body.setSize(38, 24).setOffset(8, 20);
        this.play(tipo + '_anda');
        this.tCarga = azar(3, 6);
    }

    actualizar(seg) {
        if (!this.vivo || this.congelar()) return;
        const b = this.body;
        if (b.blocked.down) {
            // ¿Hay suelo un poco por delante? Si no, media vuelta
            if (!this.escena.haySuelo(this.x + this.dir * 24, this.y + 4) || (this.dir < 0 && b.blocked.left) || (this.dir > 0 && b.blocked.right)) this.dir *= -1;
            let v = this.vel;
            // El Pinchoso embiste a ratos si el héroe está en su altura
            if (this.tipo === 'pinchoso') {
                this.tCarga -= seg;
                const h = this.escena.heroe;
                if (this.tCarga <= 0 && Math.abs(h.y - this.y) < 30 && Math.abs(h.x - this.x) < 300) {
                    this.dir = Math.sign(h.x - this.x) || 1; this.tCarga = azar(3.5, 6); this.cargando = 0.9;
                    this.setTint(0xffb0b0); this.escena.time.delayedCall(150, () => this.vivo && !this.congelado && this.clearTint());
                }
                if (this.cargando > 0) { this.cargando -= seg; v = 230; }
            }
            b.setVelocityX(this.dir * v);
        }
        this.setFlipX(this.dir > 0);
    }

    pisado() {
        if (this.tipo !== 'champi') return false;
        this.anims.stop();
        this.setFrame(2);
        this.morir();
        return true;
    }
}

/** Monocatrón pequeño: espera arriba y cae en picado cuando pasas por debajo. */
class MiniMono extends Enemigo {
    constructor(escena, x, y) {
        super(escena, x, y, 'mono_mini', { tipo: 'mini', puntos: 300, color: 0x9aa3b6, pisable: false });
        this.setOrigin(0.5, 0.5);
        this.body.allowGravity = false;
        this.body.setSize(60, 60).setOffset(6, 6);
        this.casa = { x, y };
        this.estado = 'espera';
        this.t = azar(0, 3);
    }

    actualizar(seg) {
        if (!this.vivo || this.congelar()) return;
        this.t += seg;
        const h = this.escena.heroe;
        const b = this.body;
        if (this.estado === 'espera') {
            this.y = this.casa.y + Math.sin(this.t * 2) * 4;
            b.setVelocity(0, 0);
            this.setFrame(0);
            if (!h.muerto && Math.abs(h.x - this.x) < 60 && h.y > this.y + 30) { this.estado = 'aviso'; this.tEstado = 0.35; this.setFrame(1); }
        } else if (this.estado === 'aviso') {
            this.tEstado -= seg;
            this.x = this.casa.x + Math.sin(this.t * 60) * 3;
            if (this.tEstado <= 0) {
                this.x = this.casa.x;
                this.estado = 'cae'; this.vy = 200;
                this.suelo = this.escena.sueloDebajo(this.x, this.y + 36, 30) - 36;
            }
        } else if (this.estado === 'cae') {
            this.vy = Math.min(1100, this.vy + 2600 * seg);
            this.y += this.vy * seg;
            if (this.y >= this.suelo) {
                this.y = this.suelo;
                this.estado = 'suelo'; this.tEstado = 1;
                this.escena.golpeSuelo(this.x, this.y + 36, 0.6);
            }
        } else if (this.estado === 'suelo') {
            this.tEstado -= seg;
            if (this.tEstado <= 0) { this.estado = 'sube'; this.setFrame(0); }
        } else if (this.estado === 'sube') {
            this.y -= 140 * seg;
            if (this.y <= this.casa.y) { this.y = this.casa.y; this.estado = 'espera'; }
        }
        b.reset(this.x, this.y);
    }

    /** Su cabeza es un sitio seguro: rebotar encima no hace daño (ni a él). */
    pisado() { return false; }
}

/** Nube de tormenta: flota arriba y, tras avisar, lanza un rayo en su columna. */
class Nube extends Enemigo {
    constructor(escena, x, y) {
        super(escena, x, y, 'nube', { tipo: 'nube', puntos: 400, color: 0x8a8fb8, pisable: false });
        this.setOrigin(0.5, 0.5).setDepth(16);
        this.body.allowGravity = false;
        this.body.setSize(90, 40).setOffset(15, 22);
        this.casa = { x, y };
        this.t = azar(0, 6);
        this.tRayo = azar(3, 5);
        this.dir = Math.random() < 0.5 ? -1 : 1;
    }

    // Tocarla no hace daño (pasa a la altura de la cabeza sobre las plataformas altas): el peligro es su rayo
    get peligroso() { return false; }

    actualizar(seg) {
        if (!this.vivo || this.congelar()) return;
        this.t += seg;
        if (!this.cargando) {
            this.x += this.dir * 40 * seg;
            if (this.x < 90) this.dir = 1;
            if (this.x > ANCHO - 90) this.dir = -1;
        }
        this.y = this.casa.y + Math.sin(this.t * 1.5) * 6;
        this.body.reset(this.x, this.y);
        this.tRayo -= seg;
        if (this.tRayo <= 0 && !this.cargando) {
            this.cargando = true;
            this.setFrame(1);
            this.escena.avisoRayo(this.x, this.y + 30, () => {
                this.cargando = false;
                this.setFrame(0);
                this.tRayo = azar(3.5, 5.5);
            });
        }
    }
}

/* ===================================================================== */
/* El Monocatrón jefe. Ciclo: flota siguiéndote → su sombra se pone roja → cae en picado →
   se queda clavado y mareado (con una flecha encima) → si le saltas en la cabeza, pierde vida.
   Solo hace daño al caer y al embestir; flotando, subiendo o clavado es inofensivo. */
const ESTADOS_PELIGROSOS = new Set(['entrada', 'cae', 'embiste']);

class Jefe extends Phaser.Physics.Arcade.Sprite {
    constructor(escena, mundo) {
        const def = MUNDOS[mundo].jefe;
        super(escena, ANCHO / 2, -200, 'mono_jefe_' + def.paleta, 1);
        escena.add.existing(this);
        escena.physics.add.existing(this);
        this.escena = escena;
        this.mundo = mundo;
        this.tipo = 'jefe';
        this.color = def.color;
        this.vida = this.vidaMax = def.vida;
        this.vivo = true;
        this.setDepth(13);
        this.body.allowGravity = false;
        this.body.setSize(150, 150).setOffset(15, 15);
        this.suelo = 560 - 80;          // centro cuando apoya en el suelo (mide 160)
        this.hundido = this.suelo + 40;  // clavado: la cabeza queda a 120 px del suelo
        this.altoFlotar = 150;
        this.estado = 'entrada'; this.t = 0; this.tEstado = 0; this.ciclos = 0; this.mareos = 0;
        this.vy = 0;
        // Sombra en el suelo: dice dónde va a caer
        this.sombra = escena.add.image(this.x, 562, 'sombra').setDepth(4).setTint(0x2b2235).setAlpha(0);
        // Señal sobre la cabeza cuando se puede pisar
        this.senal = escena.add.container(this.x, this.y).setDepth(35).setVisible(false);
        this.senal.add([
            escena.add.image(0, 0, 'flecha'),
            escena.add.text(0, -54, TXT.saltaEncima, estiloTexto(24, '#ffd23f', { fontStyle: '700', strokeThickness: 6 })).setOrigin(0.5),
        ]);
        escena.tweens.add({ targets: this.senal.list[0], y: 12, duration: 300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        this.flechaEmbestida = escena.add.image(this.x, this.y, 'flecha').setDepth(35).setVisible(false).setTint(0xff4f6e);
        Bus.emit('hud:jefe', TXT.jefes[mundo], 1);
    }

    get peligroso() { return this.vivo && ESTADOS_PELIGROSOS.has(this.estado); }
    get furioso() { return this.vida <= Math.ceil(this.vidaMax / 2); }

    actualizar(seg) {
        if (!this.vivo) return;
        this.t += seg;
        const h = this.escena.heroe;
        const rapidez = this.furioso ? 1.2 : 1;
        switch (this.estado) {
            case 'entrada':
                this.vy = Math.min(1300, this.vy + 2400 * seg);
                this.y += this.vy * seg;
                if (this.y >= this.suelo) {
                    this.y = this.suelo; this.golpe(true);
                    this.estado = 'grito'; this.tEstado = 1.4;
                    Bus.emit('hud:pista', TXT.jefeIntro);
                }
                break;
            case 'grito':
                this.tEstado -= seg;
                this.x = ANCHO / 2 + Math.sin(this.t * 50) * 3;
                if (this.tEstado <= 0) { this.x = ANCHO / 2; this.estado = 'sube'; }
                break;
            case 'sube':
                this.setFrame(this.furioso ? 1 : 0);
                this.y -= 300 * seg;
                if (this.y <= this.altoFlotar) {
                    this.y = this.altoFlotar; this.estado = 'flota';
                    // En la tormenta flota más rato: los rayos tienen que acabar antes de que avise de su caída
                    this.tEstado = Phaser.Math.FloatBetween(1.6, 2.4) / rapidez + (this.mundo === 2 ? 0.9 : 0);
                    this.tFlota = 0; this.rayosPendientes = 0;
                    this.colaRayos = this.mundo === 2 ? (this.furioso ? [0.2, 0.62, 1.04] : [0.2, 0.62]) : [];
                }
                break;
            case 'flota': {
                this.setFrame(this.furioso ? 1 : 0);
                this.tEstado -= seg;
                // No baja debajo de los escalones laterales: ahí no se le podría pisar bien
                const objetivo = Phaser.Math.Clamp(h.x, 215, ANCHO - 215);
                this.x += (objetivo - this.x) * Math.min(1, seg * 2 * rapidez);
                this.y = this.altoFlotar + Math.sin(this.t * 3) * 8;
                if (this.mundo === 1 && !this.atacoEnFlota && this.tEstado < 0.9) {
                    this.atacoEnFlota = true;
                    this.escena.escupirBomba(this.x, this.y + 70);
                } else if (this.mundo === 2) {
                    // Los rayos salen al empezar a flotar y no avisa de su caída hasta que han caído todos
                    this.tFlota += seg;
                    while (this.colaRayos.length && this.colaRayos[0] <= this.tFlota) {
                        this.colaRayos.shift();
                        this.rayosPendientes++;
                        this.escena.rayoEn(Phaser.Math.Clamp(h.x + Phaser.Math.FloatBetween(-170, 170), 60, ANCHO - 60), 0, () => { this.rayosPendientes--; });
                    }
                }
                if (this.tEstado <= 0 && !this.rayosPendientes && !this.colaRayos.length) {
                    this.atacoEnFlota = false;
                    this.ciclos++;
                    if (this.mundo >= 1 && this.ciclos % 3 === 0) {
                        // Antes de embestir se va al lado contrario: la embestida cruza la pantalla y da tiempo a verla venir
                        this.estado = 'aLado'; this.ladoX = h.x < ANCHO / 2 ? ANCHO - 170 : 170;
                    }
                    else { this.estado = 'aviso'; this.tEstado = [0.85, 0.7, 0.6][this.mundo] / rapidez; this.setFrame(1); Sonido.sfx('aviso'); }
                }
                break;
            }
            case 'aviso':
                this.tEstado -= seg;
                this.x += Math.sin(this.t * 70) * 2.5;
                if (this.tEstado <= 0) { this.estado = 'cae'; this.vy = 300; }
                break;
            case 'cae':
                this.vy = Math.min(1500, this.vy + 3400 * seg);
                this.y += this.vy * seg;
                if (this.y >= this.hundido) {
                    this.y = this.hundido;
                    this.golpe(false);
                    this.estado = 'aturdido'; this.tEstado = [2.8, 2.3, 2.0][this.mundo];
                    this.setFrame(2);
                    this.mareos++;
                }
                break;
            case 'aturdido':
                this.tEstado -= seg;
                if (Math.random() < 0.25) this.escena.chispasCabeza(this.x, this.y - 86);
                // En el último medio segundo tiembla: está a punto de soltarse
                if (this.tEstado < 0.5) this.x += Math.sin(this.t * 60) * 1.5;
                if (this.tEstado <= 0) { this.estado = 'sube'; this.setFrame(1); }
                break;
            case 'golpeado':
                this.tEstado -= seg;
                if (this.tEstado <= 0) this.estado = 'sube';
                break;
            case 'aLado': {
                this.setFrame(1);
                const paso = 620 * seg, dx = this.ladoX - this.x;
                this.x += Math.sign(dx) * Math.min(Math.abs(dx), paso);
                this.y = this.altoFlotar + Math.sin(this.t * 3) * 8;
                if (Math.abs(dx) <= paso) this.estado = 'bajaEmbestir';
                break;
            }
            case 'bajaEmbestir':
                // Baja hasta quedar medio hundido: así la embestida se puede saltar
                this.setFrame(1);
                this.y += 520 * seg;
                if (this.y >= this.hundido) {
                    this.y = this.hundido;
                    this.golpe(false, true);
                    this.estado = 'preparaEmbestida'; this.dirEmbestida = h.x < this.x ? -1 : 1; this.vx = 0; this.tEstado = 0.95;
                    // Mientras embiste, el golpe es algo más bajo y estrecho que el dibujo: saltarlo perdona
                    this.body.setSize(120, 135).setOffset(20, 30);
                    if (!this.explicoEmbestida) { this.explicoEmbestida = true; Bus.emit('hud:pista', TXT.jefeEmbestida); }
                    Sonido.sfx('aviso');
                }
                break;
            case 'preparaEmbestida':
                this.tEstado -= seg;
                this.x += Math.sin(this.t * 60) * 2;
                if (Math.random() < 0.4) this.escena.polvo(this.x - this.dirEmbestida * 70, this.y + 78, 1);
                if (this.tEstado <= 0) this.estado = 'embiste';
                break;
            case 'embiste':
                this.vx = Math.min(390, this.vx + 1000 * seg);
                this.x += this.dirEmbestida * this.vx * seg;
                if (Math.random() < 0.5) this.escena.polvo(this.x - this.dirEmbestida * 70, this.y + 78, 1);
                if (this.x < 95 || this.x > ANCHO - 95) {
                    this.x = Phaser.Math.Clamp(this.x, 95, ANCHO - 95);
                    this.escena.temblor(250, 0.012);
                    Sonido.sfx('temblor');
                    this.body.setSize(150, 150).setOffset(15, 15);
                    this.estado = 'sube';
                }
                break;
        }
        this.body.reset(this.x, this.y);
        // Clavado en el suelo: se dibuja detrás de las casillas para que se vea hundido
        this.setDepth(this.y >= this.hundido - 2 ? 4 : 13);
        this.actualizarSenales();
    }

    actualizarSenales() {
        // Sombra: crece y se oscurece al bajar; roja y latiendo justo antes de caer
        const altura = Math.max(0, this.suelo - this.y);
        const enSuelo = altura < 4;
        this.sombra.setPosition(this.x, 562).setVisible(!enSuelo && this.vivo);
        const k = 1 - Math.min(1, altura / 450);
        this.sombra.setScale(0.6 + k * 0.5, 1);
        if (this.estado === 'aviso' || this.estado === 'cae') {
            this.sombra.setTint(0xff2a4a).setAlpha(0.55 + Math.sin(this.t * 30) * 0.25);
        } else {
            this.sombra.setTint(0x2b2235).setAlpha(0.15 + k * 0.35);
        }
        this.senal.setVisible(this.estado === 'aturdido').setPosition(this.x, this.y - 150);
        const prep = this.estado === 'preparaEmbestida';
        this.flechaEmbestida.setVisible(prep).setPosition(this.x + this.dirEmbestida * 120, this.y).setAngle(this.dirEmbestida > 0 ? -90 : 90);
    }

    /** Golpe contra el suelo: temblor, polvo y, en los mundos 2 y 3, más peligros. */
    golpe(entrada, suave) {
        this.escena.golpeSuelo(this.x, 560, entrada ? 1.4 : 1);
        if (!entrada && !suave && this.mundo >= 2) this.escena.ondasChoque(this.x, 560);
    }

    /** Pisotón en la cabeza mientras está clavado. */
    pisado() {
        if (this.estado !== 'aturdido' || !this.vivo) return false;
        this.vida--;
        Sonido.sfx('jefeGolpe');
        Bus.emit('hud:jefe', TXT.jefes[this.mundo], this.vida / this.vidaMax);
        this.setTintFill(0xffffff);
        this.escena.time.delayedCall(90, () => this.vivo && this.clearTint());
        this.escena.temblor(300, 0.015);
        this.escena.anilloExpansivo(this.x, this.y - 80, 0xffffff, 2);
        // Se aplasta un instante
        this.escena.tweens.add({ targets: this, scaleY: 0.82, scaleX: 1.12, duration: 90, yoyo: true });
        if (this.vida <= 0) {
            this.vivo = false;
            this.estado = 'muere';
            this.setFrame(2);
            this.limpiarSenales();
            this.escena.derrotarJefe(this);
        } else {
            this.estado = 'golpeado'; this.tEstado = 0.5;
            this.setFrame(1);
            this.escena.textoFlotante(this.x, this.y - 130, `${this.vida} / ${this.vidaMax}`);
        }
        return true;
    }

    limpiarSenales() {
        this.sombra.destroy(); this.senal.destroy(); this.flechaEmbestida.destroy();
    }

    destroy(fromScene) {
        if (this.sombra && this.sombra.active) this.limpiarSenales();
        super.destroy(fromScene);
    }
}
