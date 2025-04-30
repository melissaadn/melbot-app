const chatbotContainer = document.getElementById("chatbot");
const chatbox = document.getElementById("chatbox");
let currentStep = "email_request";
let totalEstimatedTime = 0;
let weeklyTimeLimit = 3;
let estimatedWeek = 0;
let userVariables = {};
let isEmailVerified = false;


const decisionTree = {
    "email_request": {
        "message": ["Bienvenue ! Avant de commencer, j'ai besoin de ton adresse email"],
        "input_type": "text",
        "variable": "email",
        "next": "1"
    },
    "1": {
        "message": ["Bonjour ! ✨ Je suis l'assistante virtuelle de Mélissa.", "Et toi, quel est ton prénom?"],
        "options": [],
        "input_type": "text",
        "variable": "prenom",
        "next": "1.1"
    },
    "1.1": {
        "message": ["Ravie d'échanger avec toi [prenom] !", "De quoi as-tu besoin?"],
        "options": [
             { "text": "Extraction brute 📄", "next": "2.1", "time": 1.0, "tag": "Extraction", "variable": "type_demande" },
            { "text": "Analyse / Enquête 🕵🏻‍♀️", "next": "2.2", "time": 1.5, "tag": "Analyse / Enquête", "variable": "type_demande" },
            { "text": "Aide sur un fichier Excel 🆘", "next": "2.3", "time": 1.0, "tag": "Aide Excel", "variable": "type_demande" },
            { "text": "Déclarer un incident ⚠️", "next": "2.4", "time": 1.0, "tag": "Incident", "variable": "type_demande" },
            { "text": "Déclarer un changement / un ajout 🚧", "next": "2.5", "tag": "Changement / Ajout", "variable": "type_demande" }
        ],
        "input_type": "choice"
    },
    "2.1": {
        "message": ["Top ! Tu souhaites avoir une extraction de quel système ?"],
        "options": [
            { "text": "Board (Data commerciale)", "next": "2.1.1", "tag": "Board", "variable": "detail_demande" },
            { "text": "SAP (Data Client / Produit)", "next": "2.1.2", "tag": "SAP", "variable": "detail_demande" },
            { "text": "Déclarations des distributeurs", "next": "2.1.1", "tag": "Data distributeurs", "variable": "detail_demande" },
            { "text": "C'est plus compliqué..", "next": "2.1.4.2", "variable": "detail_demande" }
        ],
        "input_type": "choice"
    },
    "2.2": {
        "message": ["Je vois ! Que souhaites-tu analyser ?"],
        "options": [
            { "text": "Mes chiffres (CA réalloué)", "next": "2.2.1", "tag": "Board", "variable": "detail_demande" },
            { "text": "Le sell-in / stock / sell-out (ou VVA)", "next": "2.1.4.2", "tag": "Data distributeurs", "variable": "detail_demande" },
            { "text": "Nouvelle source de données externe", "next": "2.1.4.2", "tag": "Data externe" },
            { "text": "C'est plus compliqué..", "next": "2.1.4.2" }
        ],
        "input_type": "choice"
    },
    "2.3": {
        "message": ["Mes préférés ! 🤩", "Comment puis-je t'aider avec ce fichier ?"],
        "options": [
            { "text": "Analyser / Retravailler le fichier sans ajout d'information supplémentaire", "next": "2.1.4", "tag": "Transformation simple" },
            { "text": "Ajouter des informations / compléter le fichier", "next": "2.1.4", "tag": "Transformation et ajout" },
            { "text": "C'est plus compliqué..", "next": "2.1.4" }
        ],
        "input_type": "choice"
    },
    "2.3.1": {
        "message": ["Par souci de sécurité, je vais te demander d'envoyer ton fichier Excel directement à Mélissa par mail. Pense à indiquer ton numéro de ticket dans l’objet du mail afin qu’elle puisse l’identifier facilement."],
        "options": [],
        "next": "end"
    }, 

    "2.4": {
        "message": ["Mince.. Que se passe-t-il ?"],
        "options": [
            { "text": "Je pense qu'il y a un souci sur Board", "next": "2.4.1", "tag": "Board", "variable": "detail_demande" },
            { "text": "Je pense qu'il y a un souci sur Client 360", "next": "2.5.2.1", "tag": "C360", "variable": "detail_demande" },
            { "text": "Autre", "next": "2.4.1", "tag": "Autre" },
        ],        
        "input_type": "choice"
    },
    "2.5": {
        "message": ["Très bien !", "Ta demande concerne un ajout ou bien une modification ?"],
        "options": [
            { "text": "Un ajout", "next": "2.5.1", "tag": "Ajout" },
            { "text": "Une modification", "next": "2.5.2", "tag": "Modification" }
        ],    
        "input_type": "choice"
    },
    "2.1.1": {
        "message": ["Ça marche !", "Peux-tu me dire les 👉🏻 lignes ainsi que les 👇🏻colonnes que tu souhaites avoir dans le fichier final ?"],
        "options": [],
        "input_type": "text",
        "variable": "lignes_colonnes",
        "next": "2.1.1.1"
    },
    
    "2.1.1.1": {
        "message": ["Peux-tu me préciser la période d'extraction souahitée ? ⌚ (ex : janvier 2025, FY24, 2024, semestre en cours ..)"],
        "options": [],
        "input_type": "text",
        "variable": "periode",
        "next": "2.1.1.2"
    },
    "2.1.1.2": {
        "message": ["Souhaites-tu que la donnée soit filtrée ?", "(ex : Uniquement certains produits/familles de produit, uniquement certains clients, certaines régions, etc…)"],
        "options": [],
        "input_type": "text",
        "variable": "filtres",
        "next": "pre3"
    },
    "pre3": {
        "message": ["Dans quel but souhaites-tu utiliser ce fichier ?", "Cela m'aidera à bien comprendre le contexte de ta demande 😊"],
        "options": [],
        "input_type": "text",
        "variable": "destination",
        "next": "3"
    },
    "3": {
        "message": ["Parfait ! Souhaites-tu soumettre ton brief ?", "Tu es sûr de n'avoir rien oublié ?"],
        "options": [
            { "text": "Oui", "next": "4.1" },
            { "text": "Oups pardon, je souhaite modifier mon brief", "next": "2.1.1" }
        ],    
        "input_type": "choice"
    },    
    "2.1.2": {
        "message": ["Je vois !", "Tu devrais contacter Julia Gregoire (data client) ou Binbin Vally (data produit) pour ta demande. "],
        "options": [
            { "text": "Ah d'accord, merci !", "next": "2.1.2.1" },
        ],    
        "input_type": "choice"
        
    },
    "2.1.2.1": {
        "message": ["Parfait ! Je t'en prie, à bientôt !"],
        "status": "Clôturé",
        "input_type": "choice",
        "options": [
            { "text": "OK", "next": "end" }
        ]
    },
    "4.1": {
        "message": ["Souhaites-tu faire passer un petit mot à Mélissa ?", "Un commentaire, une précision ?"],
        "options": [
            { "text": "Oui !", "next": "4.1.2" },
            { "text": "Non, c'est tout bon pour moi !", "next": "5" }
        ],    
        "input_type": "choice"
    }, 
    "4.1.2": {
        "message": ["Dis moi tout. Je lui transmettrai ! 🎙️"],
        "options": [],
        "input_type": "text",
        "variable": "commentaires",
        "next": "5"
    },
    "5": {
        "message": ["Si ta demande est réalisable, Mélissa reviendra vers toi par mail avec le fichier demandé. ⌛ Délai estimé de retour : Semaine du getEstimatedWeek()."],
        "options": []
    }, 
    "2.1.4": {
        "message": ["Peux-tu me détailler ta demande ? "],
        "options": [],
        "input_type": "text",
        "variable": "detail_demande",
        "next": "2.3.1"
    },
    "2.1.4.2": {
        "message": ["Peux-tu me détailler ta demande ? "],
        "options": [],
        "input_type": "text",
        "variable": "detail_demande",
        "next": "end"
    },
    "2.2.1": {
        "message": ["Si ta question concerne un écart que tu as constaté entre VVA et Sell in réalloué (Board), garde en tête que c'est normal que ces chiffres ne soient pas égaux.", "Les VVA nous donnent une idée du poids de chaque agence au sein du Distributeur national, mais ce n'est pas directement comparable à notre chiffre d'affaires réalloué.", "En effet, nous traitons les VVA en pourcentage par agence et non en termes de chiffres d'affaires.", "Il arrive que nous ayons vendu moins de produits aux distributeurs qu'ils n'en ont écoulé. Cela réduit mécaniquement l'enveloppe à réallouer.", "C'est le principe et la limite du fonctionnement sur le 'sell-in réalloué'.", "Après je n'en sais rien, je ne suis qu'un robot.. 🤖"],
        "options": [
            { "text": "Je comprends, j'aimerais tout de même demander une analyse.", "next": "2.2.1.1" },
            { "text": "Merci, je n'ai plus de question ! A bientôt !", "next": "2.1.2.1" }
        ],    
        "input_type": "choice"
    }, 
    "2.2.1.1": {
        "message": ["Je vois. Peux-tu me donner un maximum d'élements pour réaliser l'analyse / l'enquête que tu souhaites ?", "(Période, Client, famille de produit, exemple concret) "],
        "options": [],
        "input_type": "text",
        "variable": "detail_demande",
        "next": "3"
    },
    "2.4.1": {
        "message": ["Aïe.. Peux tu me détailler le problème ? "],
        "options": [],
        "input_type": "text",
        "variable": "probleme",
        "next": "2.4.1.1"
    },
    "2.4.1.1": {
        "message": ["Est-ce un problème critique ? 🚨"],
        "options": [
            { "text": "Priorité élevée", "next": "8", "tag": "urgence" },
            { "text": "Priorité moyenne", "next": "8", "tag": "urgence" },
            { "text": "Priorité faible", "next": "8", "tag": "urgence" }
        ],    
        "input_type": "choice"
    }, 
    "2.3.2": {
        "message": ["Peux-tu me joindre ton fichier ? 🔻"],
        "options": [],
        "input_type": "file",
        "variable": "excel",
        "next": "2.1.4"
    },    
    "2.5.1": {
        "message": ["Cool, un peu de novueauté ! 💫", "En quoi consiste ta demande ?"],
        "options": [
            { "text": "Nouvelle agence distributeur", "next": "2.5.1.1"},
            { "text": "Nouveau commercial / Nouvelle région distri", "next": "2.1.2", "tag": "New commercial" },
            { "text": "J'aimerais qu'un nouveau distributeur soit intégré au processus de réallocation de chiffre d'affaires", "next": "2.5.1.6", "tag": "New distri réallocation" }
        ],    
        "input_type": "choice"
    }, 
    "2.5.2": {
        "message": ["Très bien ! Que souhaites-tu modifier ?"],
        "options": [
            { "text": "Transfert de CA sur Board", "next": "2.5.2.1"},
            { "text": "Autre", "next": "2.5.2.2" }
        ],    
        "input_type": "choice"
    }, 
    "2.5.2.2": {
        "message": ["Je t'écoute ! 🎙️"],
        "options": [],
        "input_type": "text",
        "variable": "changement_ajout",
        "next": "3"
    },
    "2.5.2.1": {
        "message": ["Je ne pense pas que Mélissa ait la main dessus, tu devrais contacter l'IT pour ta demande. 💻"],
        "options": [
            { "text": "Ah d'accord, merci !", "next": "2.1.2.1"}
        ],    
        "input_type": "choice",
    }, 
    "2.5.1.1": {
        "message": ["L'agence est à créer uniquement pour la réallocation de CA ou va-t-elle passer des commandes en direct (sans passer par sa plateforme) ?"],
        "options": [
            { "text": "Uniquement pour de la réallocation de CA", "next": "2.5.1.2", "time": 1.0, "tag": "New agence distri" },
            { "text": "Elle va passer des commandes en direct", "next": "2.1.2" }
        ],    
        "input_type": "choice"
    }, 
    "2.5.1.2": {
        "message": ["Pas de soucis ! Peux tu me communiquer le nom et l'adresse de l'agence ?"],
        "options": [],
        "input_type": "text",
        "variable": "agence_distri",
        "next": "2.5.1.3"
    },
    "2.5.1.3": {
        "message": ["Merci ! Et le SIRET ?"],
        "options": [],
        "input_type": "text",
        "variable": "siret_distri",
        "next": "2.5.1.4"
    },
    "2.5.1.4": {
        "message": ["A quel commercial doit-elle être rattachée ?"],
        "options": [],
        "input_type": "text",
        "variable": "commercial_rattachement",
        "next": "2.5.1.5"
    },
    "2.5.1.5": {
        "message": ["Facultatif : connais-tu le code agence (donné par le distributeur) ?"],
        "options": [],
        "input_type": "text",
        "variable": "code_agence_distri",
        "next": "9"
    },
    "9": {
        "message": ["Parfait, j'ai tout ce qu'il me faut ! ✨", "⌛ Délai estimé de retour : Semaine du getEstimatedWeek()."],
        "options": []
    }, 
    "2.5.1.6": {
        "message": ["Lequel ?"],
        "options": [],
        "input_type": "text",
        "variable": "new_distri_realloc",
        "tag": "New distri réallocation",
        "next": "10"
    },
    "10": {
        "message": ["C'est noté ! Pour mettre en place une clé de réallocation pour un distributeur, il faut que les données qu'il nous communique soient exploitables et complètes. 🔎", "Je ne peux pas estimer le délai de traitement de ta demande, elle nécessite une étude de faisabilité."],
        "options": []
    }, 
    "8": {
        "message": ["Je transmets l'information, merci d'avoir fait remonter le problème."], 
        "input_type": "choice"
    },
    "end": {
        "message": [],
        "input_type": null
    }
  

    
};



