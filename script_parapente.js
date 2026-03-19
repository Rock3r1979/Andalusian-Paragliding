// ======================================================
// SPOT CONDITIONS - UMBRALES PERSONALIZADOS POR ZONA
// Basado en el vueloConditions.js maestro
// ======================================================

window.VUELO_THRESHOLDS = {
  
  // ======================================================
  // CÁDIZ - EL ALJIBE
  // ======================================================
  
  "el-aljibe": {
    xc: {
      epic: {
        description: "Viento de Levante suave (10-15km/h) en altura, base de nubes >1800m, térmicas fuertes",
        windSpeedMax: 15,
        windDirections: ["E", "SE"],
        cloudBaseMin: 1800,
        thermalStrength: "fuerte",
        capeMin: 500
      },
      good: {
        description: "Viento de Levante o Poniente suave, buena radiación",
        windSpeedMax: 18,
        windDirections: ["E", "SE", "W"],
        cloudBaseMin: 1400,
        thermalStrength: "moderada",
        capeMin: 200
      }
    },
    danger: {
      notes: "⚠️ Viento fuerte de Levante (>25km/h) genera rotor peligroso."
    }
  }
  // ... más zonas
};
