package com.studiopilates.app.presentation.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.studiopilates.app.core.common.Resource
import com.studiopilates.app.core.datastore.UserPreferencesRepository
import com.studiopilates.app.domain.model.*
import com.studiopilates.app.domain.usecase.*
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class HomeUiState(
    val student: Student? = null,
    val nextAttendance: Attendance? = null,
    val attendancesThisMonth: Int = 0,
    val streakDays: Int = 0,
    val activeCreditsCount: Int = 0,
    val studioSettings: StudioSettings = StudioSettings(),
    val availableStudents: List<Student> = emptyList(),
    val isCheckingIn: Boolean = false,
    val checkinMessage: String? = null,
    val checkinError: String? = null,
    val isLoading: Boolean = true
)

@HiltViewModel
class HomeViewModel @Inject constructor(
    private val getStudentProfileUseCase: GetStudentProfileUseCase,
    private val refreshStudentUseCase: RefreshStudentUseCase,
    private val getStudentAttendancesUseCase: GetStudentAttendancesUseCase,
    private val getStudentCreditsUseCase: GetStudentCreditsUseCase,
    private val performGeofenceCheckinUseCase: PerformGeofenceCheckinUseCase,
    private val getStudioSettingsUseCase: GetStudioSettingsUseCase,
    private val getAvailableStudentsUseCase: GetAvailableStudentsUseCase,
    private val preferencesRepository: UserPreferencesRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(HomeUiState())
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()

    init {
        loadData()
    }

    fun loadData() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }

            // Buscar lista de alunos disponíveis para permitir selecionar/trocar perfil
            val studentsRes = getAvailableStudentsUseCase()
            if (studentsRes is Resource.Success && !studentsRes.data.isNullOrEmpty()) {
                _uiState.update { it.copy(availableStudents = studentsRes.data) }
                
                // Se nenhum aluno selecionado, selecionar o primeiro
                val currentStudentId = preferencesRepository.selectedStudentId.first()
                val targetId = currentStudentId ?: studentsRes.data.first().id
                selectStudent(targetId)
            }

            // Carregar configurações do estúdio
            val settingsRes = getStudioSettingsUseCase()
            if (settingsRes is Resource.Success && settingsRes.data != null) {
                _uiState.update { it.copy(studioSettings = settingsRes.data) }
            }
        }
    }

    fun selectStudent(studentId: String) {
        viewModelScope.launch {
            preferencesRepository.setSelectedStudentId(studentId)
            refreshStudentUseCase(studentId)

            // Observar dados do aluno
            getStudentProfileUseCase(studentId).collectLatest { student ->
                _uiState.update { it.copy(student = student, isLoading = false) }
            }
        }

        viewModelScope.launch {
            getStudentAttendancesUseCase(studentId).collectLatest { attendances ->
                val next = attendances.firstOrNull { it.status == "SCHEDULED" }
                val countPresent = attendances.count { it.status == "PRESENT" }
                _uiState.update {
                    it.copy(
                        nextAttendance = next,
                        attendancesThisMonth = countPresent,
                        streakDays = if (countPresent > 0) countPresent * 2 else 0
                    )
                }
            }
        }

        viewModelScope.launch {
            getStudentCreditsUseCase(studentId).collectLatest { credits ->
                _uiState.update { it.copy(activeCreditsCount = credits.size) }
            }
        }
    }

    fun performCheckin() {
        val student = _uiState.value.student ?: return
        val nextAtt = _uiState.value.nextAttendance

        viewModelScope.launch {
            _uiState.update { it.copy(isCheckingIn = true, checkinMessage = null, checkinError = null) }
            
            val result = performGeofenceCheckinUseCase(student.id, nextAtt?.id)
            when (result) {
                is Resource.Success -> {
                    _uiState.update {
                        it.copy(
                            isCheckingIn = false,
                            checkinMessage = result.data ?: "Check-in realizado com sucesso!"
                        )
                    }
                }
                is Resource.Error -> {
                    _uiState.update {
                        it.copy(
                            isCheckingIn = false,
                            checkinError = result.message ?: "Não foi possível realizar o check-in."
                        )
                    }
                }
                else -> {}
            }
        }
    }

    fun clearFeedback() {
        _uiState.update { it.copy(checkinMessage = null, checkinError = null) }
    }
}