function addMessage(text, sender) {
    for (const key in userVariables) {
        text = text.replace(`[${key}]`, userVariables[key]);
    }

    // Créer le conteneur du message
    const messageContainer = document.createElement("div");
    messageContainer.classList.add("message-container");

    // Si c'est un message du bot, ajouter l'avatar
    if (sender === "bot") {
        const botAvatar = document.createElement("div");
        botAvatar.classList.add("bot-avatar");
        messageContainer.appendChild(botAvatar);
    }

    const messageBubble = document.createElement("div");
    messageBubble.classList.add("message", sender);
    messageBubble.innerHTML = text; // ✅ Permet d'afficher du texte en gras avec <b>...</b>

    // ✅ Appliquer un conteneur différent pour aligner les messages utilisateur à droite
    if (sender === "user") {
        messageContainer.classList.add("user-container"); // ✅ Aligne le message utilisateur à droite
    }

    messageContainer.appendChild(messageBubble);
    chatbox.appendChild(messageContainer);
    chatbox.scrollTop = chatbox.scrollHeight;
}


function addTypingIndicator() {
    const typingContainer = document.createElement("div");
    typingContainer.classList.add("typing-container");

    // Avatar du bot (placé en dehors de la bulle)
    const botAvatar = document.createElement("div");
    botAvatar.classList.add("bot-avatar");

    // Bulle contenant les trois points animés
    const typingBubble = document.createElement("div");
    typingBubble.classList.add("typing");
    typingBubble.innerHTML = "<span></span><span></span><span></span>";

    // Ajoute l'avatar et la bulle dans le conteneur
    typingContainer.appendChild(botAvatar);
    typingContainer.appendChild(typingBubble);
    
    chatbox.appendChild(typingContainer);
    chatbox.scrollTop = chatbox.scrollHeight;

    return typingContainer; // Retourne l'élément pour pouvoir le supprimer après
}


