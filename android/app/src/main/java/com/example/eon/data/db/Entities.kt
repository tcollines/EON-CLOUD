package com.example.eon.data.db

data class LocalFile(
    val id: String,
    val name: String,
    val size: Long,
    val status: String,
    val localUri: String? // Null if cloud only
)

data class UploadTask(
    val id: String,
    val fileUri: String,
    val fileName: String,
    val fileSize: Long,
    val sessionId: String?,
    val status: String, // PENDING, UPLOADING, PAUSED, ERROR, COMPLETED
    val progress: Int
)
