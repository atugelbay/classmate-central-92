package services

import (
	"bytes"
	"fmt"
	"log"
	"os"
	"sync"

	"github.com/jung-kurt/gofpdf/v2"
)

var (
	cyrillicFontAdded bool
	foundFontRegular  string
	foundFontBold     string
	fontSearchOnce    sync.Once
)

// findCyrillicFonts searches for available Cyrillic fonts once at startup
func findCyrillicFonts() {
	fontSearchOnce.Do(func() {
		// Try different font paths
		fontPaths := []struct {
			regular string
			bold    string
		}{
			// Local project fonts
			{"fonts/DejaVuSans.ttf", "fonts/DejaVuSans-Bold.ttf"},
			{"./fonts/DejaVuSans.ttf", "./fonts/DejaVuSans-Bold.ttf"},
			// Alpine Linux (Docker) - various possible paths
			{"/usr/share/fonts/ttf-dejavu/DejaVuSans.ttf", "/usr/share/fonts/ttf-dejavu/DejaVuSans-Bold.ttf"},
			{"/usr/share/fonts/dejavu/DejaVuSans.ttf", "/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf"},
			{"/usr/share/fonts/DejaVuSans.ttf", "/usr/share/fonts/DejaVuSans-Bold.ttf"},
			// Debian/Ubuntu
			{"/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"},
			// Windows
			{"C:/Windows/Fonts/arial.ttf", "C:/Windows/Fonts/arialbd.ttf"},
		}

		log.Println("[PDF] Searching for Cyrillic fonts...")

		// Debug: list available fonts directories
		fontDirs := []string{"/usr/share/fonts", "/usr/share/fonts/ttf-dejavu", "/usr/share/fonts/dejavu", "/usr/share/fonts/truetype"}
		for _, dir := range fontDirs {
			if entries, err := os.ReadDir(dir); err == nil {
				log.Printf("[PDF] Found fonts directory: %s", dir)
				for _, e := range entries {
					log.Printf("[PDF]   - %s", e.Name())
				}
			}
		}

		for _, paths := range fontPaths {
			// Check if regular font file exists
			if info, err := os.Stat(paths.regular); err != nil {
				log.Printf("[PDF] Font not found: %s", paths.regular)
				continue
			} else {
				log.Printf("[PDF] Font file found: %s (size: %d bytes)", paths.regular, info.Size())
				foundFontRegular = paths.regular

				// Check for bold variant
				if _, err := os.Stat(paths.bold); err == nil {
					foundFontBold = paths.bold
					log.Printf("[PDF] Bold font found: %s", paths.bold)
				}
				return
			}
		}

		log.Println("[PDF] WARNING: No Cyrillic fonts found!")
	})
}

// SetupCyrillicFonts attempts to add UTF-8 fonts for Cyrillic support
func SetupCyrillicFonts(pdf *gofpdf.Fpdf) {
	cyrillicFontAdded = false
	
	// Find fonts (cached after first call)
	findCyrillicFonts()

	if foundFontRegular == "" {
		log.Println("[PDF] No Cyrillic font available, using fallback")
		return
	}

	// Add regular font
	log.Printf("[PDF] Adding regular font: %s", foundFontRegular)
	pdf.AddUTF8Font("DejaVu", "", foundFontRegular)
	
	if err := pdf.Error(); err != nil {
		log.Printf("[PDF] ERROR adding regular font: %v", err)
		return
	}
	
	log.Println("[PDF] Regular font added successfully")

	// Add bold font if available
	if foundFontBold != "" {
		log.Printf("[PDF] Adding bold font: %s", foundFontBold)
		pdf.AddUTF8Font("DejaVu", "B", foundFontBold)
		if err := pdf.Error(); err != nil {
			log.Printf("[PDF] Warning: bold font failed: %v", err)
			// Don't return, regular font is enough
		} else {
			log.Println("[PDF] Bold font added successfully")
		}
	}

	cyrillicFontAdded = true
	log.Println("[PDF] Cyrillic font setup complete!")
}

// GetCyrillicFontName returns the font name to use for Cyrillic text
// Returns "DejaVu" if UTF-8 fonts were successfully added, otherwise "Helvetica"
func GetCyrillicFontName(pdf *gofpdf.Fpdf) string {
	if cyrillicFontAdded {
		return "DejaVu"
	}
	return "Helvetica" // Fallback, but won't display Cyrillic correctly
}

// SetFontSafe safely sets a font with fallback to Helvetica if the font is not available
func SetFontSafe(pdf *gofpdf.Fpdf, fontName, style string, size float64) {
	defer func() {
		if r := recover(); r != nil {
			// Fallback to Helvetica if font setting fails
			pdf.SetFont("Helvetica", style, size)
		}
	}()
	pdf.SetFont(fontName, style, size)
}

// OutputPDFSafe safely outputs PDF to buffer with panic recovery
func OutputPDFSafe(pdf *gofpdf.Fpdf, buf *bytes.Buffer) error {
	var err error
	func() {
		defer func() {
			if r := recover(); r != nil {
				err = fmt.Errorf("PDF generation panic: %v", r)
			}
		}()
		err = pdf.Output(buf)
	}()
	return err
}
