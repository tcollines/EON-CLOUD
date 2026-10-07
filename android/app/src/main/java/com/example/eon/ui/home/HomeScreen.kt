package com.example.eon.ui.home

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.example.eon.data.api.FileItem
import com.example.eon.data.repository.EonRepository
import kotlinx.coroutines.launch

@Composable
fun HomeScreen(
    repository: EonRepository,
    token: String,
    onUploadClick: () -> Unit
) {
    var files by remember { mutableStateOf<List<FileItem>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    
    val coroutineScope = rememberCoroutineScope()

    LaunchedEffect(Unit) {
        try {
            files = repository.getFiles(token)
        } catch (e: Exception) {
            e.printStackTrace()
        } finally {
            isLoading = false
        }
    }

    Scaffold(
        floatingActionButton = {
            FloatingActionButton(onClick = onUploadClick) {
                Text("+")
            }
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .padding(16.dp)
        ) {
            Text(text = "Eon Drive", style = MaterialTheme.typography.headlineMedium)
            Spacer(modifier = Modifier.height(16.dp))

            if (isLoading) {
                CircularProgressIndicator()
            } else if (files.isEmpty()) {
                Text("No files found. Upload something!")
            } else {
                LazyColumn {
                    items(files) { file ->
                        FileRow(file)
                    }
                }
            }
        }
    }
}

@Composable
fun FileRow(file: FileItem) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(text = file.name, style = MaterialTheme.typography.titleMedium)
            Text(text = "Size: ${file.size} bytes | Status: ${file.status}", style = MaterialTheme.typography.bodyMedium)
        }
    }
}
