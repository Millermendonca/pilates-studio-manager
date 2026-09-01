package com.studiopilates.app.data.repository

import com.studiopilates.app.core.common.Resource
import com.studiopilates.app.core.database.dao.StudentDao
import com.studiopilates.app.core.database.entity.StudentEntity
import com.studiopilates.app.core.network.ApiService
import com.studiopilates.app.core.network.dto.StudentDto
import com.studiopilates.app.domain.model.*
import com.studiopilates.app.domain.repository.StudentRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject

class StudentRepositoryImpl @Inject constructor(
    private val apiService: ApiService,
    private val studentDao: StudentDao
) : StudentRepository {

    override fun getStudentFlow(studentId: String): Flow<Student?> {
        return studentDao.getStudentById(studentId).map { entity ->
            entity?.toDomain()
        }
    }

    override suspend fun refreshStudent(studentId: String): Resource<Student> {
        return try {
            val response = apiService.getStudentById(studentId)
            if (response.isSuccessful && response.body() != null) {
                val dto = response.body()!!
                studentDao.insertStudent(dto.toEntity())
                Resource.Success(dto.toDomain())
            } else {
                Resource.Error(response.message() ?: "Erro ao carregar dados do aluno")
            }
        } catch (e: Exception) {
            Resource.Error("Falha de conexão: ${e.localizedMessage}")
        }
    }

    override suspend fun updateStudentProfile(student: Student): Resource<Student> {
        return try {
            val payload = student.toDto()
            val response = apiService.updateStudent(student.id, payload)
            if (response.isSuccessful && response.body() != null) {
                val dto = response.body()!!
                studentDao.insertStudent(dto.toEntity())
                Resource.Success(dto.toDomain())
            } else {
                Resource.Error(response.message() ?: "Erro ao atualizar prontuário")
            }
        } catch (e: Exception) {
            Resource.Error("Erro ao salvar: ${e.localizedMessage}")
        }
    }

    override suspend fun getAvailableStudents(): Resource<List<Student>> {
        return try {
            val response = apiService.getStudents()
            if (response.isSuccessful && response.body() != null) {
                val list = response.body()!!.map { it.toDomain() }
                Resource.Success(list)
            } else {
                Resource.Error(response.message() ?: "Erro ao listar alunos")
            }
        } catch (e: Exception) {
            Resource.Error("Falha ao buscar alunos: ${e.localizedMessage}")
        }
    }
}

// Mappers
fun StudentEntity.toDomain(): Student {
    return Student(
        id = id,
        name = name,
        email = email,
        phone = phone,
        cpf = cpf,
        birthDate = birthDate,
        address = address,
        neighborhood = neighborhood,
        city = city,
        state = state,
        avatarUrl = avatarUrl,
        photoCompressed = photoCompressed,
        planName = planName ?: "2x por Semana",
        monthlyFee = monthlyFee ?: 340.0,
        isCorporate = isCorporate,
        corporateProvider = corporateProvider,
        status = status,
        emergencyContactName = emergencyContactName,
        emergencyContactPhone = emergencyContactPhone,
        emergencyContactRelation = emergencyContactRelation,
        medicalHistory = medicalHistory,
        injuries = injuries,
        surgeries = surgeries,
        movementRestrictions = movementRestrictions,
        painLevel = painLevel,
        goals = goals,
        contractAccepted = contractAccepted,
        contractSignature = contractSignature
    )
}

fun StudentDto.toEntity(): StudentEntity {
    return StudentEntity(
        id = id,
        name = name,
        email = email,
        phone = phone,
        cpf = cpf,
        birthDate = birthDate,
        address = address,
        neighborhood = neighborhood,
        city = city,
        state = state,
        avatarUrl = avatarUrl,
        photoCompressed = photoCompressed,
        planName = planName,
        monthlyFee = monthlyFee,
        isCorporate = isCorporate ?: false,
        corporateProvider = corporateProvider,
        status = status ?: "ACTIVE",
        emergencyContactName = emergencyContactName,
        emergencyContactPhone = emergencyContactPhone,
        emergencyContactRelation = emergencyContactRelation,
        medicalHistory = medicalHistory ?: healthNotes,
        injuries = injuries,
        surgeries = surgeries,
        movementRestrictions = movementRestrictions,
        painLevel = painLevel ?: 0,
        goals = goals,
        contractAccepted = contractAccepted ?: false,
        contractSignature = contractSignature
    )
}

fun StudentDto.toDomain(): Student {
    return Student(
        id = id,
        name = name,
        email = email,
        phone = phone,
        cpf = cpf,
        birthDate = birthDate,
        address = address,
        neighborhood = neighborhood,
        city = city,
        state = state,
        latitude = latitude,
        longitude = longitude,
        avatarUrl = avatarUrl,
        photoCompressed = photoCompressed,
        planName = planName ?: "2x por Semana",
        monthlyFee = monthlyFee ?: 340.0,
        isCorporate = isCorporate ?: false,
        corporateProvider = corporateProvider,
        status = status ?: "ACTIVE",
        emergencyContactName = emergencyContactName,
        emergencyContactPhone = emergencyContactPhone,
        emergencyContactRelation = emergencyContactRelation,
        medicalHistory = medicalHistory ?: healthNotes,
        injuries = injuries,
        surgeries = surgeries,
        movementRestrictions = movementRestrictions,
        painLevel = painLevel ?: 0,
        goals = goals,
        contractAccepted = contractAccepted ?: false,
        contractSignature = contractSignature,
        schedules = schedules.map { Schedule(it.id, it.dayOfWeek, it.startTime, it.endTime, it.active ?: true) },
        credits = credits.map { Credit(it.id, it.studentId, it.reason, it.used, it.expiresAt) },
        invoices = invoices.map { Invoice(it.id, it.studentId, it.amount, it.dueDate, it.status, it.pixCode, it.pixQrCodeUrl, it.paidAt) },
        attendances = attendances.map { Attendance(it.id, it.studentId, it.date, it.startTime, it.endTime, it.status, it.isAutoCheckin ?: false, it.checkinTime, it.notes) }
    )
}

fun Student.toDto(): StudentDto {
    return StudentDto(
        id = id,
        name = name,
        email = email,
        phone = phone,
        cpf = cpf,
        birthDate = birthDate,
        address = address,
        neighborhood = neighborhood,
        city = city,
        state = state,
        latitude = latitude,
        longitude = longitude,
        avatarUrl = avatarUrl,
        photoCompressed = photoCompressed,
        planName = planName,
        monthlyFee = monthlyFee,
        isCorporate = isCorporate,
        corporateProvider = corporateProvider,
        status = status,
        emergencyContactName = emergencyContactName,
        emergencyContactPhone = emergencyContactPhone,
        emergencyContactRelation = emergencyContactRelation,
        medicalHistory = medicalHistory,
        injuries = injuries,
        surgeries = surgeries,
        movementRestrictions = movementRestrictions,
        painLevel = painLevel,
        goals = goals,
        contractAccepted = contractAccepted,
        contractSignature = contractSignature
    )
}
