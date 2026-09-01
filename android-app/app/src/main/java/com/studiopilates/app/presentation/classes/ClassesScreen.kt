package com.studiopilates.app.presentation.classes

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
import com.studiopilates.app.domain.model.Attendance
import com.studiopilates.app.presentation.components.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ClassesScreen(
    viewModel: ClassesViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    var selectedTab by remember { mutableStateOf(0) } // 0 = Agendadas, 1 = Histórico

    var rescheduleModalAttendance by remember { mutableStateOf<Attendance?>(null) }
    var cancelDialogAttendance by remember { mutableStateOf<Attendance?>(null) }
    var showCorporateDialog by remember { mutableStateOf(false) }
    var corporateTokenInput by remember { mutableStateOf("") }

    Scaffold(
        topBar = {
            PilatesTopBar(
                title = "Minhas Aulas",
                subtitle = "Agendamentos, Vagas & Remarcação"
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .background(Slate50)
        ) {
            // Tab Selector
            TabRow(
                selectedTabIndex = selectedTab,
                containerColor = Color.White,
                contentColor = Emerald600
            ) {
                Tab(
                    selected = selectedTab == 0,
                    onClick = { selectedTab = 0 },
                    text = { Text("Próximas (${uiState.upcomingAttendances.size})", fontWeight = FontWeight.Bold) }
                )
                Tab(
                    selected = selectedTab == 1,
                    onClick = { selectedTab = 1 },
                    text = { Text("Histórico (${uiState.pastAttendances.size})", fontWeight = FontWeight.Bold) }
                )
            }

            // Banner de Convênio Corporativo (Wellhub / TotalPass)
            if (uiState.student?.isCorporate == true) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp)
                        .clip(RoundedCornerShape(16.dp))
                        .background(Purple50)
                        .padding(14.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Filled.Verified, contentDescription = null, tint = Purple700)
                            Spacer(modifier = Modifier.width(8.dp))
                            Column {
                                Text(
                                    text = "Convênio: ${uiState.student?.corporateProvider ?: "Wellhub"}",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 12.sp,
                                    color = Purple700
                                )
                                Text(
                                    text = "Valide seu token diário de acesso",
                                    fontSize = 11.sp,
                                    color = Slate500
                                )
                            }
                        }
                        Button(
                            onClick = { showCorporateDialog = true },
                            colors = ButtonDefaults.buttonColors(containerColor = Purple700),
                            shape = RoundedCornerShape(10.dp),
                            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
                        ) {
                            Text(text = "Validar Token", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }

            // Feedbacks
            uiState.actionSuccessMessage?.let { msg ->
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 8.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(Emerald50)
                        .padding(12.dp)
                ) {
                    Text(text = msg, fontSize = 12.sp, color = Emerald800, fontWeight = FontWeight.SemiBold)
                }
            }

            uiState.actionErrorMessage?.let { err ->
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 8.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(Rose50)
                        .padding(12.dp)
                ) {
                    Text(text = err, fontSize = 12.sp, color = Rose600, fontWeight = FontWeight.SemiBold)
                }
            }

            // Lista de Aulas
            val currentList = if (selectedTab == 0) uiState.upcomingAttendances else uiState.pastAttendances

            if (currentList.isEmpty()) {
                EmptyStateView(
                    icon = Icons.Outlined.EventBusy,
                    title = if (selectedTab == 0) "Nenhuma aula futura" else "Nenhum histórico encontrado",
                    description = if (selectedTab == 0) "Suas próximas aulas agendadas aparecerão aqui." else "Aulas concluídas serão listadas aqui."
                )
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    items(currentList, key = { it.id }) { attendance ->
                        CardContainer {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Box(
                                        modifier = Modifier
                                            .size(40.dp)
                                            .clip(CircleShape)
                                            .background(Emerald50),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Icon(Icons.Filled.AccessTime, contentDescription = null, tint = Emerald700, modifier = Modifier.size(20.dp))
                                    }
                                    Spacer(modifier = Modifier.width(10.dp))
                                    Column {
                                        Text(
                                            text = "${attendance.date} às ${attendance.startTime}",
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 14.sp,
                                            color = Slate900
                                        )
                                        Text(
                                            text = if (attendance.isAutoCheckin) "✓ Presença confirmada via GPS" else "Aula regular de Pilates",
                                            fontSize = 11.sp,
                                            color = if (attendance.isAutoCheckin) Emerald700 else Slate500
                                        )
                                    }
                                }
                                StatusBadge(status = attendance.status)
                            }

                            // Botões de Ação para Aulas Futuras
                            if (selectedTab == 0) {
                                Spacer(modifier = Modifier.height(12.dp))
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    OutlinedButton(
                                        onClick = { rescheduleModalAttendance = attendance },
                                        modifier = Modifier.weight(1f),
                                        shape = RoundedCornerShape(10.dp)
                                    ) {
                                        Icon(Icons.Filled.Sync, contentDescription = null, modifier = Modifier.size(14.dp))
                                        Spacer(modifier = Modifier.width(4.dp))
                                        Text(text = "Remarcar", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                    }

                                    OutlinedButton(
                                        onClick = { cancelDialogAttendance = attendance },
                                        modifier = Modifier.weight(1f),
                                        colors = ButtonDefaults.outlinedButtonColors(contentColor = Rose600),
                                        shape = RoundedCornerShape(10.dp)
                                    ) {
                                        Icon(Icons.Filled.Close, contentDescription = null, modifier = Modifier.size(14.dp))
                                        Spacer(modifier = Modifier.width(4.dp))
                                        Text(text = "Cancelar", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // Modal de Cancelamento de Aula
    cancelDialogAttendance?.let { att ->
        AlertDialog(
            onDismissRequest = { cancelDialogAttendance = null },
            icon = { Icon(Icons.Filled.Warning, contentDescription = null, tint = Rose600) },
            title = { Text("Cancelar Aula?", fontWeight = FontWeight.Bold) },
            text = {
                Text(
                    text = "Deseja cancelar sua aula de ${att.date} às ${att.startTime}?\n\nCancelando com aviso prévio (2h antes), você receberá um crédito de reposição válido por 30 dias.",
                    fontSize = 13.sp,
                    color = Slate700
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.cancelClass(att.id)
                        cancelDialogAttendance = null
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Rose600)
                ) {
                    Text("Confirmar Cancelamento", fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { cancelDialogAttendance = null }) {
                    Text("Voltar")
                }
            }
        )
    }

    // Modal de Remarcação de Aula com Vagas em Tempo Real
    rescheduleModalAttendance?.let { att ->
        var targetDate by remember { mutableStateOf(uiState.selectedDateForSlots) }
        var targetTime by remember { mutableStateOf("08:00") }
        var scope by remember { mutableStateOf("SINGLE") }

        LaunchedEffect(targetDate) {
            viewModel.loadSlotsForDate(targetDate)
        }

        AlertDialog(
            onDismissRequest = { rescheduleModalAttendance = null },
            title = { Text("Remarcar Aula", fontWeight = FontWeight.Bold) },
            text = {
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Text(text = "Aula original: ${att.date} às ${att.startTime}", fontSize = 12.sp, color = Slate500)

                    // Tipo de troca
                    Row(modifier = Modifier.fillMaxWidth()) {
                        FilterChip(
                            selected = scope == "SINGLE",
                            onClick = { scope = "SINGLE" },
                            label = { Text("Troca Única (Reposição)", fontSize = 11.sp) },
                            modifier = Modifier.padding(end = 4.dp)
                        )
                        FilterChip(
                            selected = scope == "RECURRING_FUTURE",
                            onClick = { scope = "RECURRING_FUTURE" },
                            label = { Text("Troca Fixa", fontSize = 11.sp) }
                        )
                    }

                    // Seletor de Vagas em Tempo Real
                    Text(text = "Vagas Disponíveis para $targetDate:", fontWeight = FontWeight.Bold, fontSize = 12.sp)

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
                                        text = "${slot.time} - ${slot.occupiedCount}/${slot.totalCapacity} vagas",
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
                        viewModel.rescheduleClass(att.id, targetDate, targetTime, scope)
                        rescheduleModalAttendance = null
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Emerald600)
                ) {
                    Text("Salvar Remarcação", fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { rescheduleModalAttendance = null }) {
                    Text("Cancelar")
                }
            }
        )
    }

    // Modal de Validação de Token Corporativo
    if (showCorporateDialog) {
        AlertDialog(
            onDismissRequest = { showCorporateDialog = false },
            title = { Text("Validar Token Diário", fontWeight = FontWeight.Bold) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(
                        text = "Digite o código gerado no app do ${uiState.student?.corporateProvider ?: "Wellhub"} para validar sua presença de hoje:",
                        fontSize = 12.sp,
                        color = Slate600
                    )
                    OutlinedTextField(
                        value = corporateTokenInput,
                        onValueChange = { corporateTokenInput = it },
                        placeholder = { Text("Ex: 123456") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.validateCorporateToken(corporateTokenInput)
                        corporateTokenInput = ""
                        showCorporateDialog = false
                    },
                    enabled = corporateTokenInput.isNotBlank(),
                    colors = ButtonDefaults.buttonColors(containerColor = Purple700)
                ) {
                    Text("Validar Token", fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { showCorporateDialog = false }) {
                    Text("Cancelar")
                }
            }
        )
    }
}
