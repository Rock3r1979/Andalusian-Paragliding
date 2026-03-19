// ======================================================
// ANDALUSIAN PARAGLIDING - XC OPTIMIZER 2.0
// Análisis de vuelo experto con Open-Meteo + OpenWeatherMap
// ======================================================

// ===== CONFIGURACIÓN =====
const OPENWEATHER_API_KEY = 'f68b09b09fdd7a9f01593a10c1802e25';

// ===== ZONAS DE VUELO =====
const VUELO_SPOTS = {
  'El Aljibe (Cádiz)':   { id:1, nombre:'El Aljibe', provincia:'Cádiz', lat:36.281, lon:-5.321, elevacion:800, tipo:'xc', condicionesRef:'el-aljibe' },
  'Aculadero (S. Nevada)': { id:2, nombre:'Aculadero', provincia:'Granada', lat:37.087, lon:-3.402, elevacion:2200, tipo:'xc', condicionesRef:'sierra-nevada-aculadero' },
  'Calar Alto (Almería)': { id:3, nombre:'Calar Alto', provincia:'Almería', lat:37.221, lon:-2.543, elevacion:1950, tipo:'xc', condicionesRef:'calar-alto' },
  'El Buitre (Málaga)': { id:4, nombre:'El Buitre', provincia:'Málaga', lat:36.890, lon:-4.101, elevacion:1100, tipo:'xc', condicionesRef:'el-buitre' },
  'Loja (Granada)': { id:5, nombre:'Loja', provincia:'Granada', lat:37.162, lon:-4.154, elevacion:750, tipo:'xc', condicionesRef:'loja' },
  'Sierra de Cazorla (Jaén)': { id:6, nombre:'Sierra de Cazorla', provincia:'Jaén', lat:37.910, lon:-2.890, elevacion:1500, tipo:'xc', condicionesRef:'cazorla' }
};
const ZONAS = Object.values(VUELO_SPOTS);

// ===== ESTADO =====
let datos = {};
let filtroAct = 'todas';
let ftxt = '';
let map = null;
let cloudsLayer = null, precipLayer = null, windLayer = null, tempLayer = null;
let markersLayer = null;

// ===== FUNCIONES DE CÁLCULO BÁSICAS =====

// Calcular altura base de nube
function calcularBaseNube(temp, dewpoint) {
  if (temp == null || dewpoint == null) return null;
  const delta = temp - dewpoint;
  if (delta < 2) return 300;
  return Math.round(delta * 125);
}

// Evaluar fuerza térmica
function evaluarTermica(radiacion, cape, cloudCover) {
  if (radiacion == null) return { text: 'Sin datos', cls: 'q-flat', value: 0 };
  
  if (radiacion > 800 && cape > 500 && cloudCover < 30) {
    return { text: '💥 Explosiva', cls: 'q-epic', value: 10 };
  } else if (radiacion > 700 && cape > 200 && cloudCover < 40) {
    return { text: '🔥 Muy fuerte', cls: 'q-good', value: 8 };
  } else if (radiacion > 500 && cape > 100 && cloudCover < 60) {
    return { text: '👍 Fuerte', cls: 'q-fair', value: 6 };
  } else if (radiacion > 300 && cloudCover < 70) {
    return { text: '⚪ Moderada', cls: 'q-poor', value: 4 };
  } else {
    return { text: '💨 Nula/Débil', cls: 'q-flat', value: 1 };
  }
}

// Dirección en texto
function direccionAbreviatura(deg) {
  if (deg == null || isNaN(deg)) return '–';
  const d = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSO', 'SO', 'OSO', 'O', 'ONO', 'NO', 'NNO'];
  return d[Math.round(deg / 22.5) % 16];
}

// Ventana de vuelo
function calcularVentanaVuelo() {
  const hora = new Date().getHours();
  if (hora >= 11 && hora <= 17) {
    return 'Activa ahora 🟢';
  } else if (hora >= 9 && hora <= 19) {
    return 'Posible 🟡';
  } else {
    return 'Cerrada 🔴';
  }
}

