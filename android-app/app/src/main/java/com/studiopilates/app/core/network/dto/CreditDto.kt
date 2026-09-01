package com.studiopilates.app.core.network.dto

import kotlinx.serialization.Serializable

@Serializable
data class CreditDto(
    val id: String,
    val studentId: String,
    val reason: String? = "Ausência com aviso prévio",
    val used: Boolean = false,
    val usedAt: String? = null,
    val expiresAt: String,
    val createdAt: String? = null
)
