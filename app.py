from flask import Flask, request, render_template, jsonify, session
import re
import os
import requests
import uuid
from dotenv import load_dotenv
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import smtplib
import locale

try:
    locale.setlocale(locale.LC_TIME, 'fr_FR.UTF-8')
except locale.Error:
    pass  # Render n'a pas cette locale



# ✅ Chargement des variables d'environnement
load_dotenv()

app = Flask(__name__)
app.secret_key = os.urandom(24)  # Clé secrète pour les sessions sécurisées

# 📧 Configuration SMTP pour l'envoi des emails
EMAIL_HOST = os.getenv("EMAIL_HOST")
EMAIL_PORT = int(os.getenv("EMAIL_PORT"))
EMAIL_USER = os.getenv("EMAIL_USER")
EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD")
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL")
ALLOWED_EMAILS = os.getenv("ALLOWED_EMAILS", "@fra.mee.com")


# 📋 Configuration Notion
NOTION_API_KEY = os.getenv("NOTION_API_KEY")
DATABASE_ID = os.getenv("DATABASE_ID")

if not NOTION_API_KEY or not DATABASE_ID:
    print("🚨 ERREUR : La clé API Notion ou l'ID de la base de données est manquant ! 🚨")


@app.route("/")
def index():
    return render_template("index.html")

@app.route("/submit_email", methods=["POST"])
def submit_email():
    data = request.json
    email = data.get("email", "").strip()

    if not re.match(r"^[a-zA-Z0-9._%+-]+@fra\.mee\.com$", email):
        return jsonify({"error": "Email non autorisé"}), 403

    # Tu peux stocker l'email en session si besoin
    session["user_email"] = email

    return jsonify({"success": True})


# 📁 Configuration du dossier d'upload sécurisé
UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER

# 📧 Liste des emails autorisés
ALLOWED_EMAILS = ["@fra.mee.com"]



# 📤 Route pour envoyer les données à Notion
@app.route("/send_to_notion", methods=["POST"])
def send_to_notion():
    data = request.json
    print("📨 Données reçues :", data)  # ✅ Debug des données reçues

    responses = data.get("userResponses", {})
    tags = data.get("tags", [])
    statut = data.get("statut", "En attente")

    # 🆔 Générer un ID unique pour chaque ticket
    ticket_id = f"TICKET-{uuid.uuid4().hex[:8]}"  # Ex: TICKET-3a1b2c4d

    # ✅ Fusion des champs "Détail de la demande"
    detail_complet = responses.get("detail_demande", "") or \
                     responses.get("probleme", "") or \
                     responses.get("changement_ajout", "") or \
                     responses.get("new_distri_realloc", "Non spécifié")
                     
    user_email = responses.get("email", "").strip()

    # ✅ Envoi de l'e-mail à l'utilisateur
    if user_email:
        estimated_week = data.get("estimatedWeek", "Non défini")
        send_email(
            to_email=user_email,
            subject=f"Confirmation de ta demande - {ticket_id}",
            body=(
                f"Bonjour {responses.get('prenom', '')},\n\n"
                f"Ta demande a bien été enregistrée sous l'identifiant {ticket_id}.\n\n"
                f"📌 Type de demande : {responses.get('type_demande', '')}\n"
                f"📝 Détail : {detail_complet}\n"
                f"📅 Délai estimé de traitement : Semaine du {estimated_week}\n\n"
                f"Merci pour ta demande.\nMelbot 🤖"
            )
        )
    else:
        print("❌ Aucun email utilisateur renseigné, envoi annulé.")



    # 🛎️ Notification à l'admin
    if ADMIN_EMAIL:
        send_email(
            to_email=ADMIN_EMAIL,
            subject=f"[MELBOT] Nouvelle demande - {ticket_id}",
            body=f"""Nouvelle demande soumise.

Prénom : {responses.get('prenom', '')}
Type de demande : {responses.get('type_demande', '')}
Détail : {detail_complet}
Email utilisateur : {user_email}
"""
        )



    # 📝 Préparation des données à envoyer à Notion
    notion_payload = {
    "parent": {"database_id": DATABASE_ID},
    "properties": {
        "ID Ticket": {"title": [{"text": {"content": ticket_id}}]},
        "Prénom": {"rich_text": [{"text": {"content": responses.get("prenom", "Non renseigné")}}]},
        "Lignes et Colonnes": {"rich_text": [{"text": {"content": responses.get("lignes_colonnes", "")}}]},
        "Période demandée": {"rich_text": [{"text": {"content": responses.get("periode", "")}}]},
        "Filtres demandés": {"rich_text": [{"text": {"content": responses.get("filtres", "")}}]},
        "Autres précisions": {"rich_text": [{"text": {"content": detail_complet}}]},
        "Commentaires": {"rich_text": [{"text": {"content": responses.get("commentaires", "")}}]},
        "Email": {"email": responses.get("email", "")},
        "Type de demande": {"select": {"name": responses.get("type_demande", "Autre")}},
        "Détail de la demande": {"rich_text": [{"text": {"content": responses.get("detail_demande", "Aucune précision")}}]},  # ✅ Valeur par défaut
        "Statut": {"select": {"name": statut}},
        "Date de création": {"date": {"start": responses.get("date_creation", "2025-01-01")}},
        "Date estimée de retour": {"rich_text": [{"text": {"content": data.get("estimatedWeek", "Non défini")}}]},
        "Délai traitement": {"number": data.get("totalEstimatedTime", 0)},
        "Lien du fichier attaché": {"url": responses.get("fichier_excel", "") or None},
        "Tags": {"multi_select": [{"name": tag} for tag in tags] if tags else []}  # ✅ Liste vide si aucun tag
    }
}


    # 🔗 Envoi à l'API Notion
    notion_url = "https://api.notion.com/v1/pages"
    headers = {
        "Authorization": f"Bearer {NOTION_API_KEY}",
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28"
    }

    response = requests.post(notion_url, json=notion_payload, headers=headers)
    print("📡 Réponse Notion :", response.status_code, response.text)  # Debugging
    return jsonify({
    "notion_response": response.json(),
    "notion_ticket_id": ticket_id  
}), response.status_code


