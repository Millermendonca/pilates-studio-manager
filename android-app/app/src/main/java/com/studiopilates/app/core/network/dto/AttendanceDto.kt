package com.studiopilates.app.core.network.dto

import kotlinx.serialization.Serializable

@Serializable
data class AttendanceDto(
    val id: String,
    val studentId: String,
    val date: String,
    val startTime: String,
    val endTime: String,
    val status: String = "SCHEDULED", // SCHEDULED, PRESENT, ABSENT, CANCELLED, RESCHEDULED
    val isAutoCheckin: Boolean? = false,
    val checkinTime: String? = null,
    val notes: String? = null,
    val instructorName: String? = null
)