function removeTypingIndicator(typingBubble) {
    if (typingBubble) {
        chatbox.removeChild(typingBubble);
    }
}


function showOptions(options) {
    const optionsContainer = document.createElement("div");
    optionsContainer.classList.add("options-container");
    options.forEach(option => {
        const button = document.createElement("button");
        button.innerText = option.text;
        button.onclick = () => selectOption(option);
        optionsContainer.appendChild(button);
    });
    chatbox.appendChild(optionsContainer);
    chatbox.scrollTop = chatbox.scrollHeight;
}


function showInputField(variableName, nextStep, inputType = "text") { 
    const inputContainer = document.createElement("div");
    inputContainer.classList.add("input-container");

    let inputField;

    if (inputType === "file") {
        // 📂 Gestion de l'upload de fichiers
        const fileUploadContainer = document.createElement("div");
        fileUploadContainer.classList.add("file-upload-wrapper");

        inputField = document.createElement("input");
        inputField.type = "file";
        inputField.accept = ".xls,.xlsx";
        inputField.classList.add("file-upload");
        inputField.id = variableName;
        inputField.name = variableName;

        const fileLabel = document.createElement("label");
        fileLabel.classList.add("custom-file-label");
        fileLabel.innerText = "Parcourir";
        fileLabel.setAttribute("for", variableName);

        const fileStatus = document.createElement("span");
        fileStatus.classList.add("file-status");
        fileStatus.innerText = "";

        inputField.addEventListener("change", function () {
            if (inputField.files.length > 0) {
                fileStatus.innerText = "✅ Chargé";
                userVariables[variableName] = inputField.files[0];
            }
        });

        fileUploadContainer.appendChild(inputField);
        fileUploadContainer.appendChild(fileLabel);
        fileUploadContainer.appendChild(fileStatus);
        inputContainer.appendChild(fileUploadContainer);
    } else {
        // 🧾 Champ texte classique
        inputField = document.createElement("input");
        inputField.type = "text";
        inputField.placeholder = "Votre réponse...";
        inputField.id = variableName;
        inputField.name = variableName;
        inputContainer.appendChild(inputField);
    }

    const sendButton = document.createElement("button");
    sendButton.innerText = "Envoyer";
    sendButton.classList.add("send-button");

    function submitInput() {
        if (inputType === "file") {
            const file = inputField.files[0];
            if (file) {
                if (file.size > 2 * 1024 * 1024) {
                    alert("Fichier trop volumineux (max 2MB).");
                    return;
                }
                userVariables[variableName] = file;
                addMessage(`📂 Fichier importé ✅`, "user");
            } else {
                alert("Veuillez sélectionner un fichier.");
                return;
            }
            chatbox.removeChild(inputContainer);
            setTimeout(() => runStep(nextStep), 500);
        } else {
            const userInput = inputField.value.trim();
            if (!userInput) return;

            addMessage(userInput, "user");
            chatbox.removeChild(inputContainer);

            // ✉️ Cas spécial : validation d'email côté serveur
            if (variableName === "email") {
                validateEmailAndContinue(userInput, nextStep);
            } else {
                userVariables[variableName] = userInput;
                setTimeout(() => runStep(nextStep), 500);
            }
        }
    }

    sendButton.onclick = submitInput;

    if (inputType === "text") {
        inputField.addEventListener("keydown", function (event) {
            if (event.key === "Enter") {
                event.preventDefault();
                submitInput();
            }
        });
    }

    inputContainer.appendChild(sendButton);
    chatbox.appendChild(inputContainer);
    chatbox.scrollTop = chatbox.scrollHeight;
    inputField.focus();
}



