package api

import (
	"github.com/eon/backend/internal/auth"
	"github.com/eon/backend/internal/metadata"
	"github.com/eon/backend/internal/storage"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

func SetupRouter(db *pgxpool.Pool, store storage.Storage) *gin.Engine {
	r := gin.Default()

	// CORS middleware
	r.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With, X-Chunk-Hash")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	})

	// Initialize VFS Engine
	vfs := storage.NewEonVFSEngine(store, "eon-chunks")

	v1 := r.Group("/api/v1")
	{
		authHandler := auth.NewHandler(db)
		authGroup := v1.Group("/auth")
		{
			authGroup.POST("/register", authHandler.Register)
			authGroup.POST("/login", authHandler.Login)
		}

		metaHandler := metadata.NewHandler(db, store, vfs)
		metaGroup := v1.Group("/files")
		metaGroup.Use(auth.Middleware())
		{
			metaGroup.GET("", metaHandler.ListFiles)
			metaGroup.POST("", metaHandler.CreateFileSession)
			metaGroup.POST("/direct-upload", metaHandler.DirectUploadFile)
			metaGroup.GET("/:id", metaHandler.GetFile)
			metaGroup.GET("/:id/download", metaHandler.DownloadFile)
			metaGroup.PUT("/:id/rename", metaHandler.RenameFile)
			metaGroup.DELETE("/:id", metaHandler.DeleteFile)
		}

		uploadGroup := v1.Group("/uploads")
		uploadGroup.Use(auth.Middleware())
		{
			uploadGroup.POST("/:session_id/chunks/:index", metaHandler.UploadChunk)
			uploadGroup.POST("/:session_id/commit", metaHandler.CommitSession)
		}

		devicesGroup := v1.Group("/devices")
		devicesGroup.Use(auth.Middleware())
		{
			devicesGroup.GET("", authHandler.GetDevices)
			devicesGroup.POST("", authHandler.CreateDevice)
		}
	}

	return r
}
