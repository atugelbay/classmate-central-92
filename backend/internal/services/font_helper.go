package services

import (
	"bytes"
	"fmt"
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
		{"fonts/DejaVuSans.ttf", "fonts/DejaVuSans-Bold.ttf"},
		{"./fonts/DejaVuSans.ttf", "./fonts/DejaVuSans-Bold.ttf"},
		{"/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"},
		{"C:/Windows/Fonts/arial.ttf", "C:/Windows/Fonts/arialbd.ttf"},
	}

	for _, paths := range fontPaths {
		// Check if regular font file exists before trying to add it
		if _, err := os.Stat(paths.regular); os.IsNotExist(err) {
			continue // File doesn't exist, try next path
		}

		// File exists, try to add it
		func() {
			defer func() {
				if r := recover(); r != nil {
					// Font file exists but couldn't be loaded, try next
				}
			}()

			// Try to add regular font
			pdf.AddUTF8Font("DejaVu", "", paths.regular)

			// Try to add bold font (may fail, but that's ok)
			if _, err := os.Stat(paths.bold); err == nil {
				func() {
					defer func() {
						// Ignore errors for bold font
						_ = recover()
					}()
					pdf.AddUTF8Font("DejaVu", "B", paths.bold)
				}()
			}

			// If we get here, font was added successfully
			cyrillicFontAdded = true
		}()

		if cyrillicFontAdded {
			return
		}
	}

	// Fallback: use standard fonts (will not display Cyrillic correctly)
	// This is a limitation - for proper Cyrillic support, font files are required
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
