package com.studiopilates.app.presentation.chat

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.studiopilates.app.core.datastore.UserPreferencesRepository
import com.studiopilates.app.domain.model.ChatMessage
import com.studiopilates.app.domain.model.Student
import com.studiopilates.app.domain.usecase.*
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ChatUiState(
    val student: Student? = null,
    val messages: List<ChatMessage> = emptyList(),
    val inputText: String = "",
    val isSending: Boolean = false,
    val isLoading: Boolean = true
)

@HiltViewModel
class ChatViewModel @Inject constructor(
    private val getStudentProfileUseCase: GetStudentProfileUseCase,
    private val getChatMessagesUseCase: GetChatMessagesUseCase,
    private val refreshChatMessagesUseCase: RefreshChatMessagesUseCase,
    private val sendChatMessageUseCase: SendChatMessageUseCase,
    private val preferencesRepository: UserPreferencesRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(ChatUiState())
    val uiState: StateFlow<ChatUiState> = _uiState.asStateFlow()

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

        viewModelScope.launch {
            preferencesRepository.selectedStudentId.collectLatest { studentId ->
                if (studentId != null) {
                    refreshChatMessagesUseCase(studentId)
                    getChatMessagesUseCase(studentId).collectLatest { messages ->
                        _uiState.update { it.copy(messages = messages, isLoading = false) }
                    }
                }
            }
        }
    }

    fun onInputChanged(text: String) {
        _uiState.update { it.copy(inputText = text) }
    }

    fun sendMessage(customText: String? = null) {
        val student = _uiState.value.student ?: return
        val textToSend = customText ?: _uiState.value.inputText.trim()
        if (textToSend.isBlank()) return

        viewModelScope.launch {
            _uiState.update { it.copy(isSending = true, inputText = "") }
            sendChatMessageUseCase(student.id, textToSend)
            _uiState.update { it.copy(isSending = false) }
        }
    }
}
