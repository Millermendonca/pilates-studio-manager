package com.studiopilates.app.presentation.profile

import androidx.compose.foundation.background
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
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.AsyncImage
import com.studiopilates.app.core.theme.*
import com.studiopilates.app.presentation.components.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfileScreen(
    viewModel: ProfileViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val scrollState = rememberScrollState()

    var showEditAnamneseModal by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            PilatesTopBar(
                title = "Meu Perfil",
                subtitle = "Dados Pessoais, Anamnese & Emergência"
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
            // Feedback
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

            uiState.student?.let { student ->
                // Header com Foto e Dados
                CardContainer {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        if (!student.avatarUrl.isNullOrBlank() || !student.photoCompressed.isNullOrBlank()) {
                            AsyncImage(
                                model = student.photoCompressed ?: student.avatarUrl,
                                contentDescription = "Foto de perfil",
                                contentScale = ContentScale.Crop,
                                modifier = Modifier
                                    .size(64.dp)
                                    .clip(CircleShape)
                            )
                        } else {
                            Box(
                                modifier = Modifier
                                    .size(64.dp)
                                    .clip(CircleShape)
                                    .background(Emerald100),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = student.name.take(2).uppercase(),
                                    fontWeight = FontWeight.Black,
                                    fontSize = 20.sp,
                                    color = Emerald800
                                )
                            }
                        }

                        Spacer(modifier = Modifier.width(14.dp))

                        Column {
                            Text(
                                text = student.name,
                                style = MaterialTheme.typography.titleLarge,
                                fontWeight = FontWeight.Black,
                                color = Slate900
                            )
                            Text(
                                text = student.email ?: "E-mail não cadastrado",
                                fontSize = 12.sp,
                                color = Slate500
                            )
                            Text(
                                text = student.phone ?: "Telefone não cadastrado",
                                fontSize = 12.sp,
                                color = Slate500
                            )
                        }
                    }
                }

                // Ficha Médica & Anamnese
                CardContainer {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Filled.MedicalServices, contentDescription = null, tint = Emerald600, modifier = Modifier.size(20.dp))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = "Prontuário & Ficha Médica",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                color = Slate900
                            )
                        }

                        IconButton(onClick = { showEditAnamneseModal = true }) {
                            Icon(Icons.Filled.Edit, contentDescription = "Editar", tint = Emerald600)
                        }
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    ProfileField(label = "Objetivos", value = student.goals ?: "Melhorar postura e condicionamento")
                    ProfileField(label = "Histórico Médico", value = student.medicalHistory ?: "Nenhum histórico informado")
                    ProfileField(label = "Lesões / Cirurgias", value = student.injuries ?: "Sem lesões prévias")
                    ProfileField(label = "Restrições Articulares", value = student.movementRestrictions ?: "Nenhuma restrição de movimento")

                    Spacer(modifier = Modifier.height(6.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(text = "Escala de Dor Atual (0 a 10):", fontSize = 12.sp, color = Slate600)
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(8.dp))
                                .background(if (student.painLevel > 5) Rose50 else Emerald50)
                                .padding(horizontal = 8.dp, vertical = 4.dp)
                        ) {
                            Text(
                                text = "${student.painLevel} / 10",
                                fontWeight = FontWeight.Black,
                                fontSize = 12.sp,
                                color = if (student.painLevel > 5) Rose600 else Emerald700
                            )
                        }
                    }
                }

                // Contato de Emergência
                CardContainer {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Filled.ContactPhone, contentDescription = null, tint = Amber600, modifier = Modifier.size(20.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "Contato de Emergência",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = Slate900
                        )
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    ProfileField(label = "Nome", value = student.emergencyContactName ?: "Não informado")
                    ProfileField(label = "Telefone", value = student.emergencyContactPhone ?: "Não informado")
                    ProfileField(label = "Parentesco", value = student.emergencyContactRelation ?: "Não informado")
                }

                // Endereço Residencial
                CardContainer {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Filled.LocationOn, contentDescription = null, tint = Slate600, modifier = Modifier.size(20.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "Endereço Residencial",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = Slate900
                        )
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    Text(
                        text = if (!student.address.isNullOrBlank()) "${student.address}, ${student.neighborhood} - ${student.city}/${student.state}" else "Endereço não cadastrado",
                        fontSize = 12.sp,
                        color = Slate700
                    )
                }
            }
        }
    }

    // Modal de Edição da Anamnese
    if (showEditAnamneseModal) {
        val student = uiState.student
        var goalsInput by remember { mutableStateOf(student?.goals ?: "") }
        var historyInput by remember { mutableStateOf(student?.medicalHistory ?: "") }
        var injuriesInput by remember { mutableStateOf(student?.injuries ?: "") }
        var restrictionsInput by remember { mutableStateOf(student?.movementRestrictions ?: "") }
        var painLevelInput by remember { mutableStateOf(student?.painLevel ?: 0) }

        AlertDialog(
            onDismissRequest = { showEditAnamneseModal = false },
            title = { Text("Atualizar Ficha Médica", fontWeight = FontWeight.Bold) },
            text = {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    OutlinedTextField(
                        value = goalsInput,
                        onValueChange = { goalsInput = it },
                        label = { Text("Objetivos com o Pilates") },
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = historyInput,
                        onValueChange = { historyInput = it },
                        label = { Text("Histórico Médico / Patologias") },
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = injuriesInput,
                        onValueChange = { injuriesInput = it },
                        label = { Text("Lesões ou Cirurgias Recentes") },
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = restrictionsInput,
                        onValueChange = { restrictionsInput = it },
                        label = { Text("Restrições de Movimento") },
                        modifier = Modifier.fillMaxWidth()
                    )

                    Text(text = "Nível de Dor Atual: $painLevelInput / 10", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                    Slider(
                        value = painLevelInput.toFloat(),
                        onValueChange = { painLevelInput = it.toInt() },
                        valueRange = 0f..10f,
                        steps = 9
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.updateAnamnese(
                            medicalHistory = historyInput,
                            injuries = injuriesInput,
                            restrictions = restrictionsInput,
                            painLevel = painLevelInput,
                            goals = goalsInput
                        )
                        showEditAnamneseModal = false
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Emerald600)
                ) {
                    Text("Salvar Alterações", fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { showEditAnamneseModal = false }) {
                    Text("Cancelar")
                }
            }
        )
    }
}

@Composable
fun ProfileField(label: String, value: String) {
    Column(modifier = Modifier.padding(vertical = 4.dp)) {
        Text(text = label, fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Slate400)
        Text(text = value, fontSize = 13.sp, color = Slate800, fontWeight = FontWeight.Medium)
    }
}
