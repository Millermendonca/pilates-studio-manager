package com.studiopilates.app.data.repository

import com.studiopilates.app.core.common.Resource
import com.studiopilates.app.core.network.ApiService
import com.studiopilates.app.core.network.dto.StudioSettingsDto
import com.studiopilates.app.domain.model.StudioSettings
import com.studiopilates.app.domain.repository.SettingsRepository
import javax.inject.Inject

class SettingsRepositoryImpl @Inject constructor(
    private val apiService: ApiService
) : SettingsRepository {

    override suspend fun getStudioSettings(): Resource<StudioSettings> {
        return try {
            val response = apiService.getStudioSettings()
            if (response.isSuccessful && response.body() != null) {
                Resource.Success(response.body()!!.toDomain())
            } else {
                Resource.Error("Não foi possível carregar as configurações do estúdio")
            }
        } catch (e: Exception) {
            Resource.Error("Falha de conexão: ${e.localizedMessage}")
        }
    }
}

fun StudioSettingsDto.toDomain(): StudioSettings {
    return StudioSettings(
        studioName = studioName ?: "Studio Pilates",
        address = address,
        neighborhood = neighborhood,
        city = city,
        state = state,
        latitude = latitude ?: -23.561684,
        longitude = longitude ?: -46.655981,
        cancelWindowHours = cancelWindowHours,
        creditValidityDays = creditValidityDays,
        checkinRadiusMeters = checkinRadiusMeters,
        checkinDwellMinutes = checkinDwellMinutes,
        monthlyRescheduleLimit = monthlyRescheduleLimit,
        contractTermsText = contractTermsText,
        googleReviewUrl = googleReviewUrl,
        instagram = instagram,
        whatsapp = whatsapp
    )
}
