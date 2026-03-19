// ===== CONFIGURACIÓN =====
// Usamos Open-Meteo (no requiere API key y no tiene problemas CORS)

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
let map = null, cloudsLayer = null, markersLayer = null;

// ===== FUNCIONES DE CÁLCULO =====

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

// Evaluar viento en altura
function evaluarVientoAltura(speed, dir, spot) {
  if (speed == null) return { text: 'Sin datos', cls: 'q-flat', value: 0, direccionFavorable: false };
  
  let valor = 0;
  let cls = 'q-poor';
  let text = `💨 ${Math.round(speed)}km/h`;
  
  let direccionesFavorables = ['N', 'NE', 'E', 'NW'];
  let vientoMaximo = 25;
  
  if (window.VUELO_THRESHOLDS && spot.condicionesRef) {
    const condiciones = window.VUELO_THRESHOLDS[spot.condicionesRef]?.xc?.good;
    if (condiciones?.windDirections) {
      direccionesFavorables = condiciones.windDirections;
    }
    if (condiciones?.windSpeedMax) {
      vientoMaximo = condiciones.windSpeedMax;
    }
  }
  
  const dirTxt = direccionAbreviatura(dir);
  const direccionFavorable = direccionesFavorables.includes(dirTxt);

  if (speed < 5) {
    valor = 2; text = '🌬️ Calma';
    cls = direccionFavorable ? 'q-fair' : 'q-poor';
  } else if (speed < 10) {
    valor = 8; text = '👍 Suave';
    cls = 'q-good';
  } else if (speed < vientoMaximo) {
    valor = direccionFavorable ? 7 : 4; text = '⚡ Moderado';
    cls = direccionFavorable ? 'q-good' : 'q-fair';
  } else if (speed < vientoMaximo + 5) {
    valor = direccionFavorable ? 5 : 1; text = '⚠️ Fuerte';
    cls = direccionFavorable ? 'q-fair' : 'q-poor';
  } else {
    valor = 0; text = '🔴 Muy Fuerte';
    cls = 'q-epic';
  }
  
  return { text, cls, value: valor, direccionFavorable };
}

// Calcular Vuelo Score
function vueloScore(termica, vientoAltura, baseNube) {
  if (!termica || !vientoAltura) return 0;
  
  let score = 0;
  score += termica.value * 5;
  score += vientoAltura.value * 3;
  if (baseNube && baseNube > 1500) score += 2;
  else if (baseNube && baseNube > 800) score += 1;
  
  return Math.min(10, Math.round(score / 2));
}

// Calidad del vuelo
function calidadVuelo(score) {
  if (score >= 9) return { text: 'XC ÉPICO', cls: 'score-epic', color: '#4cff82' };
  if (score >= 7) return { text: 'XC BUENO', cls: 'score-bueno', color: '#f5c842' };
  if (score >= 4) return { text: 'XC LOCAL', cls: 'score-surfable', color: '#3498db' };
  return { text: 'MALO', cls: 'score-malo', color: '#e74c3c' };
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

// Obtener peligros de la zona
function getPeligrosZona(spot) {
  if (window.VUELO_THRESHOLDS && spot.condicionesRef) {
    const peligros = window.VUELO_THRESHOLDS[spot.condicionesRef]?.danger?.notes;
    return peligros || 'Sin información de peligros específicos';
  }
  return 'Sin información de peligros específicos';
}

// Obtener condiciones épicas
function getCondicionesEpicas(spot) {
  if (window.VUELO_THRESHOLDS && spot.condicionesRef) {
    return window.VUELO_THRESHOLDS[spot.condicionesRef]?.xc?.epic || null;
  }
  return null;
}

// ===== FUNCIONES PARA OPEN-METEO (sin CORS) =====
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

function procesarDatosOpenMeteo(data, spot) {
  if (!data || !data.hourly) return null;
  
  // Tomar la hora actual
  const horaActual = new Date().getHours();
  const idx = horaActual;
  
  const temp = data.hourly.temperature_2m[idx];
  const humedad = data.hourly.relativehumidity_2m[idx];
  const dewpoint = data.hourly.dewpoint_2m[idx];
  const radiacion = data.hourly.shortwave_radiation[idx];
  const cape = data.hourly.cape[idx];
  const cloudCover = data.hourly.cloudcover[idx];
  const viento10 = data.hourly.windspeed_10m[idx];
  const dirViento = data.hourly.winddirection_10m[idx];
  const viento80 = data.hourly.windspeed_80m ? data.hourly.windspeed_80m[idx] : viento10 * 1.5;
  const dir80 = data.hourly.winddirection_80m ? data.hourly.winddirection_80m[idx] : dirViento;
  
  const baseNube = calcularBaseNube(temp, dewpoint);
  const termica = evaluarTermica(radiacion, cape, cloudCover);
  const vientoAltura = evaluarVientoAltura(viento80, dir80, spot);
  const score = vueloScore(termica, vientoAltura, baseNube);
  
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
      baseNube
    },
    termica,
    vientoAltura,
    score,
    ventanaVuelo: calcularVentanaVuelo(),
    peligros: getPeligrosZona(spot),
    condicionesEpicas: getCondicionesEpicas(spot)
  };
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
  
  const baseNube = calcularBaseNube(temp, dewpoint);
  const termica = evaluarTermica(radiacion, cape, cloudCover);
  const vientoAltura = evaluarVientoAltura(viento80, dirViento, spot);
  const score = vueloScore(termica, vientoAltura, baseNube);
  
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
      baseNube
    },
    termica,
    vientoAltura,
    score,
    ventanaVuelo: calcularVentanaVuelo(),
    peligros: getPeligrosZona(spot),
    condicionesEpicas: getCondicionesEpicas(spot)
  };
}

