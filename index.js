// npm install
// npm install js-levenshtein

const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
const levenshtein = require('js-levenshtein');
require('dotenv').config();
const keep_alive = requiree('keep_alive.js')

const quizFilePath = path.join(__dirname, 'quizvragen.json');
const replacementsFilePath = path.join(__dirname, 'replacements.json');
const winnaarsFilePath = path.join(__dirname, 'winnaars.json');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Voeg deze regel toe om een server te laten draaien, ook al is dit een Discord bot
const PORT = process.env.PORT || 3000; // Binden aan een poort
const express = require('express');
const app = express();

// Start een simpele Express server
app.get('/', (req, res) => {
    res.send('Discord bot is online!');
});

// Luister op de gedefinieerde poort
app.listen(PORT, () => {
    console.log(`Server draait op poort ${PORT}`);
});

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);

   const channelId = '123456789012345678'; // Vervang dit door jouw Channel ID

client.on('ready', () => {
    const channel = client.channels.cache.get(channelId);
    if (channel) {
        channel.send('Just Staying alive!');
    }
});

const gebruikersAntwoorden = {}; // Hier worden de correct beantwoorde vragen per gebruiker opgeslagen

// Event listener voor als de bot is ingelogd
client.once('ready', () => {
    console.log(`Ingelogd als ${client.user.tag}`);
});

// Token inloggen
const token = process.env.DISCORD_TOKEN;
client.login(token).catch(console.error);

// Event listener voor berichten
client.on('messageCreate', (message) => {
    if (message.author.bot) return; // Negeer berichten van bots

    // Voeg hier je logica toe voor het verwerken van berichten
});

// Laad origineleQuiz vanuit een JSON-bestand
let origineleQuiz = [];
try {
    const quizData = fs.readFileSync(quizFilePath, 'utf8');
    origineleQuiz = JSON.parse(quizData); // Zorg ervoor dat origineleQuiz wordt geladen
} catch (error) {
    console.error('Er ging iets mis bij het lezen van het quizvragen.json bestand:', error.message);
}

// Maak een kopie van origineleQuiz voor de actieve quiz
let quiz = [...origineleQuiz];

const punten = {};
const winsten = {};
let quizActief = false;

// Controleer of replacements.json bestaat, anders aanmaken
if (!fs.existsSync(replacementsFilePath)) {
    fs.writeFileSync(replacementsFilePath, JSON.stringify([], null, 2), 'utf8');
}

let replacements = [];
try {
    const replacementsData = fs.readFileSync(replacementsFilePath, 'utf8');
    replacements = JSON.parse(replacementsData);
} catch (error) {
    console.error('Er ging iets mis bij het lezen van het replacements.json bestand:', error.message);
}

client.on('ready', () => {
    console.log(`Ingelogd als ${client.user.tag}`);
});

// Functie om het scorebord te genereren
function toonScorebord(channel) {
    const scoreLijst = Object.entries(punten)
        .filter(([userId, score]) => score > 0) // Alleen gebruikers met meer dan 0 punten
        .map(([userId, score]) => `<@${userId}>: ${score} punten`) // Maak een lijst van gebruikers en hun punten
        .join('\n');

    if (scoreLijst) {
        channel.send(`\n**Puntentelling:**\n${scoreLijst}\n\nGebruik \`!quiz\` voor een nieuwe vraag! 😄`);
    } else {
        channel.send("\n**Puntentelling:**\nIedereen staat (weer) op nul punten!\n\nGebruik \`!quiz\` voor een nieuwe vraag! 😄");
    }
}

// Controleer of winnaars.json bestaat, anders aanmaken
if (!fs.existsSync(winnaarsFilePath)) {
    fs.writeFileSync(winnaarsFilePath, JSON.stringify({}, null, 2), 'utf8');
}

let opgeslagenWinnaars = {};
try {
    const winnaarsData = fs.readFileSync(winnaarsFilePath, 'utf8');
    opgeslagenWinnaars = JSON.parse(winnaarsData);
} catch (error) {
    console.error('Er ging iets mis bij het lezen van het winnaars.json bestand:', error.message);
}

