/* Los tres mundos de Monocatron: tres rondas de estrellas y un jefe cada uno.
   Los mapas son de 16 × 9 casillas de 70 px (1120 × 630). Leyenda:
     #  bloque macizo          =  plataforma fina (se atraviesa desde abajo)
     ^  pinchos                @  inicio del jugador
     C  Champi (se puede pisar)          P  Pinchoso (no se puede pisar)
     M  Monocatrón pequeño (cae en picado)   N  nube de tormenta
   Las estrellas caen desde arriba por oleadas; cada oleada superada suma una bomba. */
const ANCHO = 1120;
const ALTO = 630;
const CASILLA = 70;

const MUNDOS = [
    {
        clave: 'pradera', musica: 'original',
        cielo: 'cielo_dia', silueta: 'colinas', tintes: { lejos: 0x8fd18a, cerca: 0x5cae5a, casillas: 0xffffff },
        astro: 'sol', clima: null,
        jefe: { paleta: 'acero', vida: 3, color: 0xb8c0cc },
        rondas: [
            {
                olas: 3, bombas: 0, estrellas: 10, pistas: ['mover', 'estrellas'],
                mapa: [
                    '................',
                    '................',
                    '..====....====..',
                    '................',
                    '.....======.....',
                    '................',
                    '.====......====.',
                    '..@.............',
                    '################',
                ],
            },
            {
                olas: 3, bombas: 1, estrellas: 10, pistas: ['pisar', 'combo'],
                mapa: [
                    '................',
                    '................',
                    '====........====',
                    '................',
                    '....===..===....',
                    '................',
                    '==....====....==',
                    '.@.....C........',
                    '################',
                ],
            },
            {
                olas: 3, bombas: 1, estrellas: 11, pistas: ['pinchoso', 'mini', 'poder'],
                mapa: [
                    '................',
                    '.......M........',
                    '..====....====..',
                    '................',
                    '=====......=====',
                    '................',
                    '...====..====...',
                    '.@....C.....P...',
                    '################',
                ],
            },
        ],
        mapaJefe: [
            '................',
            '................',
            '................',
            '................',
            '..===......===..',
            '................',
            '==............==',
            '.@..............',
            '################',
        ],
    },
    {
        clave: 'canon', musica: 'canon',
        cielo: 'cielo_ocaso', silueta: 'mesas', tintes: { lejos: 0xb8606a, cerca: 0x7a3a52, casillas: 0xffd9b0 },
        astro: 'sol', clima: 'polvo',
        jefe: { paleta: 'arena', vida: 4, color: 0xd9a95f },
        rondas: [
            {
                olas: 3, bombas: 1, estrellas: 11, pistas: [],
                mapa: [
                    '................',
                    '................',
                    '===..........===',
                    '................',
                    '...====..====...',
                    '................',
                    '=====......=====',
                    '.@.....C....C...',
                    '######...#######',
                ],
            },
            {
                olas: 3, bombas: 1, estrellas: 11, pistas: [],
                mapa: [
                    '................',
                    '......M..M......',
                    '..===......===..',
                    '................',
                    '======....======',
                    '................',
                    '...===....===...',
                    '.@.....PP.......',
                    '################',
                ],
            },
            {
                olas: 3, bombas: 2, estrellas: 12, pistas: [],
                mapa: [
                    '................',
                    '.......M........',
                    '====........====',
                    '................',
                    '...===.==.===...',
                    '................',
                    '===....==....===',
                    '.@..........C.P.',
                    '#####..##..#####',
                ],
            },
        ],
        mapaJefe: [
            '................',
            '................',
            '................',
            '................',
            '.===........===.',
            '................',
            '==............==',
            '.@..............',
            '################',
        ],
    },
    {
        clave: 'tormenta', musica: 'tormenta',
        cielo: 'cielo_noche', silueta: 'montes', tintes: { lejos: 0x3a4680, cerca: 0x232a5a, casillas: 0x9aa6d8 },
        astro: 'luna', clima: 'lluvia',
        jefe: { paleta: 'tormenta', vida: 5, color: 0x6b7bd0 },
        rondas: [
            {
                olas: 3, bombas: 2, estrellas: 11, pistas: ['rayo'],
                mapa: [
                    '................',
                    '....N...........',
                    '..====....====..',
                    '................',
                    '====...==...====',
                    '................',
                    '..====....====..',
                    '.@.....C........',
                    '################',
                ],
            },
            {
                olas: 3, bombas: 2, estrellas: 12, pistas: [],
                mapa: [
                    '................',
                    '..N.........N...',
                    '.===...==...===.',
                    '................',
                    '....===..===....',
                    '................',
                    '===....==....===',
                    '.@......P....P..',
                    '#####..##..#####',
                ],
            },
            {
                olas: 3, bombas: 2, estrellas: 12, pistas: [],
                mapa: [
                    '................',
                    '......N..M......',
                    '===..........===',
                    '................',
                    '...====..====...',
                    '................',
                    '===....==....===',
                    '.@....C...P..C..',
                    '####..####..####',
                ],
            },
        ],
        mapaJefe: [
            '................',
            '................',
            '................',
            '................',
            '..===......===..',
            '................',
            '==............==',
            '.@..............',
            '################',
        ],
    },
];

/** Rondas por mundo, contando el jefe (la última). */
const RONDAS_POR_MUNDO = 4;
