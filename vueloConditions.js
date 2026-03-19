// ======================================================
// VUELO CONDITIONS - UMBRALES Y ANÁLISIS EXPERTO POR ZONA
// TODAS LAS ZONAS DE ANDALUCÍA - VERSIÓN PRO
// ======================================================

window.VUELO_THRESHOLDS = {
  
  // ======================================================
  // CÁDIZ
  // ======================================================
  
  "el-aljibe": {
    xc: {
      epic: {
        description: "🔥 DÍA ÉPICO: Viento de Levante suave (10-15km/h) en altura, base de nubes >1800m, térmicas fuertes y organizadas",
        windSpeedMax: 15,
        windDirections: ["E", "SE"],
        cloudBaseMin: 1800,
        thermalStrength: "fuerte",
        capeMin: 500,
        visibilityMin: 30,
        nivelRecomendado: "medio-avanzado",
        tipoVuelo: "XC + térmico",
        mejorEpoca: "Primavera",
        notas: "Posibilidad de rutas de >100km hacia el interior. Condiciones de clase mundial."
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
      noVolarSi: ["viento >25km/h", "levante fuerte", "nubes de tormenta"],
      notes: "⚠️ Viento fuerte de Levante (>25km/h en altura) genera rotor y condiciones muy peligrosas en la zona de despegue. Evitar vientos del W."
    }
  },
  
  // ======================================================
  // GRANADA - CENES DE LA VEGA / MONACHIL
  // ======================================================
  
  "cenes-monachil": {
    xc: {
      epic: {
        description: "🔥 DÍA ÉPICO: Viento Oeste/Suroeste 10-20km/h, base >2000m, térmicas 3-5m/s en Las Rozas o Sabinas",
        windSpeedMax: 20,
        windDirections: ["O", "SO"],
        cloudBaseMin: 2000,
        thermalStrength: "fuerte",
        capeMin: 400,
        visibilityMin: 30,
        nivelRecomendado: "todos (según despegue)",
        tipoVuelo: "Térmico + XC + recreativo",
        mejorEpoca: "Primavera/Verano",
        opcionesDespegue: {
          "Las Rozas": { altitud: 1300, nivel: "iniciacion" },
          "Las Sabinas": { altitud: 2000, nivel: "intermedio" },
          "Cahuchiles": { altitud: 2700, nivel: "avanzado" }
        },
        notas: "Zona de valle con ciclos térmicos muy marcados. Ideal para progresión."
      },
      good: {
        windSpeedMax: 25,
        windDirections: ["O", "SO"],
        cloudBaseMin: 1500,
        thermalStrength: "moderada",
        capeMin: 200,
        visibilityMin: 20
      }
    },
    danger: {
      noVolarSi: ["levante fuerte", "viento >25km/h", "inestabilidad"],
      notes: "⚠️ Levante fuerte genera rotor brutal. Ciclos térmicos pueden colapsar rápido. Zona de valle con cambios bruscos."
    }
  },
  
  // ======================================================
  // GRANADA - SIERRA NEVADA (ALTA MONTAÑA)
  // ======================================================
  
  "sierra-nevada": {
    xc: {
      epic: {
        description: "🔥 DÍA ÉPICO: Viento flojo en altura (<15km/h), base >3000m, térmicas 3-5m/s, despegue desde Cahuchiles (2700m)",
        windSpeedMax: 15,
        windDirections: ["variable", "N", "NE"],
        cloudBaseMin: 3000,
        thermalStrength: "muy fuerte",
        capeMin: 500,
        visibilityMin: 40,
        nivelRecomendado: "avanzado-experto",
        tipoVuelo: "XC + alta montaña",
        mejorEpoca: "Verano",
        notas: "Altura = ventaja brutal. Posibles vuelos de 40-80km hacia Alpujarra. MUY técnico."
      },
      good: {
        windSpeedMax: 20,
        windDirections: ["N", "NE", "NO"],
        cloudBaseMin: 2500,
        thermalStrength: "fuerte",
        capeMin: 300,
        visibilityMin: 30
      }
    },
    danger: {
      noVolarSi: ["viento >20km/h en altura", "nubes pegadas", "inestabilidad"],
      notes: "⚠️ Viento fuerte en altura = NO VOLAR. Rotor en valles laterales. Turbulencia extrema. Zona de alta montaña, cambios rápidos."
    }
  },
  
  // ======================================================
  // GRANADA - SIERRA DE LOJA
  // ======================================================
  
  "sierra-loja": {
    xc: {
      epic: {
        description: "🔥 DÍA ÉPICO: Viento Oeste/Noroeste 10-20km/h, base >1800m, mezcla perfecta dinámico + térmico",
        windSpeedMax: 20,
        windDirections: ["O", "NO"],
        cloudBaseMin: 1800,
        thermalStrength: "moderada-fuerte",
        capeMin: 300,
        visibilityMin: 30,
        nivelRecomendado: "intermedio-avanzado",
        tipoVuelo: "Mixto (dinámico + térmico)",
        mejorEpoca: "Otoño/Primavera",
        notas: "Zona infravalorada. Vuelos largos y relajados. Cuidado con viento fuerte."
      },
      good: {
        windSpeedMax: 25,
        windDirections: ["O", "NO"],
        cloudBaseMin: 1500,
        thermalStrength: "moderada",
        capeMin: 150,
        visibilityMin: 20
      }
    },
    danger: {
      noVolarSi: ["viento >25km/h", "sotavento", "nubes de tormenta"],
      notes: "⚠️ Zona con historial de accidentes. Peligro de rotor con viento fuerte. Cuidado con aproximaciones a sotavento."
    }
  },
  
  // ======================================================
  // GRANADA - JABALCÓN (BAZA)
  // ======================================================
  
  "jabalcon": {
    xc: {
      epic: {
        description: "🔥 DÍA ÉPICO: Viento flojo (<15km/h), base >2500m, térmicas 3-5m/s muy limpias, terreno seco",
        windSpeedMax: 15,
        windDirections: ["N", "NO", "NE"],
        cloudBaseMin: 2500,
        thermalStrength: "muy fuerte",
        capeMin: 400,
        visibilityMin: 40,
        nivelRecomendado: "intermedio-avanzado",
        tipoVuelo: "XC puro + térmico",
        mejorEpoca: "Primavera",
        notas: "Terreno desértico = térmicas perfectas. Ideal para aprender centrado y XC. Subidas rápidas."
      },
      good: {
        windSpeedMax: 18,
        windDirections: ["N", "NO"],
        cloudBaseMin: 2000,
        thermalStrength: "fuerte",
        capeMin: 250,
        visibilityMin: 30
      }
    },
    danger: {
      noVolarSi: ["viento >20km/h", "inestabilidad", "nubes de desarrollo"],
      notes: "⚠️ Térmicas muy fuertes pueden ser violentas. Zona remota, rescate complicado. Llevar agua y GPS."
    }
  },
  
  // ======================================================
  // GRANADA - LA HERRADURA (COSTA)
  // ======================================================
  
  "la-herradura": {
    xc: {
      epic: {
        description: "🔥 DÍA ÉPICO: Viento Sur/Sureste 15-30km/h laminar, brisa marina constante, ridge soaring perfecto",
        windSpeedMax: 30,
        windDirections: ["S", "SE"],
        cloudBaseMin: 800,
        thermalStrength: "suave",
        capeMin: 100,
        visibilityMin: 30,
        nivelRecomendado: "todos (iniciación a experto)",
        tipoVuelo: "Dinámico puro",
        mejorEpoca: "Invierno",
        notas: "Horas infinitas en el aire sin térmicas. Perfecto para control de vela y vuelo relajado."
      },
      good: {
        windSpeedMax: 25,
        windDirections: ["S", "SE", "E"],
        cloudBaseMin: 600,
        thermalStrength: "suave",
        capeMin: 50,
        visibilityMin: 20
      }
    },
    danger: {
      noVolarSi: ["viento >35km/h", "viento cruzado", "mezcla térmica+brisa"],
      notes: "⚠️ Cuidado con cizalladura si hay mezcla de brisa y térmica. Viento cruzado peligroso en despegue."
    }
  },
  
  // ======================================================
  // GRANADA - OTÍVAR
  // ======================================================
  
  "otivar": {
    xc: {
      epic: {
        description: "🔥 DÍA ÉPICO: Brisa marina + térmica, convergencias locales, vuelos hacia costa",
        windSpeedMax: 20,
        windDirections: ["S", "SE", "O"],
        cloudBaseMin: 1500,
        thermalStrength: "moderada",
        capeMin: 250,
        visibilityMin: 30,
        nivelRecomendado: "intermedio",
        tipoVuelo: "Mixto técnico",
        mejorEpoca: "Primavera",
        notas: "Zona poco conocida pero con gran potencial. Convergencias locales muy interesantes."
      },
      good: {
        windSpeedMax: 25,
        windDirections: ["S", "SE"],
        cloudBaseMin: 1200,
        thermalStrength: "moderada",
        capeMin: 150,
        visibilityMin: 20
      }
    },
    danger: {
      noVolarSi: ["viento norte", "terral fuerte", "inestabilidad"],
      notes: "⚠️ Zona técnica. Cambios bruscos de dirección. Si el viento rola al norte, condiciones peligrosas."
    }
  },
  
  // ======================================================
  // MÁLAGA - EL BUITRE
  // ======================================================
  
  "el-buitre": {
    xc: {
      epic: {
        description: "🔥 DÍA ÉPICO: Terral suave (10-15km/h) del Norte, base >1800m, térmicas organizadas",
        windSpeedMax: 15,
        windDirections: ["N", "NO"],
        cloudBaseMin: 1800,
        thermalStrength: "fuerte",
        capeMin: 300,
        visibilityMin: 30,
        nivelRecomendado: "intermedio-avanzado",
        tipoVuelo: "XC + térmico",
        mejorEpoca: "Primavera/Otoño",
        notas: "Excelente para vuelos de distancia hacia Antequera o Granada."
      },
      good: {
        windSpeedMax: 18,
        windDirections: ["N", "NO", "NE"],
        cloudBaseMin: 1200,
        thermalStrength: "moderada",
        capeMin: 150,
        visibilityMin: 20
      }
    },
    danger: {
      noVolarSi: ["viento levante >20km/h", "componente sur"],
      notes: "⚠️ Levante fuerte genera rotor en despegue. Precaución con la componente sur."
    }
  },
  
  // ======================================================
  // ALMERÍA - CALAR ALTO
  // ======================================================
  
  "calar-alto": {
    xc: {
      epic: {
        description: "🔥 DÍA ÉPICO: Viento N/NE suave (10-15km/h), máxima insolación, térmicas explosivas y secas",
        windSpeedMax: 15,
        windDirections: ["N", "NE"],
        cloudBaseMin: 2000,
        thermalStrength: "explosiva",
        capeMin: 400,
        visibilityMin: 50,
        nivelRecomendado: "avanzado",
        tipoVuelo: "XC + térmico puro",
        mejorEpoca: "Primavera/Otoño",
        notas: "Térmicas fuertes y turbulentas. Solo expertos. Vuelos de distancia hacia interior o costa."
      },
      good: {
        windSpeedMax: 18,
        windDirections: ["N", "NE", "NO"],
        cloudBaseMin: 1500,
        thermalStrength: "fuerte",
        capeMin: 200,
        visibilityMin: 30
      }
    },
    danger: {
      noVolarSi: ["viento levante >20km/h", "calima extrema"],
      notes: "⚠️ Viento de levante fuerte genera turbulencia extrema. Peligro de sobrevuelo del desierto."
    }
  },
  
  // ======================================================
  // JAÉN - CAZORLA
  // ======================================================
  
  "cazorla": {
    xc: {
      epic: {
        description: "🔥 DÍA ÉPICO: Viento N/NE suave (10-15km/h), base >2200m, térmicas explosivas en sierra",
        windSpeedMax: 15,
        windDirections: ["N", "NE"],
        cloudBaseMin: 2200,
        thermalStrength: "muy fuerte",
        capeMin: 400,
        visibilityMin: 40,
        nivelRecomendado: "avanzado-experto",
        tipoVuelo: "XC + montaña",
        mejorEpoca: "Primavera",
        notas: "Potencial para vuelos de >150km. Orografía compleja, requiere experiencia."
      },
      good: {
        windSpeedMax: 18,
        windDirections: ["N", "NE", "NO"],
        cloudBaseMin: 1600,
        thermalStrength: "fuerte",
        capeMin: 200,
        visibilityMin: 25
      }
    },
    danger: {
      noVolarSi: ["viento SW o W >15km/h", "nubes bajas"],
      notes: "⚠️ Viento de SW o W (>15km/h) genera rotor muy peligroso en laderas. Zona remota, rescate complicado."
    }
  }
};
