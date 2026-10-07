package com.example.eon.ui.login

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp

@Composable
fun WorkspaceScreen(
    onWorkspaceConnected: (String) -> Unit
) {
    var workspaceCode by remember { mutableStateOf("") }
    
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            text = "Connect to Workspace", 
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onBackground
        )
        Spacer(modifier = Modifier.height(16.dp))
        
        Text(
            text = "Enter your Eon Space workspace code to sync your environment.",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Spacer(modifier = Modifier.height(32.dp))
        
        OutlinedTextField(
            value = workspaceCode,
            onValueChange = { workspaceCode = it },
            label = { Text("Workspace Code") },
            placeholder = { Text("e.g. EON-X79A") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth()
        )
        Spacer(modifier = Modifier.height(24.dp))
        
        Button(
            onClick = {
                if (workspaceCode.isNotBlank()) {
                    onWorkspaceConnected(workspaceCode)
                }
            },
            modifier = Modifier.fillMaxWidth().height(48.dp),
            enabled = workspaceCode.isNotBlank()
        ) {
            Text("Connect", style = MaterialTheme.typography.labelLarge)
        }
    }
}
