// ===== CONFIGURACIÓN =====
const AEMET_KEY = 'TU_API_KEY_DE_AEMET_OPEN_DATA'; // ¡Regístrate en AEMET OpenData!
// Por simplicidad, usaremos Open-Meteo AEMET, que ya tiene estos datos.
// La URL base será: https://api.open-meteo.com/v1/aemet

// ===== ZONAS DE VUELO (formato objeto con keys) =====
const VUELO_SPOTS = {
  'El Aljibe (Cádiz)':   { id:1, nombre:'El Aljibe', provincia:'Cádiz', lat:36.281, lon:-5.321, elevacion:800, tipo:'xc', condicionesRef:'el-aljibe' },
  'Aculadero (S. Nevada)': { id:2, nombre:'Aculadero', provincia:'Granada', lat:37.087, lon:-3.402, elevacion:2200, tipo:'xc', condicionesRef:'sierra-nevada-aculadero' },
  'Calar Alto (Almería)': { id:3, nombre:'Calar Alto', provincia:'Almería', lat:37.221, lon:-2.543, elevacion:1950, tipo:'xc', condicionesRef:'calar-alto' },
  'El Buitre (Málaga)': { id:4, nombre:'El Buitre', provincia:'Málaga', lat:36.890, lon:-4.101, elevacion:1100, tipo:'xc', condicionesRef:'el-buitre' },
  'Loja (Granada)': { id:5, nombre:'Loja', provincia:'Granada', lat:37.162, lon:-4.154, elevacion:750, tipo:'xc', condicionesRef:'loja' }
  // ... más spots de vuelo
};
const ZONAS = Object.values(VUELO_SPOTS);

// ===== ESTADO =====
let datos = {};
let filtroAct = 'todas';
let ftxt = '';

// ===== FUNCIONES DE CÁLCULO EXPERTO (XCOptimizer) =====

/**
 * Calcula la altura de la base de la nube (Cloud Base Altitude)
 * Fórmula aproximada: (Temperatura - Punto de Rocío) * 125 (en metros)
 */
function calcularBaseNube(temp, dewpoint) {
  if (temp == null || dewpoint == null) return null;
  const delta = temp - dewpoint;
  // Si el delta es muy pequeño, la base está muy baja (estrato)
  if (delta < 2) return 300; // Base baja, nubes pegadas
  return Math.round(delta * 125);
}

/**
 * Evalúa la fuerza térmica potencial basada en radiación y CAPE
 */
function evaluarTermica(radiacion, cape, cloudCover) {
  if (radiacion == null) return { text:'Sin datos', cls:'q-flat', value:0 };
  
  // La radiación solar es el motor principal (W/m²)
  let termicaPotencial = 0;
  let desc = '';
  let cls = 'q-poor';
  
  if (radiacion > 800 && cape > 500 && cloudCover < 30) {
    termicaPotencial = 10;
    desc = '💥 Explosiva';
    cls = 'q-epic';
  } else if (radiacion > 700 && cape > 200 && cloudCover < 40) {
    termicaPotencial = 8;
    desc = '🔥 Muy fuerte';
    cls = 'q-good';
  } else if (radiacion > 500 && cape > 100 && cloudCover < 60) {
    termicaPotencial = 6;
    desc = '👍 Fuerte';
    cls = 'q-fair';
  } else if (radiacion > 300 && cloudCover < 70) {
    termicaPotencial = 4;
    desc = '⚪ Moderada';
    cls = 'q-poor';
  } else {
    termicaPotencial = 1;
    desc = '💨 Nula/Débil';
    cls = 'q-flat';
  }
  
  return { text: desc, cls: cls, value: termicaPotencial };
}

/**
 * Calcula la ventana de vuelo óptima.
 * Idealmente de 3 a 5 horas después del mediodía solar.
 */
function calcularVentanaVuelo(horaSalidaSol, horaPuestaSol) {
  // Simplificación: asumimos que la ventana empieza 2-3h después del mediodía.
  // Un cálculo más exacto usaría la hora solar real.
  const mediodiaSolar = 13; // Aproximación para España peninsular en invierno/verano. Se puede mejorar.
  let inicio = mediodiaSolar + 2;
  let fin = mediodiaSolar + 5;
  
  // Ajustar para que no se salga del día
  if (fin > 20) fin = 20;
  if (inicio < 10) inicio = 10;
  
  return `${inicio}:00 - ${fin}:00`;
}

