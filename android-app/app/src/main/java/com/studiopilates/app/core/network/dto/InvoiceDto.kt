package com.studiopilates.app.core.network.dto

import kotlinx.serialization.Serializable

@Serializable
data class InvoiceDto(
    val id: String,
    val studentId: String,
    val amount: Double,
    val dueDate: String,
    val status: String = "PENDING", // PENDING, PAID, OVERDUE, CANCELLED
    val pixCode: String? = null,
    val pixQrCodeUrl: String? = null,
    val paidAt: String? = null
)
