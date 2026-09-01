package com.studiopilates.app.core.network.dto

import kotlinx.serialization.Serializable

@Serializable
data class ChatMessageDto(
    val id: String,
    val studentId: String,
    val senderType: String, // STUDENT, STUDIO, SYSTEM
    val messageText: String,
    val read: Boolean = false,
    val createdAt: String
)

@Serializable
data class SendMessageRequestDto(
    val studentId: String,
    val message: String,
    val senderType: String = "STUDENT"
)
