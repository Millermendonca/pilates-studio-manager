package com.studiopilates.app.data.repository

import com.studiopilates.app.core.common.Resource
import com.studiopilates.app.core.database.dao.ChatDao
import com.studiopilates.app.core.database.entity.ChatMessageEntity
import com.studiopilates.app.core.network.ApiService
import com.studiopilates.app.core.network.dto.ChatMessageDto
import com.studiopilates.app.core.network.dto.SendMessageRequestDto
import com.studiopilates.app.domain.model.ChatMessage
import com.studiopilates.app.domain.repository.ChatRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject

class ChatRepositoryImpl @Inject constructor(
    private val apiService: ApiService,
    private val chatDao: ChatDao
) : ChatRepository {

    override fun getMessagesFlow(studentId: String): Flow<List<ChatMessage>> {
        return chatDao.getMessagesByStudentId(studentId).map { entities ->
            entities.map { it.toDomain() }
        }
    }

    override suspend fun refreshMessages(studentId: String): Resource<List<ChatMessage>> {
        return try {
            val response = apiService.getChatMessages(studentId)
            if (response.isSuccessful && response.body() != null) {
                val dtoList = response.body()!!
                chatDao.deleteByStudentId(studentId)
                chatDao.insertMessages(dtoList.map { it.toEntity() })
                Resource.Success(dtoList.map { it.toDomain() })
            } else {
                Resource.Error(response.message() ?: "Erro ao buscar mensagens")
            }
        } catch (e: Exception) {
            Resource.Error("Falha ao atualizar chat: ${e.localizedMessage}")
        }
    }

    override suspend fun sendMessage(studentId: String, text: String): Resource<ChatMessage> {
        return try {
            val req = SendMessageRequestDto(studentId = studentId, message = text, senderType = "STUDENT")
            val response = apiService.sendChatMessage(req)
            if (response.isSuccessful && response.body() != null) {
                val created = response.body()!!
                chatDao.insertMessage(created.toEntity())
                Resource.Success(created.toDomain())
            } else {
                Resource.Error(response.message() ?: "Erro ao enviar mensagem")
            }
        } catch (e: Exception) {
            Resource.Error("Falha no envio: ${e.localizedMessage}")
        }
    }
}

// Mappers
fun ChatMessageEntity.toDomain(): ChatMessage {
    return ChatMessage(id, studentId, senderType, messageText, read, createdAt)
}

fun ChatMessageDto.toEntity(): ChatMessageEntity {
    return ChatMessageEntity(id, studentId, senderType, messageText, read, createdAt)
}

fun ChatMessageDto.toDomain(): ChatMessage {
    return ChatMessage(id, studentId, senderType, messageText, read, createdAt)
}