// Obtener condiciones de la zona desde vueloConditions.js
function getCondicionesZona(spot, tipo = 'good') {
  if (window.VUELO_THRESHOLDS && spot.condicionesRef) {
    return window.VUELO_THRESHOLDS[spot.condicionesRef]?.xc?.[tipo] || null;
  }
  return null;
}

function getPeligrosZona(spot) {
  if (window.VUELO_THRESHOLDS && spot.condicionesRef) {
    return window.VUELO_THRESHOLDS[spot.condicionesRef]?.danger?.notes || null;
  }
  return null;
}

// ===== FUNCIONES DE ANÁLISIS EXPERTO =====

// Evaluar viento en altura comparando con condiciones óptimas
function evaluarVientoAltura(speed, dir, spot) {
  if (speed == null) return { text: 'Sin datos', cls: 'q-flat', value: 0, direccionFavorable: false, match: 0 };
  
  const condiciones = getCondicionesZona(spot);
  
  let direccionesFavorables = ['N', 'NE', 'E', 'NW'];
  let vientoOptimo = 12;
  let vientoMaximo = 20;
  
  if (condiciones) {
    if (condiciones.windDirections) direccionesFavorables = condiciones.windDirections;
    if (condiciones.windSpeedMax) vientoOptimo = condiciones.windSpeedMax;
  }
  
  const dirTxt = direccionAbreviatura(dir);
  const direccionFavorable = direccionesFavorables.includes(dirTxt);
  
  // Calcular match percentage (0-100%)
  let match = 0;
  let valor = 0;
  let cls = 'q-poor';
  let text = `💨 ${Math.round(speed)}km/h`;

  if (speed < 5) {
    match = 30;
    valor = 2;
    text = '🌬️ Calma';
    cls = direccionFavorable ? 'q-fair' : 'q-poor';
  } else if (speed < 10) {
    match = 80;
    valor = 8;
    text = '👍 Suave';
    cls = 'q-good';
  } else if (speed <= vientoOptimo + 2) {
    match = 100;
    valor = 10;
    text = '⚡ Óptimo';
    cls = 'q-epic';
  } else if (speed < vientoOptimo + 5) {
    match = 70;
    valor = 7;
    text = '👍 Moderado';
    cls = 'q-good';
  } else if (speed < vientoOptimo + 10) {
    match = 40;
    valor = 4;
    text = '⚠️ Fuerte';
    cls = 'q-fair';
  } else {
    match = 10;
    valor = 1;
    text = '🔴 Muy Fuerte';
    cls = 'q-poor';
  }
  
  // Penalizar dirección desfavorable
  if (!direccionFavorable) {
    match = Math.round(match * 0.5);
    valor = Math.round(valor * 0.5);
  }
  
  return { text, cls, value: valor, direccionFavorable, match };
}

// Evaluar base de nubes
function evaluarBaseNube(baseNube, spot) {
  if (!baseNube) return { match: 0, text: 'Sin datos' };
  
  const condiciones = getCondicionesZona(spot);
  const baseOptima = condiciones?.cloudBaseMin || 1500;
  
  let match = 0;
  let text = '';
  
  if (baseNube >= baseOptima + 500) {
    match = 100;
    text = 'Excelente ⬆️⬆️';
  } else if (baseNube >= baseOptima) {
    match = 90;
    text = 'Buena ⬆️';
  } else if (baseNube >= baseOptima - 300) {
    match = 60;
    text = 'Aceptable 🟡';
  } else if (baseNube >= 800) {
    match = 30;
    text = 'Baja 🔴';
  } else {
    match = 10;
    text = 'Muy baja ⚠️';
  }
  
  return { match, text };
}

