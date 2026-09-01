package com.studiopilates.app.core.network.dto

import kotlinx.serialization.Serializable

@Serializable
data class ScheduleDto(
    val id: String? = null,
    val studentId: String? = null,
    val dayOfWeek: Int,
    val startTime: String,
    val endTime: String,
    val active: Boolean? = true
)

@Serializable
data class DaySlotDto(
    val time: String,
    val totalCapacity: Int = 4,
    val occupiedCount: Int = 0,
    val availableCount: Int = 4,
    val isFull: Boolean = false,
    val attendees: List<SlotAttendeeDto> = emptyList()
)

@Serializable
data class SlotAttendeeDto(
    val studentId: String,
    val studentName: String,
    val type: String = "REGULAR", // REGULAR, REPLACEMENT, TRIAL
    val status: String = "SCHEDULED"
)

@Serializable
data class ScheduleDayResponseDto(
    val date: String,
    val dayName: String,
    val slots: List<DaySlotDto> = emptyList()
)
