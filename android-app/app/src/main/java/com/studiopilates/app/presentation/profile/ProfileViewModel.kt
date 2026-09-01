package com.studiopilates.app.presentation.profile

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.studiopilates.app.core.common.Resource
import com.studiopilates.app.core.datastore.UserPreferencesRepository
import com.studiopilates.app.domain.model.Student
import com.studiopilates.app.domain.usecase.GetStudentProfileUseCase
import com.studiopilates.app.domain.usecase.UpdateStudentProfileUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ProfileUiState(
    val student: Student? = null,
    val isSaving: Boolean = false,
    val successMessage: String? = null,
    val errorMessage: String? = null
)

@HiltViewModel
class ProfileViewModel @Inject constructor(
    private val getStudentProfileUseCase: GetStudentProfileUseCase,
    private val updateStudentProfileUseCase: UpdateStudentProfileUseCase,
    private val preferencesRepository: UserPreferencesRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(ProfileUiState())
    val uiState: StateFlow<ProfileUiState> = _uiState.asStateFlow()

    init {
        observeData()
    }

    private fun observeData() {
        viewModelScope.launch {
            preferencesRepository.selectedStudentId.collectLatest { studentId ->
                if (studentId != null) {
                    getStudentProfileUseCase(studentId).collectLatest { student ->
                        _uiState.update { it.copy(student = student) }
                    }
                }
            }
        }
    }

    fun updateAnamnese(
        medicalHistory: String,
        injuries: String,
        restrictions: String,
        painLevel: Int,
        goals: String
    ) {
        val current = _uiState.value.student ?: return
        viewModelScope.launch {
            _uiState.update { it.copy(isSaving = true, successMessage = null, errorMessage = null) }
            val updated = current.copy(
                medicalHistory = medicalHistory,
                injuries = injuries,
                movementRestrictions = restrictions,
                painLevel = painLevel,
                goals = goals
            )
            val result = updateStudentProfileUseCase(updated)
            when (result) {
                is Resource.Success -> {
                    _uiState.update { it.copy(isSaving = false, successMessage = "Ficha médica atualizada com sucesso!") }
                }
                is Resource.Error -> {
                    _uiState.update { it.copy(isSaving = false, errorMessage = result.message) }
                }
                else -> {}
            }
        }
    }

    fun clearFeedback() {
        _uiState.update { it.copy(successMessage = null, errorMessage = null) }
    }
}