// Evaluar térmicas comparando con condiciones óptimas
function evaluarTermicaExperta(radiacion, cape, spot) {
  if (radiacion == null) return { match: 0, text: 'Sin datos', value: 0, cls: 'q-flat' };
  
  const condiciones = getCondicionesZona(spot);
  const capeMinimo = condiciones?.capeMin || 200;
  
  let match = 0;
  let text = '';
  let value = 0;
  let cls = 'q-poor';
  
  if (radiacion > 800 && cape > capeMinimo * 1.5) {
    match = 100;
    text = '💥 Explosivas';
    value = 10;
    cls = 'q-epic';
  } else if (radiacion > 700 && cape > capeMinimo) {
    match = 85;
    text = '🔥 Muy fuertes';
    value = 8;
    cls = 'q-good';
  } else if (radiacion > 500 && cape > capeMinimo * 0.7) {
    match = 70;
    text = '👍 Fuertes';
    value = 6;
    cls = 'q-fair';
  } else if (radiacion > 300 && cape > 100) {
    match = 50;
    text = '⚪ Moderadas';
    value = 4;
    cls = 'q-poor';
  } else {
    match = 20;
    text = '💨 Débiles';
    value = 2;
    cls = 'q-flat';
  }
  
  return { match, text, value, cls };
}

// Evaluar visibilidad
function evaluarVisibilidad(visibilidad, spot) {
  if (!visibilidad) return { match: 0, text: 'Sin datos' };
  
  const condiciones = getCondicionesZona(spot);
  const visibilidadMinima = condiciones?.visibilityMin || 20;
  
  let match = 0;
  let text = '';
  
  if (visibilidad >= 40) {
    match = 100;
    text = 'Excelente 👁️';
  } else if (visibilidad >= 30) {
    match = 90;
    text = 'Muy buena';
  } else if (visibilidad >= 20) {
    match = 70;
    text = 'Buena';
  } else if (visibilidad >= 10) {
    match = 40;
    text = 'Regular';
  } else {
    match = 10;
    text = 'Mala ⚠️';
  }
  
  return { match, text };
}

// Calcular Vuelo Score experto
function vueloScoreExperto(termica, viento, baseNube, visibilidad) {
  if (!termica || !viento) return 0;
  
  // Pesos: 40% térmicas, 30% viento, 20% base nube, 10% visibilidad
  let score = 0;
  score += (termica.match || 0) * 0.4;
  score += (viento.match || 0) * 0.3;
  score += (baseNube.match || 0) * 0.2;
  score += (visibilidad.match || 0) * 0.1;
  
  return Math.min(10, Math.round(score / 10));
}

// Calidad del vuelo
function calidadVuelo(score) {
  if (score >= 9) return { text: 'XC ÉPICO', cls: 'score-epic', color: '#4cff82' };
  if (score >= 7) return { text: 'XC BUENO', cls: 'score-bueno', color: '#f5c842' };
  if (score >= 5) return { text: 'XC LOCAL', cls: 'score-surfable', color: '#3498db' };
  return { text: 'MALO', cls: 'score-malo', color: '#e74c3c' };
}

// ===== FUNCIONES PARA APIs =====

// Open-Meteo (datos de altura, CAPE, térmicas)
async function fetchOpenMeteoData(lat, lon) {
  try {
    const params = new URLSearchParams({
      latitude: lat,
      longitude: lon,
      hourly: 'temperature_2m,relativehumidity_2m,dewpoint_2m,cloudcover,shortwave_radiation,windspeed_10m,winddirection_10m,windspeed_80m,winddirection_80m,cape',
      current_weather: true,
      timezone: 'Europe/Madrid'
    });
    
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching Open-Meteo data:', error);
    return null;
  }
}

