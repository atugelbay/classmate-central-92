package services

import (
	"fmt"
	"net/smtp"
	"os"
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
	err := smtp.SendMail(s.smtpHost+":"+s.smtpPort, auth, s.fromEmail, []string{toEmail}, []byte(msg))
	if err != nil {
		return err
	}

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
	err := smtp.SendMail(s.smtpHost+":"+s.smtpPort, auth, s.fromEmail, []string{toEmail}, []byte(msg))
	if err != nil {
		return err
	}

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
	err := smtp.SendMail(s.smtpHost+":"+s.smtpPort, auth, s.fromEmail, []string{toEmail}, []byte(msg))
	if err != nil {
		return err
	}

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
	err := smtp.SendMail(s.smtpHost+":"+s.smtpPort, auth, s.fromEmail, []string{toEmail}, []byte(msg))
	if err != nil {
		return err
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
