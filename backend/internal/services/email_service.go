package services

import (
	"crypto/tls"
	"fmt"
	"net"
	"net/smtp"
	"os"
	"strconv"
	"time"

	"classmate-central/internal/logger"

	"go.uber.org/zap"
)

type EmailService struct {
	smtpHost     string
	smtpPort     string
	smtpUser     string
	smtpPassword string
	fromEmail    string
	enabled      bool
}

func NewEmailService() *EmailService {
	service := &EmailService{
		smtpHost:     os.Getenv("SMTP_HOST"),
		smtpPort:     os.Getenv("SMTP_PORT"),
		smtpUser:     os.Getenv("SMTP_USER"),
		smtpPassword: os.Getenv("SMTP_PASSWORD"),
		fromEmail:    os.Getenv("SMTP_FROM_EMAIL"),
	}

	// Check if SMTP is fully configured
	service.enabled = service.smtpHost != "" && service.smtpPort != "" &&
		service.smtpUser != "" && service.smtpPassword != "" && service.fromEmail != ""

	if !service.enabled {
		logger.Warn("SMTP is not configured. Email notifications will be logged to console only.",
			zap.String("smtpHost", service.smtpHost),
			zap.String("smtpPort", service.smtpPort),
		)
		logger.Info("To enable email notifications, set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, and SMTP_FROM_EMAIL environment variables")
	} else {
		logger.Info("Email service initialized",
			zap.String("smtpHost", service.smtpHost),
			zap.String("smtpPort", service.smtpPort),
			zap.String("fromEmail", service.fromEmail),
		)
	}

	return service
}

// SendVerificationCode sends a verification code via email
func (s *EmailService) SendVerificationCode(toEmail, code string) error {
	// If SMTP is not configured, just log the token (for dev/test)
	if !s.enabled {
		logger.Info("SMTP not configured - verification code logged to console",
			zap.String("email", toEmail),
			zap.String("code", code),
		)
		fmt.Printf("⚠️  SMTP not configured. Verification code for %s: %s\n", toEmail, code)
		return nil
	}

	subject := "Код подтверждения - SmartCRM"
	body := fmt.Sprintf(`
		<h1>Добро пожаловать в SmartCRM!</h1>
		<p>Ваш код подтверждения:</p>
		<h2 style="letter-spacing: 5px; font-family: monospace;">%s</h2>
		<p>Введите этот код на странице входа для завершения регистрации.</p>
	`, code)

	msg := "From: " + s.fromEmail + "\n" +
		"To: " + toEmail + "\n" +
		"Subject: " + subject + "\n" +
		"MIME-Version: 1.0\n" +
		"Content-Type: text/html; charset=UTF-8\n\n" +
		body

	auth := smtp.PlainAuth("", s.smtpUser, s.smtpPassword, s.smtpHost)

	err := s.sendEmailWithTLS(toEmail, msg, auth)
	if err != nil {
		logger.Error("Failed to send verification email",
			logger.ErrorField(err),
			zap.String("to", toEmail),
			zap.String("smtpHost", s.smtpHost),
			zap.String("smtpPort", s.smtpPort),
		)
		return fmt.Errorf("failed to send verification email: %w", err)
	}

	logger.Info("Verification email sent successfully", zap.String("to", toEmail))
	return nil
}

