/* Escena de arranque: carga los gráficos originales, genera el arte por código y crea las
   animaciones. Con ?mundo=N&ronda=R en la URL se entra directo (útil para probar). */
class Arranque extends Phaser.Scene {
    constructor() { super('Arranque'); }

    preload() {
        const barra = this.add.rectangle(ANCHO / 2 - 160, ALTO / 2, 0, 12, 0xffd23f).setOrigin(0, 0.5);
        this.add.rectangle(ANCHO / 2, ALTO / 2, 326, 20).setStrokeStyle(3, 0xffffff);
        this.add.text(ANCHO / 2, ALTO / 2 - 36, TXT.cargando, estiloTexto(22)).setOrigin(0.5);
        this.load.on('progress', (p) => barra.setSize(320 * p, 12));
        this.load.spritesheet('dude', 'assets/dude.png', { frameWidth: 32, frameHeight: 48 });
        this.load.image('star', 'assets/star.png');
        for (const k of ['slice01_01', 'slice02_02', 'slice03_03', 'slice04_04', 'slice05_05', 'slice27_27', 'grassHalf', 'grassHalfLeft', 'grassHalfMid', 'grassHalfRight']) {
            this.load.image(k, `arte/${k}.png`);
        }
    }

    create() {
        Arte.generar(this);
        const a = this.anims;
        a.create({ key: 'izquierda', frames: a.generateFrameNumbers('dude', { start: 0, end: 3 }), frameRate: 11, repeat: -1 });
        a.create({ key: 'derecha', frames: a.generateFrameNumbers('dude', { start: 5, end: 8 }), frameRate: 11, repeat: -1 });
        a.create({ key: 'bomba_mecha', frames: a.generateFrameNumbers('bomba', { start: 0, end: 1 }), frameRate: 8, repeat: -1 });
        a.create({ key: 'champi_anda', frames: a.generateFrameNumbers('champi', { start: 0, end: 1 }), frameRate: 5, repeat: -1 });
        a.create({ key: 'pinchoso_anda', frames: a.generateFrameNumbers('pinchoso', { start: 0, end: 1 }), frameRate: 7, repeat: -1 });
        const q = new URLSearchParams(location.search);
        const mundo = parseInt(q.get('mundo'), 10);
        if (mundo >= 1 && mundo <= MUNDOS.length) this.scene.start('Juego', { mundo: mundo - 1, ronda: Math.max(0, (parseInt(q.get('ronda'), 10) || 1) - 1) });
        else this.scene.start('Menu');
    }
}
