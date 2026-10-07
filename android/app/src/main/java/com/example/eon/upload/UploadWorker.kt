package com.example.eon.upload

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.example.eon.data.api.ApiClient
import com.example.eon.data.api.CreateFileRequest
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.File
import java.io.FileInputStream
import java.security.MessageDigest

class UploadWorker(appContext: Context, workerParams: WorkerParameters) :
    CoroutineWorker(appContext, workerParams) {

    private val api = ApiClient.api

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        val filePath = inputData.getString("FILE_PATH") ?: return@withContext Result.failure()
        val token = inputData.getString("TOKEN") ?: return@withContext Result.failure()

        // In a production app, we would handle content URIs.
        // For this MVP, we assume local file paths.
        val file = File(filePath)
        if (!file.exists()) return@withContext Result.failure()

        val fileSize = file.length()
        val chunkSize = 8 * 1024 * 1024 // 8 MB chunks

        try {
            // 1. Create upload session
            val createRes = api.createFileSession(
                "Bearer $token",
                CreateFileRequest(name = file.name, size = fileSize)
            )
            val sessionId = createRes.session_id

            // 2. Upload chunks
            val buffer = ByteArray(chunkSize)
            var bytesRead: Int
            var chunkIndex = 0

            FileInputStream(file).use { fis ->
                while (fis.read(buffer).also { bytesRead = it } != -1) {
                    val actualChunk = if (bytesRead == chunkSize) buffer else buffer.copyOf(bytesRead)

                    val hash = hashChunk(actualChunk)
                    val requestBody = actualChunk.toRequestBody("application/octet-stream".toMediaTypeOrNull())

                    api.uploadChunk(
                        "Bearer $token",
                        sessionId,
                        chunkIndex,
                        hash,
                        requestBody
                    )

                    chunkIndex++
                    // Progress could be emitted here
                }
            }

            // 3. Commit session
            api.commitSession("Bearer $token", sessionId)

            Result.success()
        } catch (e: Exception) {
            e.printStackTrace()
            // Using Result.retry() tells WorkManager to back off exponentially and try again
            // exactly as requested in the resumable uploads specification.
            Result.retry() 
        }
    }

    private fun hashChunk(chunk: ByteArray): String {
        val md = MessageDigest.getInstance("SHA-256")
        val digest = md.digest(chunk)
        return digest.joinToString("") { "%02x".format(it) }
    }
}
