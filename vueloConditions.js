// ======================================================
// VUELO CONDITIONS - UMBRALES Y ANÁLISIS EXPERTO POR ZONA
// Basado en conocimiento de vuelo en Andalucía
// ======================================================

window.VUELO_THRESHOLDS = {
  
  // ======================================================
  // CÁDIZ - EL ALJIBE (Zona de vuelo de referencia)
  // ======================================================
  
  "el-aljibe": {
    xc: {
      epic: {
        description: "Viento de Levante suave (10-15km/h) en altura, base de nubes >1800m, térmicas fuertes y organizadas",
        windSpeedMax: 15, // km/h en altura
        windDirections: ["E", "SE"],
        cloudBaseMin: 1800, // metros
        thermalStrength: "fuerte",
        capeMin: 500, // J/kg
        notes: "Posibilidad de rutas de >100km hacia el interior. Condiciones de clase mundial."
      },
      good: {
        description: "Viento de Levante o Poniente suave, buena radiación, nubes de evolución",
        windSpeedMax: 18,
        windDirections: ["E", "SE", "W"],
        cloudBaseMin: 1400,
        thermalStrength: "moderada",
        capeMin: 200,
        notes: "XC local de 30-50km."
      }
    },
    danger: {
      notes: "⚠️ Viento fuerte de Levante (>25km/h en altura) genera rotor y condiciones muy peligrosas en la zona de despegue."
    }
  },
  
  // ======================================================
  // GRANADA - SIERRA NEVADA (Aculadero - Zona de altura)
  // ======================================================
  
  "sierra-nevada-aculadero": {
    xc: {
      epic: {
        description: "Viento N/NE suave, térmicas explosivas por radiación en alta montaña, base de nubes >3500m",
        windSpeedMax: 12,
        windDirections: ["N", "NE"],
        cloudBaseMin: 3200,
        thermalStrength: "muy fuerte",
        capeMin: 300,
        notes: "Vuelos de gran altitud y distancia. Requiere buena aclimatación y equipo de altura."
      },
      good: {
        description: "Viento de ladera NW, buena insolación",
        windSpeedMax: 15,
        windDirections: ["NW"],
        cloudBaseMin: 2800,
        thermalStrength: "fuerte",
        notes: "Excelentes condiciones para vuelos dinámicos y térmicos de media montaña."
      }
    },
    danger: {
      notes: "⚠️ Viento fuerte del W o SW puede crear ondas de rotor peligrosas. Cambios bruscos de tiempo."
    }
  },
  
  // ======================================================
  // ALMERÍA - CALAR ALTO (Zona árida, térmicas potentes)
  // ======================================================
  
  "calar-alto": {
    xc: {
      epic: {
        description: "Viento N/NE suave, máxima insolación, baja humedad relativa, térmicas muy potentes y secas",
        windSpeedMax: 15,
        windDirections: ["N", "NE"],
        cloudBaseMin: 2000,
        thermalStrength: "explosiva",
        capeMin: 400,
        notes: "Vuelos de distancia hacia el interior o costa. Térmicas fuertes y turbulentas. Solo expertos."
      }
    }
  }
  // ... más zonas
};