// SendInviteEmail sends an invite link to the user
func (s *EmailService) SendInviteEmail(toEmail, code string) error {
	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		frontendURL = "http://localhost:8081"
	}
	inviteLink := fmt.Sprintf("%s/invite?email=%s&code=%s", frontendURL, toEmail, code)

	// If SMTP is not configured, log to console
	if !s.enabled {
		logger.Info("SMTP not configured - invite link logged to console",
			zap.String("email", toEmail),
			zap.String("link", inviteLink),
			zap.String("code", code),
		)
		fmt.Printf("⚠️  SMTP not configured. Invite link for %s: %s (code: %s)\n", toEmail, inviteLink, code)
		return nil
	}

	subject := "Приглашение в SmartCRM"
	body := fmt.Sprintf(`
		<h1>Вас пригласили в SmartCRM</h1>
		<p>Для завершения регистрации перейдите по ссылке и установите пароль:</p>
		<p><a href="%s">%s</a></p>
		<p>Если ссылка не открывается, используйте код: <strong>%s</strong></p>
	`, inviteLink, inviteLink, code)

	msg := "From: " + s.fromEmail + "\n" +
		"To: " + toEmail + "\n" +
		"Subject: " + subject + "\n" +
		"MIME-Version: 1.0\n" +
		"Content-Type: text/html; charset=UTF-8\n\n" +
		body

	auth := smtp.PlainAuth("", s.smtpUser, s.smtpPassword, s.smtpHost)

	err := s.sendEmailWithTLS(toEmail, msg, auth)
	if err != nil {
		logger.Error("Failed to send invite email",
			logger.ErrorField(err),
			zap.String("to", toEmail),
		)
		return fmt.Errorf("failed to send invite email: %w", err)
	}

	logger.Info("Invite email sent successfully", zap.String("to", toEmail))
	return nil
}

// SendPaymentNotification sends a payment notification email
func (s *EmailService) SendPaymentNotification(toEmail, studentName string, amount float64, paymentType, paymentMethod, description string) error {
	// If SMTP is not configured, just log (for dev/test)
	if !s.enabled {
		logger.Info("SMTP not configured - payment notification logged to console",
			zap.String("email", toEmail),
			zap.String("student", studentName),
			zap.Float64("amount", amount),
			zap.String("type", paymentType),
		)
		fmt.Printf("⚠️  SMTP not configured. Payment notification for %s: %.2f ₸ (%s)\n", toEmail, amount, paymentType)
		return nil
	}

	var subject string
	var body string

	if paymentType == "payment" {
		subject = "Получен платеж - SmartCRM"
		body = fmt.Sprintf(`
			<h1>Уважаемый(ая) %s!</h1>
			<p>Мы получили ваш платеж:</p>
			<ul>
				<li><strong>Сумма:</strong> %.2f ₸</li>
				<li><strong>Способ оплаты:</strong> %s</li>
				%s
			</ul>
			<p>Спасибо за оплату!</p>
			<p>С уважением,<br>SmartCRM</p>
		`, studentName, amount, s.translatePaymentMethod(paymentMethod), s.formatDescription(description))
	} else if paymentType == "refund" {
		subject = "Возврат средств - SmartCRM"
		body = fmt.Sprintf(`
			<h1>Уважаемый(ая) %s!</h1>
			<p>Был произведен возврат средств:</p>
			<ul>
				<li><strong>Сумма возврата:</strong> %.2f ₸</li>
				<li><strong>Способ:</strong> %s</li>
				%s
			</ul>
			<p>С уважением,<br>SmartCRM</p>
		`, studentName, amount, s.translatePaymentMethod(paymentMethod), s.formatDescription(description))
	} else {
		// Other types (debt, deduction) - don't send email
		return nil
	}

	msg := "From: " + s.fromEmail + "\n" +
		"To: " + toEmail + "\n" +
		"Subject: " + subject + "\n" +
		"MIME-Version: 1.0\n" +
		"Content-Type: text/html; charset=UTF-8\n\n" +
		body

	auth := smtp.PlainAuth("", s.smtpUser, s.smtpPassword, s.smtpHost)

	err := s.sendEmailWithTLS(toEmail, msg, auth)
	if err != nil {
		logger.Error("Failed to send payment notification",
			logger.ErrorField(err),
			zap.String("to", toEmail),
			zap.String("type", paymentType),
		)
		return fmt.Errorf("failed to send payment notification: %w", err)
	}

	logger.Info("Payment notification sent successfully", zap.String("to", toEmail), zap.String("type", paymentType))
	return nil
}

