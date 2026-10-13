import docx

def add_hashes_at_page_breaks(input_filename, output_filename):
    doc = docx.Document(input_filename)
    
    # Durchlaufe alle Absätze im Dokument
    for i, paragraph in enumerate(doc.paragraphs):
        # Überprüfe, ob der Absatz einen Seitenumbruch enthält (paragraph.paragraph_format.page_break_before)
        # Oder ob es einen Abschnittswechsel / Seitenumbruch in den Runs gibt
        has_break = paragraph.paragraph_format.page_break_before
        
        # Manchmal sind Seitenumbrüche in den Runs enthalten (z.B. als break-Element)
        for run in paragraph.runs:
            if '_element' in dir(run):
                # XML-Prüfung auf Seitenumbruch: w:br mit w:type="page"
                xml_text = run._element.xml
                if 'w:br' in xml_text and 'w:type="page"' in xml_text:
                    has_break = True
                    break
        
        # Überprüfe auch, ob es ein Abschnittswechsel ist (über die Sektionen des Dokuments)
        # In python-docx sind Abschnittswechsel in den Section-Eigenschaften oder in den w:sectPr der Absätze/Dokumentenden gespeichert.
        # Ein Abschnittswechsel "Nächste Seite" (section break next page) wird im w:pPr des letzten Absatzes eines Abschnitts gespeichert.
        pPr = paragraph._element.get_or_add_pPr()
        if pPr.xpath('./w:sectPr'):
            has_break = True

        if has_break:
            # Füge "###" am Anfang oder als neuen Absatz davor ein
            paragraph.insert_paragraph_before("###")

    doc.save(output_filename)
    print(f"Datei erfolgreich gespeichert unter: {output_filename}")

if __name__ == "__main__":
    add_hashes_at_page_breaks("Gauthier_Johannisnacht_Hintergründe_Jo.docx", "Gauthier_Johannisnacht_Hintergründe_J.docx")
