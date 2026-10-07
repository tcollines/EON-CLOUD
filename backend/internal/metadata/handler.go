package metadata

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"time"

	"github.com/eon/backend/internal/storage"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Handler struct {
	db    *pgxpool.Pool
	store storage.Storage
	vfs   *storage.EonVFSEngine
}

func NewHandler(db *pgxpool.Pool, store storage.Storage, vfs *storage.EonVFSEngine) *Handler {
	return &Handler{db: db, store: store, vfs: vfs}
}

type CreateFileRequest struct {
	Name     string `json:"name" binding:"required"`
	FolderID string `json:"folder_id"` // Optional
	Size     int64  `json:"size"`
}

func (h *Handler) ListFiles(c *gin.Context) {
	userIDStr := c.GetString("user_id")
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid user context"})
		return
	}

	rows, err := h.db.Query(context.Background(),
		"SELECT id, name, size, status, created_at FROM files WHERE user_id = $1", userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to query files"})
		return
	}
	defer rows.Close()

	var files []map[string]interface{}
	for rows.Next() {
		var id uuid.UUID
		var name string
		var size int64
		var status string
		var createdAt time.Time
		if err := rows.Scan(&id, &name, &size, &status, &createdAt); err != nil {
			continue
		}
		files = append(files, map[string]interface{}{
			"id":         id,
			"name":       name,
			"size":       size,
			"status":     status,
			"created_at": createdAt,
		})
	}

	if files == nil {
		files = make([]map[string]interface{}, 0)
	}

	c.JSON(http.StatusOK, gin.H{"files": files})
}

func (h *Handler) CreateFileSession(c *gin.Context) {
	var req CreateFileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userIDStr := c.GetString("user_id")
	deviceIDStr := c.GetString("device_id")

	userID, _ := uuid.Parse(userIDStr)
	deviceID, _ := uuid.Parse(deviceIDStr)

	var fileID uuid.UUID
	var folderID *uuid.UUID
	if req.FolderID != "" {
		parsed, err := uuid.Parse(req.FolderID)
		if err == nil {
			folderID = &parsed
		}
	}

	// Use a transaction with an advisory lock to prevent concurrent duplicates
	tx, err := h.db.Begin(context.Background())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to start transaction"})
		return
	}
	defer tx.Rollback(context.Background())

	// Acquire a lock based on the file name to prevent race conditions
	_, err = tx.Exec(context.Background(), "SELECT pg_advisory_xact_lock(hashtext($1))", req.Name)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to acquire lock"})
		return
	}

	// 0. Delete existing file with the same name to prevent duplicates
	var existingID uuid.UUID
	err = tx.QueryRow(context.Background(), 
		"SELECT id FROM files WHERE user_id = $1 AND folder_id IS NOT DISTINCT FROM $2 AND name = $3", 
		userID, folderID, req.Name,
	).Scan(&existingID)
	if err == nil {
		tx.Exec(context.Background(), "DELETE FROM chunks WHERE file_id = $1", existingID)
		tx.Exec(context.Background(), "DELETE FROM files WHERE id = $1", existingID)
	}

	// 1. Create file record (UPLOADING state)
	err = tx.QueryRow(context.Background(),
		"INSERT INTO files (user_id, folder_id, name, size, status) VALUES ($1, $2, $3, $4, 'UPLOADING') RETURNING id",
		userID, folderID, req.Name, req.Size,
	).Scan(&fileID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create file record"})
		return
	}

	err = tx.Commit(context.Background())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to commit transaction"})
		return
	}

	// 2. Create upload session
	var sessionID uuid.UUID
	expiresAt := time.Now().Add(time.Hour * 24 * 7) // 7 days to complete upload
	err = h.db.QueryRow(context.Background(),
		"INSERT INTO upload_sessions (file_id, device_id, expires_at) VALUES ($1, $2, $3) RETURNING id",
		fileID, deviceID, expiresAt,
	).Scan(&sessionID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create upload session"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"file_id":    fileID,
		"session_id": sessionID,
		"expires_at": expiresAt,
	})
}

