package middleware

import (
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"

	"classmate-central/internal/logger"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"go.uber.org/zap"
)

type Claims struct {
	UserID         int      `json:"user_id"`
	Email          string   `json:"email"`
	RoleID         *string  `json:"role_id,omitempty"`
	Permissions    []string `json:"permissions,omitempty"`
	CurrentBranchID *string  `json:"current_branch_id,omitempty"`
	Branches       []string `json:"branches,omitempty"` // List of accessible branch IDs
	jwt.RegisteredClaims
}

func GenerateToken(userID int, email string, roleID *string, permissions []string, currentBranchID *string, branches []string) (string, error) {
	expirationTime := time.Now().Add(24 * time.Hour)
	claims := &Claims{
		UserID:         userID,
		Email:          email,
		RoleID:         roleID,
		Permissions:    permissions,
		CurrentBranchID: currentBranchID,
		Branches:       branches,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	jwtSecret := os.Getenv("JWT_SECRET")
	return token.SignedString([]byte(jwtSecret))
}

func GenerateRefreshToken(userID int, email string, roleID *string, permissions []string, currentBranchID *string, branches []string) (string, error) {
	expirationTime := time.Now().Add(7 * 24 * time.Hour)
	claims := &Claims{
		UserID:         userID,
		Email:          email,
		RoleID:         roleID,
		Permissions:    permissions,
		CurrentBranchID: currentBranchID,
		Branches:       branches,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	jwtSecret := os.Getenv("JWT_SECRET")
	return token.SignedString([]byte(jwtSecret))
}

func ValidateToken(tokenString string) (*Claims, error) {
	jwtSecret := os.Getenv("JWT_SECRET")

	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(jwtSecret), nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*Claims); ok && token.Valid {
		return claims, nil
	}

	return nil, fmt.Errorf("invalid token")
}

func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header required"})
			c.Abort()
			return
		}

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		if tokenString == authHeader {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid authorization format"})
			c.Abort()
			return
		}

		claims, err := ValidateToken(tokenString)
		if err != nil {
			tokenPrefix := tokenString
			if len(tokenString) > 20 {
				tokenPrefix = tokenString[:20]
			}
			logger.Error("Token validation failed", logger.ErrorField(err), zap.String("tokenPrefix", tokenPrefix))
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired token"})
			c.Abort()
			return
		}

	c.Set("user_id", claims.UserID)
	c.Set("user_email", claims.Email)
	if claims.RoleID != nil {
		c.Set("role_id", *claims.RoleID)
	}
	c.Set("permissions", claims.Permissions)
	if claims.CurrentBranchID != nil {
		c.Set("current_branch_id", *claims.CurrentBranchID)
	}
	c.Set("branches", claims.Branches)
	c.Next()
	}
}