let userTags = []; // Initialiser une liste des tags sélectionnés


function selectOption(option) {
    // ✅ Création du conteneur de réponse utilisateur
    const userChoiceContainer = document.createElement("div");
    userChoiceContainer.classList.add("user-choice");

    const userChoiceBubble = document.createElement("div");
    userChoiceBubble.classList.add("message", "user");
    userChoiceBubble.innerText = option.text;

    userChoiceContainer.appendChild(userChoiceBubble);
    chatbox.appendChild(userChoiceContainer);
    chatbox.scrollTop = chatbox.scrollHeight;

    // ✅ Enregistre la variable définie dans le decisionTree
    if (option.variable) {
        userVariables[option.variable] = option.text;
    }

    // ✅ Capture les tags si définis
    if (option.tag) {
        userTags.push(option.tag);
    }

    // ✅ Définition du statut (par défaut "En attente", sauf si précisé autrement)
    currentStep = option.next || currentStep;
    if (decisionTree[currentStep].status) {
        userVariables["statut"] = decisionTree[currentStep].status;
    } else {
        userVariables["statut"] = "En attente";
    }
    totalEstimatedTime += option.time || 0;
    console.log("📌 Tags sélectionnés :", userTags);
    console.log("📌 Statut de la demande :", userVariables["statut"]);

    // ✅ Vérifie si l'étape actuelle doit arrêter la conversation (cas "Clôturé")
    if (decisionTree[currentStep].status === "Clôturé") {
        addMessage("Je t'en prie, à bientôt !", "bot");
        sendDataToDatabase();  // ✅ Envoi immédiat des données
        return; // ⛔ Stoppe la conversation ici
    }

    // ✅ Continue la conversation si une prochaine étape existe
    if (option.next && decisionTree[option.next]) {
        setTimeout(() => runStep(option.next), 500);
    } else {
        // ✅ Dernière étape de l'arbre → envoi automatique des données
        addMessage("✅ Ta demande est clôturée. Bonne journée à toi !", "bot");
        sendDataToDatabase();  // ✅ Envoi automatique des données à la fin
    }
}



