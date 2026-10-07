package com.example.eon.data.api

import kotlinx.serialization.Serializable

@Serializable
data class LoginRequest(val email: String, val password: String, val device: String, val os_type: String)

@Serializable
data class LoginResponse(val token: String, val user_id: String, val device_id: String)

@Serializable
data class RegisterRequest(val email: String, val password: String)

@Serializable
data class RegisterResponse(val message: String, val user_id: String)

@Serializable
data class FileItem(val id: String, val name: String, val size: Long, val status: String, val created_at: String)

@Serializable
data class FileListResponse(val files: List<FileItem>)

@Serializable
data class CreateFileRequest(val name: String, val size: Long, val folder_id: String? = null)

@Serializable
data class CreateFileResponse(val file_id: String, val session_id: String, val expires_at: String)

@Serializable
data class ChunkUploadResponse(val message: String, val chunk_index: Int)

@Serializable
data class CommitResponse(val message: String, val file_id: String)
