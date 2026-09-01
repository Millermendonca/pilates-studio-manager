package com.studiopilates.app.core.database

import android.content.Context
import androidx.room.Room
import com.studiopilates.app.core.common.Constants
import com.studiopilates.app.core.database.dao.*
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {

    @Provides
    @Singleton
    fun provideDatabase(@ApplicationContext context: Context): PilatesDatabase {
        return Room.databaseBuilder(
            context,
            PilatesDatabase::class.java,
            Constants.DATABASE_NAME
        ).fallbackToDestructiveMigration().build()
    }

    @Provides
    fun provideStudentDao(db: PilatesDatabase): StudentDao = db.studentDao

    @Provides
    fun provideAttendanceDao(db: PilatesDatabase): AttendanceDao = db.attendanceDao

    @Provides
    fun provideCreditDao(db: PilatesDatabase): CreditDao = db.creditDao

    @Provides
    fun provideChatDao(db: PilatesDatabase): ChatDao = db.chatDao
}
