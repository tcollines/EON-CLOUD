package auth

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
)

type Handler struct {
	db *pgxpool.Pool
}

func NewHandler(db *pgxpool.Pool) *Handler {
	return &Handler{db: db}
}

type RegisterRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=5"`
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
	Device   string `json:"device"`
	OSType   string `json:"os_type"`
}

func (h *Handler) Register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}

	var userID uuid.UUID
	err = h.db.QueryRow(
		context.Background(),
		"INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id",
		req.Email, string(hash),
	).Scan(&userID)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "User registered successfully", "user_id": userID})
}

func (h *Handler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var userID uuid.UUID
	var hash string
	err := h.db.QueryRow(
		context.Background(),
		"SELECT id, password_hash FROM users WHERE email = $1",
		req.Email,
	).Scan(&userID, &hash)

	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(req.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	// Register device if not exists
	var deviceID uuid.UUID
	err = h.db.QueryRow(
		context.Background(),
		`INSERT INTO devices (user_id, name, os_type, last_active) 
		 VALUES ($1, $2, $3, $4) RETURNING id`,
		userID, req.Device, req.OSType, time.Now(),
	).Scan(&deviceID)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to register device"})
		return
	}

	token, err := generateToken(userID.String(), deviceID.String())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token":     token,
		"user_id":   userID,
		"device_id": deviceID,
	})
}

type DeviceResponse struct {
	ID         string    `json:"id"`
	Name       string    `json:"name"`
	OSType     string    `json:"os_type"`
	LastActive time.Time `json:"last_active"`
}

func (h *Handler) GetDevices(c *gin.Context) {
	userIDStr, _ := c.Get("user_id")
	userID, _ := uuid.Parse(userIDStr.(string))

	rows, err := h.db.Query(
		context.Background(),
		"SELECT id, name, os_type, last_active FROM devices WHERE user_id = $1 ORDER BY last_active DESC",
		userID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch devices"})
		return
	}
	defer rows.Close()

	devices := []DeviceResponse{}
	for rows.Next() {
		var d DeviceResponse
		if err := rows.Scan(&d.ID, &d.Name, &d.OSType, &d.LastActive); err == nil {
			devices = append(devices, d)
		}
	}

	c.JSON(http.StatusOK, gin.H{"devices": devices})
}

func (h *Handler) CreateDevice(c *gin.Context) {
	userIDStr, _ := c.Get("user_id")
	userID, _ := uuid.Parse(userIDStr.(string))

	var req struct {
		Name   string `json:"name" binding:"required"`
		OSType string `json:"os_type" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var deviceID uuid.UUID
	err := h.db.QueryRow(
		context.Background(),
		`INSERT INTO devices (user_id, name, os_type, last_active) 
		 VALUES ($1, $2, $3, $4) RETURNING id`,
		userID, req.Name, req.OSType, time.Now(),
	).Scan(&deviceID)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to register device"})
		return
	}

	token, err := generateToken(userID.String(), deviceID.String())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"token":     token,
		"device": DeviceResponse{
			ID:         deviceID.String(),
			Name:       req.Name,
			OSType:     req.OSType,
			LastActive: time.Now(),
		},
	})
}
