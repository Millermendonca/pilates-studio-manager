package com.studiopilates.app.core.network.dto

import kotlinx.serialization.Serializable

@Serializable
data class StudioSettingsDto(
    val studioName: String? = "Studio Pilates",
    val address: String? = null,
    val neighborhood: String? = null,
    val city: String? = null,
    val state: String? = null,
    val latitude: Double? = null,
    val longitude: Double? = null,
    val cancelWindowHours: Int = 2,
    val creditValidityDays: Int = 30,
    val checkinRadiusMeters: Double = 60.0,
    val checkinDwellMinutes: Int = 30,
    val monthlyRescheduleLimit: Int = 2,
    val contractTermsText: String? = null,
    val googleReviewUrl: String? = null,
    val instagram: String? = null,
    val whatsapp: String? = null
)

@Serializable
data class CheckinRequestDto(
    val studentId: String,
    val attendanceId: String? = null,
    val latitude: Double,
    val longitude: Double,
    val dwellMinutes: Int = 30
)

@Serializable
data class RescheduleRequestDto(
    val studentId: String,
    val attendanceId: String? = null,
    val scheduleId: String? = null,
    val targetDate: String,
    val targetTime: String,
    val scope: String = "SINGLE" // SINGLE, RECURRING_FUTURE
)

@Serializable
data class CancelClassRequestDto(
    val studentId: String,
    val attendanceId: String
)

@Serializable
data class BookReplacementRequestDto(
    val studentId: String,
    val creditId: String,
    val date: String,
    val time: String
)

@Serializable
data class CorporateTokenRequestDto(
    val studentId: String,
    val provider: String, // WELLHUB, TOTALPASS
    val token: String
)

@Serializable
data class DigitalContractSignatureDto(
    val studentId: String,
    val signature: String,
    val accepted: Boolean = true
)

@Serializable
data class ApiResponseDto(
    val success: Boolean = true,
    val message: String? = null,
    val error: String? = null
)