/**
 * Evalúa la calidad del viento en altura.
 * Para vuelo, el viento debe ser suave en altura y de dirección favorable.
 */
function evaluarVientoAltura(speed, dir, spot) {
  if (speed == null) return { text:'Sin datos', cls:'q-flat', value:0 };
  
  let valor = 0;
  let cls = 'q-poor';
  let text = `💨 ${Math.round(speed)}km/h`;

  // Consultar condiciones específicas de la zona (simplificado)
  const condiciones = window.VUELO_THRESHOLDS?.[spot.condicionesRef]?.xc?.good;
  const direccionesFavorables = condiciones?.windDirections || ['N', 'NE', 'E', 'SE']; // Por defecto, vientos de componente N/E (menos turbulentos)
  
  // Convertir dirección a texto para comparar (simplificado)
  const dirTxt = direccionAbreviatura(dir);
  const direccionFavorable = direccionesFavorables.includes(dirTxt);

  if (speed < 5) {
    valor = 2; text = '🌬️ Calma';
    cls = direccionFavorable ? 'q-fair' : 'q-poor';
  } else if (speed < 10) {
    valor = 8; text = '👍 Suave';
    cls = 'q-good';
  } else if (speed < 15) {
    valor = direccionFavorable ? 7 : 4; text = '⚡ Moderado';
    cls = direccionFavorable ? 'q-good' : 'q-fair';
  } else if (speed < 20) {
    valor = direccionFavorable ? 5 : 1; text = '⚠️ Fuerte';
    cls = direccionFavorable ? 'q-fair' : 'q-poor';
  } else {
    valor = 0; text = '🔴 Muy Fuerte';
    cls = 'q-epic'; // Usamos epic para destacar peligro
  }
  
  return { text, cls, value: valor, direccionFavorable };
}

/**
 * Calcula el Vuelo Score principal (XCOptimizer)
 */
function vueloScore(termica, vientoAltura, baseNube) {
  if (!termica || !vientoAltura) return 0;
  
  // Ponderación experta
  let score = 0;
  score += termica.value * 5;      // La térmica es lo más importante (50%)
  score += vientoAltura.value * 3; // El viento en altura (30%)
  if (baseNube && baseNube > 1500) score += 2; // Bonus por base alta (20%)
  else if (baseNube && baseNube > 800) score += 1;
  
  return Math.min(10, Math.round(score / 2)); // Ajustar a escala /10
}

function calidadVuelo(score) {
  if (score >= 9) return { text:'XC ÉPICO', cls:'score-epic', color:'#4cff82' };
  if (score >= 7) return { text:'XC BUENO', cls:'score-bueno', color:'#f5c842' };
  if (score >= 4) return { text:'XC LOCAL', cls:'score-surfable', color:'#3498db' };
  return               { text:'MALO',     cls:'score-malo',     color:'#e74c3c' };
}

// Funciones auxiliares de conversión (dirección, etc.) se mantienen similares.

// ===== FETCH DATOS (Nuevo: AEMET vía Open-Meteo) =====
async function fetchVueloData(lat, lon) {
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    hourly: 'temperature_2m,relativehumidity_2m,dewpoint_2m,cloudcover,shortwave_radiation,windspeed_10m,winddirection_10m,windspeed_80m,winddirection_80m,windspeed_120m,winddirection_120m,cape,pressure_msl',
    daily: 'weathercode,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_sum',
    timezone: 'Europe/Madrid',
    forecast_days: 5
  });
  
  // Usamos el endpoint estándar de Open-Meteo que incluye datos de AEMET para España
  const r = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!r.ok) throw new Error(`AEMET API ${r.status}`);
  const d = await r.json();
  
  const hh = new Date().getHours();
  const idxNow = hh; // Simplificación, la API devuelve arrays de 24+ horas

  // Extraer datos horarios relevantes
  const hourly = [];
  for (let i = 0; i < 24; i++) {
    const idx = i; // Para el ejemplo, tomamos las próximas 24h
    hourly.push({
      hora: `${String(i).padStart(2,'0')}:00`,
      temp: d.hourly.temperature_2m[idx],
      hum: d.hourly.relativehumidity_2m[idx],
      dewpoint: d.hourly.dewpoint_2m[idx],
      cloud: d.hourly.cloudcover[idx],
      rad: d.hourly.shortwave_radiation[idx],
      wind10: d.hourly.windspeed_10m[idx],
      dir10: d.hourly.winddirection_10m[idx],
      wind80: d.hourly.windspeed_80m[idx],
      dir80: d.hourly.winddirection_80m[idx],
      cape: d.hourly.cape[idx]
    });
  }

  // Datos actuales (primera hora del array)
  const ahora = hourly[0];
  const baseNube = calcularBaseNube(ahora.temp, ahora.dewpoint);
  const termica = evaluarTermica(ahora.rad, ahora.cape, ahora.cloud);
  const vientoAltura = evaluarVientoAltura(ahora.wind80, ahora.dir80, {}); // Evaluamos viento a 80m
  const score = vueloScore(termica, vientoAltura, baseNube);
  const ventanaVuelo = calcularVentanaVuelo(d.daily.sunrise[0], d.daily.sunset[0]);

  return {
    actual: {
      temp: ahora.temp,
      hum: ahora.hum,
      cloud: ahora.cloud,
      rad: ahora.rad,
      viento10: ahora.wind10,
      dir10: ahora.dir10,
      viento80: ahora.wind80,
      dir80: ahora.dir80,
      cape: ahora.cape,
      baseNube
    },
    termica,
    vientoAltura,
    score,
    ventanaVuelo,
    hourly,
    daily: d.daily
  };
}