// ===== CARGA PRINCIPAL =====
async function cargarTodo() {
  document.getElementById('statusBar').innerHTML =
    `<div class="spill loading"><span class="sdot"></span>Cargando datos de Open-Meteo...</div>`;

  let errores = 0;
  datos = {};
  
  for (let i = 0; i < ZONAS.length; i++) {
    const spot = ZONAS[i];
    
    try {
      document.getElementById('statusBar').innerHTML =
        `<div class="spill loading"><span class="sdot"></span>Cargando ${spot.nombre} (${i+1}/${ZONAS.length})...</div>`;
      
      const meteoData = await fetchOpenMeteoData(spot.lat, spot.lon);
      
      if (meteoData) {
        datos[spot.id] = procesarDatosOpenMeteo(meteoData, spot);
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
  
  const ok = ZONAS.length - errores;
  document.getElementById('statusBar').innerHTML = errores === 0
    ? `<div class="spill ok"><span class="sdot"></span>${ZONAS.length} zonas · Datos actualizados</div>`
    : `<div class="spill ok"><span class="sdot"></span>${ok}/${ZONAS.length} zonas OK · ${errores} con fallback</div>`;
  
  document.getElementById('lastUpd').textContent =
    'Actualizado ' + new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

  renderRanking();
}

// ===== RENDER CARD =====
function renderCard(spot, d) {
  if (!d) return `<div class="pcard" id="card-${spot.id}"><div class="ldg"><div class="spin"></div><span>Cargando...</span></div></div>`;
  
  const act = d.actual;
  const scoreInfo = calidadVuelo(d.score);
  const termica = d.termica;
  const vientoAlt = d.vientoAltura;

  return `<div class="pcard" id="card-${spot.id}">
    <div class="chead">
      <div>
        <h3>${spot.nombre}</h3>
        <div class="cprov"><i class="fa fa-location-dot"></i>${spot.provincia} (${spot.elevacion}m)</div>
        <div class="csrc">Open-Meteo · Vuelo</div>
      </div>
      <span class="qbadge ${termica.cls}" title="Potencial térmico">${termica.text}</span>
    </div>

    <div class="surf-score" style="margin-bottom:0;">
      <div class="score-circle ${scoreInfo.cls}" style="border-color:${scoreInfo.color}">${d.score}</div>
      <div class="score-info">
        <div class="score-label">Vuelo Score</div>
        <div class="score-value" style="color:${scoreInfo.color}">${scoreInfo.text}</div>
        <div class="score-desc">Base nube: ${act.baseNube ? act.baseNube + 'm' : '–'}</div>
      </div>
    </div>

    <div class="srow">
      <div class="sbox"><div class="sv c-ola">${act.temp ?? '–'}°</div><div class="sl">Temp</div></div>
      <div class="sbox"><div class="sv c-per">${act.rad ?? '–'}</div><div class="sl">Rad. <span class="su">W/m²</span></div></div>
      <div class="sbox"><div class="sv c-wind">${act.viento10 ?? '–'}</div><div class="sl">Viento 10m</div></div>
      <div class="sbox"><div class="sv c-temp" style="color:${vientoAlt.cls === 'q-poor' ? 'var(--rojo)' : 'var(--orange)'}">${act.viento80 ?? '–'}</div><div class="sl">Viento 80m</div></div>
    </div>

    <div class="xc-card">
      <div class="xc-row">
        <span class="xc-label">💨 Viento 80m:</span>
        <span class="xc-value ${vientoAlt.direccionFavorable ? 'favorable' : 'desfavorable'}">${direccionAbreviatura(act.dir80)} ${act.viento80}km/h</span>
      </div>
      <div class="xc-row">
        <span class="xc-label">☁️ Nubosidad:</span>
        <span class="xc-value">${act.cloud}%</span>
      </div>
      <div class="xc-row">
        <span class="xc-label">🔥 CAPE:</span>
        <span class="xc-value">${act.cape} J/kg</span>
      </div>
      <div class="xc-row">
        <span class="xc-label">⏱️ Ventana:</span>
        <span class="xc-value">${d.ventanaVuelo}</span>
      </div>
      <div class="xc-row">
        <span class="xc-label">⬆️ Base:</span>
        <span class="xc-value" style="color:var(--azul-cian)">${act.baseNube ?? '–'}m</span>
      </div>
    </div>

    ${d.condicionesEpicas ? `
    <div class="xc-card" style="border-left-color: #4cff82; margin-top: 5px;">
      <div class="xc-row">
        <span class="xc-label">🏆 Condición épica:</span>
      </div>
      <div class="xc-row" style="font-size: 0.7rem; color: var(--muted);">
        ${d.condicionesEpicas.description}
      </div>
    </div>
    ` : ''}

    ${d.peligros ? `
    <div class="xc-card" style="border-left-color: var(--rojo); margin-top: 5px;">
      <div class="xc-row">
        <span class="xc-label">⚠️ Peligros:</span>
        <span class="xc-value" style="color: var(--rojo); font-size: 0.7rem;">${d.peligros}</span>
      </div>
    </div>
    ` : ''}
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
    lista.sort((a, b) => (datos[b.id]?.termica?.value ?? 0) - (datos[a.id]?.termica?.value ?? 0));
  }

  document.getElementById('pgrid').innerHTML = lista.map(p => renderCard(p, datos[p.id])).join('');

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

// ===== MAPA =====
function initMapa() {
  if (map) return;
  map = L.map('mapaLeaflet').setView([36.5, -5.5], 8);
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    { attribution: 'Esri', maxZoom: 18 }).addTo(map);
  
  markersLayer = L.layerGroup().addTo(map);
  actualizarMarcadoresMapa();
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
    else if (d.score >= 4) color = '#3498db';
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
      Térmica: ${d.termica.text}<br>
      Viento 80m: ${direccionAbreviatura(d.actual.dir80)} ${d.actual.viento80}km/h<br>
      <span style="color:#8fbc8f">${p.provincia}</span>`);
  });
}

function setLayer(tipo, btn) {
  document.querySelectorAll('.lpill').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  
  if (!map) return;
  
  if (tipo === 'clouds') {
    if (!cloudsLayer) {
      cloudsLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        opacity: 0.3
      });
    }
    if (!map.hasLayer(cloudsLayer)) map.addLayer(cloudsLayer);
    document.getElementById('mapLegend').innerHTML =
      `<div class="lt">NUBOSIDAD</div>
       <div class="leg-item">☁️ Visualización aproximada</div>`;
  } else {
    if (cloudsLayer && map.hasLayer(cloudsLayer)) map.removeLayer(cloudsLayer);
    document.getElementById('mapLegend').innerHTML =
      `<div class="lt">SATÉLITE</div><div class="leg-item">🌍 Imagen satélite</div>`;
  }
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
