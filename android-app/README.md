# 📱 Studio Pilates - Aplicativo Android Nativo (Padrão Ouro)

Aplicativo Android Nativo do Aluno construído com a arquitetura e tecnologias mais modernas recomendadas pelo Google (**Modern Android Development - MAD**).

---

## 🛠️ Stack Tecnológica

- **UI & Design**: Jetpack Compose 100% Declarativo, Material 3 (Material You), Coil 3 para imagens.
- **Linguagem & Assincronismo**: Kotlin 2.0+, Coroutines, Kotlin Flow & StateFlow.
- **Arquitetura**: Clean Architecture (Presentation, Domain, Data, Core) + MVI / MVVM.
- **Injeção de Dependências**: Dagger Hilt.
- **Persistência Local (Offline-First)**: Room Database (SQLite) + DataStore Preferences.
- **Rede & APIs**: Retrofit 2 + OkHttp + kotlinx.serialization.
- **Geolocalização**: Google Play Services (`FusedLocationProviderClient`) com cálculo de raio para check-in.
- **Navegação**: Navigation Compose com rotas tipadas.
- **Build System**: Gradle Version Catalogs (`libs.versions.toml`) com Kotlin DSL (`.gradle.kts`).

---

## 📂 Estrutura do Projeto

```
android-app/
├── gradle/
│   └── libs.versions.toml             # Version Catalog centralizado
├── build.gradle.kts                   # Root build script
├── settings.gradle.kts                # Configurações de repositórios e módulos
└── app/
    ├── build.gradle.kts               # Configuração do módulo principal
    └── src/main/
        ├── AndroidManifest.xml        # Permissões (Internet, GPS, Câmera)
        ├── res/                       # Cores, strings, temas e ícones adaptativos
        └── java/com/studiopilates/app/
            ├── PilatesApplication.kt  # Classe Application com @HiltAndroidApp
            ├── MainActivity.kt        # Activity principal com Compose NavHost
            ├── core/                  # Rede, Room, DataStore, Localização e Tema
            ├── domain/                # Modelos de Domínio, Repositórios e Use Cases
            ├── data/                  # Implementações de Repositórios e Mappers
            └── presentation/          # Telas Compose, ViewModels e Navegação
```

---

## 🚀 Como Executar o Projeto

1. Abra o **Android Studio** (versão Ladybug / Iguana ou mais recente).
2. Clique em **Open** e selecione a pasta `android-app/`.
3. Aguarde o Gradle sincronizar as dependências automaticamente via `libs.versions.toml`.
4. Conecte um celular Android via USB (com Depuração USB ativada) ou inicie um Emulador (AVD).
5. Clique no botão verde **Run ▶️** no topo do Android Studio.

### 🌐 Configuração do Backend
Por padrão, o app está configurado para acessar a API local via emulador (`http://10.0.2.2:3000/api/`).
Para testar no celular físico ou apontar para o servidor de produção do Render:
- Altere `BASE_URL` no arquivo `app/build.gradle.kts` ou nas preferências do app.
