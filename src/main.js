/* Punto de entrada: espera a la fuente y arranca Phaser. */
function arrancar() {
    TouchControls.init([
        { name: 'left', label: '◀', side: 'left', aria: 'Left' },
        { name: 'right', label: '▶', side: 'left', aria: 'Right' },
        { name: 'down', label: '▼', side: 'right', aria: 'Down' },
        { name: 'up', label: '▲', side: 'right', aria: 'Jump' },
    ]);
    window.juego = new Phaser.Game({
        type: Phaser.AUTO,
        width: ANCHO,
        height: ALTO,
        parent: 'juego',
        backgroundColor: '#1a1428',
        scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
        physics: { default: 'arcade', arcade: { gravity: { y: FISICA.gravedad }, debug: new URLSearchParams(location.search).has('debug') } },
        input: { activePointers: 3 },
        scene: [Arranque, Menu, Juego, HUD, Pausa, Resumen, FinPartida, Final],
    });
}

const fuente = new FontFace('Fredoka', 'url(fuente/Fredoka.ttf)', { weight: '300 700' });
fuente.load()
    .then((f) => { document.fonts.add(f); arrancar(); })
    .catch(arrancar);
