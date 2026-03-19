// ======================================================
// ANDALUSIAN PARAGLIDING - XC OPTIMIZER 3.0
// ANÁLISIS EXPERTO POR ZONA CON RECOMENDACIONES DE NIVEL
// ======================================================

// ===== CONFIGURACIÓN =====
const OPENWEATHER_API_KEY = 'f68b09b09fdd7a9f01593a10c1802e25';

// ===== ZONAS DE VUELO (ACTUALIZADO CON TODAS) =====
const VUELO_SPOTS = {
  // Cádiz
  'El Aljibe (Cádiz)': { id:1, nombre:'El Aljibe', provincia:'Cádiz', lat:36.281, lon:-5.321, elevacion:800, condicionesRef:'el-aljibe' },
  
  // Granada
  'Cenes de la Vega (Granada)': { id:2, nombre:'Cenes de la Vega', provincia:'Granada', lat:37.159, lon:-3.538, elevacion:1300, condicionesRef:'cenes-monachil' },
  'Las Sabinas (Sierra Nevada)': { id:3, nombre:'Las Sabinas', provincia:'Granada', lat:37.087, lon:-3.402, elevacion:2000, condicionesRef:'cenes-monachil' },
  'Cahuchiles (Sierra Nevada)': { id:4, nombre:'Cahuchiles', provincia:'Granada', lat:37.100, lon:-3.380, elevacion:2700, condicionesRef:'sierra-nevada' },
  'Sierra de Loja': { id:5, nombre:'Sierra de Loja', provincia:'Granada', lat:37.162, lon:-4.154, elevacion:1200, condicionesRef:'sierra-loja' },
  'Jabalcón (Baza)': { id:6, nombre:'Jabalcón', provincia:'Granada', lat:37.573, lon:-2.714, elevacion:1400, condicionesRef:'jabalcon' },
  'La Herradura': { id:7, nombre:'La Herradura', provincia:'Granada', lat:36.730, lon:-3.740, elevacion:300, condicionesRef:'la-herradura' },
  'Otívar': { id:8, nombre:'Otívar', provincia:'Granada', lat:36.820, lon:-3.680, elevacion:500, condicionesRef:'otivar' },
  
  // Málaga
  'El Buitre (Málaga)': { id:9, nombre:'El Buitre', provincia:'Málaga', lat:36.890, lon:-4.101, elevacion:1100, condicionesRef:'el-buitre' },
  
  // Almería
  'Calar Alto (Almería)': { id:10, nombre:'Calar Alto', provincia:'Almería', lat:37.221, lon:-2.543, elevacion:1950, condicionesRef:'calar-alto' },
  
  // Jaén
  'Sierra de Cazorla': { id:11, nombre:'Sierra de Cazorla', provincia:'Jaén', lat:37.910, lon:-2.890, elevacion:1500, condicionesRef:'cazorla' }
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

// Dirección en texto
function direccionAbreviatura(deg) {
  if (deg == null || isNaN(deg)) return '–';
  const d = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSO', 'SO', 'OSO', 'O', 'ONO', 'NO', 'NNO'];
  return d[Math.round(deg / 22.5) % 16];
}

// Ventana de vuelo (mejorada)
function calcularVentanaVuelo() {
  const hora = new Date().getHours();
  const mes = new Date().getMonth();
  
  // Ajuste según época del año
  let inicio, fin;
  if (mes >= 3 && mes <= 8) { // Primavera/Verano
    inicio = 11; fin = 18;
  } else { // Otoño/Invierno
    inicio = 10; fin = 16;
  }
  
  if (hora >= inicio && hora <= fin) {
    return `🟢 Activa (${inicio}:00-${fin}:00)`;
  } else if (hora >= inicio-1 && hora <= fin+1) {
    return `🟡 Posible (${inicio-1}:00-${fin+1}:00)`;
  } else {
    return `🔴 Cerrada (mejor ${inicio}:00-${fin}:00)`;
  }
}

// Obtener condiciones de la zona
function getCondicionesZona(spot, tipo = 'epic') {
  if (window.VUELO_THRESHOLDS && spot.condicionesRef) {
    return window.VUELO_THRESHOLDS[spot.condicionesRef]?.xc?.[tipo] || 
           window.VUELO_THRESHOLDS[spot.condicionesRef]?.xc?.good || null;
  }
  return null;
}

function getPeligrosZona(spot) {
  if (window.VUELO_THRESHOLDS && spot.condicionesRef) {
    return window.VUELO_THRESHOLDS[spot.condicionesRef]?.danger || null;
  }
  return null;
}

function getNoVolarSi(spot) {
  const peligros = getPeligrosZona(spot);
  return peligros?.noVolarSi || [];
}

// ===== FUNCIONES DE ANÁLISIS EXPERTO =====

// Evaluar viento en altura
function evaluarVientoAltura(speed, dir, spot) {
  if (speed == null) return { text: 'Sin datos', cls: 'q-flat', value: 0, match: 0, direccionFavorable: false };
  
  const condiciones = getCondicionesZona(spot);
  
  let direccionesFavorables = condiciones?.windDirections || ['N', 'NE', 'E', 'NW'];
  let vientoOptimo = condiciones?.windSpeedMax || 15;
  
  const dirTxt = direccionAbreviatura(dir);
  const direccionFavorable = direccionesFavorables.includes(dirTxt);
  
  let match = 0;
  let cls = 'q-poor';
  let text = `💨 ${Math.round(speed)}km/h`;

  if (speed < 5) {
    match = 30;
    text = '🌬️ Calma';
    cls = direccionFavorable ? 'q-fair' : 'q-poor';
  } else if (speed < 10) {
    match = 80;
    text = '👍 Suave';
    cls = 'q-good';
  } else if (speed <= vientoOptimo) {
    match = 100;
    text = '⚡ Óptimo';
    cls = 'q-epic';
  } else if (speed <= vientoOptimo + 5) {
    match = 70;
    text = '👍 Moderado';
    cls = 'q-good';
  } else if (speed <= vientoOptimo + 10) {
    match = 40;
    text = '⚠️ Fuerte';
    cls = 'q-fair';
  } else {
    match = 10;
    text = '🔴 Muy Fuerte';
    cls = 'q-poor';
  }
  
  if (!direccionFavorable) {
    match = Math.round(match * 0.6);
  }
  
  return { text, cls, match, direccionFavorable };
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

// Evaluar térmicas
function evaluarTermica(radiacion, cape, cloudCover, spot) {
  if (radiacion == null) return { match: 0, text: 'Sin datos', cls: 'q-flat' };
  
  const condiciones = getCondicionesZona(spot);
  const capeMinimo = condiciones?.capeMin || 200;
  
  let match = 0;
  let text = '';
  let cls = 'q-poor';
  
  if (radiacion > 800 && cape > capeMinimo * 1.5) {
    match = 100;
    text = '💥 Explosivas';
    cls = 'q-epic';
  } else if (radiacion > 700 && cape > capeMinimo) {
    match = 85;
    text = '🔥 Muy fuertes';
    cls = 'q-good';
  } else if (radiacion > 500 && cape > capeMinimo * 0.7) {
    match = 70;
    text = '👍 Fuertes';
    cls = 'q-fair';
  } else if (radiacion > 300 && cape > 100) {
    match = 50;
    text = '⚪ Moderadas';
    cls = 'q-poor';
  } else {
    match = 20;
    text = '💨 Débiles';
    cls = 'q-flat';
  }
  
  // Penalizar nubosidad excesiva
  if (cloudCover > 70) {
    match = Math.round(match * 0.7);
    text += ' (nublado)';
  }
  
  return { match, text, cls };
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

// Evaluar si es épico (todas las condiciones)
function esDiaEpico(termica, viento, baseNube, visibilidad) {
  return termica.match >= 85 && viento.match >= 80 && baseNube.match >= 80 && visibilidad.match >= 80;
}

// Evaluar si es seguro para el nivel del piloto
function esSeguroParaNivel(nivelPiloto, nivelRecomendado) {
  const niveles = { 'iniciacion': 1, 'iniciación': 1, 'iniciante': 1,
                   'intermedio': 2, 'medio': 2,
                   'avanzado': 3,
                   'experto': 4 };
  
  const pilotoNum = niveles[nivelPiloto?.toLowerCase()] || 0;
  const zonaNum = niveles[nivelRecomendado?.toLowerCase()] || 0;
  
  return pilotoNum >= zonaNum;
}

// Calcular Vuelo Score global
function vueloScoreGlobal(termica, viento, baseNube, visibilidad) {
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

// Open-Meteo
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
    console.error('Error Open-Meteo:', error);
    return null;
  }
}

// OpenWeatherMap
async function fetchOWMData(lat, lon) {
  try {
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric`
    );
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error OpenWeatherMap:', error);
    return null;
  }
}

// Procesar datos combinados
async function procesarDatosSpot(spot) {
  try {
    const [meteoData, owmData] = await Promise.all([
      fetchOpenMeteoData(spot.lat, spot.lon),
      fetchOWMData(spot.lat, spot.lon)
    ]);
    
    if (!meteoData || !meteoData.hourly) return null;
    
    const horaActual = new Date().getHours();
    const idx = horaActual;
    
    // Datos Open-Meteo
    const temp = meteoData.hourly.temperature_2m[idx];
    const humedad = meteoData.hourly.relativehumidity_2m[idx];
    const dewpoint = meteoData.hourly.dewpoint_2m[idx];
    const radiacion = meteoData.hourly.shortwave_radiation[idx];
    const cape = meteoData.hourly.cape[idx];
    const cloudCover = meteoData.hourly.cloudcover[idx];
    const viento10 = meteoData.hourly.windspeed_10m[idx];
    const dirViento = meteoData.hourly.winddirection_10m[idx];
    const viento80 = meteoData.hourly.windspeed_80m?.[idx] || viento10 * 1.5;
    const dir80 = meteoData.hourly.winddirection_80m?.[idx] || dirViento;
    
    // Datos OpenWeatherMap
    const visibilidad = owmData?.visibility ? owmData.visibility / 1000 : null;
    const racha = owmData?.wind?.gust || null;
    const presion = owmData?.main?.pressure || null;
    
    // Cálculos
    const baseNube = calcularBaseNube(temp, dewpoint);
    const termica = evaluarTermica(radiacion, cape, cloudCover, spot);
    const viento = evaluarVientoAltura(viento80, dir80, spot);
    const baseNubeEval = evaluarBaseNube(baseNube, spot);
    const visibilidadEval = evaluarVisibilidad(visibilidad, spot);
    
    // Análisis avanzado
    const diaEpico = esDiaEpico(termica, viento, baseNubeEval, visibilidadEval);
    const score = vueloScoreGlobal(termica, viento, baseNubeEval, visibilidadEval);
    
    // Obtener condiciones de la zona
    const condicionesEpicas = getCondicionesZona(spot, 'epic');
    const condicionesGood = getCondicionesZona(spot, 'good');
    const peligros = getPeligrosZona(spot);
    
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
      analisis: {
        termica,
        viento,
        baseNube: baseNubeEval,
        visibilidad: visibilidadEval
      },
      score,
      diaEpico,
      ventanaVuelo: calcularVentanaVuelo(),
      condicionesEpicas,
      condicionesGood,
      peligros,
      nivelRecomendado: condicionesEpicas?.nivelRecomendado || 'intermedio',
      tipoVuelo: condicionesEpicas?.tipoVuelo || 'mixto',
      mejorEpoca: condicionesEpicas?.mejorEpoca || 'Primavera',
      noVolarSi: getNoVolarSi(spot)
    };
  } catch (error) {
    console.error(`Error en ${spot.nombre}:`, error);
    return null;
  }
}

// ===== DATOS SIMULADOS =====
function generarDatosSimuladosParaSpot(spot) {
  const condiciones = getCondicionesZona(spot);
  const baseTemp = 25 - (spot.elevacion / 200);
  
  const temp = baseTemp + (Math.random() * 10 - 5);
  const dewpoint = temp - (8 + Math.random() * 8);
  const radiacion = 500 + Math.random() * 400;
  const cape = 200 + Math.random() * 600;
  const cloudCover = Math.random() * 50;
  const viento10 = 5 + Math.random() * 15;
  const viento80 = viento10 * (1.2 + Math.random() * 0.5);
  const dirViento = Math.random() * 360;
  const visibilidad = 20 + Math.random() * 30;
  
  const baseNube = calcularBaseNube(temp, dewpoint);
  const termica = evaluarTermica(radiacion, cape, cloudCover, spot);
  const viento = evaluarVientoAltura(viento80, dirViento, spot);
  const baseNubeEval = evaluarBaseNube(baseNube, spot);
  const visibilidadEval = evaluarVisibilidad(visibilidad, spot);
  const score = vueloScoreGlobal(termica, viento, baseNubeEval, visibilidadEval);
  
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
    analisis: {
      termica,
      viento,
      baseNube: baseNubeEval,
      visibilidad: visibilidadEval
    },
    score,
    diaEpico: termica.match >= 85 && viento.match >= 80 && baseNubeEval.match >= 80,
    ventanaVuelo: calcularVentanaVuelo(),
    condicionesEpicas: getCondicionesZona(spot, 'epic'),
    condicionesGood: getCondicionesZona(spot, 'good'),
    peligros: getPeligrosZona(spot),
    nivelRecomendado: condiciones?.nivelRecomendado || 'intermedio',
    tipoVuelo: condiciones?.tipoVuelo || 'mixto',
    mejorEpoca: condiciones?.mejorEpoca || 'Primavera',
    noVolarSi: getNoVolarSi(spot)
  };
}

// ===== CARGA PRINCIPAL =====
async function cargarTodo() {
  document.getElementById('statusBar').innerHTML =
    `<div class="spill loading"><span class="sdot"></span>Cargando datos de vuelo (${ZONAS.length} zonas)...</div>`;

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
    
    await new Promise(r => setTimeout(r, 300));
  }
  
  document.getElementById('statusBar').innerHTML = errores === 0
    ? `<div class="spill ok"><span class="sdot"></span>${exitos}/${ZONAS.length} zonas · XC Optimizer 3.0 activo</div>`
    : `<div class="spill ok"><span class="sdot"></span>${exitos}/${ZONAS.length} zonas OK · ${errores} con datos simulados</div>`;
  
  document.getElementById('lastUpd').textContent =
    'Actualizado ' + new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

  renderRanking();
  renderAlertasSeguridad();
}

// ===== RENDER CARD (VERSIÓN ULTRA) =====
function renderCard(spot, d) {
  if (!d) return `<div class="pcard" id="card-${spot.id}"><div class="ldg"><div class="spin"></div><span>Cargando...</span></div></div>`;
  
  const act = d.actual;
  const analisis = d.analisis;
  const scoreInfo = calidadVuelo(d.score);
  
  // Determinar clase del borde
  let borderClass = '';
  if (d.diaEpico) borderClass = 'q-epic';
  else if (d.score >= 7) borderClass = 'q-good';
  else if (d.score >= 5) borderClass = 'q-fair';
  else borderClass = 'q-poor';

  return `<div class="pcard ${borderClass}" id="card-${spot.id}">
    <div class="chead">
      <div>
        <h3>${spot.nombre}</h3>
        <div class="cprov"><i class="fa fa-location-dot"></i>${spot.provincia} (${spot.elevacion}m)</div>
        <div class="csrc">
          ${d.tipoVuelo} · Nivel: ${d.nivelRecomendado}
          ${d.diaEpico ? '🔥 DÍA ÉPICO' : ''}
        </div>
      </div>
      <span class="qbadge ${analisis.termica.cls}">${analisis.termica.text}</span>
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
      <div class="sbox"><div class="sv c-per">${act.rad ?? '–'}</div><div class="sl">Rad. W/m²</div></div>
      <div class="sbox"><div class="sv c-wind">${act.viento10 ?? '–'}</div><div class="sl">Viento 10m</div></div>
      <div class="sbox"><div class="sv c-temp">${act.viento80 ?? '–'}</div><div class="sl">Viento 80m</div></div>
    </div>

    <!-- ANÁLISIS XCOptimizer 3.0 -->
    <div class="xc-card">
      <div class="xc-row">
        <span class="xc-label">💨 Viento 80m:</span>
        <span class="xc-value ${analisis.viento.direccionFavorable ? 'favorable' : 'desfavorable'}">
          ${direccionAbreviatura(act.dir80)} ${act.viento80}km/h (${analisis.viento.match}%)
        </span>
      </div>
      <div class="xc-row">
        <span class="xc-label">☁️ Base nube:</span>
        <span class="xc-value" style="color:${analisis.baseNube.match > 70 ? '#4cff82' : analisis.baseNube.match > 40 ? 'var(--gold)' : 'var(--rojo)'}">
          ${act.baseNube ?? '–'}m (${analisis.baseNube.match}%)
        </span>
      </div>
      <div class="xc-row">
        <span class="xc-label">🔥 Térmicas:</span>
        <span class="xc-value ${analisis.termica.cls}">${analisis.termica.match}%</span>
      </div>
      <div class="xc-row">
        <span class="xc-label">👁️ Visibilidad:</span>
        <span class="xc-value">${act.visibilidad ?? '–'}km (${analisis.visibilidad.match}%)</span>
      </div>
      <div class="xc-row">
        <span class="xc-label">⏱️ Ventana:</span>
        <span class="xc-value">${d.ventanaVuelo}</span>
      </div>
      ${act.racha ? `
      <div class="xc-row">
        <span class="xc-label">💨 Rachas:</span>
        <span class="xc-value ${act.racha > 30 ? 'desfavorable' : ''}">${act.racha} km/h</span>
      </div>
      ` : ''}
    </div>

    <!-- CONDICIONES ÉPICAS -->
    ${d.condicionesEpicas ? `
    <div class="xc-card" style="border-left-color: #4cff82; margin-top: 5px;">
      <div class="xc-row">
        <span class="xc-label">🏆 Condición épica:</span>
      </div>
      <div class="xc-row" style="font-size: 0.7rem; color: var(--muted); flex-wrap: wrap;">
        ${d.condicionesEpicas.description}
      </div>
      <div class="xc-row" style="font-size: 0.65rem; margin-top: 5px; justify-content: flex-start; gap: 10px;">
        <span>🎯 Viento: ${d.condicionesEpicas.windDirections?.join('/')} ${d.condicionesEpicas.windSpeedMax}km/h</span>
        <span>⬆️ Base >${d.condicionesEpicas.cloudBaseMin}m</span>
      </div>
    </div>
    ` : ''}

    <!-- PELIGROS Y NO VOLAR SI -->
    ${d.peligros ? `
    <div class="xc-card" style="border-left-color: var(--rojo); margin-top: 5px;">
      <div class="xc-row">
        <span class="xc-label">⚠️ Peligros:</span>
      </div>
      <div class="xc-row" style="font-size: 0.7rem; color: var(--rojo);">
        ${d.peligros.notes}
      </div>
      ${d.noVolarSi && d.noVolarSi.length > 0 ? `
      <div class="xc-row" style="font-size: 0.7rem; margin-top: 5px;">
        <span class="xc-label">🚫 NO VOLAR SI:</span>
        <span>${d.noVolarSi.join(' · ')}</span>
      </div>
      ` : ''}
    </div>
    ` : ''}

    <!-- MATCH GLOBAL -->
    <div class="cfoot">
      <div class="stars">
        Match: ${Math.round((analisis.termica.match + analisis.viento.match + analisis.baseNube.match + analisis.visibilidad.match) / 4)}% · 
        Mejor época: ${d.mejorEpoca}
      </div>
      <a class="mlink" href="https://maps.google.com/?q=${encodeURIComponent(spot.nombre+' '+spot.provincia)}" target="_blank">
        <i class="fa fa-map-location-dot"></i> Ver mapa
      </a>
    </div>
  </div>`;
}

// ===== ALERTAS DE SEGURIDAD =====
function renderAlertasSeguridad() {
  const alertas = [];
  
  ZONAS.forEach(spot => {
    const d = datos[spot.id];
    if (!d) return;
    
    // Verificar condiciones peligrosas
    if (d.analisis.viento.match < 30 && d.analisis.viento.match > 0) {
      alertas.push(`⚠️ Viento desfavorable en ${spot.nombre} (${d.actual.viento80}km/h)`);
    }
    if (d.analisis.baseNube.match < 20 && d.analisis.baseNube.match > 0) {
      alertas.push(`🔴 Base de nubes muy baja en ${spot.nombre}`);
    }
    if (d.actual.visibilidad && d.actual.visibilidad < 5) {
      alertas.push(`🌫️ Mala visibilidad en ${spot.nombre} (${d.actual.visibilidad}km)`);
    }
  });
  
  if (alertas.length > 0) {
    const alertaDiv = document.createElement('div');
    alertaDiv.className = 'alerta';
    alertaDiv.innerHTML = alertas[0];
    document.body.appendChild(alertaDiv);
    setTimeout(() => alertaDiv.remove(), 5000);
  }
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
    lista.sort((a, b) => (datos[b.id]?.analisis?.termica?.match ?? 0) - (datos[a.id]?.analisis?.termica?.match ?? 0));
  } else if (sort === 'match') {
    const getAvgMatch = (d) => d ? (d.analisis.termica.match + d.analisis.viento.match + d.analisis.baseNube.match + d.analisis.visibilidad.match) / 4 : 0;
    lista.sort((a, b) => getAvgMatch(datos[b.id]) - getAvgMatch(datos[a.id]));
  }

  document.getElementById('pgrid').innerHTML = lista.map(p => renderCard(p, datos[p.id])).join('');

  // Actualizar stats
  const loaded = Object.values(datos).filter(d => d.score);
  document.getElementById('sSpots').textContent = ZONAS.length;
  document.getElementById('sEpic').textContent = loaded.filter(d => d.diaEpico).length;
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

// ===== MAPA =====
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
    if (d.diaEpico) color = '#4cff82';
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
      Score: ${d.score}/10 · ${d.diaEpico ? '🔥 ÉPICO' : ''}<br>
      Viento: ${d.analisis.viento.match}% · Térmica: ${d.analisis.termica.match}%<br>
      Base: ${d.analisis.baseNube.match}% · Nivel: ${d.nivelRecomendado}<br>
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

// Verificar condiciones
window.addEventListener('load', () => {
  if (typeof window.VUELO_THRESHOLDS !== 'undefined') {
    console.log('✅ Condiciones de vuelo cargadas:', Object.keys(window.VUELO_THRESHOLDS));
  } else {
    console.warn('⚠️ No se encontró VUELO_THRESHOLDS. Usando valores por defecto.');
  }
});

// ===== INICIO =====
cargarTodo();
