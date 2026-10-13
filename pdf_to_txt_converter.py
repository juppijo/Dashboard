import pymupdf  # Ersetzt das alte 'import fitz'

pdf_file = 'Das_Geheimnis_der Johannisnacht.pdf'
txt_output = 'Das_Geheimnis_der Johannisnacht.txt'

doc = pymupdf.open(pdf_file)
full_text = []

for page_num in range(len(doc)):
    page = doc[page_num]
    text = page.get_text()
    full_text.append(text)
    # Füge nach jeder Seite (außer der letzten) ### ein
    full_text.append("\n\n###\n\n")

with open(txt_output, "w", encoding="utf-8") as f:
    f.write("".join(full_text))

print(f"Seitenweise extrahiert und gespeichert in: {txt_output}")