// Functie om het algemene winsten scoreboard te tonen
function toonWinstenScorebord(channel) {
    // Laad de winnaars opnieuw vanuit het bestand om de laatste stand te tonen
    try {
        const winnaarsData = fs.readFileSync(winnaarsFilePath, 'utf8');
        opgeslagenWinnaars = JSON.parse(winnaarsData);
    } catch (error) {
        console.error('Er ging iets mis bij het lezen van het winnaars.json bestand:', error.message);
    }

    const winstenLijst = Object.entries(opgeslagenWinnaars)
        .map(([userId, { overwinningen, naam }]) => `${naam}: ${overwinningen} overwinningen`) // Lijst van gebruikers en hun overwinningen
        .join('\n');

    if (winstenLijst) {
        channel.send(`\n🏆 **Voorgaande winnaars:**\n${winstenLijst}\n`);
    } else {
        channel.send("\n🏆 **Voorgaande winnaars:**\nNog geen overwinningen!");
    }
}

// Functie om de quizregels te tonen
function toonQuizRegels(channel) {
    const regels = `
  🌞 Welkom bij de Televisienostalgie Quiz! 🎬 📺

    **Quizregels:**
  - Je kunt met \`!quiz\` een spel beginnen en de volgende vraag starten.
  - ⏱️ Voor elke vraag heb je 60 seconden om te beantwoorden.
  - Wie als eerst vijf punten behaalt, wint het spel! 🎉
  - Gebruik \`!quizpunten\` om de puntentelling te bekijken.
  - Gebruik \`!quizwinnaars\` voor een overzicht van voorgaande winnaars. 🏆
  - Gebruik \`!quizregels\` om de regels te lezen.

  Let op: de antwoorden zijn (zoveel mogelijk) in het Nederlands!
  
  Veel plezier & succes! ❤️
    `;
    channel.send(regels);
}

