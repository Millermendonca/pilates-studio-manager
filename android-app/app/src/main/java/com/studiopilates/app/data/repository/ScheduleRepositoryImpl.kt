package com.studiopilates.app.data.repository

import com.studiopilates.app.core.common.Resource
import com.studiopilates.app.core.database.dao.AttendanceDao
import com.studiopilates.app.core.database.dao.CreditDao
import com.studiopilates.app.core.database.entity.AttendanceEntity
import com.studiopilates.app.core.database.entity.CreditEntity
import com.studiopilates.app.core.network.ApiService
import com.studiopilates.app.core.network.dto.*
import com.studiopilates.app.domain.model.Attendance
import com.studiopilates.app.domain.model.Credit
import com.studiopilates.app.domain.model.DaySlot
import com.studiopilates.app.domain.model.SlotAttendee
import com.studiopilates.app.domain.repository.ScheduleRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject

class ScheduleRepositoryImpl @Inject constructor(
    private val apiService: ApiService,
    private val attendanceDao: AttendanceDao,
    private val creditDao: CreditDao
) : ScheduleRepository {

    override fun getAttendancesFlow(studentId: String): Flow<List<Attendance>> {
        return attendanceDao.getAttendancesByStudentId(studentId).map { entities ->
            entities.map { it.toDomain() }
        }
    }

    override fun getCreditsFlow(studentId: String): Flow<List<Credit>> {
        return creditDao.getActiveCreditsByStudentId(studentId).map { entities ->
            entities.map { it.toDomain() }
        }
    }

    override suspend fun refreshScheduleData(studentId: String): Resource<Unit> {
        return try {
            val response = apiService.getStudentById(studentId)
            if (response.isSuccessful && response.body() != null) {
                val student = response.body()!!
                
                // Cache Attendances
                attendanceDao.deleteByStudentId(studentId)
                attendanceDao.insertAttendances(student.attendances.map { it.toEntity() })

                // Cache Credits
                creditDao.deleteByStudentId(studentId)
                creditDao.insertCredits(student.credits.map { it.toEntity() })

                Resource.Success(Unit)
            } else {
                Resource.Error(response.message() ?: "Erro ao atualizar agenda")
            }
        } catch (e: Exception) {
            Resource.Error("Falha de conexão: ${e.localizedMessage}")
        }
    }

    override suspend fun getDaySlots(date: String): Resource<List<DaySlot>> {
        return try {
            val response = apiService.getScheduleForDay(date, "day")
            if (response.isSuccessful && response.body() != null) {
                val slots = response.body()!!.slots.map { slotDto ->
                    DaySlot(
                        time = slotDto.time,
                        totalCapacity = slotDto.totalCapacity,
                        occupiedCount = slotDto.occupiedCount,
                        availableCount = slotDto.availableCount,
                        isFull = slotDto.isFull,
                        attendees = slotDto.attendees.map { SlotAttendee(it.studentId, it.studentName, it.type, it.status) }
                    )
                }
                Resource.Success(slots)
            } else {
                Resource.Error(response.message() ?: "Erro ao buscar vagas do dia")
            }
        } catch (e: Exception) {
            Resource.Error("Falha ao buscar vagas: ${e.localizedMessage}")
        }
    }

    override suspend fun performCheckin(
        studentId: String,
        attendanceId: String?,
        lat: Double,
        lon: Double
    ): Resource<String> {
        return try {
            val req = CheckinRequestDto(
                studentId = studentId,
                attendanceId = attendanceId,
                latitude = lat,
                longitude = lon
            )
            val response = apiService.performCheckin(req)
            if (response.isSuccessful) {
                refreshScheduleData(studentId)
                Resource.Success(response.body()?.message ?: "Check-in realizado com sucesso! Bom treino 🧘‍♀️✨")
            } else {
                Resource.Error(response.body()?.error ?: "Não foi possível validar seu check-in.")
            }
        } catch (e: Exception) {
            Resource.Error("Erro ao enviar check-in: ${e.localizedMessage}")
        }
    }

    override suspend fun cancelAttendance(
        studentId: String,
        attendanceId: String
    ): Resource<String> {
        return try {
            val req = CancelClassRequestDto(studentId, attendanceId)
            val response = apiService.cancelAttendance(req)
            if (response.isSuccessful) {
                refreshScheduleData(studentId)
                Resource.Success(response.body()?.message ?: "Aula cancelada e crédito de reposição gerado com sucesso!")
            } else {
                Resource.Error(response.body()?.error ?: "Erro ao cancelar aula")
            }
        } catch (e: Exception) {
            Resource.Error("Erro: ${e.localizedMessage}")
        }
    }

    override suspend fun rescheduleClass(
        studentId: String,
        attendanceId: String?,
        scheduleId: String?,
        targetDate: String,
        targetTime: String,
        scope: String
    ): Resource<String> {
        return try {
            val req = RescheduleRequestDto(studentId, attendanceId, scheduleId, targetDate, targetTime, scope)
            val response = apiService.rescheduleClass(req)
            if (response.isSuccessful) {
                refreshScheduleData(studentId)
                Resource.Success(response.body()?.message ?: "Horário remarcado com sucesso!")
            } else {
                Resource.Error(response.body()?.error ?: "Vaga indisponível ou limite atingido.")
            }
        } catch (e: Exception) {
            Resource.Error("Erro: ${e.localizedMessage}")
        }
    }

    override suspend fun bookReplacement(
        studentId: String,
        creditId: String,
        date: String,
        time: String
    ): Resource<String> {
        return try {
            val req = BookReplacementRequestDto(studentId, creditId, date, time)
            val response = apiService.bookClass(req)
            if (response.isSuccessful) {
                refreshScheduleData(studentId)
                Resource.Success(response.body()?.message ?: "Aula de reposição agendada com sucesso!")
            } else {
                Resource.Error(response.body()?.error ?: "Horário selecionado indisponível.")
            }
        } catch (e: Exception) {
            Resource.Error("Erro: ${e.localizedMessage}")
        }
    }

    override suspend fun validateCorporateToken(
        studentId: String,
        provider: String,
        token: String
    ): Resource<String> {
        return try {
            val req = CorporateTokenRequestDto(studentId, provider, token)
            val response = apiService.validateCorporateToken(req)
            if (response.isSuccessful) {
                refreshScheduleData(studentId)
                Resource.Success(response.body()?.message ?: "Token $provider validado com sucesso!")
            } else {
                Resource.Error(response.body()?.error ?: "Token inválido ou já utilizado hoje.")
            }
        } catch (e: Exception) {
            Resource.Error("Erro: ${e.localizedMessage}")
        }
    }
}

// Mappers
fun AttendanceEntity.toDomain(): Attendance {
    return Attendance(id, studentId, date, startTime, endTime, status, isAutoCheckin, checkinTime, notes)
}

fun AttendanceDto.toEntity(): AttendanceEntity {
    return AttendanceEntity(id, studentId, date, startTime, endTime, status, isAutoCheckin ?: false, checkinTime, notes)
}

fun CreditEntity.toDomain(): Credit {
    return Credit(id, studentId, reason, used, expiresAt)
}

fun CreditDto.toEntity(): CreditEntity {
    return CreditEntity(id, studentId, reason, used, expiresAt)
}
