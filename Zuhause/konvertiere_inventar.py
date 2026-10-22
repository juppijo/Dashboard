from datetime import datetime
import json


def konvertiere_daten():
  # 1. Quelldatei (Daten.json) einlesen
  try:
    with open("Daten.json", "r", encoding="utf-8") as f:
      alte_daten = json.load(f)
  except FileNotFoundError:
    print(
        "Fehler: Die Datei 'Daten.json' wurde nicht gefunden. Bitte stelle sicher,"
        " dass sie im selben Verzeichnis liegt."
    )
    return

  elektronikteile = []
  kategorien_set = set()
  raeume_orte_set = set()

  # 2. Datensätze transformieren
  for item in alte_daten:
    # ID formatieren (z. B. 1 -> "E-001")
    item_id = f"E-{item.get('id', 0):03d}"

    # Bezeichnung
    bezeichnung = item.get("name", "")

    # Kategorie
    kategorie = item.get("cat", "Sonstiges")
    if kategorie:
      kategorien_set.add(kategorie)

    # Raum, Ort, Kiste/Fach
    raum = item.get("room", "")
    ort = item.get("place", "")
    kiste_fach = item.get("box", "")

    if raum or ort or kiste_fach:
      raeume_orte_set.add((raum, ort, kiste_fach))

    # Anzahl
    anzahl = item.get("qty", 1)

    # Anmerkungen aus verschiedenen Feldern zusammenstellen
    notizen = []
    if item.get("full"):
      notizen.append(item.get("full"))
    if item.get("seller"):
      notizen.append(f"Verkäufer: {item.get('seller')}")
    if item.get("date"):
      notizen.append(f"Kaufdatum: {item.get('date')}")
    if item.get("note"):
      notizen.append(item.get("note"))

    anmerkungen = " | ".join(notizen)

    # Element zur Liste hinzufügen
    elektronikteile.append({
        "id": item_id,
        "bezeichnung": bezeichnung,
        "kategorie": kategorie,
        "raum": raum,
        "ort": ort,
        "kiste_fach": kiste_fach,
        "anzahl": anzahl,
        "anmerkungen": anmerkungen,
    })

  # 3. Kategorien dynamisch generieren (mit Farbpalette)
  farb_palette = [
      "#ef4444",
      "#f59e0b",
      "#10b981",
      "#06b6d4",
      "#3b82f6",
      "#8b5cf6",
      "#ec4899",
      "#64748b",
      "#84cc16",
  ]
  kategorien = []
  for i, kat in enumerate(sorted(kategorien_set)):
    kategorien.append({
        "kategorie": kat,
        "farb_code": farb_palette[i % len(farb_palette)],
        "beschreibung": f"Bauteile und Module der Kategorie {kat}",
    })

  # 4. Räume und Orte dynamisch generieren
  raeume_orte = []
  for raum, ort, kiste in sorted(raeume_orte_set):
    raeume_orte.append({
        "raum": raum if raum else "Nicht zugewiesen",
        "ort": ort if ort else "Standard",
        "kisten_faecher": kiste if kiste else "-",
        "beschreibung": f"Lagerort: {ort} ({raum})",
    })

  # 5. Zielstruktur zusammenbauen
  neues_inventar = {
      "metadata": {
          "title": "Krims & Kram Inventar",
          "version": "2.0",
          "exported_at": datetime.now().strftime("%Y-%m-%d"),
          "source_file": "Daten.json",
      },
      "elektronikteile": elektronikteile,
      "raeume_orte": raeume_orte,
      "kategorien": kategorien,
  }

  # 6. In neue Datei speichern
  output_filename = "inventar_daten.json"
  with open(output_filename, "w", encoding="utf-8") as f:
    json.dump(neues_inventar, f, ensure_ascii=False, indent=2)

  print(
      f"Konvertierung erfolgreich! Die Datei '{output_filename}' wurde"
      " erstellt."
  )


if __name__ == "__main__":
  konvertiere_daten()
