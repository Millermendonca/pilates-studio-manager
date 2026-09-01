package com.studiopilates.app.core.database.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "students")
data class StudentEntity(
    @PrimaryKey val id: String,
    val name: String,
    val email: String?,
    val phone: String?,
    val cpf: String?,
    val birthDate: String?,
    val address: String?,
    val neighborhood: String?,
    val city: String?,
    val state: String?,
    val avatarUrl: String?,
    val photoCompressed: String?,
    val planName: String?,
    val monthlyFee: Double?,
    val isCorporate: Boolean,
    val corporateProvider: String?,
    val status: String,
    val emergencyContactName: String?,
    val emergencyContactPhone: String?,
    val emergencyContactRelation: String?,
    val medicalHistory: String?,
    val injuries: String?,
    val surgeries: String?,
    val movementRestrictions: String?,
    val painLevel: Int,
    val goals: String?,
    val contractAccepted: Boolean,
    val contractSignature: String?
)

@Entity(tableName = "attendances")
data class AttendanceEntity(
    @PrimaryKey val id: String,
    val studentId: String,
    val date: String,
    val startTime: String,
    val endTime: String,
    val status: String,
    val isAutoCheckin: Boolean,
    val checkinTime: String?,
    val notes: String?
)

@Entity(tableName = "credits")
data class CreditEntity(
    @PrimaryKey val id: String,
    val studentId: String,
    val reason: String?,
    val used: Boolean,
    val expiresAt: String
)

@Entity(tableName = "chat_messages")
data class ChatMessageEntity(
    @PrimaryKey val id: String,
    val studentId: String,
    val senderType: String,
    val messageText: String,
    val read: Boolean,
    val createdAt: String
)
