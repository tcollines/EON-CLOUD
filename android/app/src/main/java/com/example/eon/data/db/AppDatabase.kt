package com.example.eon.data.db

interface LocalFileDao {
    suspend fun getAll(): List<LocalFile>
    suspend fun insertAll(files: List<LocalFile>)
}

interface UploadTaskDao {
    suspend fun getAll(): List<UploadTask>
    suspend fun insert(task: UploadTask)
    suspend fun update(task: UploadTask)
    suspend fun getActiveTasks(): List<UploadTask>
}

abstract class AppDatabase {
    abstract fun localFileDao(): LocalFileDao
    abstract fun uploadTaskDao(): UploadTaskDao
}
