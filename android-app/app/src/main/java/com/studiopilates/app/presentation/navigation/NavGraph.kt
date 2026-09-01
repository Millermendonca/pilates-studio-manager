package com.studiopilates.app.presentation.navigation

import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import com.studiopilates.app.presentation.classes.ClassesScreen
import com.studiopilates.app.presentation.credits.CreditsScreen
import com.studiopilates.app.presentation.financial.FinancialScreen
import com.studiopilates.app.presentation.home.HomeScreen
import com.studiopilates.app.presentation.chat.ChatScreen
import com.studiopilates.app.presentation.profile.ProfileScreen

@Composable
fun NavGraph(
    navController: NavHostController,
    paddingValues: PaddingValues
) {
    NavHost(
        navController = navController,
        startDestination = Screen.Home.route,
        modifier = Modifier.padding(paddingValues)
    ) {
        composable(Screen.Home.route) {
            HomeScreen(
                onNavigateToClasses = { navController.navigate(Screen.Classes.route) },
                onNavigateToCredits = { navController.navigate(Screen.Credits.route) },
                onNavigateToFinancial = { navController.navigate(Screen.Financial.route) },
                onNavigateToChat = { navController.navigate(Screen.Chat.route) }
            )
        }

        composable(Screen.Classes.route) {
            ClassesScreen()
        }

        composable(Screen.Credits.route) {
            CreditsScreen()
        }

        composable(Screen.Financial.route) {
            FinancialScreen()
        }

        composable(Screen.Chat.route) {
            ChatScreen()
        }

        composable(Screen.Profile.route) {
            ProfileScreen()
        }
    }
}
