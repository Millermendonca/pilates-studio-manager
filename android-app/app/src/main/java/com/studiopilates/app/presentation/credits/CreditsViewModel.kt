package com.studiopilates.app.presentation.credits

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.studiopilates.app.core.common.Resource
import com.studiopilates.app.core.datastore.UserPreferencesRepository
import com.studiopilates.app.domain.model.*
import com.studiopilates.app.domain.usecase.*
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*
import javax.inject.Inject

data class CreditsUiState(
    val student: Student? = null,
    val activeCredits: List<Credit> = emptyList(),
    val daySlots: List<DaySlot> = emptyList(),
    val selectedDate: String = "",
    val isLoadingSlots: Boolean = false,
    val actionLoading: Boolean = false,
    val successMessage: String? = null,
    val errorMessage: String? = null
)

@HiltViewModel
class CreditsViewModel @Inject constructor(
    private val getStudentProfileUseCase: GetStudentProfileUseCase,
    private val getStudentCreditsUseCase: GetStudentCreditsUseCase,
    private val getDaySlotsUseCase: GetDaySlotsUseCase,
    private val bookReplacementUseCase: BookReplacementUseCase,
    private val preferencesRepository: UserPreferencesRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(CreditsUiState())
    val uiState: StateFlow<CreditsUiState> = _uiState.asStateFlow()

    init {
        val tomorrow = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(
            Date(System.currentTimeMillis() + 86400000)
        )
        _uiState.update { it.copy(selectedDate = tomorrow) }
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

        viewModelScope.launch {
            preferencesRepository.selectedStudentId.collectLatest { studentId ->
                if (studentId != null) {
                    getStudentCreditsUseCase(studentId).collectLatest { credits ->
                        _uiState.update { it.copy(activeCredits = credits) }
                    }
                }
            }
        }
    }

    fun loadSlots(dateStr: String) {
        _uiState.update { it.copy(selectedDate = dateStr, isLoadingSlots = true) }
        viewModelScope.launch {
            val result = getDaySlotsUseCase(dateStr)
            if (result is Resource.Success && result.data != null) {
                _uiState.update { it.copy(daySlots = result.data, isLoadingSlots = false) }
            } else {
                _uiState.update { it.copy(isLoadingSlots = false) }
            }
        }
    }

    fun bookReplacement(creditId: String, date: String, time: String) {
        val student = _uiState.value.student ?: return
        viewModelScope.launch {
            _uiState.update { it.copy(actionLoading = true, successMessage = null, errorMessage = null) }
            val result = bookReplacementUseCase(student.id, creditId, date, time)
            when (result) {
                is Resource.Success -> {
                    _uiState.update { it.copy(actionLoading = false, successMessage = result.data) }
                }
                is Resource.Error -> {
                    _uiState.update { it.copy(actionLoading = false, errorMessage = result.message) }
                }
                else -> {}
            }
        }
    }

    fun clearFeedback() {
        _uiState.update { it.copy(successMessage = null, errorMessage = null) }
    }
}
