from datetime import datetime, timezone
import json


def convert_item(item):
    """Konvertiert ein einzelnes Element aus Daten.json in das Zielformat."""

    # 1. ID als String formulieren
    item_id = str(item.get("id", ""))

    # 2. Name / Bezeichnung ermitteln
    name = item.get("name") or item.get("full") or "Unbenannter Artikel"

    # 3. Standort-Felder mappen (Falls leer, Standardwerte setzen)
    room = item.get("room") or "Werkstatt"
    location = item.get("place") or "Lager"
    box = item.get("box") or "Kiste 1"

    # 4. Kategorie übernehmen
    category = item.get("cat") or "Elektronik"

    # 5. Menge & Einheit
    quantity = item.get("qty", 1)
    unit = "Stück"

    # 6. Notizen / Beschreibung zusammenbauen
    notes_parts = []

    # Ausführlicher Name / Beschreibung hinzufügen, falls abweichend
    full_name = item.get("full")
    if full_name and full_name != name:
        notes_parts.append(full_name)

    # Zusätzliche Informationen wie Händler, Preis, Kaufdatum anhängen
    src = item.get("src")
    seller = item.get("seller")
    date = item.get("date")
    price = item.get("price")

    info_str = ""
    if src:
        info_str += f"Quelle: {src}"
    if seller:
        info_str += f" (Verkäufer: {seller})"
    if date:
        info_str += f" | Kaufdatum: {date}"
    if price is not None:
        info_str += f" | Preis: {price:.2f} €"

    if info_str:
        notes_parts.append(info_str)

    # Benutzer-Notiz hinzufügen, falls vorhanden
    note = item.get("note")
    if note:
        notes_parts.append(f"Notiz: {note}")

    notes = " - ".join(notes_parts)

    # 7. Aktueller Zeitstempel im ISO 8601 UTC-Format
    updated_at = (
        datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    )

    return {
        "id": item_id,
        "name": name,
        "room": room,
        "location": location,
        "box": box,
        "category": category,
        "quantity": quantity,
        "unit": unit,
        "notes": notes,
        "updatedAt": updated_at,
    }


def main():
    input_file = "Daten.json"
    output_file = "krims_kram_inventar.json"

    # JSON-Quelldatei einlesen
    try:
        with open(input_file, "r", encoding="utf-8") as f:
            data = json.load(f)
    except FileNotFoundError:
        print(f"Fehler: {input_file} wurde nicht gefunden.")
        return

    # Daten konvertieren
    converted_data = [convert_item(item) for item in data]

    # In Ziel-JSON-Datei schreiben
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(converted_data, f, ensure_ascii=False, indent=2)

    print(
        f"Erfolgreich {len(converted_data)} Einträge aus '{input_file}' nach '{output_file}' konvertiert!"
    )


if __name__ == "__main__":
    main()