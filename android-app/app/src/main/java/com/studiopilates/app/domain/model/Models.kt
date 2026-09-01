package com.studiopilates.app.domain.model

data class Student(
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
    val planName: String? = "2x por Semana",
    val monthlyFee: Double? = 340.0,
    val isCorporate: Boolean = false,
    val corporateProvider: String? = null,
    val status: String = "ACTIVE",
    val emergencyContactName: String? = null,
    val emergencyContactPhone: String? = null,
    val emergencyContactRelation: String? = null,
    val medicalHistory: String? = null,
    val injuries: String? = null,
    val surgeries: String? = null,
    val movementRestrictions: String? = null,
    val painLevel: Int = 0,
    val goals: String? = null,
    val contractAccepted: Boolean = false,
    val contractSignature: String? = null,
    val schedules: List<Schedule> = emptyList(),
    val credits: List<Credit> = emptyList(),
    val invoices: List<Invoice> = emptyList(),
    val attendances: List<Attendance> = emptyList()
)

data class Schedule(
    val id: String? = null,
    val dayOfWeek: Int,
    val startTime: String,
    val endTime: String,
    val active: Boolean = true
)

data class Attendance(
    val id: String,
    val studentId: String,
    val date: String,
    val startTime: String,
    val endTime: String,
    val status: String = "SCHEDULED",
    val isAutoCheckin: Boolean = false,
    val checkinTime: String? = null,
    val notes: String? = null
)

data class Credit(
    val id: String,
    val studentId: String,
    val reason: String? = "Ausência com aviso prévio",
    val used: Boolean = false,
    val expiresAt: String
)

data class Invoice(
    val id: String,
    val studentId: String,
    val amount: Double,
    val dueDate: String,
    val status: String = "PENDING",
    val pixCode: String? = null,
    val pixQrCodeUrl: String? = null,
    val paidAt: String? = null
)

data class ChatMessage(
    val id: String,
    val studentId: String,
    val senderType: String, // STUDENT, STUDIO, SYSTEM
    val messageText: String,
    val read: Boolean = false,
    val createdAt: String
)

data class DaySlot(
    val time: String,
    val totalCapacity: Int = 4,
    val occupiedCount: Int = 0,
    val availableCount: Int = 4,
    val isFull: Boolean = false,
    val attendees: List<SlotAttendee> = emptyList()
)

data class SlotAttendee(
    val studentId: String,
    val studentName: String,
    val type: String = "REGULAR",
    val status: String = "SCHEDULED"
)

data class StudioSettings(
    val studioName: String = "Studio Pilates",
    val address: String? = null,
    val neighborhood: String? = null,
    val city: String? = null,
    val state: String? = null,
    val latitude: Double = -23.561684,
    val longitude: Double = -46.655981,
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