func (h *Handler) UploadChunk(c *gin.Context) {
	sessionIDStr := c.Param("session_id")
	indexStr := c.Param("index")

	sessionID, err := uuid.Parse(sessionIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid session ID"})
		return
	}
	chunkIndex, err := strconv.Atoi(indexStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid chunk index"})
		return
	}

	// Verify session
	var fileID uuid.UUID
	err = h.db.QueryRow(context.Background(),
		"SELECT file_id FROM upload_sessions WHERE id = $1 AND expires_at > NOW()",
		sessionID,
	).Scan(&fileID)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired session"})
		return
	}

	// Receive chunk body
	contentLength := c.Request.ContentLength
	if contentLength <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Content length is required"})
		return
	}

	// Require chunk hash for deduplication
	chunkHash := c.GetHeader("X-Chunk-Hash")
	if chunkHash == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "X-Chunk-Hash header is required for deduplication"})
		return
	}

	// Check if chunk exists (Deduplication)
	exists, statErr := h.store.StatObject(c.Request.Context(), "eon-chunks", chunkHash)
	if statErr != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check chunk existence"})
		return
	}

	if !exists {
		// Save to object storage using the hash as the key
		err = h.store.PutObject(c.Request.Context(), "eon-chunks", chunkHash, c.Request.Body, contentLength)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to upload to storage"})
			return
		}
	}

	// Record chunk metadata
	_, err = h.db.Exec(context.Background(),
		`INSERT INTO chunks (file_id, chunk_index, size, hash, storage_key, status) 
		 VALUES ($1, $2, $3, $4, $5, 'COMMITTED')`,
		fileID, chunkIndex, contentLength, chunkHash, chunkHash,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to record chunk metadata"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Chunk uploaded successfully", "chunk_index": chunkIndex})
}

func (h *Handler) CommitSession(c *gin.Context) {
	sessionIDStr := c.Param("session_id")
	sessionID, err := uuid.Parse(sessionIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid session ID"})
		return
	}

	var fileID uuid.UUID
	err = h.db.QueryRow(context.Background(),
		"SELECT file_id FROM upload_sessions WHERE id = $1", sessionID,
	).Scan(&fileID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Session not found"})
		return
	}

	// For MVP, simply mark file as READY
	_, err = h.db.Exec(context.Background(),
		"UPDATE files SET status = 'READY', updated_at = NOW() WHERE id = $1", fileID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to finalize file"})
		return
	}

	// Clean up session
	h.db.Exec(context.Background(), "DELETE FROM upload_sessions WHERE id = $1", sessionID)

	// Emit sync event
	userIDStr := c.GetString("user_id")
	h.db.Exec(context.Background(),
		"INSERT INTO sync_events (user_id, event_type, entity_id) VALUES ($1, 'FILE_CREATED', $2)",
		userIDStr, fileID,
	)

	c.JSON(http.StatusOK, gin.H{"message": "File upload complete", "file_id": fileID})
}

func (h *Handler) GetFile(c *gin.Context) {
	fileIDStr := c.Param("id")
	fileID, err := uuid.Parse(fileIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid file ID"})
		return
	}

	userIDStr := c.GetString("user_id")
	var name string
	var size int64
	var status string
	err = h.db.QueryRow(context.Background(),
		"SELECT name, size, status FROM files WHERE id = $1 AND user_id = $2", fileID, userIDStr,
	).Scan(&name, &size, &status)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "File not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"id":     fileID,
		"name":   name,
		"size":   size,
		"status": status,
	})
}

func (h *Handler) DownloadFile(c *gin.Context) {
	fileIDStr := c.Param("id")
	fileID, err := uuid.Parse(fileIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid file ID"})
		return
	}

	userIDStr := c.GetString("user_id")
	var name string
	var size int64
	err = h.db.QueryRow(context.Background(),
		"SELECT name, size FROM files WHERE id = $1 AND user_id = $2", fileID, userIDStr,
	).Scan(&name, &size)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "File not found"})
		return
	}

	rows, err := h.db.Query(context.Background(),
		"SELECT storage_key FROM chunks WHERE file_id = $1 ORDER BY chunk_index ASC", fileID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch chunks"})
		return
	}
	defer rows.Close()

	var chunkHashes []string
	for rows.Next() {
		var key string
		if err := rows.Scan(&key); err == nil {
			chunkHashes = append(chunkHashes, key)
		}
	}

	c.Header("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, name))
	c.Header("Content-Length", strconv.FormatInt(size, 10))
	c.Header("Content-Type", "application/octet-stream")

	rc, err := h.vfs.ReadStream(c.Request.Context(), chunkHashes)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to initialize stream"})
		return
	}
	defer rc.Close()

	io.Copy(c.Writer, rc)
}

func (h *Handler) DeleteFile(c *gin.Context) {
	fileIDStr := c.Param("id")
	fileID, err := uuid.Parse(fileIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid file ID"})
		return
	}

	userIDStr := c.GetString("user_id")
	
	// Ensure the file belongs to the user
	var exists bool
	err = h.db.QueryRow(context.Background(),
		"SELECT EXISTS(SELECT 1 FROM files WHERE id = $1 AND user_id = $2)", fileID, userIDStr,
	).Scan(&exists)
	if err != nil || !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "File not found"})
		return
	}

	// Delete from storage (fire and forget for now, or could iterate chunks)
	rows, _ := h.db.Query(context.Background(), "SELECT storage_key FROM chunks WHERE file_id = $1", fileID)
	defer rows.Close()
	for rows.Next() {
		var key string
		if err := rows.Scan(&key); err == nil {
			_ = h.store.DeleteObject(context.Background(), "eon-chunks", key)
		}
	}

	// Delete from DB (cascade deletes chunks due to foreign key)
	_, err = h.db.Exec(context.Background(), "DELETE FROM chunks WHERE file_id = $1", fileID)
	_, err = h.db.Exec(context.Background(), "DELETE FROM files WHERE id = $1", fileID)
	
	c.JSON(http.StatusOK, gin.H{"message": "File deleted"})
}

