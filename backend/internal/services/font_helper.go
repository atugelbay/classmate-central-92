package services

import (
	"bytes"
	"fmt"
	"log"
	"os"

	"github.com/jung-kurt/gofpdf/v2"
)

var cyrillicFontAdded bool

// SetupCyrillicFonts attempts to add UTF-8 fonts for Cyrillic support
// If font files are available in the fonts directory, they will be loaded
// Otherwise, falls back to standard fonts (which may not display Cyrillic correctly)
func SetupCyrillicFonts(pdf *gofpdf.Fpdf) {
	cyrillicFontAdded = false

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
		// Check if regular font file exists before trying to add it
		if _, err := os.Stat(paths.regular); os.IsNotExist(err) {
			log.Printf("[PDF] Font not found: %s", paths.regular)
			continue // File doesn't exist, try next path
		}

		log.Printf("[PDF] Font file found: %s", paths.regular)

		// File exists, try to add it
		func() {
			defer func() {
				if r := recover(); r != nil {
					log.Printf("[PDF] Failed to load font %s: %v", paths.regular, r)
				}
			}()

			// Try to add regular font
			pdf.AddUTF8Font("DejaVu", "", paths.regular)
			log.Printf("[PDF] Successfully added regular font: %s", paths.regular)

			// Try to add bold font (may fail, but that's ok)
			if _, err := os.Stat(paths.bold); err == nil {
				func() {
					defer func() {
						// Ignore errors for bold font
						if r := recover(); r != nil {
							log.Printf("[PDF] Failed to load bold font: %v", r)
						}
					}()
					pdf.AddUTF8Font("DejaVu", "B", paths.bold)
					log.Printf("[PDF] Successfully added bold font: %s", paths.bold)
				}()
			}

			// If we get here, font was added successfully
			cyrillicFontAdded = true
		}()

		if cyrillicFontAdded {
			log.Println("[PDF] Cyrillic font setup complete!")
			return
		}
	}

	// Fallback: use standard fonts (will not display Cyrillic correctly)
	log.Println("[PDF] WARNING: No Cyrillic fonts found! PDF will not display Cyrillic correctly.")
	log.Println("[PDF] Please install ttf-dejavu package or add DejaVuSans.ttf to fonts/ directory")
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