@app.route("/get_estimated_week", methods=["GET"])
def get_estimated_week():
    # 🔗 Appel API Notion pour récupérer tous les tickets "En attente" ou "En cours"
    notion_url = f"https://api.notion.com/v1/databases/{DATABASE_ID}/query"
    headers = {
        "Authorization": f"Bearer {NOTION_API_KEY}",
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28"
    }
    
    payload = {
        "filter": {
            "or": [
                {"property": "Statut", "select": {"equals": "En cours"}},
                {"property": "Statut", "select": {"equals": "En attente"}}
            ]
        }
    }

    response = requests.post(notion_url, json=payload, headers=headers)
    data = response.json()

    total_existing_time = 0  # Somme des heures de "Délai traitement"

    for result in data.get("results", []):
        props = result.get("properties", {})
        delay_prop = props.get("Délai traitement", {}).get("number", 0)
        if delay_prop:
            total_existing_time += delay_prop

    # 🔢 Calcul du nombre de semaines nécessaires avec weeklyTimeLimit
    weeklyTimeLimit = 3  # En heures par semaine
    weekly_limit = weeklyTimeLimit  # 3h/semaine
    weeks_needed = int(total_existing_time / weekly_limit) + 1

    # 📆 Calcul de la date de la semaine estimée
    from datetime import datetime, timedelta
    current_date = datetime.now()
    estimated_date = current_date + timedelta(weeks=weeks_needed)
    months_fr = ["janvier", "février", "mars", "avril", "mai", "juin",
             "juillet", "août", "septembre", "octobre", "novembre", "décembre"]
    estimated_week_str = f"{estimated_date.day} {months_fr[estimated_date.month - 1]} {estimated_date.year}"


    return jsonify({"estimatedWeek": estimated_week_str})



def send_email(to_email, subject, body):
    try:
        msg = MIMEMultipart()
        msg['From'] = EMAIL_USER
        msg['To'] = to_email
        msg['Subject'] = subject
        msg.attach(MIMEText(body, 'plain'))

        server = smtplib.SMTP(EMAIL_HOST, EMAIL_PORT)
        server.starttls()
        server.login(EMAIL_USER, EMAIL_PASSWORD)
        server.sendmail(EMAIL_USER, to_email, msg.as_string())
        server.quit()
        print(f"✅ Email envoyé à {to_email}")
    except Exception as e:
        print(f"❌ Erreur envoi mail : {e}")


# 🚀 Lancer l'application Flask
if __name__ == "__main__":
    app.run(debug=True)
