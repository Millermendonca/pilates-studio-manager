package com.studiopilates.app.domain.usecase

import com.studiopilates.app.core.common.Resource
import com.studiopilates.app.core.location.LocationHelper
import com.studiopilates.app.domain.model.*
import com.studiopilates.app.domain.repository.*
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject

class GetStudentProfileUseCase @Inject constructor(
    private val repository: StudentRepository
) {
    operator fun invoke(studentId: String): Flow<Student?> = repository.getStudentFlow(studentId)
}

class RefreshStudentUseCase @Inject constructor(
    private val repository: StudentRepository
) {
    suspend operator fun invoke(studentId: String): Resource<Student> = repository.refreshStudent(studentId)
}

class UpdateStudentProfileUseCase @Inject constructor(
    private val repository: StudentRepository
) {
    suspend operator fun invoke(student: Student): Resource<Student> = repository.updateStudentProfile(student)
}

class GetAvailableStudentsUseCase @Inject constructor(
    private val repository: StudentRepository
) {
    suspend operator fun invoke(): Resource<List<Student>> = repository.getAvailableStudents()
}

class GetStudentAttendancesUseCase @Inject constructor(
    private val repository: ScheduleRepository
) {
    operator fun invoke(studentId: String): Flow<List<Attendance>> = repository.getAttendancesFlow(studentId)
}

class GetStudentCreditsUseCase @Inject constructor(
    private val repository: ScheduleRepository
) {
    operator fun invoke(studentId: String): Flow<List<Credit>> = repository.getCreditsFlow(studentId)
}

class GetDaySlotsUseCase @Inject constructor(
    private val repository: ScheduleRepository
) {
    suspend operator fun invoke(date: String): Resource<List<DaySlot>> = repository.getDaySlots(date)
}

class PerformGeofenceCheckinUseCase @Inject constructor(
    private val scheduleRepository: ScheduleRepository,
    private val settingsRepository: SettingsRepository,
    private val locationHelper: LocationHelper
) {
    suspend operator fun invoke(studentId: String, attendanceId: String?): Resource<String> {
        val location = locationHelper.getCurrentLocation()
            ?: return Resource.Error("Não foi possível obter sua localização GPS. Verifique se o GPS está ativado.")

        val settingsResult = settingsRepository.getStudioSettings()
        val settings = settingsResult.data ?: StudioSettings()

        val distance = locationHelper.calculateDistanceMeters(
            location.latitude,
            location.longitude,
            settings.latitude,
            settings.longitude
        )

        val allowedRadius = settings.checkinRadiusMeters
        if (distance > allowedRadius) {
            val distFormatted = String.format("%.0f", distance)
            val allowedFormatted = String.format("%.0f", allowedRadius)
            return Resource.Error("Você está a ${distFormatted}m do estúdio. Aproxime-se (raio máximo permitido: ${allowedFormatted}m) para realizar o check-in.")
        }

        return scheduleRepository.performCheckin(
            studentId = studentId,
            attendanceId = attendanceId,
            lat = location.latitude,
            lon = location.longitude
        )
    }
}

class CancelClassUseCase @Inject constructor(
    private val repository: ScheduleRepository
) {
    suspend operator fun invoke(studentId: String, attendanceId: String): Resource<String> =
        repository.cancelAttendance(studentId, attendanceId)
}

class RescheduleClassUseCase @Inject constructor(
    private val repository: ScheduleRepository
) {
    suspend operator fun invoke(
        studentId: String,
        attendanceId: String?,
        scheduleId: String?,
        targetDate: String,
        targetTime: String,
        scope: String
    ): Resource<String> = repository.rescheduleClass(studentId, attendanceId, scheduleId, targetDate, targetTime, scope)
}

class BookReplacementUseCase @Inject constructor(
    private val repository: ScheduleRepository
) {
    suspend operator fun invoke(
        studentId: String,
        creditId: String,
        date: String,
        time: String
    ): Resource<String> = repository.bookReplacement(studentId, creditId, date, time)
}

class ValidateCorporateTokenUseCase @Inject constructor(
    private val repository: ScheduleRepository
) {
    suspend operator fun invoke(
        studentId: String,
        provider: String,
        token: String
    ): Resource<String> = repository.validateCorporateToken(studentId, provider, token)
}

class GetChatMessagesUseCase @Inject constructor(
    private val repository: ChatRepository
) {
    operator fun invoke(studentId: String): Flow<List<ChatMessage>> = repository.getMessagesFlow(studentId)
}

class RefreshChatMessagesUseCase @Inject constructor(
    private val repository: ChatRepository
) {
    suspend operator fun invoke(studentId: String): Resource<List<ChatMessage>> = repository.refreshMessages(studentId)
}

class SendChatMessageUseCase @Inject constructor(
    private val repository: ChatRepository
) {
    suspend operator fun invoke(studentId: String, text: String): Resource<ChatMessage> =
        repository.sendMessage(studentId, text)
}

class GetStudioSettingsUseCase @Inject constructor(
    private val repository: SettingsRepository
) {
    suspend operator fun invoke(): Resource<StudioSettings> = repository.getStudioSettings()
}
