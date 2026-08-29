# App do Aluno • Studio Pilates (Android APK)

Aplicativo nativo para os alunos do estúdio com suporte a **Geolocalização em segundo plano (Check-in automático)**, **Notificações Push** e **Gestão de Créditos de Reposição**.

---

## 🚀 Como Gerar o Arquivo `.apk` Android Diretamente (Sem Burocracia)

Você pode compilar o arquivo `.apk` pronto para instalar em qualquer celular Android usando o serviço em nuvem do Expo EAS Build:

1. Instale o utilitário do EAS (se ainda não tiver):
   ```bash
   npm install -g eas-cli
   ```

2. Faça login na sua conta gratuita do Expo:
   ```bash
   eas login
   ```

3. Execute o comando de compilação do APK:
   ```bash
   eas build -p android --profile preview
   ```

4. Ao finalizar, o terminal exibirá um link para baixar o arquivo `.apk` diretamente ou ler um QR Code para instalar no celular!

---

## 📱 Como Testar no Celular via Expo Go

1. Instale o app **Expo Go** na Google Play Store do seu celular.
2. Na pasta `mobile`, execute:
   ```bash
   npm install
   npx expo start
   ```
3. Abra a câmera ou o Expo Go e aponte para o QR Code gerado no terminal.
