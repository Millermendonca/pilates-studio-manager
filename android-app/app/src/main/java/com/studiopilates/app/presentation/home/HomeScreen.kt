package com.studiopilates.app.presentation.home

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.studiopilates.app.core.common.Constants
import com.studiopilates.app.core.theme.*
import com.studiopilates.app.presentation.components.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    onNavigateToClasses: () -> Unit,
    onNavigateToCredits: () -> Unit,
    onNavigateToFinancial: () -> Unit,
    onNavigateToChat: () -> Unit,
    viewModel: HomeViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val context = LocalContext.current
    val scrollState = rememberScrollState()

    var showStudentPicker by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            PilatesTopBar(
                title = uiState.studioSettings.studioName,
                subtitle = "Portal do Aluno",
                actions = {
                    // Seletor de Aluno Ativo
                    Box(
                        modifier = Modifier
                            .padding(end = 12.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(Emerald50)
                            .clickable { showStudentPicker = true }
                            .padding(horizontal = 10.dp, vertical = 6.dp)
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Filled.AccountCircle, contentDescription = null, tint = Emerald700, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                text = uiState.student?.name?.split(" ")?.firstOrNull() ?: "Selecionar",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                color = Emerald700
                            )
                            Icon(Icons.Filled.ArrowDropDown, contentDescription = null, tint = Emerald700, modifier = Modifier.size(16.dp))
                        }
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .background(Slate50)
                .verticalScroll(scrollState)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Boas-Vindas
            uiState.student?.let { student ->
                Column {
                    Text(
                        text = "Olá, ${student.name.split(" ").firstOrNull()}! 👋",
                        style = MaterialTheme.typography.headlineMedium,
                        fontWeight = FontWeight.Black,
                        color = Slate900
                    )
                    Text(
                        text = "Seu plano: ${student.planName ?: "2x por Semana"}",
                        style = MaterialTheme.typography.bodyMedium,
                        color = Slate500
                    )
                }
            }

            // Card da Próxima Aula & Check-in GPS
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
                                .background(Emerald100),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(Icons.Filled.Spa, contentDescription = null, tint = Emerald700, modifier = Modifier.size(20.dp))
                        }
                        Spacer(modifier = Modifier.width(10.dp))
                        Column {
                            Text(
                                text = "Próxima Aula",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                color = Slate900
                            )
                            Text(
                                text = uiState.nextAttendance?.let { "${it.date} às ${it.startTime}" } ?: "Nenhuma aula agendada",
                                style = MaterialTheme.typography.bodySmall,
                                color = Slate500
                            )
                        }
                    }
                    uiState.nextAttendance?.let {
                        StatusBadge(status = it.status)
                    }
                }

                Spacer(modifier = Modifier.height(14.dp))

                // Botão de Check-in Nativo via GPS
                PrimaryButton(
                    text = if (uiState.nextAttendance?.isAutoCheckin == true) "✓ Presença Confirmada" else "Fazer Check-in por Proximidade (GPS)",
                    onClick = { viewModel.performCheckin() },
                    loading = uiState.isCheckingIn,
                    enabled = uiState.nextAttendance?.isAutoCheckin != true,
                    icon = Icons.Filled.LocationOn
                )

                // Feedback do Check-in
                uiState.checkinMessage?.let { msg ->
                    Spacer(modifier = Modifier.height(10.dp))
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(10.dp))
                            .background(Emerald50)
                            .padding(10.dp)
                    ) {
                        Text(text = msg, fontSize = 12.sp, color = Emerald800, fontWeight = FontWeight.SemiBold)
                    }
                }

                uiState.checkinError?.let { err ->
                    Spacer(modifier = Modifier.height(10.dp))
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(10.dp))
                            .background(Rose50)
                            .padding(10.dp)
                    ) {
                        Text(text = err, fontSize = 12.sp, color = Rose600, fontWeight = FontWeight.SemiBold)
                    }
                }
            }

            // Métricas: Frequência & Créditos
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                // Card Frequência
                Card(
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(18.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White)
                ) {
                    Column(modifier = Modifier.padding(14.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Filled.LocalFireDepartment, contentDescription = null, tint = Amber500, modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(text = "Frequência", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Slate600)
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = "${uiState.attendancesThisMonth} aulas",
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Black,
                            color = Slate900
                        )
                        Text(text = "Neste mês", fontSize = 11.sp, color = Slate400)
                    }
                }

                // Card Créditos de Reposição
                Card(
                    modifier = Modifier
                        .weight(1f)
                        .clickable { onNavigateToCredits() },
                    shape = RoundedCornerShape(18.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White)
                ) {
                    Column(modifier = Modifier.padding(14.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Filled.Stars, contentDescription = null, tint = Purple600, modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(text = "Reposições", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Slate600)
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = "${uiState.activeCreditsCount} disponíveis",
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Black,
                            color = Purple700
                        )
                        Text(text = "Clique p/ agendar", fontSize = 11.sp, color = Slate400)
                    }
                }
            }

            // Atalhos Rápidos
            Text(
                text = "Atalhos Rápidos",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = Slate900
            )

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                QuickActionItem(
                    icon = Icons.Outlined.CalendarToday,
                    title = "Remarcar",
                    modifier = Modifier.weight(1f),
                    onClick = onNavigateToClasses
                )
                QuickActionItem(
                    icon = Icons.Outlined.QrCode,
                    title = "PIX",
                    modifier = Modifier.weight(1f),
                    onClick = onNavigateToFinancial
                )
                QuickActionItem(
                    icon = Icons.Outlined.Chat,
                    title = "Chat",
                    modifier = Modifier.weight(1f),
                    onClick = onNavigateToChat
                )
                QuickActionItem(
                    icon = Icons.Outlined.Spa,
                    title = "Créditos",
                    modifier = Modifier.weight(1f),
                    onClick = onNavigateToCredits
                )
            }

            // Apoio & Redes Sociais
            CardContainer {
                Text(
                    text = "Apoie o Studio",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = Slate900
                )
                Spacer(modifier = Modifier.height(10.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    OutlinedButton(
                        onClick = {
                            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(Constants.GOOGLE_REVIEW_URL))
                            context.startActivity(intent)
                        },
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Icon(Icons.Filled.Star, contentDescription = null, tint = Amber500, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(text = "Avaliar", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }

                    OutlinedButton(
                        onClick = {
                            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(Constants.WHATSAPP_URL))
                            context.startActivity(intent)
                        },
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Icon(Icons.Filled.Phone, contentDescription = null, tint = Emerald600, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(text = "WhatsApp", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }

    // Modal de Troca de Aluno
    if (showStudentPicker) {
        AlertDialog(
            onDismissRequest = { showStudentPicker = false },
            title = { Text(text = "Selecionar Aluno", fontWeight = FontWeight.Bold) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    uiState.availableStudents.forEach { student ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(12.dp))
                                .background(if (student.id == uiState.student?.id) Emerald50 else Slate100)
                                .clickable {
                                    viewModel.selectStudent(student.id)
                                    showStudentPicker = false
                                }
                                .padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = student.name,
                                fontWeight = FontWeight.Bold,
                                color = if (student.id == uiState.student?.id) Emerald700 else Slate800,
                                modifier = Modifier.weight(1f)
                            )
                            if (student.id == uiState.student?.id) {
                                Icon(Icons.Filled.Check, contentDescription = null, tint = Emerald700)
                            }
                        }
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = { showStudentPicker = false }) {
                    Text("Fechar")
                }
            }
        )
    }
}

@Composable
fun QuickActionItem(
    icon: ImageVector,
    title: String,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    Card(
        modifier = modifier.clickable { onClick() },
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 12.dp, horizontal = 8.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Box(
                modifier = Modifier
                    .size(36.dp)
                    .clip(CircleShape)
                    .background(Emerald50),
                contentAlignment = Alignment.Center
            ) {
                Icon(imageVector = icon, contentDescription = null, tint = Emerald600, modifier = Modifier.size(18.dp))
            }
            Spacer(modifier = Modifier.height(6.dp))
            Text(text = title, fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Slate800)
        }
    }
}
