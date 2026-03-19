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
        windSpeedMax: 15,
        windDirections: ["E", "SE"],
        cloudBaseMin: 1800,
        thermalStrength: "fuerte",
        capeMin: 500,
        visibilityMin: 30,
        notes: "Posibilidad de rutas de >100km hacia el interior. Condiciones de clase mundial."
      },
      good: {
        description: "Viento de Levante o Poniente suave, buena radiación, nubes de evolución",
        windSpeedMax: 18,
        windDirections: ["E", "SE", "W"],
        cloudBaseMin: 1400,
        thermalStrength: "moderada",
        capeMin: 200,
        visibilityMin: 20
      }
    },
    danger: {
      notes: "⚠️ Viento fuerte de Levante (>25km/h en altura) genera rotor y condiciones muy peligrosas en la zona de despegue. Evitar vientos del W."
    }
  },
  
  // ======================================================
  // GRANADA - SIERRA NEVADA (Aculadero - Zona de altura)
  // ======================================================
  
  "sierra-nevada-aculadero": {
    xc: {
      epic: {
        description: "Viento N/NE suave (8-12km/h), térmicas explosivas por radiación en alta montaña, base de nubes >3500m",
        windSpeedMax: 12,
        windDirections: ["N", "NE"],
        cloudBaseMin: 3200,
        thermalStrength: "muy fuerte",
        capeMin: 300,
        visibilityMin: 40,
        notes: "Vuelos de gran altitud y distancia. Requiere buena aclimatación y equipo de altura."
      },
      good: {
        description: "Viento de ladera NW, buena insolación, térmicas desarrolladas",
        windSpeedMax: 15,
        windDirections: ["NW"],
        cloudBaseMin: 2800,
        thermalStrength: "fuerte",
        capeMin: 150,
        visibilityMin: 30
      }
    },
    danger: {
      notes: "⚠️ Viento fuerte del W o SW puede crear ondas de rotor peligrosas. Cambios bruscos de tiempo. Peligro de nubes de desarrollo vertical."
    }
  },
  
  // ======================================================
  // ALMERÍA - CALAR ALTO (Zona árida, térmicas potentes)
  // ======================================================
  
  "calar-alto": {
    xc: {
      epic: {
        description: "Viento N/NE suave (10-15km/h), máxima insolación, baja humedad relativa, térmicas muy potentes y secas",
        windSpeedMax: 15,
        windDirections: ["N", "NE"],
        cloudBaseMin: 2000,
        thermalStrength: "explosiva",
        capeMin: 400,
        visibilityMin: 50,
        notes: "Vuelos de distancia hacia el interior o costa. Térmicas fuertes y turbulentas. Solo expertos."
      },
      good: {
        description: "Viento de componente N, buena visibilidad, térmicas desarrolladas",
        windSpeedMax: 18,
        windDirections: ["N", "NE", "NW"],
        cloudBaseMin: 1500,
        thermalStrength: "fuerte",
        capeMin: 200,
        visibilityMin: 30
      }
    },
    danger: {
      notes: "⚠️ Viento de levante fuerte (>20km/h) genera turbulencia extrema. Peligro de sobrevuelo del desierto."
    }
  },
  
  // ======================================================
  // MÁLAGA - EL BUITRE (Zona costera-interior)
  // ======================================================
  
  "el-buitre": {
    xc: {
      epic: {
        description: "Terral suave (10-15km/h), base de nubes >1800m, buena visibilidad, térmicas organizadas",
        windSpeedMax: 15,
        windDirections: ["N", "NW"],
        cloudBaseMin: 1800,
        thermalStrength: "fuerte",
        capeMin: 300,
        visibilityMin: 30,
        notes: "Excelente para vuelos de distancia hacia Antequera o Granada."
      },
      good: {
        description: "Viento de componente N, buena insolación",
        windSpeedMax: 18,
        windDirections: ["N", "NW", "NE"],
        cloudBaseMin: 1200,
        thermalStrength: "moderada",
        capeMin: 150,
        visibilityMin: 20
      }
    },
    danger: {
      notes: "⚠️ Viento de levante (>20km/h) genera rotor en la zona de despegue. Precaución con la componente sur."
    }
  },
  
  // ======================================================
  // GRANADA - LOJA (Zona interior, térmicas de calidad)
  // ======================================================
  
  "loja": {
    xc: {
      epic: {
        description: "Viento N/NE suave (10-15km/h), base de nubes >2000m, térmicas fuertes y organizadas",
        windSpeedMax: 15,
        windDirections: ["N", "NE"],
        cloudBaseMin: 2000,
        thermalStrength: "fuerte",
        capeMin: 350,
        visibilityMin: 30,
        notes: "Rutas clásicas hacia Granada y Antequera. Condiciones muy estables."
      },
      good: {
        description: "Viento de componente N, buena radiación",
        windSpeedMax: 18,
        windDirections: ["N", "NE", "NW"],
        cloudBaseMin: 1500,
        thermalStrength: "moderada",
        capeMin: 150,
        visibilityMin: 20
      }
    },
    danger: {
      notes: "⚠️ Viento de SW (>15km/h) puede generar turbulencia en la zona de aterrizaje."
    }
  },
  
  // ======================================================
  // JAÉN - CAZORLA (Zona de montaña, vuelos de distancia)
  // ======================================================
  
  "cazorla": {
    xc: {
      epic: {
        description: "Viento N/NE suave (10-15km/h), base de nubes >2200m, térmicas explosivas en sierra",
        windSpeedMax: 15,
        windDirections: ["N", "NE"],
        cloudBaseMin: 2200,
        thermalStrength: "muy fuerte",
        capeMin: 400,
        visibilityMin: 40,
        notes: "Potencial para vuelos de >150km. Orografía compleja, requiere experiencia."
      },
      good: {
        description: "Viento de componente N, buena insolación",
        windSpeedMax: 18,
        windDirections: ["N", "NE", "NW"],
        cloudBaseMin: 1600,
        thermalStrength: "fuerte",
        capeMin: 200,
        visibilityMin: 25
      }
    },
    danger: {
      notes: "⚠️ Viento de SW o W (>15km/h) genera rotor muy peligroso en las laderas. Zona remota, rescate complicado."
    }
  }
};
