package com.studiopilates.app.core.database

import androidx.room.Database
import androidx.room.RoomDatabase
import com.studiopilates.app.core.database.dao.*
import com.studiopilates.app.core.database.entity.*

@Database(
    entities = [
        StudentEntity::class,
        AttendanceEntity::class,
        CreditEntity::class,
        ChatMessageEntity::class
    ],
    version = 1,
    exportSchema = false
)
abstract class PilatesDatabase : RoomDatabase() {
    abstract val studentDao: StudentDao
    abstract val attendanceDao: AttendanceDao
    abstract val creditDao: CreditDao
    abstract val chatDao: ChatDao
}
