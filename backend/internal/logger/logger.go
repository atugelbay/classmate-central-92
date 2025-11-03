package logger

import (
	"os"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

var Logger *zap.Logger

// Init initializes the logger based on environment
func Init(env string) error {
	var config zap.Config

	if env == "production" || env == "prod" {
		config = zap.NewProductionConfig()
		config.EncoderConfig.TimeKey = "timestamp"
		config.EncoderConfig.EncodeTime = zapcore.ISO8601TimeEncoder
	} else {
		config = zap.NewDevelopmentConfig()
		config.EncoderConfig.EncodeLevel = zapcore.CapitalColorLevelEncoder
	}

	config.OutputPaths = []string{"stdout"}
	config.ErrorOutputPaths = []string{"stderr"}

	var err error
	Logger, err = config.Build()
	if err != nil {
		return err
	}

	// Set as global logger
	zap.ReplaceGlobals(Logger)

	return nil
}

// GetLogger returns the logger instance
func GetLogger() *zap.Logger {
	if Logger == nil {
		// Fallback to development logger if not initialized
		env := os.Getenv("ENV")
		if env == "" {
			env = "development"
		}
		if err := Init(env); err != nil {
			// If initialization fails, use a basic logger
			Logger, _ = zap.NewDevelopment()
		}
	}
	return Logger
}

// Info logs an info message
func Info(msg string, fields ...zap.Field) {
	GetLogger().Info(msg, fields...)
}

// Error logs an error message
func Error(msg string, fields ...zap.Field) {
	GetLogger().Error(msg, fields...)
}

// Warn logs a warning message
func Warn(msg string, fields ...zap.Field) {
	GetLogger().Warn(msg, fields...)
}

// Debug logs a debug message
func Debug(msg string, fields ...zap.Field) {
	GetLogger().Debug(msg, fields...)
}

// Fatal logs a fatal message and exits
func Fatal(msg string, fields ...zap.Field) {
	GetLogger().Fatal(msg, fields...)
}

// Helper functions for common log fields
func String(key, value string) zap.Field {
	return zap.String(key, value)
}

func Int(key string, value int) zap.Field {
	return zap.Int(key, value)
}

func ErrorField(err error) zap.Field {
	return zap.Error(err)
}

func Any(key string, value interface{}) zap.Field {
	return zap.Any(key, value)
}