// SendAbsenceNotification sends an absence notification email
func (s *EmailService) SendAbsenceNotification(toEmail, studentName, lessonSubject, reason, notes string, lessonDate time.Time) error {
	// If SMTP is not configured, just log (for dev/test)
	if !s.enabled {
		logger.Info("SMTP not configured - absence notification logged to console",
			zap.String("email", toEmail),
			zap.String("student", studentName),
			zap.String("subject", lessonSubject),
			zap.String("date", lessonDate.Format("02.01.2006")),
		)
		fmt.Printf("⚠️  SMTP not configured. Absence notification for %s: %s on %s\n", toEmail, lessonSubject, lessonDate.Format("02.01.2006"))
		return nil
	}

	subject := "Пропуск занятия - SmartCRM"
	reasonText := "Не указана"
	if reason != "" {
		reasonText = s.translateAbsenceReason(reason)
	}

	body := fmt.Sprintf(`
		<h1>Уважаемый(ая) %s!</h1>
		<p>Вы пропустили занятие:</p>
		<ul>
			<li><strong>Предмет:</strong> %s</li>
			<li><strong>Дата:</strong> %s</li>
			<li><strong>Причина:</strong> %s</li>
			%s
		</ul>
		<p>Пожалуйста, свяжитесь с нами, если у вас есть вопросы.</p>
		<p>С уважением,<br>SmartCRM</p>
	`, studentName, lessonSubject, lessonDate.Format("02.01.2006 15:04"), reasonText, s.formatDescription(notes))

	msg := "From: " + s.fromEmail + "\n" +
		"To: " + toEmail + "\n" +
		"Subject: " + subject + "\n" +
		"MIME-Version: 1.0\n" +
		"Content-Type: text/html; charset=UTF-8\n\n" +
		body

	auth := smtp.PlainAuth("", s.smtpUser, s.smtpPassword, s.smtpHost)

	err := s.sendEmailWithTLS(toEmail, msg, auth)
	if err != nil {
		logger.Error("Failed to send absence notification",
			logger.ErrorField(err),
			zap.String("to", toEmail),
			zap.String("student", studentName),
		)
		return fmt.Errorf("failed to send absence notification: %w", err)
	}

	logger.Info("Absence notification sent successfully", zap.String("to", toEmail), zap.String("student", studentName))
	return nil
}

// sendEmailWithTLS sends an email using TLS/STARTTLS or SSL connection
// This is required for Gmail and most modern SMTP servers
func (s *EmailService) sendEmailWithTLS(toEmail, msg string, auth smtp.Auth) error {
	port, err := strconv.Atoi(s.smtpPort)
	if err != nil {
		return fmt.Errorf("invalid SMTP port: %w", err)
	}

	// Port 465 requires SSL from the start
	if port == 465 {
		return s.sendEmailWithSSL(toEmail, msg, auth)
	}

	// Port 587 uses STARTTLS
	// Use DialTimeout to avoid hanging connections
	dialer := &net.Dialer{
		Timeout: 30 * time.Second,
	}

	conn, err := dialer.Dial("tcp", fmt.Sprintf("%s:%d", s.smtpHost, port))
	if err != nil {
		return fmt.Errorf("failed to connect to SMTP server: %w", err)
	}
	defer conn.Close()

	// Create SMTP client
	client, err := smtp.NewClient(conn, s.smtpHost)
	if err != nil {
		return fmt.Errorf("failed to create SMTP client: %w", err)
	}
	defer client.Close()

	// Check if server supports STARTTLS
	if ok, _ := client.Extension("STARTTLS"); ok {
		// Configure TLS
		tlsConfig := &tls.Config{
			ServerName:         s.smtpHost,
			InsecureSkipVerify: false,
		}

		if err = client.StartTLS(tlsConfig); err != nil {
			return fmt.Errorf("failed to start TLS: %w", err)
		}
	}

	// Authenticate
	if auth != nil {
		if err = client.Auth(auth); err != nil {
			return fmt.Errorf("authentication failed: %w", err)
		}
	}

	// Set sender
	if err = client.Mail(s.fromEmail); err != nil {
		return fmt.Errorf("failed to set sender: %w", err)
	}

	// Set recipient
	if err = client.Rcpt(toEmail); err != nil {
		return fmt.Errorf("failed to set recipient: %w", err)
	}

	// Send email body
	writer, err := client.Data()
	if err != nil {
		return fmt.Errorf("failed to get data writer: %w", err)
	}

	_, err = writer.Write([]byte(msg))
	if err != nil {
		writer.Close()
		return fmt.Errorf("failed to write email body: %w", err)
	}

	err = writer.Close()
	if err != nil {
		return fmt.Errorf("failed to close data writer: %w", err)
	}

	// Quit
	err = client.Quit()
	if err != nil {
		return fmt.Errorf("failed to quit SMTP client: %w", err)
	}

	return nil
}

