package com.example.eon.data.repository

import com.example.eon.data.api.ApiClient
import com.example.eon.data.api.LoginRequest
import com.example.eon.data.db.AppDatabase
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class EonRepository(private val db: AppDatabase) {
    private val api = ApiClient.api

    suspend fun login(email: String, password: String): String {
        return withContext(Dispatchers.IO) {
            val response = api.login(LoginRequest(email, password, "Android Device", "Android"))
            // We return token to be saved in secure preferences by the caller
            response.token
        }
    }

    suspend fun getFiles(token: String) = withContext(Dispatchers.IO) {
        val remoteFiles = api.listFiles("Bearer $token").files
        // Map to local DB entities or just return domain models. For MVP, returning raw list
        remoteFiles
    }
}
