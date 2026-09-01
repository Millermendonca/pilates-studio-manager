package com.studiopilates.app.domain.repository

import com.studiopilates.app.core.common.Resource
import com.studiopilates.app.domain.model.*
import kotlinx.coroutines.flow.Flow

interface StudentRepository {
    fun getStudentFlow(studentId: String): Flow<Student?>
    suspend fun refreshStudent(studentId: String): Resource<Student>
    suspend fun updateStudentProfile(student: Student): Resource<Student>
    suspend fun getAvailableStudents(): Resource<List<Student>>
}

interface ScheduleRepository {
    fun getAttendancesFlow(studentId: String): Flow<List<Attendance>>
    fun getCreditsFlow(studentId: String): Flow<List<Credit>>
    suspend fun refreshScheduleData(studentId: String): Resource<Unit>
    suspend fun getDaySlots(date: String): Resource<List<DaySlot>>
    suspend fun performCheckin(studentId: String, attendanceId: String?, lat: Double, lon: Double): Resource<String>
    suspend fun cancelAttendance(studentId: String, attendanceId: String): Resource<String>
    suspend fun rescheduleClass(studentId: String, attendanceId: String?, scheduleId: String?, targetDate: String, targetTime: String, scope: String): Resource<String>
    suspend fun bookReplacement(studentId: String, creditId: String, date: String, time: String): Resource<String>
    suspend fun validateCorporateToken(studentId: String, provider: String, token: String): Resource<String>
}

interface ChatRepository {
    fun getMessagesFlow(studentId: String): Flow<List<ChatMessage>>
    suspend fun refreshMessages(studentId: String): Resource<List<ChatMessage>>
    suspend fun sendMessage(studentId: String, text: String): Resource<ChatMessage>
}

interface SettingsRepository {
    suspend fun getStudioSettings(): Resource<StudioSettings>
}
