/* Sonido de Monocatron con WebAudio: los sonidos originales del juego (salto, estrellas,
   explosión y la música de fondo para el mundo 1), más efectos y temas chiptune generados.
   El navegador solo deja sonar audio tras un gesto del jugador (Sonido.iniciar). */
const Sonido = (() => {
    const CLAVE = 'monocatron-sonido';
    let activo = true;
    try { activo = localStorage.getItem(CLAVE) !== 'no'; } catch (e) { /* sin almacenamiento */ }

    let ctx = null, maestro = null, busSfx = null, busMusica = null, ruidoBuffer = null;
    const muestras = {};
    let pendiente = null;

    function iniciar() {
        if (ctx) {
            if (ctx.state === 'suspended') ctx.resume();
            return;
        }
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        ctx = new AC();
        const comp = ctx.createDynamicsCompressor();
        comp.threshold.value = -14; comp.ratio.value = 4;
        comp.connect(ctx.destination);
        maestro = ctx.createGain();
        maestro.gain.value = activo ? 1 : 0;
        maestro.connect(comp);
        busSfx = ctx.createGain(); busSfx.gain.value = 0.55; busSfx.connect(maestro);
        busMusica = ctx.createGain(); busMusica.gain.value = 0.24; busMusica.connect(maestro);
        ruidoBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
        const datos = ruidoBuffer.getChannelData(0);
        for (let i = 0; i < datos.length; i++) datos[i] = Math.random() * 2 - 1;
        cargar('salto', 'sounds/salto.mp3');
        cargar('estrellas', 'sounds/songestrella.mp3');
        cargar('explosion', 'sounds/explosion.mp3');
        cargar('musica', 'sounds/songfondo.mp3');
        if (pendiente) { const p = pendiente; pendiente = null; musica(p); }
    }

    function cargar(nombre, archivo) {
        fetch(archivo).then((r) => r.arrayBuffer()).then((b) => ctx.decodeAudioData(b)).then((buf) => {
            muestras[nombre] = buf;
            if (nombre === 'musica' && actual === 'original') { actual = null; musica('original'); }
        }).catch(() => { /* sin el archivo, solo lo sintetizado */ });
    }

    function tono({ tipo = 'square', f0 = 440, f1 = f0, dur = 0.12, vol = 0.25, retardo = 0, bus = busSfx }) {
        if (!ctx) return;
        const t = ctx.currentTime + retardo;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = tipo;
        osc.frequency.setValueAtTime(f0, t);
        if (f1 !== f0) osc.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(vol, t + 0.006);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        osc.connect(g); g.connect(bus);
        osc.start(t); osc.stop(t + dur + 0.02);
    }

    function ruido({ dur = 0.15, vol = 0.3, f0 = 2000, f1 = 300, tipo = 'lowpass', retardo = 0, bus = busSfx }) {
        if (!ctx) return;
        const t = ctx.currentTime + retardo;
        const src = ctx.createBufferSource();
        src.buffer = ruidoBuffer;
        const filtro = ctx.createBiquadFilter();
        filtro.type = tipo;
        filtro.frequency.setValueAtTime(f0, t);
        filtro.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
        const g = ctx.createGain();
        g.gain.setValueAtTime(vol, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        src.connect(filtro); filtro.connect(g); g.connect(bus);
        src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.02);
    }

    function muestra(nombre, vol = 0.5, velocidad = 1) {
        const buf = muestras[nombre];
        if (!ctx || !buf) return false;
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.playbackRate.value = velocidad;
        const g = ctx.createGain();
        g.gain.value = vol;
        src.connect(g); g.connect(busSfx);
        src.start();
        return true;
    }

    const nota = (n) => 440 * Math.pow(2, (n - 69) / 12);
    const ultimo = {};
    const limite = { estrella: 0.03, rebote: 0.08, golpe: 0.05 };

    const EFECTOS = {
        salto: () => { if (!muestra('salto', 0.35, 1.05)) tono({ f0: 300, f1: 700, dur: 0.12, vol: 0.12 }); },
        doble: () => { tono({ tipo: 'triangle', f0: 600, f1: 1300, dur: 0.12, vol: 0.14 }); tono({ tipo: 'sine', f0: 900, f1: 1800, dur: 0.1, vol: 0.08, retardo: 0.04 }); },
        // Cada estrella seguida sube un semitono: el combo se oye
        estrella: (combo = 0) => { const n = 84 + Math.min(combo, 14); tono({ tipo: 'square', f0: nota(n), dur: 0.05, vol: 0.06 }); tono({ tipo: 'square', f0: nota(n + 7), dur: 0.1, vol: 0.06, retardo: 0.045 }); },
        oleada: () => { if (!muestra('estrellas', 0.5)) [72, 76, 79, 84].forEach((n, i) => tono({ tipo: 'triangle', f0: nota(n), dur: 0.2, vol: 0.15, retardo: i * 0.08 })); },
        rebote: () => tono({ tipo: 'sine', f0: 180, f1: 90, dur: 0.08, vol: 0.12 }),
        pisar: () => { tono({ tipo: 'triangle', f0: 260, f1: 80, dur: 0.14, vol: 0.28 }); ruido({ dur: 0.06, vol: 0.12, f0: 1500, f1: 200 }); },
        golpe: () => { ruido({ dur: 0.1, vol: 0.28, f0: 3000, f1: 400 }); tono({ tipo: 'square', f0: 320, f1: 120, dur: 0.08, vol: 0.12 }); },
        dano: () => { if (!muestra('explosion', 0.45, 1.25)) ruido({ dur: 0.3, vol: 0.3, f0: 1500, f1: 80 }); tono({ tipo: 'sawtooth', f0: 300, f1: 70, dur: 0.3, vol: 0.14 }); },
        muerte: () => { muestra('explosion', 0.7, 0.9); tono({ tipo: 'square', f0: 520, f1: 60, dur: 0.9, vol: 0.15 }); },
        explosion: () => { if (!muestra('explosion', 0.35, 1.4 + Math.random() * 0.2)) ruido({ dur: 0.3, vol: 0.3, f0: 1500, f1: 80 }); },
        poder: () => [60, 64, 67, 72, 76, 79, 84].forEach((n, i) => tono({ tipo: 'square', f0: nota(n + 12), dur: 0.12, vol: 0.08, retardo: i * 0.05 })),
        corazon: () => [72, 76, 79, 84].forEach((n, i) => tono({ tipo: 'triangle', f0: nota(n), dur: 0.16, vol: 0.18, retardo: i * 0.07 })),
        escudo: () => { tono({ tipo: 'sine', f0: 900, f1: 300, dur: 0.3, vol: 0.2 }); ruido({ dur: 0.25, vol: 0.12, f0: 7000, f1: 1500, tipo: 'highpass' }); },
        congelar: () => { ruido({ dur: 0.6, vol: 0.2, f0: 9000, f1: 3000, tipo: 'highpass' }); [96, 91, 88, 84].forEach((n, i) => tono({ tipo: 'sine', f0: nota(n), dur: 0.2, vol: 0.08, retardo: i * 0.06 })); },
        temblor: () => { ruido({ dur: 0.5, vol: 0.4, f0: 700, f1: 40 }); tono({ tipo: 'sine', f0: 100, f1: 35, dur: 0.45, vol: 0.4 }); },
        aviso: () => tono({ tipo: 'square', f0: 880, f1: 660, dur: 0.12, vol: 0.06 }),
        rayo: () => { ruido({ dur: 0.7, vol: 0.45, f0: 6000, f1: 200 }); tono({ tipo: 'sawtooth', f0: 120, f1: 40, dur: 0.6, vol: 0.2 }); },
        jefeGolpe: () => { tono({ tipo: 'square', f0: 200, f1: 70, dur: 0.25, vol: 0.2 }); ruido({ dur: 0.2, vol: 0.25, f0: 2500, f1: 200 }); },
        escupir: () => { tono({ tipo: 'sine', f0: 300, f1: 90, dur: 0.18, vol: 0.2 }); ruido({ dur: 0.1, vol: 0.12, f0: 800, f1: 200, tipo: 'bandpass' }); },
        menu: () => tono({ f0: nota(84), dur: 0.05, vol: 0.07 }),
        elegir: () => { tono({ f0: nota(79), dur: 0.06, vol: 0.09 }); tono({ f0: nota(86), dur: 0.12, vol: 0.09, retardo: 0.06 }); },
        estrellaResumen: () => [79, 84, 91].forEach((n, i) => tono({ tipo: 'triangle', f0: nota(n), dur: 0.25, vol: 0.16, retardo: i * 0.05 })),
        victoria: () => [72, 76, 79, 84, 79, 84, 88].forEach((n, i) => tono({ f0: nota(n), dur: i === 6 ? 0.6 : 0.13, vol: 0.12, retardo: i * 0.12 })),
        alerta: () => [0, 0.4, 0.8].forEach((r) => tono({ tipo: 'square', f0: 660, f1: 330, dur: 0.32, vol: 0.12, retardo: r })),
    };

    function sfx(nombre, arg) {
        if (!ctx || !activo) return;
        const t = ctx.currentTime;
        if (limite[nombre] && ultimo[nombre] && t - ultimo[nombre] < limite[nombre]) return;
        ultimo[nombre] = t;
        const f = EFECTOS[nombre];
        if (f) f(arg);
    }

    /* ---------- Música ---------- */
    const ACORDES = { M: [0, 4, 7, 12], m: [0, 3, 7, 12] };
    const CANCIONES = {
        menu: { bpm: 112, acordes: [[48, 'M'], [45, 'm'], [41, 'M'], [43, 'M']],
            melodia: [76, null, 79, null, 84, null, 79, 76, 77, null, 76, null, 74, null, null, null,
                      72, null, 76, null, 79, null, 77, 76, 74, null, 72, null, 74, null, null, null] },
        canon: { bpm: 124, acordes: [[45, 'm'], [41, 'M'], [43, 'M'], [40, 'M']],
            melodia: [69, null, 72, 76, null, 74, 72, null, 71, null, 72, null, 74, null, null, null,
                      76, null, 77, 76, null, 74, 72, null, 71, null, 68, null, 69, null, null, null] },
        tormenta: { bpm: 136, acordes: [[38, 'm'], [41, 'M'], [36, 'M'], [45, 'M']],
            melodia: [74, 77, 81, null, 79, null, 77, 74, 76, null, 72, null, 74, null, null, null,
                      77, 81, 84, null, 83, null, 81, 77, 79, null, 76, null, 73, null, null, null] },
        jefe: { bpm: 158, acordes: [[40, 'm'], [40, 'm'], [36, 'M'], [38, 'M']],
            melodia: [76, 76, null, 79, 76, null, 74, 76, null, 71, null, 72, 74, null, 71, null,
                      72, 72, null, 76, 74, null, 72, 71, null, 67, null, 69, 71, null, 74, null] },
        fin: { bpm: 108, acordes: [[48, 'M'], [43, 'M'], [45, 'm'], [41, 'M']],
            melodia: [79, null, 84, null, 88, null, 84, null, 83, null, 79, null, 81, null, null, null,
                      84, null, 83, null, 81, null, 79, null, 81, null, null, null, null, null, null, null] },
    };

    let actual = null, temporizador = null, paso = 0, proxima = 0, fuente = null;

    function programar() {
        const c = CANCIONES[actual];
        if (!c || !ctx) return;
        const dur = 60 / c.bpm / 4;
        while (proxima < ctx.currentTime + 0.12) {
            const compas = Math.floor(paso / 16) % c.acordes.length;
            const p = paso % 16;
            const [raiz, tipo] = c.acordes[compas];
            const t0 = proxima - ctx.currentTime;
            if (p % 2 === 0) tono({ tipo: 'triangle', f0: nota(raiz - 12 + (p % 8 === 4 ? 7 : 0)), dur: dur * 1.8, vol: 0.3, retardo: t0, bus: busMusica });
            tono({ tipo: 'square', f0: nota(raiz + 12 + ACORDES[tipo][p % 4]), dur: dur * 0.8, vol: 0.03, retardo: t0, bus: busMusica });
            if (p % 4 === 0) tono({ tipo: 'sine', f0: 150, f1: 45, dur: 0.1, vol: 0.22, retardo: t0, bus: busMusica });
            if (p % 8 === 4) ruido({ dur: 0.08, vol: 0.1, f0: 6000, f1: 2500, tipo: 'highpass', retardo: t0, bus: busMusica });
            const m = c.melodia[paso % c.melodia.length];
            if (m) tono({ tipo: 'square', f0: nota(m), dur: dur * 1.7, vol: 0.06, retardo: t0, bus: busMusica });
            proxima += dur;
            paso++;
        }
    }

    function musica(nombre) {
        if (!ctx) { pendiente = nombre; return; }
        if (actual === nombre) return;
        parar();
        actual = nombre;
        if (nombre === 'original') {
            if (!muestras.musica) return; // sonará al terminar de cargar
            fuente = ctx.createBufferSource();
            fuente.buffer = muestras.musica;
            fuente.loop = true;
            const g = ctx.createGain(); g.gain.value = 0.7;
            fuente.connect(g); g.connect(busMusica);
            fuente.start();
            return;
        }
        paso = 0;
        proxima = ctx.currentTime + 0.05;
        temporizador = setInterval(programar, 30);
    }

    function parar() {
        if (temporizador) clearInterval(temporizador);
        temporizador = null;
        if (fuente) { try { fuente.stop(); } catch (e) { /* ya parada */ } fuente = null; }
        actual = null;
    }

    function alternar() {
        activo = !activo;
        try { localStorage.setItem(CLAVE, activo ? 'si' : 'no'); } catch (e) { /* sin almacenamiento */ }
        if (maestro) maestro.gain.setTargetAtTime(activo ? 1 : 0, ctx.currentTime, 0.02);
        return activo;
    }

    document.addEventListener('visibilitychange', () => {
        if (!ctx) return;
        if (document.hidden) ctx.suspend(); else ctx.resume();
    });

    return {
        iniciar, sfx, musica, parar, alternar,
        get activo() { return activo; },
        atenuar(seg) {
            if (!busMusica) return;
            const t = ctx.currentTime;
            busMusica.gain.cancelScheduledValues(t);
            busMusica.gain.setValueAtTime(0.05, t);
            busMusica.gain.linearRampToValueAtTime(0.24, t + seg);
        },
    };
})();