function showHomeButton() {
    const homeContainer = document.createElement("div");
    homeContainer.classList.add("home-container");
    homeContainer.id = "home-button-container"; 

    const homeButton = document.createElement("button");
    homeButton.innerText = "Retour à l'accueil";
    homeButton.classList.add("home-button");
    
    // ✅ Recharge la page lorsqu'on clique sur le bouton
    homeButton.onclick = () => {
        location.reload(); // Recharge toute la page pour recommencer
    };

    homeContainer.appendChild(homeButton);
    chatbox.appendChild(homeContainer);
    chatbox.scrollTop = chatbox.scrollHeight; // ✅ Fait défiler jusqu'au bouton
}


function hideHomeButton() {
    const homeButtonContainer = document.getElementById("home-button-container");
    if (homeButtonContainer) {
        homeButtonContainer.remove();  // Supprime le bouton s'il est présent
    }
}



function runStep(step) {
    console.log(`🚀 Exécution de runStep(${step})`);

    if (!decisionTree[step]) {
        console.error(`❌ Erreur : L'étape ${step} n'existe pas dans l'arbre de décision.`);
        return;
    }

    const node = decisionTree[step];

    if (!node.message || !Array.isArray(node.message)) {
        console.error(`❌ Erreur : L'étape ${step} n'a pas de message défini.`);
        return;
    }

    const typingBubble = addTypingIndicator();

    setTimeout(async () => {
    removeTypingIndicator(typingBubble);

    // 🔥 Affiche tous les messages en attendant les dynamiques
    for (const msg of node.message) {
        let finalMessage = msg;

        if (msg.includes("getEstimatedWeek()")) {
            const week = await getEstimatedWeek();
            finalMessage = msg.replace("getEstimatedWeek()", week);
        }

        addMessage(finalMessage, "bot");
    }

    // 🧠 Si on arrive à l'étape finale
    if (step === "end") {
        sendDataToDatabase();
        return;
    }

    // 🕒 Délai pour laisser l’utilisateur lire avant de montrer les options/champs
    setTimeout(() => {
        if (node.input_type === "file" && node.variable) {
            showInputField(node.variable, node.next, "file");
        } else if (node.input_type === "text" && node.variable) {
            showInputField(node.variable, node.next);
        } else if (node.options && node.options.length > 0) {
            showOptions(node.options);
        } else if (node.next) {
            runStep(node.next);
        } else {
            console.log("✅ Fin du parcours, envoi des données...");
            sendDataToDatabase();
            setTimeout(showHomeButton, 500);
        }
    }, 400);  // ✅ Délai après affichage du message
}, 1000);

}



