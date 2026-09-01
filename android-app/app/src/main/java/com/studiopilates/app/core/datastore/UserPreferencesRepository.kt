package com.studiopilates.app.core.datastore

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.*
import androidx.datastore.preferences.preferencesDataStore
import com.studiopilates.app.core.common.Constants
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = Constants.PREFERENCES_NAME)

@Singleton
class UserPreferencesRepository @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private object PreferencesKeys {
        val SELECTED_STUDENT_ID = stringPreferencesKey("selected_student_id")
        val SERVER_BASE_URL = stringPreferencesKey("server_base_url")
        val DARK_THEME = booleanPreferencesKey("dark_theme")
        val NOTIFICATIONS_ENABLED = booleanPreferencesKey("notifications_enabled")
    }

    val selectedStudentId: Flow<String?> = context.dataStore.data.map { preferences ->
        preferences[PreferencesKeys.SELECTED_STUDENT_ID]
    }

    val serverBaseUrl: Flow<String> = context.dataStore.data.map { preferences ->
        preferences[PreferencesKeys.SERVER_BASE_URL] ?: Constants.BASE_URL
    }

    val isDarkTheme: Flow<Boolean?> = context.dataStore.data.map { preferences ->
        preferences[PreferencesKeys.DARK_THEME]
    }

    suspend fun setSelectedStudentId(studentId: String) {
        context.dataStore.edit { preferences ->
            preferences[PreferencesKeys.SELECTED_STUDENT_ID] = studentId
        }
    }

    suspend fun setServerBaseUrl(url: String) {
        context.dataStore.edit { preferences ->
            preferences[PreferencesKeys.SERVER_BASE_URL] = url
        }
    }

    suspend fun setDarkTheme(enabled: Boolean) {
        context.dataStore.edit { preferences ->
            preferences[PreferencesKeys.DARK_THEME] = enabled
        }
    }

    suspend fun clearSession() {
        context.dataStore.edit { preferences ->
            preferences.remove(PreferencesKeys.SELECTED_STUDENT_ID)
        }
    }
}
