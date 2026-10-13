import os
import sys
from pdf2docx import Converter

pdf_file = 'Das_Geheimnis_der Johannisnacht.pdf'
docx_file = 'Das_Geheimnis_der Johannisnacht.docx'


def convert_pdf_to_docx(pdf_file, docx_file=None):
    """
    Konvertiert eine PDF-Datei (auch große Dateien) lokal in eine DOCX-Datei
    unter Verwendung der 'pdf2docx'-Bibliothek.
    
    :param pdf_file: Pfad zur Eingabe-PDF-Datei
    :param docx_file: Optionaler Pfad zur Ausgabe-DOCX-Datei
    """
    if not os.path.exists(pdf_file):
        print(f"Fehler: Die Datei '{pdf_file}' wurde nicht gefunden.")
        return

    if docx_file is None:
        # Korrigiert: Nur den Dateinamen ohne Endung verwenden
        base_name, _ = os.path.splitext(pdf_file)
        docx_file = f"{base_name}.docx"

    print(f"Starte Konvertierung von '{pdf_file}' nach '{docx_file}'...")
    print("Dies kann bei sehr großen PDF-Dateien einige Augenblicke dauern...")

    try:
        # Converter initialisieren
        cv = Converter(pdf_file)
        
        # Gesamte PDF konvertieren (mit Standardeinstellungen für Layout-Erkennung)
        cv.convert(docx_file, start=0, end=None)
        
        # Converter schließen, um Ressourcen freizugeben
        cv.close()
        
        print(f"Erfolgreich konvertiert! Gespeichert als: '{docx_file}'")
    except Exception as e:
        print(f"Ein Fehler ist während der Konvertierung aufgetreten: {e}")

if __name__ == "__main__":
    print("=== PDF zu DOCX Lokaler Konverter (mit pdf2docx) ===")
    print("Voraussetzung: pip install pdf2docx")
    print("-" * 50)
    
    # Direktes Ausführen mit den definierten Variablen
    convert_pdf_to_docx(pdf_file, docx_file)