// sendEmailWithSSL sends an email using SSL connection (port 465)
func (s *EmailService) sendEmailWithSSL(toEmail, msg string, auth smtp.Auth) error {
	port, err := strconv.Atoi(s.smtpPort)
	if err != nil {
		return fmt.Errorf("invalid SMTP port: %w", err)
	}

	// Use DialTimeout to avoid hanging connections
	dialer := &net.Dialer{
		Timeout: 30 * time.Second,
	}

	// Connect with SSL from the start
	conn, err := tls.DialWithDialer(dialer, "tcp", fmt.Sprintf("%s:%d", s.smtpHost, port), &tls.Config{
		ServerName:         s.smtpHost,
		InsecureSkipVerify: false,
	})
	if err != nil {
		return fmt.Errorf("failed to connect to SMTP server with SSL: %w", err)
	}
	defer conn.Close()

	// Create SMTP client
	client, err := smtp.NewClient(conn, s.smtpHost)
	if err != nil {
		return fmt.Errorf("failed to create SMTP client: %w", err)
	}
	defer client.Close()

	// Authenticate
	if auth != nil {
		if err = client.Auth(auth); err != nil {
			return fmt.Errorf("authentication failed: %w", err)
		}
	}

	// Set sender
	if err = client.Mail(s.fromEmail); err != nil {
		return fmt.Errorf("failed to set sender: %w", err)
	}

	// Set recipient
	if err = client.Rcpt(toEmail); err != nil {
		return fmt.Errorf("failed to set recipient: %w", err)
	}

	// Send email body
	writer, err := client.Data()
	if err != nil {
		return fmt.Errorf("failed to get data writer: %w", err)
	}

	_, err = writer.Write([]byte(msg))
	if err != nil {
		writer.Close()
		return fmt.Errorf("failed to write email body: %w", err)
	}

	err = writer.Close()
	if err != nil {
		return fmt.Errorf("failed to close data writer: %w", err)
	}

	// Quit
	err = client.Quit()
	if err != nil {
		return fmt.Errorf("failed to quit SMTP client: %w", err)
	}

	return nil
}

// Helper functions for translations
func (s *EmailService) translatePaymentMethod(method string) string {
	translations := map[string]string{
		"cash":     "Наличные",
		"card":     "Банковская карта",
		"transfer": "Банковский перевод",
		"other":    "Другое",
	}
	if translated, ok := translations[method]; ok {
		return translated
	}
	return method
}

func (s *EmailService) translateAbsenceReason(reason string) string {
	translations := map[string]string{
		"excused":   "Уважительная причина",
		"unexcused": "Неуважительная причина",
		"sick":      "Болезнь",
		"other":     "Другое",
	}
	if translated, ok := translations[reason]; ok {
		return translated
	}
	return reason
}

func (s *EmailService) formatDescription(desc string) string {
	if desc == "" {
		return ""
	}
	return fmt.Sprintf(`<li><strong>Описание:</strong> %s</li>`, desc)
}
