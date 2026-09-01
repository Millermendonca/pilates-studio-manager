package com.studiopilates.app.core.network

import com.studiopilates.app.core.network.dto.*
import retrofit2.Response
import retrofit2.http.*

interface ApiService {

    // Alunos
    @GET("students")
    suspend fun getStudents(): Response<List<StudentDto>>

    @GET("students/{id}")
    suspend fun getStudentById(@Path("id") id: String): Response<StudentDto>

    @PUT("students/{id}")
    suspend fun updateStudent(
        @Path("id") id: String,
        @Body payload: StudentDto
    ): Response<StudentDto>

    // Agenda & Vagas
    @GET("schedule")
    suspend fun getScheduleForDay(
        @Query("date") date: String,
        @Query("view") view: String = "day"
    ): Response<ScheduleDayResponseDto>

    @PATCH("schedule")
    suspend fun rescheduleClass(
        @Body request: RescheduleRequestDto
    ): Response<ApiResponseDto>

    @POST("schedule")
    suspend fun bookClass(
        @Body payload: BookReplacementRequestDto
    ): Response<ApiResponseDto>

    // Presença & Check-in
    @POST("attendance/checkin")
    suspend fun performCheckin(
        @Body request: CheckinRequestDto
    ): Response<ApiResponseDto>

    @POST("attendance/cancel")
    suspend fun cancelAttendance(
        @Body request: CancelClassRequestDto
    ): Response<ApiResponseDto>

    // Convênios Corporativos (Wellhub / TotalPass)
    @POST("corporate/checkin")
    suspend fun validateCorporateToken(
        @Body request: CorporateTokenRequestDto
    ): Response<ApiResponseDto>

    // Chat
    @GET("chat")
    suspend fun getChatMessages(
        @Query("studentId") studentId: String
    ): Response<List<ChatMessageDto>>

    @POST("chat")
    suspend fun sendChatMessage(
        @Body request: SendMessageRequestDto
    ): Response<ChatMessageDto>

    // Configurações do Estúdio
    @GET("settings")
    suspend fun getStudioSettings(): Response<StudioSettingsDto>
}
