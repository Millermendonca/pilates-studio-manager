package com.studiopilates.app.core.database.dao

import androidx.room.*
import com.studiopilates.app.core.database.entity.*
import kotlinx.coroutines.flow.Flow

@Dao
interface StudentDao {
    @Query("SELECT * FROM students WHERE id = :id")
    fun getStudentById(id: String): Flow<StudentEntity?>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertStudent(student: StudentEntity)

    @Query("DELETE FROM students WHERE id = :id")
    suspend fun deleteStudent(id: String)
}

@Dao
interface AttendanceDao {
    @Query("SELECT * FROM attendances WHERE studentId = :studentId ORDER BY date ASC, startTime ASC")
    fun getAttendancesByStudentId(studentId: String): Flow<List<AttendanceEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAttendances(attendances: List<AttendanceEntity>)

    @Query("DELETE FROM attendances WHERE studentId = :studentId")
    suspend fun deleteByStudentId(studentId: String)
}

@Dao
interface CreditDao {
    @Query("SELECT * FROM credits WHERE studentId = :studentId AND used = 0 ORDER BY expiresAt ASC")
    fun getActiveCreditsByStudentId(studentId: String): Flow<List<CreditEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertCredits(credits: List<CreditEntity>)

    @Query("DELETE FROM credits WHERE studentId = :studentId")
    suspend fun deleteByStudentId(studentId: String)
}

@Dao
interface ChatDao {
    @Query("SELECT * FROM chat_messages WHERE studentId = :studentId ORDER BY createdAt ASC")
    fun getMessagesByStudentId(studentId: String): Flow<List<ChatMessageEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertMessages(messages: List<ChatMessageEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertMessage(message: ChatMessageEntity)

    @Query("DELETE FROM chat_messages WHERE studentId = :studentId")
    suspend fun deleteByStudentId(studentId: String)
}
