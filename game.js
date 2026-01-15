const canvas = document.getElementById('tablero');
const ctx = canvas.getContext('2d');

// Configuración Global
const TAM_TABLERO = 10;
let TAM_CELDA;
let tablero = [];
let barcosObjetos = [];
let nivelActual = 1;
let municionInicial = 40; // Empezamos con 40
let municion = 40;
let terminado = false;
let victoria = false;

// Estados de celda
const AGUA = 0;
const BARCO = 1;
const TOCADO = 2;
const FALLO = 3;

const BARCOS_CONFIG = [5, 4, 3, 3, 2]; // Tamaños de los barcos

function iniciarJuego() {
    // 1. Ajustar dimensiones
    const lado = Math.min(window.innerWidth - 40, 450);
    canvas.width = canvas.height = lado;
    TAM_CELDA = lado / TAM_TABLERO;

    // 2. Reiniciar variables
    municion = municionInicial; // Usar la munición calculada por el nivel
    terminado = false;
    document.getElementById('mensaje-flotante').classList.add('oculto');
    
    // 3. Crear tablero y barcos
    generarTablero();
    actualizarUI();
    dibujar();
}

function generarTablero() {
    // Crear matriz vacía
    tablero = Array.from({ length: TAM_TABLERO }, () => Array(TAM_TABLERO).fill(AGUA));
    barcosObjetos = [];
    
    BARCOS_CONFIG.forEach((tam, index) => {
        let colocado = false;
        while (!colocado) {
            let horiz = Math.random() < 0.5;
            let f = Math.floor(Math.random() * (horiz ? TAM_TABLERO : TAM_TABLERO - tam));
            let c = Math.floor(Math.random() * (horiz ? TAM_TABLERO - tam : TAM_TABLERO));
            
            if (puedeColocar(f, c, tam, horiz)) {
                let coordenadas = [];
                for (let i = 0; i < tam; i++) {
                    let filaActual = horiz ? f : f + i;
                    let colActual = horiz ? c + i : c;
                    tablero[filaActual][colActual] = BARCO;
                    coordenadas.push({ f: filaActual, c: colActual, tocado: false });
                }
                barcosObjetos.push({ id: index, celdas: coordenadas, hundido: false });
                colocado = true;
            }
        }
    });
}

function puedeColocar(f, c, tam, horiz) {
    for (let i = 0; i < tam; i++) {
        let filaActual = horiz ? f : f + i;
        let colActual = horiz ? c + i : c;
        if (tablero[filaActual][colActual] !== AGUA) return false;
    }
    return true;
}

function disparar(e) {
    if (terminado || municion <= 0) return;

    // Calcular coordenadas exactas del clic
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const c = Math.floor(x / TAM_CELDA);
    const f = Math.floor(y / TAM_CELDA);

    // Evitar disparar fuera o repetir celda
    if (f < 0 || f >= TAM_TABLERO || c < 0 || c >= TAM_TABLERO) return;
    if (tablero[f][c] === TOCADO || tablero[f][c] === FALLO) return;

    if (tablero[f][c] === AGUA) {
        tablero[f][c] = FALLO;
        municion--;
    } else if (tablero[f][c] === BARCO) {
        tablero[f][c] = TOCADO;
        municion--; // El disparo inicial cuesta 1

        // Buscar el barco golpeado
        barcosObjetos.forEach(barco => {
            let celda = barco.celdas.find(cel => cel.f === f && cel.c === c);
            if (celda) {
                celda.tocado = true;
                // Si se hunde por completo: RECOMPENSA
                if (barco.celdas.every(cel => cel.tocado) && !barco.hundido) {
                    barco.hundido = true;
                    municion += 10;
                    mostrarAvisoBonus("+10 Balas");
                    if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
                } else {
                    if (navigator.vibrate) navigator.vibrate(40);
                }
            }
        });
    }

    comprobarVictoria();
    actualizarUI();
    dibujar();
}

function dibujar() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let f = 0; f < TAM_TABLERO; f++) {
        for (let c = 0; c < TAM_TABLERO; c++) {
            const x = c * TAM_CELDA;
            const y = f * TAM_CELDA;

            // 1. Dibujar la rejilla
            ctx.strokeStyle = "#1a759f";
            ctx.strokeRect(x, y, TAM_CELDA, TAM_CELDA);

            // 2. Lógica de revelación
            if (tablero[f][c] === TOCADO) {
                const barcoHundido = barcosObjetos.find(b => 
                    b.hundido && b.celdas.some(cel => cel.f === f && cel.c === c)
                );
                ctx.fillStyle = barcoHundido ? "#333533" : "#ef476f"; 
                ctx.fillRect(x + 4, y + 4, TAM_CELDA - 8, TAM_CELDA - 8);

            } else if (tablero[f][c] === FALLO) {
                ctx.fillStyle = "#48cae4";
                ctx.beginPath();
                ctx.arc(x + TAM_CELDA / 2, y + TAM_CELDA / 2, 4, 0, Math.PI * 2);
                ctx.fill();

            } else if (terminado && !victoria && tablero[f][c] === BARCO) {
                // --- ESTA ES LA NOVEDAD ---
                // Si perdiste, mostramos los barcos restantes en un color fantasma
                ctx.fillStyle = "rgba(255, 255, 255, 0.2)"; // Blanco muy transparente
                ctx.fillRect(x + 8, y + 8, TAM_CELDA - 16, TAM_CELDA - 16);
                ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
                ctx.strokeRect(x + 8, y + 8, TAM_CELDA - 16, TAM_CELDA - 16);
            }
        }
    }
}

function actualizarUI() {
    document.getElementById('municion').textContent = municion;
    document.getElementById('nivel').textContent = nivelActual; // Nueva línea
    const restantes = barcosObjetos.filter(b => !b.hundido).length;
    document.getElementById('barcos-restantes').textContent = restantes;
}

function comprobarVictoria() {
    const todosHundidos = barcosObjetos.every(b => b.hundido);
    if (todosHundidos) finalizar(true);
    else if (municion <= 0) finalizar(false);
}

function finalizar(esVictoria) {
    terminado = true;
    victoria = esVictoria;
    
    if (esVictoria) {
        nivelActual++;
        // Reducimos 3 balas por cada nivel ganado, pero ponemos un límite (ej. mínimo 20)
        municionInicial = Math.max(20, municionInicial - 3);
    } else {
        // Si pierde, podemos resetear la dificultad o dejarla igual
        nivelActual = 1;
        municionInicial = 40;
    }

    const msg = document.getElementById('mensaje-flotante');
    const titulo = victoria ? `¡NIVEL ${nivelActual-1} COMPLETADO! 🎉` : "SIN MUNICIÓN 💀";
    const subtexto = victoria ? `Siguiente nivel: ${municionInicial} balas` : `Vuelve al Nivel 1`;
    
    document.getElementById('texto-final').innerHTML = `${titulo}<br><small style="font-size: 0.8em">${subtexto}</small>`;
    
    msg.classList.remove('oculto');
    dibujar();
}

function mostrarAvisoBonus(texto) {
    const stats = document.getElementById('stats');
    const bonus = document.createElement('span');
    bonus.textContent = texto;
    bonus.style.color = "#52b69a";
    bonus.style.fontWeight = "bold";
    bonus.className = "fade-out";
    stats.appendChild(bonus);
    setTimeout(() => bonus.remove(), 1500);
}

// Eventos
canvas.addEventListener('click', disparar);
window.onload = iniciarJuego;
