package com.studiopilates.app.presentation.financial

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.widget.Toast
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.studiopilates.app.core.theme.*
import com.studiopilates.app.presentation.components.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FinancialScreen(
    viewModel: FinancialViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val context = LocalContext.current
    val scrollState = rememberScrollState()

    var showContractModal by remember { mutableStateOf(false) }
    var signatureInput by remember { mutableStateOf("") }

    Scaffold(
        topBar = {
            PilatesTopBar(
                title = "Financeiro & PIX",
                subtitle = "Faturas, PIX Copia-e-Cola & Contrato"
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
            uiState.feedbackMessage?.let { msg ->
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

            // Card da Fatura Atual / PIX
            CardContainer {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            text = "Mensalidade Atual",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = Slate500
                        )
                        Text(
                            text = "R$ ${String.format("%.2f", uiState.student?.monthlyFee ?: 340.0)}",
                            fontSize = 26.sp,
                            fontWeight = FontWeight.Black,
                            color = Emerald700
                        )
                    }
                    StatusBadge(status = uiState.latestInvoice?.status ?: "PENDING")
                }

                Spacer(modifier = Modifier.height(14.dp))

                Divider(color = Slate100)

                Spacer(modifier = Modifier.height(14.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(text = "Plano:", fontSize = 12.sp, color = Slate500)
                    Text(
                        text = uiState.student?.planName ?: "2x por Semana",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        color = Slate800
                    )
                }

                Spacer(modifier = Modifier.height(6.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(text = "Vencimento:", fontSize = 12.sp, color = Slate500)
                    Text(
                        text = uiState.latestInvoice?.dueDate ?: "10 do mês",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        color = Slate800
                    )
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Botão Copiar Código PIX Banco Inter
                PrimaryButton(
                    text = "Copiar Código PIX Copia-e-Cola",
                    onClick = {
                        val pix = uiState.latestInvoice?.pixCode ?: "CHAVE-PIX-STUDIO-PILATES"
                        val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                        val clip = ClipData.newPlainText("Código PIX", pix)
                        clipboard.setPrimaryClip(clip)
                        Toast.makeText(context, "Código PIX copiado! Abra o app do seu banco.", Toast.LENGTH_LONG).show()
                    },
                    icon = Icons.Filled.ContentCopy
                )
            }

            // Card PIX Automático (Recorrente)
            CardContainer {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(36.dp)
                            .clip(CircleShape)
                            .background(Emerald50),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(Icons.Filled.Autorenew, contentDescription = null, tint = Emerald700, modifier = Modifier.size(20.dp))
                    }
                    Spacer(modifier = Modifier.width(10.dp))
                    Column {
                        Text(
                            text = "PIX Automático Banco Inter",
                            fontWeight = FontWeight.Bold,
                            fontSize = 14.sp,
                            color = Slate900
                        )
                        Text(
                            text = "Cobrança automática mensal sem se preocupar",
                            fontSize = 11.sp,
                            color = Slate500
                        )
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                if (uiState.pixAutoActive) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(10.dp))
                            .background(Emerald50)
                            .padding(10.dp)
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Filled.CheckCircle, contentDescription = null, tint = Emerald600, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(text = "PIX Automático Ativo", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Emerald700)
                        }
                    }
                } else {
                    SecondaryButton(
                        text = "Ativar PIX Automático",
                        onClick = { viewModel.activatePixAutomatico() },
                        icon = Icons.Filled.Bolt
                    )
                }
            }

            // Card Contrato Digital
            CardContainer {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .size(36.dp)
                                .clip(CircleShape)
                                .background(Purple50),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(Icons.Filled.Description, contentDescription = null, tint = Purple700, modifier = Modifier.size(20.dp))
                        }
                        Spacer(modifier = Modifier.width(10.dp))
                        Column {
                            Text(
                                text = "Contrato de Prestação de Serviços",
                                fontWeight = FontWeight.Bold,
                                fontSize = 13.sp,
                                color = Slate900
                            )
                            Text(
                                text = if (uiState.contractAccepted) "✓ Assinado digitalmente" else "Pendente de assinatura",
                                fontSize = 11.sp,
                                color = if (uiState.contractAccepted) Emerald700 else Amber700,
                                fontWeight = FontWeight.SemiBold
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                SecondaryButton(
                    text = if (uiState.contractAccepted) "Visualizar Termos do Contrato" else "Ler e Assinar Contrato Digital",
                    onClick = { showContractModal = true },
                    icon = Icons.Filled.FactCheck
                )
            }
        }
    }

    // Modal de Contrato Digital
    if (showContractModal) {
        AlertDialog(
            onDismissRequest = { showContractModal = false },
            title = { Text("Contrato de Matrícula", fontWeight = FontWeight.Bold) },
            text = {
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Text(
                        text = "Termos e Condições do Studio de Pilates:\n\n1. O plano contratado concede direito à frequência semanal de aulas conforme grade acordada.\n2. Cancelamentos com até 2h de antecedência geram crédito de reposição automático com validade de 30 dias.\n3. O atraso no pagamento superior a 5 dias libera o horário para a fila de espera.\n4. O aluno declara estar em condições físicas adequadas para a prática das atividades.",
                        fontSize = 12.sp,
                        color = Slate700,
                        lineHeight = 16.sp
                    )

                    if (!uiState.contractAccepted) {
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(text = "Digite seu nome completo como assinatura digital:", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Slate800)
                        OutlinedTextField(
                            value = signatureInput,
                            onValueChange = { signatureInput = it },
                            placeholder = { Text("Ex: ${uiState.student?.name ?: "Seu Nome"}") },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                }
            },
            confirmButton = {
                if (!uiState.contractAccepted) {
                    Button(
                        onClick = {
                            viewModel.signDigitalContract(signatureInput)
                            showContractModal = false
                        },
                        enabled = signatureInput.isNotBlank(),
                        colors = ButtonDefaults.buttonColors(containerColor = Emerald600)
                    ) {
                        Text("Assinar e Concordar", fontWeight = FontWeight.Bold)
                    }
                } else {
                    Button(onClick = { showContractModal = false }) {
                        Text("Fechar")
                    }
                }
            },
            dismissButton = {
                if (!uiState.contractAccepted) {
                    TextButton(onClick = { showContractModal = false }) {
                        Text("Fechar")
                    }
                }
            }
        )
    }
}
