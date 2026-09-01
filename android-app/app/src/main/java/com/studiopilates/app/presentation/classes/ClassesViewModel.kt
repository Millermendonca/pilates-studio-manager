package com.studiopilates.app.presentation.classes

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

data class ClassesUiState(
    val student: Student? = null,
    val upcomingAttendances: List<Attendance> = emptyList(),
    val pastAttendances: List<Attendance> = emptyList(),
    val daySlots: List<DaySlot> = emptyList(),
    val selectedDateForSlots: String = "",
    val isLoadingSlots: Boolean = false,
    val actionLoading: Boolean = false,
    val actionSuccessMessage: String? = null,
    val actionErrorMessage: String? = null
)

@HiltViewModel
class ClassesViewModel @Inject constructor(
    private val getStudentProfileUseCase: GetStudentProfileUseCase,
    private val getStudentAttendancesUseCase: GetStudentAttendancesUseCase,
    private val getDaySlotsUseCase: GetDaySlotsUseCase,
    private val cancelClassUseCase: CancelClassUseCase,
    private val rescheduleClassUseCase: RescheduleClassUseCase,
    private val validateCorporateTokenUseCase: ValidateCorporateTokenUseCase,
    private val preferencesRepository: UserPreferencesRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(ClassesUiState())
    val uiState: StateFlow<ClassesUiState> = _uiState.asStateFlow()

    init {
        val tomorrow = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(
            Date(System.currentTimeMillis() + 86400000)
        )
        _uiState.update { it.copy(selectedDateForSlots = tomorrow) }
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
                    getStudentAttendancesUseCase(studentId).collectLatest { attendances ->
                        val upcoming = attendances.filter { it.status == "SCHEDULED" }
                        val past = attendances.filter { it.status != "SCHEDULED" }
                        _uiState.update {
                            it.copy(
                                upcomingAttendances = upcoming,
                                pastAttendances = past
                            )
                        }
                    }
                }
            }
        }
    }

    fun loadSlotsForDate(dateStr: String) {
        _uiState.update { it.copy(selectedDateForSlots = dateStr, isLoadingSlots = true) }
        viewModelScope.launch {
            val result = getDaySlotsUseCase(dateStr)
            if (result is Resource.Success && result.data != null) {
                _uiState.update { it.copy(daySlots = result.data, isLoadingSlots = false) }
            } else {
                _uiState.update { it.copy(isLoadingSlots = false) }
            }
        }
    }

    fun cancelClass(attendanceId: String) {
        val student = _uiState.value.student ?: return
        viewModelScope.launch {
            _uiState.update { it.copy(actionLoading = true, actionSuccessMessage = null, actionErrorMessage = null) }
            val result = cancelClassUseCase(student.id, attendanceId)
            when (result) {
                is Resource.Success -> {
                    _uiState.update { it.copy(actionLoading = false, actionSuccessMessage = result.data) }
                }
                is Resource.Error -> {
                    _uiState.update { it.copy(actionLoading = false, actionErrorMessage = result.message) }
                }
                else -> {}
            }
        }
    }

    fun rescheduleClass(attendanceId: String?, targetDate: String, targetTime: String, scope: String) {
        val student = _uiState.value.student ?: return
        viewModelScope.launch {
            _uiState.update { it.copy(actionLoading = true, actionSuccessMessage = null, actionErrorMessage = null) }
            val result = rescheduleClassUseCase(
                studentId = student.id,
                attendanceId = attendanceId,
                scheduleId = null,
                targetDate = targetDate,
                targetTime = targetTime,
                scope = scope
            )
            when (result) {
                is Resource.Success -> {
                    _uiState.update { it.copy(actionLoading = false, actionSuccessMessage = result.data) }
                }
                is Resource.Error -> {
                    _uiState.update { it.copy(actionLoading = false, actionErrorMessage = result.message) }
                }
                else -> {}
            }
        }
    }

    fun validateCorporateToken(token: String) {
        val student = _uiState.value.student ?: return
        val provider = student.corporateProvider ?: "WELLHUB"
        viewModelScope.launch {
            _uiState.update { it.copy(actionLoading = true, actionSuccessMessage = null, actionErrorMessage = null) }
            val result = validateCorporateTokenUseCase(student.id, provider, token)
            when (result) {
                is Resource.Success -> {
                    _uiState.update { it.copy(actionLoading = false, actionSuccessMessage = result.data) }
                }
                is Resource.Error -> {
                    _uiState.update { it.copy(actionLoading = false, actionErrorMessage = result.message) }
                }
                else -> {}
            }
        }
    }

    fun clearFeedback() {
        _uiState.update { it.copy(actionSuccessMessage = null, actionErrorMessage = null) }
    }
}
