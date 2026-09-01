package com.studiopilates.app.presentation.credits

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.studiopilates.app.core.theme.*
import com.studiopilates.app.domain.model.Credit
import com.studiopilates.app.presentation.components.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CreditsScreen(
    viewModel: CreditsViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    var selectedCreditForBooking by remember { mutableStateOf<Credit?>(null) }

    Scaffold(
        topBar = {
            PilatesTopBar(
                title = "Créditos de Reposição",
                subtitle = "Histórico e Agendamento de Reposições"
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .background(Slate50)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Card de Saldo
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = Purple700)
            ) {
                Column(modifier = Modifier.padding(18.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "Saldo de Reposições",
                            fontWeight = FontWeight.Bold,
                            fontSize = 14.sp,
                            color = Purple50
                        )
                        Box(
                            modifier = Modifier
                                .size(32.dp)
                                .clip(CircleShape)
                                .background(Color.White.copy(alpha = 0.2f)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(Icons.Filled.Spa, contentDescription = null, tint = Color.White, modifier = Modifier.size(18.dp))
                        }
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    Text(
                        text = "${uiState.activeCredits.size} aulas disponíveis",
                        fontSize = 22.sp,
                        fontWeight = FontWeight.Black,
                        color = Color.White
                    )
                    Text(
                        text = "Válidos por 30 dias a partir da data de cancelamento",
                        fontSize = 11.sp,
                        color = Purple50.copy(alpha = 0.8f)
                    )
                }
            }

            // Feedbacks
            uiState.successMessage?.let { msg ->
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp))
                        .background(Emerald50)
                        .padding(12.dp)
                ) {
                    Text(text = msg, fontSize = 12.sp, color = Emerald800, fontWeight = FontWeight.SemiBold)
                }
            }

            uiState.errorMessage?.let { err ->
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp))
                        .background(Rose50)
                        .padding(12.dp)
                ) {
                    Text(text = err, fontSize = 12.sp, color = Rose600, fontWeight = FontWeight.SemiBold)
                }
            }

            Text(
                text = "Seus Créditos Ativos",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = Slate900
            )

            if (uiState.activeCredits.isEmpty()) {
                EmptyStateView(
                    icon = Icons.Outlined.Spa,
                    title = "Nenhum crédito disponível",
                    description = "Quando você cancelar uma aula com antecedência mínima de 2h, o crédito de reposição aparecerá aqui."
                )
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    items(uiState.activeCredits, key = { it.id }) { credit ->
                        CardContainer {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = credit.reason ?: "Ausência com aviso prévio",
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 13.sp,
                                        color = Slate900
                                    )
                                    Text(
                                        text = "Expira em: ${credit.expiresAt.split("T").firstOrNull()}",
                                        fontSize = 11.sp,
                                        color = Amber700,
                                        fontWeight = FontWeight.SemiBold
                                    )
                                }

                                Button(
                                    onClick = { selectedCreditForBooking = credit },
                                    colors = ButtonDefaults.buttonColors(containerColor = Emerald600),
                                    shape = RoundedCornerShape(10.dp),
                                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
                                ) {
                                    Text(text = "Agendar", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // Modal de Agendamento da Reposição
    selectedCreditForBooking?.let { credit ->
        var targetDate by remember { mutableStateOf(uiState.selectedDate) }
        var targetTime by remember { mutableStateOf("08:00") }

        LaunchedEffect(targetDate) {
            viewModel.loadSlots(targetDate)
        }

        AlertDialog(
            onDismissRequest = { selectedCreditForBooking = null },
            title = { Text("Agendar Aula de Reposição", fontWeight = FontWeight.Bold) },
            text = {
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Text(text = "Selecione o horário desejado para abater o crédito:", fontSize = 12.sp, color = Slate600)

                    if (uiState.isLoadingSlots) {
                        CircularProgressIndicator(modifier = Modifier.size(24.dp).align(Alignment.CenterHorizontally))
                    } else {
                        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            uiState.daySlots.forEach { slot ->
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clip(RoundedCornerShape(10.dp))
                                        .background(if (targetTime == slot.time) Emerald50 else Slate100)
                                        .clickable(enabled = !slot.isFull) { targetTime = slot.time }
                                        .padding(10.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(
                                        text = "${slot.time} (${slot.availableCount} vagas livres)",
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 12.sp,
                                        color = if (slot.isFull) Slate400 else if (targetTime == slot.time) Emerald700 else Slate800
                                    )
                                    if (slot.isFull) {
                                        Text(text = "Lotado", fontSize = 11.sp, color = Rose600, fontWeight = FontWeight.Bold)
                                    } else if (targetTime == slot.time) {
                                        Icon(Icons.Filled.Check, contentDescription = null, tint = Emerald700, modifier = Modifier.size(16.dp))
                                    }
                                }
                            }
                        }
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.bookReplacement(credit.id, targetDate, targetTime)
                        selectedCreditForBooking = null
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Emerald600)
                ) {
                    Text("Confirmar Reposição", fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { selectedCreditForBooking = null }) {
                    Text("Cancelar")
                }
            }
        )
    }
}
