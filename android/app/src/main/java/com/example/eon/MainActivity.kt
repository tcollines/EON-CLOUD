package com.example.eon

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import com.example.eon.ui.theme.EonTheme
import androidx.compose.foundation.layout.padding
import androidx.compose.ui.unit.dp
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.work.Data
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import com.example.eon.data.db.AppDatabase
import com.example.eon.data.db.LocalFileDao
import com.example.eon.data.db.LocalFile
import com.example.eon.data.db.UploadTaskDao
import com.example.eon.data.db.UploadTask
import com.example.eon.data.repository.EonRepository
import com.example.eon.ui.home.HomeScreen
import com.example.eon.ui.login.LoginScreen
import com.example.eon.upload.UploadWorker

enum class AppState { LOGIN, WORKSPACE, PERMISSION, HOME }

class MockAppDatabase : AppDatabase() {
    override fun localFileDao() = object : LocalFileDao {
        override suspend fun getAll() = emptyList<LocalFile>()
        override suspend fun insertAll(files: List<LocalFile>) {}
    }
    override fun uploadTaskDao() = object : UploadTaskDao {
        override suspend fun getAll() = emptyList<UploadTask>()
        override suspend fun insert(task: UploadTask) {}
        override suspend fun update(task: UploadTask) {}
        override suspend fun getActiveTasks() = emptyList<UploadTask>()
    }
}

class MainActivity : ComponentActivity() {
    private lateinit var db: AppDatabase
    private lateinit var repository: EonRepository

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        try {
            db = MockAppDatabase()
            repository = EonRepository(db)

            setContent {
                EonTheme {
                    Surface(
                        modifier = Modifier.fillMaxSize(),
                        color = androidx.compose.material3.MaterialTheme.colorScheme.background
                    ) {
                        var appState by remember { mutableStateOf(AppState.LOGIN) }
                        var token by remember { mutableStateOf<String?>(null) }
                        var workspaceCode by remember { mutableStateOf<String?>(null) }

                        when (appState) {
                            AppState.LOGIN -> {
                                LoginScreen(repository = repository) { newToken ->
                                    token = newToken
                                    appState = AppState.WORKSPACE
                                }
                            }
                            AppState.WORKSPACE -> {
                                com.example.eon.ui.login.WorkspaceScreen { code ->
                                    workspaceCode = code
                                    appState = AppState.PERMISSION
                                }
                            }
                            AppState.PERMISSION -> {
                                com.example.eon.ui.login.PermissionScreen {
                                    appState = AppState.HOME
                                }
                            }
                            AppState.HOME -> {
                                HomeScreen(
                                    repository = repository,
                                    token = token!!,
                                    onUploadClick = {
                                        val mockFilePath = "/storage/emulated/0/DCIM/Camera/large_video.mp4"
                                        val uploadWork = OneTimeWorkRequestBuilder<UploadWorker>()
                                            .setInputData(
                                                Data.Builder()
                                                    .putString("FILE_PATH", mockFilePath)
                                                    .putString("TOKEN", token!!)
                                                    .build()
                                            )
                                            .build()
                                        WorkManager.getInstance(applicationContext).enqueue(uploadWork)
                                    }
                                )
                            }
                        }
                    }
                }
            }
        } catch (e: Throwable) {
            setContent {
                EonTheme {
                    Surface(modifier = Modifier.fillMaxSize(), color = androidx.compose.material3.MaterialTheme.colorScheme.error) {
                        androidx.compose.foundation.layout.Column(
                            modifier = Modifier.fillMaxSize().padding(16.dp)
                        ) {
                            androidx.compose.material3.Text(
                                "App Crashed!", 
                                style = androidx.compose.material3.MaterialTheme.typography.headlineLarge,
                                color = androidx.compose.material3.MaterialTheme.colorScheme.onError
                            )
                            androidx.compose.material3.Text(
                                e.stackTraceToString(),
                                color = androidx.compose.material3.MaterialTheme.colorScheme.onError
                            )
                        }
                    }
                }
            }
        }
    }
}
