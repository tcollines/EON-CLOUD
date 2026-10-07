package com.example.eon.data.api

import retrofit2.http.*
import okhttp3.RequestBody

interface EonApi {
    @POST("auth/login")
    suspend fun login(@Body request: LoginRequest): LoginResponse

    @POST("auth/register")
    suspend fun register(@Body request: RegisterRequest): RegisterResponse

    @GET("files")
    suspend fun listFiles(@Header("Authorization") token: String): FileListResponse

    @POST("files")
    suspend fun createFileSession(
        @Header("Authorization") token: String,
        @Body request: CreateFileRequest
    ): CreateFileResponse

    @POST("uploads/{session_id}/chunks/{index}")
    suspend fun uploadChunk(
        @Header("Authorization") token: String,
        @Path("session_id") sessionId: String,
        @Path("index") index: Int,
        @Header("X-Chunk-Hash") hash: String,
        @Body chunkData: RequestBody
    ): ChunkUploadResponse

    @POST("uploads/{session_id}/commit")
    suspend fun commitSession(
        @Header("Authorization") token: String,
        @Path("session_id") sessionId: String
    ): CommitResponse
}
