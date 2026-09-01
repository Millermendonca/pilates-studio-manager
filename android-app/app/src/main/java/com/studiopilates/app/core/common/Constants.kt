package com.studiopilates.app.core.common

object Constants {
    const val BASE_URL = "http://10.0.2.2:3000/api/" // Default local emulator; in production set your Render URL
    const val DATABASE_NAME = "pilates_db"
    const val PREFERENCES_NAME = "pilates_user_preferences"
    
    // Configurações Padrão de Geolocalização (Studio Harmonia)
    const val DEFAULT_STUDIO_LATITUDE = -23.561684
    const val DEFAULT_STUDIO_LONGITUDE = -46.655981
    const val DEFAULT_CHECKIN_RADIUS_METERS = 60.0
    const val DEFAULT_CHECKIN_DWELL_MINUTES = 30
    
    // Links Sociais e de Apoio
    const val GOOGLE_REVIEW_URL = "https://maps.app.goo.gl/sUoFd6YoGGLMLkMi9"
    const val INSTAGRAM_URL = "https://instagram.com/pilatescenter"
    const val WHATSAPP_URL = "https://wa.me/5522999623247?text=Olá,%20Studio%20Pilates!%20Gostaria%20de%20tirar%20uma%20dúvida."
}