// OpenWeatherMap (visibilidad, rachas, y datos actuales)
async function fetchOWMData(lat, lon) {
  try {
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric`
    );
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching OpenWeatherMap data:', error);
    return null;
  }
}

// Procesar datos combinados
async function procesarDatosSpot(spot) {
  try {
    // Obtener datos de ambas APIs
    const [meteoData, owmData] = await Promise.all([
      fetchOpenMeteoData(spot.lat, spot.lon),
      fetchOWMData(spot.lat, spot.lon)
    ]);
    
    if (!meteoData || !meteoData.hourly) return null;
    
    // Hora actual
    const horaActual = new Date().getHours();
    const idx = horaActual;
    
    // Datos de Open-Meteo
    const temp = meteoData.hourly.temperature_2m[idx];
    const humedad = meteoData.hourly.relativehumidity_2m[idx];
    const dewpoint = meteoData.hourly.dewpoint_2m[idx];
    const radiacion = meteoData.hourly.shortwave_radiation[idx];
    const cape = meteoData.hourly.cape[idx];
    const cloudCover = meteoData.hourly.cloudcover[idx];
    const viento10 = meteoData.hourly.windspeed_10m[idx];
    const dirViento = meteoData.hourly.winddirection_10m[idx];
    const viento80 = meteoData.hourly.windspeed_80m ? meteoData.hourly.windspeed_80m[idx] : viento10 * 1.5;
    const dir80 = meteoData.hourly.winddirection_80m ? meteoData.hourly.winddirection_80m[idx] : dirViento;
    
    // Datos de OpenWeatherMap
    const visibilidad = owmData?.visibility ? owmData.visibility / 1000 : null; // en km
    const racha = owmData?.wind?.gust || null;
    const presion = owmData?.main?.pressure || null;
    
    // Cálculos
    const baseNube = calcularBaseNube(temp, dewpoint);
    const termica = evaluarTermicaExperta(radiacion, cape, spot);
    const vientoAltura = evaluarVientoAltura(viento80, dir80, spot);
    const baseNubeEval = evaluarBaseNube(baseNube, spot);
    const visibilidadEval = evaluarVisibilidad(visibilidad, spot);
    
    // Vuelo Score experto
    const score = vueloScoreExperto(termica, vientoAltura, baseNubeEval, visibilidadEval);
    
    return {
      actual: {
        temp: Math.round(temp * 10) / 10,
        hum: Math.round(humedad),
        cloud: Math.round(cloudCover),
        rad: Math.round(radiacion),
        viento10: Math.round(viento10),
        dir10: Math.round(dirViento),
        viento80: Math.round(viento80),
        dir80: Math.round(dir80),
        cape: Math.round(cape),
        baseNube,
        visibilidad: visibilidad ? Math.round(visibilidad * 10) / 10 : null,
        racha: racha ? Math.round(racha) : null,
        presion
      },
      termica,
      viento: vientoAltura,
      baseNube: baseNubeEval,
      visibilidad: visibilidadEval,
      score,
      ventanaVuelo: calcularVentanaVuelo(),
      condicionesOptimas: getCondicionesZona(spot, 'epic'),
      peligros: getPeligrosZona(spot)
    };
  } catch (error) {
    console.error(`Error procesando ${spot.nombre}:`, error);
    return null;
  }
}

// ===== GENERAR DATOS SIMULADOS (FALLBACK) =====
function generarDatosSimuladosParaSpot(spot) {
  const baseTemp = 25 - (spot.elevacion / 200);
  const baseRad = 600 + (spot.elevacion / 10);
  
  const temp = baseTemp + (Math.random() * 10 - 5);
  const dewpoint = temp - (8 + Math.random() * 8);
  const radiacion = Math.min(1000, baseRad + (Math.random() * 300 - 150));
  const cape = 200 + Math.random() * 600;
  const cloudCover = Math.random() * 50;
  const viento10 = 5 + Math.random() * 15;
  const viento80 = viento10 * (1.2 + Math.random() * 0.5);
  const dirViento = Math.random() * 360;
  const visibilidad = 20 + Math.random() * 30;
  
  const baseNube = calcularBaseNube(temp, dewpoint);
  const termica = evaluarTermicaExperta(radiacion, cape, spot);
  const vientoAltura = evaluarVientoAltura(viento80, dirViento, spot);
  const baseNubeEval = evaluarBaseNube(baseNube, spot);
  const visibilidadEval = evaluarVisibilidad(visibilidad, spot);
  const score = vueloScoreExperto(termica, vientoAltura, baseNubeEval, visibilidadEval);
  
  return {
    actual: {
      temp: Math.round(temp * 10) / 10,
      hum: Math.round(50 + Math.random() * 30),
      cloud: Math.round(cloudCover),
      rad: Math.round(radiacion),
      viento10: Math.round(viento10),
      dir10: Math.round(dirViento),
      viento80: Math.round(viento80),
      dir80: Math.round(dirViento + (Math.random() * 30 - 15)),
      cape: Math.round(cape),
      baseNube,
      visibilidad: Math.round(visibilidad * 10) / 10
    },
    termica,
    viento: vientoAltura,
    baseNube: baseNubeEval,
    visibilidad: visibilidadEval,
    score,
    ventanaVuelo: calcularVentanaVuelo(),
    condicionesOptimas: getCondicionesZona(spot, 'epic'),
    peligros: getPeligrosZona(spot)
  };
}

// ===== CARGA PRINCIPAL =====
async function cargarTodo() {
  document.getElementById('statusBar').innerHTML =
    `<div class="spill loading"><span class="sdot"></span>Cargando datos de Open-Meteo + OpenWeatherMap...</div>`;

  let errores = 0;
  let exitos = 0;
  datos = {};
  
  for (let i = 0; i < ZONAS.length; i++) {
    const spot = ZONAS[i];
    
    try {
      document.getElementById('statusBar').innerHTML =
        `<div class="spill loading"><span class="sdot"></span>Cargando ${spot.nombre} (${i+1}/${ZONAS.length})...</div>`;
      
      const spotData = await procesarDatosSpot(spot);
      
      if (spotData) {
        datos[spot.id] = spotData;
        exitos++;
      } else {
        datos[spot.id] = generarDatosSimuladosParaSpot(spot);
        errores++;
      }
      
      renderGrid();
      if (map) actualizarMarcadoresMapa();
      
    } catch (error) {
      console.error(`Error en ${spot.nombre}:`, error);
      datos[spot.id] = generarDatosSimuladosParaSpot(spot);
      errores++;
    }
    
    // Pequeña pausa para no saturar APIs
    await new Promise(r => setTimeout(r, 300));
  }
  
  document.getElementById('statusBar').innerHTML = errores === 0
    ? `<div class="spill ok"><span class="sdot"></span>${exitos}/${ZONAS.length} zonas · APIs combinadas OK</div>`
    : `<div class="spill ok"><span class="sdot"></span>${exitos}/${ZONAS.length} zonas OK · ${errores} con fallback</div>`;
  
  document.getElementById('lastUpd').textContent =
    'Actualizado ' + new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

  renderRanking();
}

// ===== RENDER CARD =====
function renderCard(spot, d) {
  if (!d) return `<div class="pcard" id="card-${spot.id}"><div class="ldg"><div class="spin"></div><span>Cargando...</span></div></div>`;
  
  const act = d.actual;
  const scoreInfo = calidadVuelo(d.score);
  
  // Determinar clase del borde según el score
  let borderClass = '';
  if (d.score >= 7) borderClass = 'q-epic';
  else if (d.score >= 5) borderClass = 'q-fair';
  else borderClass = 'q-poor';

  return `<div class="pcard ${borderClass}" id="card-${spot.id}">
    <div class="chead">
      <div>
        <h3>${spot.nombre}</h3>
        <div class="cprov"><i class="fa fa-location-dot"></i>${spot.provincia} (${spot.elevacion}m)</div>
        <div class="csrc">Open-Meteo + OpenWeatherMap</div>
      </div>
      <span class="qbadge ${d.termica.cls}" title="Potencial térmico">${d.termica.text}</span>
    </div>

    <!-- VUELO SCORE -->
    <div class="surf-score" style="margin-bottom:0;">
      <div class="score-circle ${scoreInfo.cls}" style="border-color:${scoreInfo.color}">${d.score}</div>
      <div class="score-info">
        <div class="score-label">Vuelo Score</div>
        <div class="score-value" style="color:${scoreInfo.color}">${scoreInfo.text}</div>
        <div class="score-desc">Base nube: ${act.baseNube ? act.baseNube + 'm' : '–'}</div>
      </div>
    </div>

    <!-- MÉTRICAS CLAVE -->
    <div class="srow">
      <div class="sbox"><div class="sv c-ola">${act.temp ?? '–'}°</div><div class="sl">Temp</div></div>
      <div class="sbox"><div class="sv c-per">${act.rad ?? '–'}</div><div class="sl">Rad. <span class="su">W/m²</span></div></div>
      <div class="sbox"><div class="sv c-wind">${act.viento10 ?? '–'}</div><div class="sl">Viento 10m</div></div>
      <div class="sbox"><div class="sv c-temp">${act.viento80 ?? '–'}</div><div class="sl">Viento 80m</div></div>
    </div>

    <!-- ANÁLISIS XCOptimizer 2.0 -->
    <div class="xc-card">
      <div class="xc-row">
        <span class="xc-label">💨 Viento 80m:</span>
        <span class="xc-value ${d.viento.direccionFavorable ? 'favorable' : 'desfavorable'}">
          ${direccionAbreviatura(act.dir80)} ${act.viento80}km/h (${d.viento.match}%)
        </span>
      </div>
      <div class="xc-row">
        <span class="xc-label">☁️ Base nube:</span>
        <span class="xc-value" style="color:${d.baseNube.match > 70 ? '#4cff82' : d.baseNube.match > 40 ? 'var(--gold)' : 'var(--rojo)'}">
          ${act.baseNube ?? '–'}m (${d.baseNube.match}%)
        </span>
      </div>
      <div class="xc-row">
        <span class="xc-label">🔥 Térmicas:</span>
        <span class="xc-value ${d.termica.cls}">${d.termica.match}%</span>
      </div>
      <div class="xc-row">
        <span class="xc-label">👁️ Visibilidad:</span>
        <span class="xc-value">${act.visibilidad ?? '–'}km (${d.visibilidad.match}%)</span>
      </div>
      <div class="xc-row">
        <span class="xc-label">⏱️ Ventana:</span>
        <span class="xc-value">${d.ventanaVuelo}</span>
      </div>
      ${act.racha ? `
      <div class="xc-row">
        <span class="xc-label">💨 Rachas:</span>
        <span class="xc-value">${act.racha} km/h</span>
      </div>
      ` : ''}
    </div>

    <!-- CONDICIONES ÓPTIMAS (EPIC) -->
    ${d.condicionesOptimas ? `
    <div class="xc-card" style="border-left-color: #4cff82; margin-top: 5px;">
      <div class="xc-row">
        <span class="xc-label">🏆 Condición épica:</span>
      </div>
      <div class="xc-row" style="font-size: 0.7rem; color: var(--muted); flex-wrap: wrap;">
        ${d.condicionesOptimas.description}
      </div>
      <div class="xc-row" style="font-size: 0.65rem; margin-top: 5px;">
        <span>🎯 Viento: ${d.condicionesOptimas.windDirections?.join('/')} ${d.condicionesOptimas.windSpeedMax}km/h · Base >${d.condicionesOptimas.cloudBaseMin}m</span>
      </div>
    </div>
    ` : ''}

    <!-- PELIGROS -->
    ${d.peligros ? `
    <div class="xc-card" style="border-left-color: var(--rojo); margin-top: 5px;">
      <div class="xc-row">
        <span class="xc-label">⚠️ Peligros:</span>
      </div>
      <div class="xc-row" style="font-size: 0.7rem; color: var(--rojo);">
        ${d.peligros}
      </div>
    </div>
    ` : ''}

    <!-- MATCH GLOBAL -->
    <div class="cfoot">
      <div class="stars">Match: ${Math.round((d.termica.match + d.viento.match + d.baseNube.match + d.visibilidad.match) / 4)}%</div>
      <a class="mlink" href="https://maps.google.com/?q=${encodeURIComponent(spot.nombre+' '+spot.provincia)}" target="_blank">
        <i class="fa fa-map-location-dot"></i> Ver mapa
      </a>
    </div>
  </div>`;
}

// ===== RENDER GRID =====
function renderGrid() {
  const sort = document.getElementById('sortSel').value;
  let lista = ZONAS.filter(p =>
    (filtroAct === 'todas' || p.provincia === filtroAct) &&
    (!ftxt || p.nombre.toLowerCase().includes(ftxt) || p.provincia.toLowerCase().includes(ftxt))
  );
  
  if (sort === 'score') {
    lista.sort((a, b) => (datos[b.id]?.score ?? 0) - (datos[a.id]?.score ?? 0));
  } else if (sort === 'termica') {
    lista.sort((a, b) => (datos[b.id]?.termica?.match ?? 0) - (datos[a.id]?.termica?.match ?? 0));
  } else if (sort === 'match') {
    const getAvgMatch = (d) => d ? (d.termica.match + d.viento.match + d.baseNube.match + d.visibilidad.match) / 4 : 0;
    lista.sort((a, b) => getAvgMatch(datos[b.id]) - getAvgMatch(datos[a.id]));
  }

  document.getElementById('pgrid').innerHTML = lista.map(p => renderCard(p, datos[p.id])).join('');

  // Actualizar stats del hero
  const loaded = Object.values(datos).filter(d => d.score);
  document.getElementById('sSpots').textContent = ZONAS.length;
  document.getElementById('sEpic').textContent = loaded.filter(d => d.score >= 9).length;
  const maxScore = Math.max(0, ...loaded.map(d => d.score ?? 0));
  document.getElementById('sMax').textContent = maxScore;
  
  if (map) actualizarMarcadoresMapa();
}

// ===== RANKING =====
function renderRanking() {
  const top = ZONAS.map(s => ({ spot: s, score: datos[s.id]?.score ?? 0 }))
    .sort((a, b) => b.score - a.score).slice(0, 5);
  
  let html = `<div class="ranking-bar">
    <div class="ranking-title">⭐ TOP 5 HOY</div>
    <div class="ranking-list">`;
  
  top.forEach((item, idx) => {
    const q = calidadVuelo(item.score);
    html += `<div class="ranking-item">
      <div class="ranking-num">${idx + 1}</div>
      <div class="ranking-spot">${item.spot.nombre}</div>
      <div class="ranking-score" style="color:${q.color}">${item.score}</div>
      <div class="score-badge ${q.cls}">${q.text}</div>
    </div>`;
  });
  
  html += `</div></div>`;
  document.getElementById('rankingContainer').innerHTML = html;
  document.getElementById('rankingContainer').style.display = 'block';
}

// ===== FILTROS =====
function setFiltro(prov, btn) {
  filtroAct = prov;
  document.querySelectorAll('.fbtn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderGrid();
}

function filtrar() {
  ftxt = document.getElementById('sInput').value.toLowerCase();
  renderGrid();
}

// ===== VISTAS =====
function setVista(v) {
  document.querySelectorAll('.vtab').forEach(t => t.classList.remove('active'));
  if (v === 'lista') {
    document.querySelectorAll('.vtab')[0].classList.add('active');
    document.getElementById('mainContent').style.display = 'block';
    document.getElementById('mapaOverlay').classList.remove('open');
  } else {
    document.querySelectorAll('.vtab')[1].classList.add('active');
    document.getElementById('mainContent').style.display = 'none';
    document.getElementById('mapaOverlay').classList.add('open');
    if (!map) initMapa(); else { map.invalidateSize(); actualizarMarcadoresMapa(); }
  }
}

function cerrarMapa() { setVista('lista'); }

// ===== MAPA CON CAPAS DE OPENWEATHERMAP =====
function initMapa() {
  if (map) return;
  map = L.map('mapaLeaflet').setView([36.5, -5.5], 8);
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    { attribution: 'Esri', maxZoom: 18 }).addTo(map);
  
  markersLayer = L.layerGroup().addTo(map);
  actualizarMarcadoresMapa();
}

function setLayer(tipo, btn) {
  document.querySelectorAll('.lpill').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  
  if (!map) return;
  
  // Eliminar todas las capas meteorológicas
  if (cloudsLayer) map.removeLayer(cloudsLayer);
  if (precipLayer) map.removeLayer(precipLayer);
  if (windLayer) map.removeLayer(windLayer);
  if (tempLayer) map.removeLayer(tempLayer);
  
  if (tipo === 'sat') {
    document.getElementById('mapLegend').innerHTML =
      `<div class="lt">SATÉLITE</div>
       <div class="leg-item">🌍 Imagen satélite</div>`;
       
  } else if (tipo === 'clouds') {
    cloudsLayer = L.tileLayer(
      `https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=${OPENWEATHER_API_KEY}`,
      { opacity: 0.7, attribution: '© OpenWeatherMap' }
    );
    cloudsLayer.addTo(map);
    document.getElementById('mapLegend').innerHTML =
      `<div class="lt">NUBOSIDAD</div>
       <div class="leg-item">☁️ Cobertura de nubes</div>`;
       
  } else if (tipo === 'precip') {
    precipLayer = L.tileLayer(
      `https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=${OPENWEATHER_API_KEY}`,
      { opacity: 0.6, attribution: '© OpenWeatherMap' }
    );
    precipLayer.addTo(map);
    document.getElementById('mapLegend').innerHTML =
      `<div class="lt">PRECIPITACIÓN</div>
       <div class="leg-item"><span style="background:#00aaff;">█</span> Débil</div>
       <div class="leg-item"><span style="background:#0066ff;">█</span> Moderada</div>
       <div class="leg-item"><span style="background:#0000cc;">█</span> Fuerte</div>`;
       
  } else if (tipo === 'wind') {
    windLayer = L.tileLayer(
      `https://tile.openweathermap.org/map/wind_new/{z}/{x}/{y}.png?appid=${OPENWEATHER_API_KEY}`,
      { opacity: 0.6, attribution: '© OpenWeatherMap' }
    );
    windLayer.addTo(map);
    document.getElementById('mapLegend').innerHTML =
      `<div class="lt">VIENTO</div>
       <div class="leg-item">💨 Velocidad en superficie</div>`;
       
  } else if (tipo === 'temp') {
    tempLayer = L.tileLayer(
      `https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=${OPENWEATHER_API_KEY}`,
      { opacity: 0.6, attribution: '© OpenWeatherMap' }
    );
    tempLayer.addTo(map);
    document.getElementById('mapLegend').innerHTML =
      `<div class="lt">TEMPERATURA</div>
       <div class="leg-item">🌡️ Superficie</div>`;
  }
}

