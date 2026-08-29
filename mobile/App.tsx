import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';

const LOCATION_TASK_NAME = 'background-pilates-checkin';
const API_URL = 'http://SEU_IP_LOCAL:3000/api'; // Altere para a URL pública ou IP local em produção

// Configuração do manipulador de notificações em primeiro plano
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export default function App() {
  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [gpsStatus, setGpsStatus] = useState('Iniciando GPS...');

  useEffect(() => {
    setupPermissions();
    fetchStudentProfile();
  }, []);

  const setupPermissions = async () => {
    try {
      // 1. Notificações Push
      const { status: notifStatus } = await Notifications.requestPermissionsAsync();
      if (notifStatus === 'granted') {
        console.log('Permissão de notificações concedida!');
      }

      // 2. Permissão de Localização em Primeiro e Segundo Plano
      const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
      if (fgStatus !== 'granted') {
        setGpsStatus('Permissão de localização negada');
        return;
      }

      const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
      if (bgStatus === 'granted') {
        setGpsStatus('GPS Ativo com Check-in Automático');
        await startBackgroundLocation();
      } else {
        setGpsStatus('GPS Ativo (Apenas com app aberto)');
      }
    } catch (e) {
      console.log('Erro ao configurar permissões:', e);
    }
  };

  const startBackgroundLocation = async () => {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
    if (!isRegistered) {
      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 60000, // Cada 1 min
        distanceInterval: 10,
        showsBackgroundLocationIndicator: true,
        foregroundService: {
          notificationTitle: 'Studio Pilates Harmonia',
          notificationBody: 'Monitorando sua chegada para check-in automático na aula.',
          notificationColor: '#4f979a',
        },
      });
    }
  };

  const fetchStudentProfile = async () => {
    // Aluno demonstrativo
    setStudent({
      id: 'demo-student',
      name: 'Camila Rodrigues',
      planName: '3x por Semana',
      nextClass: {
        id: 'att-1',
        date: 'Hoje',
        time: '08:00 - 09:00',
        instructor: 'Instrutora Renata',
        status: 'SCHEDULED',
      },
      credits: 1,
    });
    setLoading(false);
  };

  const handleCancelClass = async () => {
    Alert.alert(
      'Desmarcar Aula',
      'Se desmarcar com mais de 2h de antecedência, você receberá 1 crédito de reposição válido por 30 dias. Deseja confirmar?',
      [
        { text: 'Não', style: 'cancel' },
        {
          text: 'Sim, Desmarcar',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Aula Desmarcada!',
              'Crédito de reposição gerado com sucesso! Você tem 30 dias para repor sua aula.'
            );
            if (student) {
              setStudent({
                ...student,
                nextClass: null,
                credits: (student.credits || 0) + 1,
              });
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4f979a" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Olá,</Text>
          <Text style={styles.studentName}>{student?.name}</Text>
          <Text style={styles.planBadge}>{student?.planName}</Text>
        </View>
        <View style={styles.gpsBadge}>
          <Text style={styles.gpsText}>📡 GPS Ativo</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Próxima Aula */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sua Próxima Aula</Text>
          {student?.nextClass ? (
            <View style={styles.classInfo}>
              <Text style={styles.classDate}>{student.nextClass.date} • {student.nextClass.time}</Text>
              <Text style={styles.instructorText}>{student.nextClass.instructor}</Text>
              <Text style={styles.studioName}>Studio Pilates & Bem-Estar Harmonia</Text>

              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.cancelButton} onPress={handleCancelClass}>
                  <Text style={styles.cancelButtonText}>🔴 Desmarcar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.rescheduleButton}
                  onPress={() => {
                    Alert.alert(
                      'Remarcar Aula',
                      'Deseja transferir sua aula para outro dia ou horário?',
                      [
                        { text: 'Cancelar', style: 'cancel' },
                        {
                          text: 'Escolher Nova Data',
                          onPress: () =>
                            Alert.alert('Sucesso', 'Horário remarcado com sucesso!'),
                        },
                      ]
                    );
                  }}
                >
                  <Text style={styles.rescheduleButtonText}>🔄 Remarcar</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <Text style={styles.emptyText}>Você não tem aulas agendadas para hoje.</Text>
          )}
        </View>

        {/* Saldo de Créditos */}
        <View style={[styles.card, styles.creditCard]}>
          <View style={styles.creditHeader}>
            <Text style={styles.creditTitle}>Créditos de Reposição</Text>
            <View style={styles.creditBadge}>
              <Text style={styles.creditBadgeText}>{student?.credits} disponível(is)</Text>
            </View>
          </View>
          <Text style={styles.creditDesc}>
            Válidos por 30 dias. Use para agendar sua reposição em horários disponíveis.
          </Text>
        </View>

        {/* Avaliação no Google Maps & Redes Sociais */}
        <View style={[styles.card, styles.reviewCard]}>
          <Text style={styles.reviewTitle}>⭐⭐⭐⭐⭐ Avalie no Google</Text>
          <Text style={styles.reviewDesc}>
            Gostando das aulas no Studio Pilates Center? Deixe sua avaliação 5 estrelas no Google Maps!
          </Text>

          <TouchableOpacity
            style={styles.googleButton}
            onPress={() => Linking.openURL('https://maps.app.goo.gl/sUoFd6YoGGLMLkMi9')}
          >
            <Text style={styles.googleButtonText}>⭐ Avaliar no Google Maps</Text>
          </TouchableOpacity>

          <View style={styles.socialRow}>
            <TouchableOpacity
              style={styles.instaButton}
              onPress={() => Linking.openURL('https://instagram.com/pilatescenter')}
            >
              <Text style={styles.instaButtonText}>📸 @pilatescenter</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.whatsappButton}
              onPress={() => Linking.openURL('https://wa.me/5522999623247?text=Ol%C3%A1%2C%20Studio%20Pilates%20Center!')}
            >
              <Text style={styles.whatsappButtonText}>💬 WhatsApp</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Informações de Check-in GPS */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Presença Inteligente</Text>
          <Text style={styles.gpsDesc}>
            Ao permanecer mais de 30 minutos próximo ao estúdio durante sua aula, sua presença é confirmada de forma 100% automática.
          </Text>
          <Text style={styles.statusIndicator}>Status: {gpsStatus}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#305256',
    padding: 24,
    paddingTop: 36,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  greeting: {
    color: '#a7d2d3',
    fontSize: 12,
    fontWeight: '600',
  },
  studentName: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 2,
  },
  planBadge: {
    color: '#cfe5e5',
    fontSize: 12,
    marginTop: 4,
  },
  gpsBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  gpsText: {
    color: '#34d399',
    fontSize: 11,
    fontWeight: 'bold',
  },
  content: {
    padding: 20,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  classInfo: {
    marginTop: 4,
  },
  classDate: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  instructorText: {
    fontSize: 13,
    color: '#4f979a',
    fontWeight: '600',
    marginTop: 4,
  },
  studioName: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 16,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#fff1f2',
    borderColor: '#fecdd3',
    borderWidth: 1,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#e11d48',
    fontSize: 12,
    fontWeight: 'bold',
  },
  rescheduleButton: {
    flex: 1,
    backgroundColor: '#4f979a',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  rescheduleButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 13,
  },
  creditCard: {
    backgroundColor: '#3b0764',
    borderColor: '#581c87',
  },
  creditHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  creditTitle: {
    color: '#e9d5ff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  creditBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  creditBadgeText: {
    color: '#6b21a8',
    fontSize: 11,
    fontWeight: 'bold',
  },
  creditDesc: {
    fontSize: 12,
    color: '#6b21a8',
    lineHeight: 18,
  },
  reviewCard: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
  },
  reviewTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#92400e',
    marginBottom: 6,
  },
  reviewDesc: {
    fontSize: 12,
    color: '#78350f',
    lineHeight: 18,
    marginBottom: 14,
  },
  googleButton: {
    backgroundColor: '#f59e0b',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  googleButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  socialRow: {
    flexDirection: 'row',
    gap: 10,
  },
  instaButton: {
    flex: 1,
    backgroundColor: '#c13584',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  instaButtonText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  whatsappButton: {
    flex: 1,
    backgroundColor: '#25D366',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  whatsappButtonText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  gpsDesc: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 19,
  },
  statusIndicator: {
    marginTop: 8,
    fontSize: 11,
    fontWeight: '600',
    color: '#059669',
  },
});
