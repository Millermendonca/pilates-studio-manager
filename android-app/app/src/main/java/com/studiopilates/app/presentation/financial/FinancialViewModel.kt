package com.studiopilates.app.presentation.financial

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.studiopilates.app.core.datastore.UserPreferencesRepository
import com.studiopilates.app.domain.model.*
import com.studiopilates.app.domain.usecase.*
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class FinancialUiState(
    val student: Student? = null,
    val invoices: List<Invoice> = emptyList(),
    val latestInvoice: Invoice? = null,
    val isActivatingPixAuto: Boolean = false,
    val pixAutoActive: Boolean = false,
    val isAcceptingContract: Boolean = false,
    val contractAccepted: Boolean = false,
    val feedbackMessage: String? = null
)

@HiltViewModel
class FinancialViewModel @Inject constructor(
    private val getStudentProfileUseCase: GetStudentProfileUseCase,
    private val updateStudentProfileUseCase: UpdateStudentProfileUseCase,
    private val preferencesRepository: UserPreferencesRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(FinancialUiState())
    val uiState: StateFlow<FinancialUiState> = _uiState.asStateFlow()

    init {
        observeData()
    }

    private fun observeData() {
        viewModelScope.launch {
            preferencesRepository.selectedStudentId.collectLatest { studentId ->
                if (studentId != null) {
                    getStudentProfileUseCase(studentId).collectLatest { student ->
                        if (student != null) {
                            val inv = student.invoices
                            val latest = inv.firstOrNull() ?: Invoice(
                                id = "inv_simulated",
                                studentId = student.id,
                                amount = student.monthlyFee ?: 340.0,
                                dueDate = "10/10/2026",
                                status = "PENDING",
                                pixCode = "00020126580014br.gov.bcb.pix0136123e4567-e89b-12d3-a456-4266141740005204000053039865406${(student.monthlyFee ?: 340.0)}5802BR5913StudioPilates6009SaoPaulo62070503***6304ABCD"
                            )
                            _uiState.update {
                                it.copy(
                                    student = student,
                                    invoices = inv,
                                    latestInvoice = latest,
                                    contractAccepted = student.contractAccepted
                                )
                            }
                        }
                    }
                }
            }
        }
    }

    fun activatePixAutomatico() {
        viewModelScope.launch {
            _uiState.update { it.copy(isActivatingPixAuto = true) }
            kotlinx.coroutines.delay(1000)
            _uiState.update {
                it.copy(
                    isActivatingPixAuto = false,
                    pixAutoActive = true,
                    feedbackMessage = "PIX Automático habilitado! As próximas mensalidades serão debitadas no vencimento."
                )
            }
        }
    }

    fun signDigitalContract(signature: String) {
        val student = _uiState.value.student ?: return
        viewModelScope.launch {
            _uiState.update { it.copy(isAcceptingContract = true) }
            val updated = student.copy(
                contractAccepted = true,
                contractSignature = signature
            )
            updateStudentProfileUseCase(updated)
            _uiState.update {
                it.copy(
                    isAcceptingContract = false,
                    contractAccepted = true,
                    feedbackMessage = "Contrato digital assinado e registrado com sucesso!"
                )
            }
        }
    }

    fun clearFeedback() {
        _uiState.update { it.copy(feedbackMessage = null) }
    }
}