function actualizarMarcadoresMapa() {
  if (!markersLayer) return;
  markersLayer.clearLayers();
  
  ZONAS.forEach(p => {
    const d = datos[p.id];
    if (!d) return;
    
    let color = '#8fbc8f';
    if (d.score >= 9) color = '#4cff82';
    else if (d.score >= 7) color = '#f5c842';
    else if (d.score >= 5) color = '#3498db';
    else color = '#e74c3c';
    
    const mk = L.circleMarker([p.lat, p.lon], {
      radius: 10,
      fillColor: color,
      color: '#fff',
      weight: 2,
      fillOpacity: 0.85
    }).addTo(markersLayer);
    
    mk.bindPopup(`<b>${p.nombre}</b><br>
      Vuelo Score <b>${d.score}/10</b><br>
      Térmica: ${d.termica.match}%<br>
      Viento: ${d.viento.match}%<br>
      Base: ${d.baseNube.match}%<br>
      <span style="color:#8fbc8f">${p.provincia}</span>`);
  });
}

// ===== RECARGAR =====
function recargar() {
  toast('Actualizando datos...');
  datos = {};
  renderGrid();
  cargarTodo();
}

function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}

// Verificar VUELO_THRESHOLDS
window.addEventListener('load', () => {
  if (typeof window.VUELO_THRESHOLDS !== 'undefined') {
    console.log('✅ Condiciones de vuelo cargadas:', Object.keys(window.VUELO_THRESHOLDS));
  } else {
    console.warn('⚠️ No se encontró VUELO_THRESHOLDS. Usando valores por defecto.');
  }
});

// ===== INICIO =====
cargarTodo();