func (h *Handler) DirectUploadFile(c *gin.Context) {
	userIDStr := c.GetString("user_id")
	userID, _ := uuid.Parse(userIDStr)

	name := c.PostForm("name")
	if name == "" {
		name = "uploaded_file"
	}
	
	folderIDStr := c.PostForm("folder_id")
	var folderID *uuid.UUID
	if folderIDStr != "" {
		parsed, err := uuid.Parse(folderIDStr)
		if err == nil {
			folderID = &parsed
		}
	}

	file, _, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File is required"})
		return
	}
	defer file.Close()

	// Use a transaction with an advisory lock to prevent concurrent duplicates
	tx, err := h.db.Begin(context.Background())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to start transaction"})
		return
	}
	defer tx.Rollback(context.Background())

	// Acquire a lock based on the file name to prevent race conditions
	_, err = tx.Exec(context.Background(), "SELECT pg_advisory_xact_lock(hashtext($1))", name)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to acquire lock"})
		return
	}

	// 0. Delete existing file with the same name to prevent duplicates
	var existingID uuid.UUID
	err = tx.QueryRow(context.Background(), 
		"SELECT id FROM files WHERE user_id = $1 AND folder_id IS NOT DISTINCT FROM $2 AND name = $3", 
		userID, folderID, name,
	).Scan(&existingID)
	if err == nil {
		tx.Exec(context.Background(), "DELETE FROM chunks WHERE file_id = $1", existingID)
		tx.Exec(context.Background(), "DELETE FROM files WHERE id = $1", existingID)
	}

	// 1. Create file record (UPLOADING state)
	var fileID uuid.UUID
	err = tx.QueryRow(context.Background(),
		"INSERT INTO files (user_id, folder_id, name, size, status) VALUES ($1, $2, $3, 0, 'UPLOADING') RETURNING id",
		userID, folderID, name,
	).Scan(&fileID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create file record"})
		return
	}

	err = tx.Commit(context.Background())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to commit transaction"})
		return
	}

	// 2. Stream through VFS engine
	chunkHashes, totalSize, err := h.vfs.SaveStream(c.Request.Context(), file)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process and chunk file"})
		return
	}

	// 3. Save chunks to DB
	for i, hash := range chunkHashes {
		_, err = h.db.Exec(context.Background(),
			`INSERT INTO chunks (file_id, chunk_index, size, hash, storage_key, status) 
			 VALUES ($1, $2, 0, $3, $4, 'COMMITTED')`,
			fileID, i, hash, hash,
		)
	}

	// 4. Mark file as READY and update total size
	_, err = h.db.Exec(context.Background(),
		"UPDATE files SET status = 'READY', size = $1, updated_at = NOW() WHERE id = $2", totalSize, fileID,
	)

	// Emit sync event
	h.db.Exec(context.Background(),
		"INSERT INTO sync_events (user_id, event_type, entity_id) VALUES ($1, 'FILE_CREATED', $2)",
		userIDStr, fileID,
	)

	c.JSON(http.StatusCreated, gin.H{
		"message": "File uploaded successfully via Direct Stream",
		"file_id": fileID,
		"size":    totalSize,
	})
}

type RenameFileRequest struct {
	Name string `json:"name" binding:"required"`
}

func (h *Handler) RenameFile(c *gin.Context) {
	fileIDStr := c.Param("id")
	fileID, err := uuid.Parse(fileIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid file ID"})
		return
	}

	userIDStr := c.GetString("user_id")
	userID, _ := uuid.Parse(userIDStr)

	var req RenameFileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	result, err := h.db.Exec(context.Background(),
		"UPDATE files SET name = $1 WHERE id = $2 AND user_id = $3",
		req.Name, fileID, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to rename file"})
		return
	}

	if result.RowsAffected() == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "File not found or unauthorized"})
		return
	}
    
    h.db.Exec(context.Background(),
		"INSERT INTO sync_events (user_id, event_type, entity_id) VALUES ($1, 'FILE_UPDATED', $2)",
		userIDStr, fileID,
	)

	c.JSON(http.StatusOK, gin.H{"message": "File renamed successfully"})
}
