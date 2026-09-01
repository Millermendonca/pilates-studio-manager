package com.studiopilates.app.core.network.dto

import kotlinx.serialization.Serializable

@Serializable
data class StudentDto(
    val id: String,
    val name: String,
    val email: String? = null,
    val phone: String? = null,
    val cpf: String? = null,
    val birthDate: String? = null,
    val address: String? = null,
    val neighborhood: String? = null,
    val city: String? = null,
    val state: String? = null,
    val latitude: Double? = null,
    val longitude: Double? = null,
    val avatarUrl: String? = null,
    val photoCompressed: String? = null,
    val planName: String? = null,
    val monthlyFee: Double? = null,
    val isCorporate: Boolean? = false,
    val corporateProvider: String? = null,
    val status: String? = "ACTIVE",
    val emergencyContactName: String? = null,
    val emergencyContactPhone: String? = null,
    val emergencyContactRelation: String? = null,
    val medicalHistory: String? = null,
    val healthNotes: String? = null,
    val injuries: String? = null,
    val surgeries: String? = null,
    val movementRestrictions: String? = null,
    val painLevel: Int? = 0,
    val goals: String? = null,
    val contractAccepted: Boolean? = false,
    val contractAcceptedAt: String? = null,
    val contractSignature: String? = null,
    val schedules: List<ScheduleDto> = emptyList(),
    val credits: List<CreditDto> = emptyList(),
    val invoices: List<InvoiceDto> = emptyList(),
    val attendances: List<AttendanceDto> = emptyList()
)