// ===== CARGA PRINCIPAL (Adaptada) =====
async function cargarTodo() {
  // ... (código de loading similar) ...

  for (let i = 0; i < ZONAS.length; i += 3) {
    const lote = ZONAS.slice(i, i + 3);
    await Promise.all(lote.map(async spot => {
      try {
        const vueloData = await fetchVueloData(spot.lat, spot.lon);
        datos[spot.id] = vueloData;
        renderGrid();
        if (map) actualizarMarcadoresMapa();
      } catch(e) {
        console.error(`Error en ${spot.nombre}:`, e.message);
        datos[spot.id] = { error: e.message, score: 0 };
      }
    }));
    await new Promise(r => setTimeout(r, 250));
  }
  // ... (actualización de UI y ranking) ...
}

// ===== RENDER CARD (Nuevo diseño para parapente) =====
function renderCard(spot, d) {
  if (!d) return `<div class="pcard" id="card-${spot.id}">Cargando...</div>`;
  if (d.error) return `<div class="pcard" id="card-${spot.id}">Error ${d.error}</div>`;

  const act = d.actual;
  const scoreInfo = calidadVuelo(d.score);
  const termica = d.termica;
  const vientoAlt = d.vientoAltura;

  return `<div class="pcard" id="card-${spot.id}">
    <div class="chead">
      <div>
        <h3>${spot.nombre}</h3>
        <div class="cprov"><i class="fa fa-location-dot"></i>${spot.provincia} (${spot.elevacion}m)</div>
        <div class="csrc">AEMET · Altura</div>
      </div>
      <span class="qbadge ${termica.cls}" title="Potencial térmico">${termica.text}</span>
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
      <div class="sbox"><div class="sv c-ola">${act.temp?.toFixed(0) ?? '–'}°</div><div class="sl">Temp</div></div>
      <div class="sbox"><div class="sv c-per">${act.rad ?? '–'}</div><div class="sl">Rad. <span class="su">W/m²</span></div></div>
      <div class="sbox"><div class="sv c-wind">${act.viento10 != null ? Math.round(act.viento10) : '–'}</div><div class="sl">Viento 10m</div></div>
      <div class="sbox"><div class="sv c-temp" style="color:${vientoAlt.cls === 'q-poor' ? 'var(--rojo)' : 'var(--orange)'}">${act.viento80 != null ? Math.round(act.viento80) : '–'}</div><div class="sl">Viento 80m</div></div>
    </div>

    <!-- ANÁLISIS EXPERTO (XCOptimizer) -->
    <div style="padding:12px; background: rgba(0,0,0,0.2); border-radius: 8px; margin:10px 12px;">
      <div style="display:flex; justify-content:space-between; font-size:.75rem;">
        <span>💨 Viento 80m: ${direccionAbreviatura(act.dir80)} ${Math.round(act.viento80)}km/h</span>
        <span style="color:${vientoAlt.direccionFavorable ? '#4cff82' : '#e74c3c'}">${vientoAlt.direccionFavorable ? 'Favorable' : 'Desfavorable'}</span>
      </div>
      <div style="display:flex; justify-content:space-between; font-size:.75rem; margin-top:4px;">
        <span>☁️ Nubosidad: ${act.cloud}%</span>
        <span>🔥 CAPE: ${act.cape?.toFixed(0) ?? '–'} J/kg</span>
      </div>
      <div style="display:flex; justify-content:space-between; font-size:.75rem; margin-top:4px;">
        <span>⏱️ Ventana: ${d.ventanaVuelo}</span>
        <span style="color:var(--azul-cian)">⬆️ Base: ${act.baseNube ?? '–'}m</span>
      </div>
    </div>

    <!-- PESTAÑAS: Detalle, Pronóstico, Condiciones -->
    <div class="ctabs">
      <button class="ctab active" onclick="cambiarTab(${spot.id},'detalle',this)"><i class="fa fa-chart-line"></i>Detalle</button>
      <button class="ctab" onclick="cambiarTab(${spot.id},'horas',this)"><i class="fa fa-clock"></i>Evolución</button>
      <button class="ctab" onclick="cambiarTab(${spot.id},'experto',this)"><i class="fa fa-brain"></i>Experto</button>
    </div>

    <!-- PANEL DETALLE -->
    <div class="tpane active" id="tab-${spot.id}-detalle">
      <!-- ... Información detallada de las variables actuales ... -->
       <p>Información detallada de las condiciones actuales de vuelo.</p>
    </div>

    <!-- PANEL HORAS (Evolución horaria) -->
    <div class="tpane" id="tab-${spot.id}-horas">
      <div class="wind-hours-bars" style="height:60px; margin-bottom:5px;">
        ${(d.hourly ?? []).slice(6, 18).map(h => `
          <div class="wind-hour-bar">
            <div style="height:${Math.min(60, (h.rad / 15))}px;width:100%;background:#f5c842;border-radius:3px 3px 0 0" title="Radiación"></div>
            <span class="wind-hour-label">${h.hora}</span>
          </div>
        `).join('')}
      </div>
      <div class="wind-table">
        <table>
          <tr><th>Hora</th><th>Temp</th><th>Rad</th><th>V10</th><th>V80</th><th>Nube</th></tr>
          ${(d.hourly ?? []).slice(0,12).map(h => `<tr>
            <td>${h.hora}</td>
            <td>${h.temp?.toFixed(0)}°</td>
            <td>${h.rad}</td>
            <td>${Math.round(h.wind10)}</td>
            <td>${Math.round(h.wind80)}</td>
            <td>${h.cloud}%</td>
          </tr>`).join('')}
        </table>
      </div>
    </div>

    <!-- PANEL EXPERTO (Condiciones específicas del spot) -->
    <div class="tpane" id="tab-${spot.id}-experto">
      ${window.VUELO_THRESHOLDS?.[spot.condicionesRef] ? `
        <div style="background:rgba(0,0,0,.3); padding:10px; border-radius:8px;">
          <h4 style="color:var(--gold); margin-bottom:8px;">🎯 Condiciones Épicas</h4>
          <p style="font-size:.8rem;">${window.VUELO_THRESHOLDS[spot.condicionesRef].xc.epic.description}</p>
          <p style="font-size:.7rem; color:var(--muted); margin-top:5px;">${window.VUELO_THRESHOLDS[spot.condicionesRef].xc.epic.notes}</p>
          <h4 style="color:var(--rojo); margin:12px 0 5px;">⚠️ Peligros</h4>
          <p style="font-size:.75rem;">${window.VUELO_THRESHOLDS[spot.condicionesRef].danger.notes}</p>
        </div>
      ` : '<p>No hay condiciones específicas para esta zona.</p>'}
    </div>
  </div>`;
}

// ===== RENDER GRID Y RANKING (Adaptados) =====
function renderGrid() {
  // ... (filtrado similar, pero ordenando por d.score) ...
  // Actualizar stats hero
  const loaded = Object.values(datos).filter(d => d.score);
  document.getElementById('sSpots').textContent = ZONAS.length;
  document.getElementById('sEpic').textContent = loaded.filter(d => d.score >= 9).length;
  const maxScore = Math.max(0, ...loaded.map(d => d.score ?? 0));
  document.getElementById('sMax').textContent = maxScore;
}
function renderRanking() {
  const top = ZONAS.map(s => ({ spot: s, score: datos[s.id]?.score ?? 0 }))
    .sort((a,b) => b.score - a.score).slice(0,5);
  // ... (render del ranking similar)
}

// ===== MAPA (Actualizar marcadores con color según score) =====
function actualizarMarcadoresMapa() {
  // ... (código similar, usando d.score para el color) ...
}

// ===== INICIO =====