// Logging van berichten om te zien of de bot berichten ontvangt
client.on('messageCreate', (message) => {
    console.log(`Ontvangen bericht: ${message.content}`);

    if (message.content.toLowerCase() === '!quiz') {
        if (quizActief) {
            message.channel.send("🧐 Er is al een quiz aan de gang! Wacht tot deze is afgelopen. 😘");
            return;
        }

        if (quiz.length === 0) {
            message.channel.send("🥳 Gefeliciteerd! Jullie hebben alle vragen beantwoord. We gaan de vragen opnieuw herhalen! 🥳");

            // Reset de quiz naar de originele vragen
            quiz = [...origineleQuiz]; // Zorg ervoor dat origineleQuiz gedefinieerd is
        }

        quizActief = true; // Zet quizActief op true om aan te geven dat er een quiz aan de gang is

        // Kies een willekeurige quizvraag en verwijder deze uit de array
        const randomIndex = Math.floor(Math.random() * quiz.length);
        const randomVraag = quiz.splice(randomIndex, 1)[0]; // Verwijder de vraag uit de array

        // Stuur de vraag naar het kanaal
        message.channel.send(`❓**Vraag:** ${randomVraag.vraag}`);

        // Kapitalen niet relevant        
        const filter = response => {
            const userAnswer = response.content.toLowerCase().trim();
            const correctAnswer = randomVraag.antwoord.toLowerCase().trim();

            // Lidwoorden, -, komma's en extra spaties verwijderen uit de antwoorden
            const stripArticlesCommasAndSpaces = answer => answer.replace(/\b(de|het|en|the|z'n|n|een)\b/g, '').replace(/,/g, '').replace(/'/g, '').replace(/-/g, '').replace(/!/g, '').replace(/\s+/g, ' ').trim();
            const strippedUserAnswer = stripArticlesCommasAndSpaces(userAnswer);
            const strippedCorrectAnswer = stripArticlesCommasAndSpaces(correctAnswer);

            // Controleer ook of het antwoord gelijk is ongeacht de volgorde voor specifieke vraag
            const isKwikKwekKwak = strippedCorrectAnswer.includes('kwik') && strippedCorrectAnswer.includes('kwek') && strippedCorrectAnswer.includes('kwak');
            if (isKwikKwekKwak) {
                const userWordsSet = new Set(strippedUserAnswer.replace(/[&]/g, 'en').split(/\s*,\s*|\s+/)); // Split op spaties of komma's en maak een set
                const correctWordsSet = new Set(strippedCorrectAnswer.replace(/[&]/g, 'en').split(/\s*,\s*|\s+/)); // Zelfde voor het juiste antwoord

                return [...userWordsSet].every(word => correctWordsSet.has(word)); // Controleer of elk woord in het juiste antwoord zit
            }
            // Lees het JSON-bestand
            const replacementsData = fs.readFileSync('./replacements.json');
            const replacements = JSON.parse(replacementsData);

            // Gebruik de vervangingen
            const acceptedAnswers = replacements.reduce((acc, { van, naar }) => {
                const regex = new RegExp(van, 'gi'); // 'g' voor global, 'i' voor case-insensitive
                return acc.concat(strippedCorrectAnswer.replace(regex, naar));
            }, [strippedCorrectAnswer]);

            // Gebruik levenshtein om de afstand tussen het antwoord van de gebruiker en het juiste antwoord te bepalen
            const distance = levenshtein(strippedUserAnswer, strippedCorrectAnswer);

            // Definieer een drempel voor hoeveel fouten zijn toegestaan, bijvoorbeeld 2
            const levenshteinThreshold = 2;

            // Check voor antwoorden die bijna goed zijn
            if (distance <= levenshteinThreshold) {
                return true;
            }


            // Check voor andere variaties
            const modifiedUserAnswer = strippedUserAnswer
                .replace(/en/g, '&') // vervang 'en' met '&'
                .replace(/&/g, 'en'); // vervang '&' met 'en'

            return acceptedAnswers.includes(strippedUserAnswer) || acceptedAnswers.includes(modifiedUserAnswer);
        };

        // Geef melding na 40 seconden dat er nog 20 seconden te gaan zijn
        const timeWarning = setTimeout(() => {
            const hint = randomVraag.antwoord.replace(/[^ ]/g, '-'); // Vervang alleen letters door '-'
            message.channel.send(`⏳Nog **30** seconden te gaan!\n\n**Hint💡** ${hint}`);
        }, 30000); // 40 seconden

        // Geef de tweede hint na 50 seconden
        const secondHintTimeout = setTimeout(() => {
            const hint = randomVraag.antwoord
                .split(' ') // Splitst de zin in afzonderlijke woorden
                .map(word => word.charAt(0) + word.slice(1).replace(/[^ ]/g, '-')) // Behoudt de eerste letter, vervangt de rest door '-'
                .join(' '); // Voegt de woorden weer samen met een spatie

            message.channel.send(`⌛NOG **20** SECONDEN TE GAAN!! \n\n**Laatste hint💡** ${hint}`);
        }, 40000); // 50 seconden

        message.channel.awaitMessages({
            filter,
            max: 1,
            time: 60000, // 60 seconden
            errors: ['time']
        })
            .then(collected => {
                clearTimeout(timeWarning); // Stop de tijdwaarschuwing
                clearTimeout(secondHintTimeout); // Stop de hint timers als het antwoord correct is

                const userId = collected.first().author.id;

                // Controleer of de gebruiker deze vraag al eerder correct heeft beantwoord
                if (!gebruikersAntwoorden[userId]) {
                    gebruikersAntwoorden[userId] = []; // Initialiseer een array voor deze gebruiker als dat nog niet is gebeurd
                }
                
                if (gebruikersAntwoorden[userId].includes(randomVraag.vraag)) {
                    // De gebruiker heeft deze vraag al correct beantwoord, maar de vraag blijft in de quiz voor anderen
                    quiz.push(randomVraag);
                    message.channel.send(`🛑 Correct ${collected.first().author}! Maar je hebt deze vraag al eerder goed beantwoord. Geen extra punten deze keer! 😏`);
                } else {
                    // Speler geeft correct antwoord en heeft deze vraag nog niet correct beantwoord
                    gebruikersAntwoorden[userId].push(randomVraag.vraag); // Voeg de vraag toe aan hun lijst
                
                    // Voeg 1 punt toe aan de gebruiker
                    if (!punten[userId]) {
                        punten[userId] = 0; // Zorg ervoor dat de gebruiker een puntenscore heeft
                    }
                    punten[userId] += 1; // Voeg een punt toe
                
                    // Controleer of de gebruiker 5 punten heeft
                    if (punten[userId] === 5) {
                        message.channel.send(`✌️ Het juiste antwoord is inderdaad ${randomVraag.antwoord}. ✌️`);
                        message.channel.send(`🎉 **Gefeliciteerd  ${collected.first().author}**, je hebt als eerst ${punten[userId]} punten behaald! 🎉`);
                        message.channel.send(`🏆🥇 Je bent de winnaar van dit potje!  😎🏆🥇`);
                
                        // Verhoog het aantal overwinningen voor de gebruiker
                        if (!winsten[userId]) {
                            winsten[userId] = 0; // Zorg ervoor dat de gebruiker een overwinning heeft
                        }
                        winsten[userId] += 1; // Voeg een overwinning toe
                
                        // Voeg de winnaar toe aan het opgeslagenWinnaars object
                        if (!opgeslagenWinnaars[userId]) {
                            opgeslagenWinnaars[userId] = { overwinningen: 0, naam: collected.first().author.username };
                        }
                        opgeslagenWinnaars[userId].overwinningen += 1;
                
                        // Schrijf de bijgewerkte winnaars naar het bestand
                        try {
                            fs.writeFileSync(winnaarsFilePath, JSON.stringify(opgeslagenWinnaars, null, 2), 'utf8');
                        } catch (error) {
                            console.error('Er ging iets mis bij het opslaan van de winnaar:', error.message);
                        }
                
                        // Reset de punten voor iedereen
                        for (const userId in punten) {
                            punten[userId] = 0; // Reset naar 0
                        }
                    } else {
                        message.channel.send(`✌️ Goed gedaan ${collected.first().author}! Het juiste antwoord is ${randomVraag.antwoord}. Je hebt nu ${punten[userId]} punten. ✌️`);
                    }
                }
                

                // Toon het scorebord na elk antwoord
                toonScorebord(message.channel);

                // Zet quizActief weer op false omdat de quiz is afgelopen
                quizActief = false;

            })
            .catch(() => {
                // Voeg de vraag weer toe aan de quiz
                quiz.push(randomVraag);
                message.channel.send(`⏰ De tijd is om! 😦 Probeer het later nog een keer. 💪`);

                // Toon het scorebord na het verstrijken van de tijd
                toonScorebord(message.channel);

                // Zet quizActief weer op false omdat de quiz is afgelopen
                quizActief = false;
            });
    }

    // Command voor het tonen van het scorebord
    if (message.content.toLowerCase() === '!quizpunten') {
        toonScorebord(message.channel);
    }

    // Command voor het tonen van het algemene winsten scoreboard
    if (message.content.toLowerCase() === '!quizwinnaars') {
        toonWinstenScorebord(message.channel);
    }

    // Command voor het tonen van de quizregels
    if (message.content.toLowerCase() === '!quizregels') {
        toonQuizRegels(message.channel);
    }

    // Command voor moderators om de quiz te resetten
    if (message.content.toLowerCase() === '!quizreset') {
        // Controleer of de gebruiker de juiste permissies heeft (beheerder of met permissies voor beheren van berichten)
        if (message.member.permissions.has(PermissionsBitField.Flags.Administrator) ||
            message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            quiz = [...origineleQuiz]; // Reset de quiz naar de originele vragen
            message.channel.send("De quiz is gereset! Je kunt nu weer beginnen met `!quiz`.");
            // Reset de punten voor iedereen (of je kunt ze individueel resetten)
            for (const userId in punten) {
                punten[userId] = 0; // Reset naar 0
            }
            // Reset de winsten voor iedereen
            for (const userId in winsten) {
                winsten[userId] = 0; // Reset naar 0
            }
        } else {
            message.channel.send("Alleen een moderator kan de quiz resetten.");
        }
    }
// Declareer een array om bij te houden wie de quiz al heeft beantwoord
let deelnemers = [];

// Command voor moderators om de quiz te refillen
if (message.content.toLowerCase() === '!quizrefill') {
    // Controleer of de gebruiker de juiste permissies heeft (beheerder of met permissies voor beheren van berichten)
    if (message.member.permissions.has(PermissionsBitField.Flags.Administrator) ||
        message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
        quiz = [...origineleQuiz]; // Reset de quiz naar de originele vragen
        deelnemers = []; // Reset de deelnemerslijst
        message.channel.send("We bieden alle vragen weer opnieuw aan! Je kunt nu weer beginnen met `!quiz`.");
        // Reset de punten voor iedereen (of je kunt ze individueel resetten)
    } else {
        message.channel.send("Alleen een moderator kan de quiz resetten.");
    }
}
    // Command voor moderators om een vervangingsregel toe te voegen
    if (message.content.toLowerCase().startsWith('!quizreplace')) {
        // Controleer of de gebruiker de juiste permissies heeft
        if (message.member.permissions.has(PermissionsBitField.Flags.Administrator) ||
            message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            const content = message.content.slice('!quizreplace'.length).trim();

            // Gebruik een regex om het "van" en "naar" te extraheren
            const replaceRegex = /van:\s*"(.*?)"\s*naar:\s*"(.*?)"/i;
            const match = content.match(replaceRegex);

            if (match) {
                const van = match[1].trim(); // De eerste capture group voor "van"
                const naar = match[2].trim(); // De tweede capture group voor "naar"

                // Voeg de vervangingsregel toe aan de array en schrijf het terug naar het bestand
                replacements.push({ van, naar });
                try {
                    fs.writeFileSync(replacementsFilePath, JSON.stringify(replacements, null, 2), 'utf8');
                    message.channel.send(`✅ Nieuwe vervangingsregel toegevoegd: van "${van}" naar "${naar}".`);
                } catch (error) {
                    console.error('Er ging iets mis bij het opslaan van de nieuwe vervangingsregel:', error.message);
                    message.channel.send("❌ Er ging iets mis bij het opslaan van de nieuwe vervangingsregel: " + error.message);
                }
            } else {
                message.channel.send("⚠️ Het lijkt erop dat je de vervangingsregel niet correct hebt ingevoerd. Zorg ervoor dat je het volgende formaat gebruikt:\n`!quizreplace van: \"<woord te vervangen>\" naar: \"<vervangend woord>\"`");
            }
        } else {
            message.channel.send("⚠️ Alleen een moderator kan vervangingsregels toevoegen.");
        }
    }
    // Command voor moderators om beschikbare modcommands te tonen
    if (message.content.toLowerCase() === '!quizmods') {
        // Controleer of de gebruiker de juiste permissies heeft (beheerder of met permissies voor beheren van berichten)
        if (message.member.permissions.has(PermissionsBitField.Flags.Administrator) ||
            message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            // Stuur de modcommands naar het kanaal
            const modCommands = `
        **Modcommands:**
        \`!quizadd vraag: "vraag" antwoord: "antwoord"\`
        \`!quizreplace van: "fout woord" naar: "correct woord"\`
        \`!quizrefill\` - Bied alle vragen opnieuw aan
        \`!quizreset\` - (NIET GEBRUIKEN!!) Wis alle punt- en winstreaks + vragen opnieuw aanbieden 
        `;
            message.channel.send(modCommands);
        } else {
            message.channel.send("⚠️ Alleen moderators kunnen dit command gebruiken.");
        }
    }
    // Command voor moderators om een nieuwe quizvraag toe te voegen
    if (message.content.toLowerCase().startsWith('!quizadd')) {
        // Controleer of de gebruiker de juiste permissies heeft (beheerder of met permissies voor beheren van berichten)
        if (message.member.permissions.has(PermissionsBitField.Flags.Administrator) ||
            message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            // Haal de inhoud van het bericht op zonder het command (!quizadd)
            const content = message.content.slice('!quizadd'.length).trim();

            // Gebruik een regex om de vraag en het antwoord te extraheren
            const quizRegex = /vraag:\s*"(.*?)"\s*antwoord:\s*"(.*?)"/i;
            const match = content.match(quizRegex);

            if (match) {
                const vraag = match[1]; // De eerste capture group voor de vraag
                const antwoord = match[2]; // De tweede capture group voor het antwoord

                // Voeg de nieuwe vraag en het antwoord toe aan zowel de originele quiz als de actieve quiz
                origineleQuiz.push({ vraag, antwoord });
                quiz.push({ vraag, antwoord }); // Voeg ook toe aan de actieve quiz

                // Schrijf de bijgewerkte origineleQuiz terug naar quizvragen.json
                try {
                    fs.writeFileSync(quizFilePath, JSON.stringify(origineleQuiz, null, 2), 'utf8');
                    message.channel.send(`✅ Nieuwe quizvraag toegevoegd: "${vraag}" met antwoord "${antwoord}".`);
                } catch (error) {
                    console.error('Er ging iets mis bij het opslaan van de nieuwe vraag:', error.message); // Log de foutmelding
                    message.channel.send("❌ Er ging iets mis bij het opslaan van de nieuwe vraag: " + error.message); // Stuur de foutmelding naar de gebruiker
                }
            } else {
                message.channel.send("⚠️ Het lijkt erop dat je de vraag niet correct hebt ingevoerd. Zorg ervoor dat je het volgende formaat gebruikt:\n`!quizadd vraag: \"<jouw vraag>\" antwoord: \"<jouw antwoord>\"`");
            }
        } else {
            message.channel.send("⚠️ Alleen een moderator kan nieuwe quizvragen toevoegen.");
        }
    }
});

// Login bij Discord met de bot token
client.login(token);