async function getEstimatedWeek() {
    try {
        const response = await fetch("/get_estimated_week");
        const data = await response.json();
        return data.estimatedWeek;  // Exemple : "13 mai 2025"
    } catch (error) {
        console.error("Erreur lors du calcul de la semaine estimée :", error);
        return "Non défini";
    }
}


async function sendDataToDatabase() {
    let formData = new FormData();

    // Ajout des variables utilisateur au FormData
    for (const key in userVariables) {
        formData.append(key, userVariables[key]);
    }

    // 📤 Étape 1 : Upload éventuel du fichier
    let fileUrl = "";
    try {
        const fileResponse = await fetch("/upload", {
            method: "POST",
            body: formData
        });
        const fileData = await fileResponse.json();
        if (fileData.file_url) {
            userVariables["fichier_excel"] = fileData.file_url;
            fileUrl = fileData.file_url;
        }
    } catch (err) {
        console.error("Erreur upload fichier :", err);
    }

    // 📤 Étape 2 : récupérer la semaine estimée
    const estimatedWeek = await getEstimatedWeek();

    // 👇 Affiche un message temporaire pendant l'envoi
    hideHomeButton();
    addMessage("📡 Enregistrement de ta demande en cours...", "bot");

    // 📤 Étape 3 : envoyer à Notion
    try {
        const response = await fetch("/send_to_notion", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                userResponses: userVariables,
                estimatedWeek: estimatedWeek,
                tags: userTags,
                statut: userVariables["statut"] || "En attente",
                totalEstimatedTime: totalEstimatedTime
            })
        });

        const data = await response.json();

        // ✅ Message stylé avec le ticket ID
        if (data.notion_ticket_id) {
            addMessage(`
                <div>
                    ✅ Ta demande a bien été enregistrée sous l'identifiant :<br>
                    <b style="font-size: 1.1em;">${data.notion_ticket_id}</b><br>
                    Merci 😊
                </div>
            `, "bot");
        } else {
            addMessage("✅ Ta demande a bien été enregistrée. Merci 😊", "bot");
        }

        setTimeout(showHomeButton, 500);

    } catch (error) {
        console.error("❌ Erreur pendant l'envoi :", error);
        addMessage("❌ Une erreur s’est produite. Réessaie plus tard.", "bot");
    }
}




function validateEmailAndContinue(email, nextStep) {
    fetch("/submit_email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            userVariables["email"] = email;
            runStep(nextStep);  // ✅ Continue si OK
        } else {
            addMessage("❌ Adresse email invalide. Vous n'êtes pas autorisés à utiliser ce bot.", "bot");
            // ❌ NE PAS faire : showInputField("email", "email_request");
            // ✅ Laisser l’utilisateur retaper dans le champ actuel (sans redemander l'étape entière)
        }
    })
    .catch(err => {
        console.error("Erreur de validation email :", err);
        addMessage("❌ Une erreur s’est produite. Réessaie.", "bot");
        // idem ici : ne relance pas showInputField
    });
}



// Lancer le chatbot
runStep(currentStep);
