import { Injectable, InternalServerErrorException } from '@nestjs/common';

@Injectable()
export class OpenRouterImpactReportService {
  private readonly openRouterUrl =
    'https://openrouter.ai/api/v1/chat/completions';

  private readonly primaryModel =
    process.env.OPENROUTER_MODEL || 'nvidia/nemotron-3-super:free';

  private readonly fallbackModel =
    process.env.OPENROUTER_FALLBACK_MODEL || 'openai/gpt-oss-120b:free';

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private extractJson(text: string): string {
    const cleaned = text
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();

    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');

    if (start === -1 || end === -1 || end <= start) {
      throw new Error('JSON non trouvé');
    }

    return cleaned.substring(start, end + 1);
  }

  private safeParseJson(text: string): unknown {
    return JSON.parse(this.extractJson(text));
  }

  private buildPrompt(simulation: unknown): string {
    return `
Tu es un expert senior en planification de projets de construction en Tunisie dans le domaine du BTP.

Contexte :
Le backend a déjà simulé l'impact d'une modification des dates d'une tâche.
Le backend a déjà calculé :
- la tâche modifiée ;
- les tâches dépendantes affectées ;
- les anciennes et nouvelles dates ;
- le décalage du projet.

Ton rôle n'est pas de recalculer la simulation.
Ton rôle est d'interpréter les résultats, qualifier l'impact et proposer une décision.

Objectif :
Analyser cette simulation de modification des dates d'une tâche afin de déterminer :
- si l'impact est positif, neutre ou négatif ;
- le niveau de risque réel ;
- les conséquences concrètes sur les tâches affectées ;
- les recommandations à appliquer ;
- si la modification est recommandée ou non.

Règles importantes :
- L’impact d’une modification n’est pas forcément négatif.
- Il peut y avoir :
  - un gain ou une optimisation du planning ;
  - aucun impact réel si aucune tâche critique n'est affectée ;
  - un risque si la modification crée un retard ou un effet domino.
- Ne dramatise pas le risque.
- Ne donne pas un risque élevé sans preuve.
- Justifie chaque conclusion à partir des données de simulation.
- N'invente aucune tâche, date, dépendance ou durée.
- Cite uniquement les tâches réellement présentes dans la simulation.
- Si affectedTasks est vide et projectImpact.delayDays = 0, l'impact doit être neutral ou positive selon le changement de la tâche modifiée.
- Si projectImpact.delayDays > 0, l'impact est généralement negative sauf justification contraire.
- Si la modification avance la fin du projet ou réduit la durée de la tâche sans affecter négativement les dépendances, l'impact peut être positive.
- Si la tâche modifiée change mais que le projet ne change pas et aucune tâche dépendante n'est affectée, l'impact est probablement neutral.
- Si plusieurs tâches dépendantes sont décalées, analyse l'effet domino.
- Si une tâche affectée a delayDays élevé, elle doit apparaître clairement dans affectedTasksAnalysis.

Règles de risque :
- riskPercent doit être un nombre entre 0 et 100.
- 0 à 30 = low.
- 31 à 65 = medium.
- 66 à 100 = high.
- riskLevel doit correspondre à riskPercent.
- Risque faible : aucune tâche affectée ou impact projet nul.
- Risque moyen : quelques tâches affectées mais projet peu ou pas retardé.
- Risque élevé : retard projet significatif ou plusieurs tâches dépendantes fortement décalées.
- Ne donne jamais 100 sauf si le retard est très important et touche plusieurs tâches critiques.
- Ne donne jamais 0 si des tâches sont affectées ou si un décalage projet existe.

Règles d'analyse des tâches affectées :
Pour chaque tâche dans affectedTasks :
- cite taskId, taskName et phaseName si disponible ;
- explique l'ancienne période et la nouvelle période ;
- explique le delayDays ;
- indique si l'impact est faible, moyen ou fort ;
- donne une recommandation concrète.

Règles de recommandations :
- Les recommandations doivent être précises et actionnables.
- Évite les phrases vagues comme "surveiller le planning".
- Propose des actions concrètes :
  - valider la nouvelle date avec le chef de projet ;
  - renforcer les ressources sur une tâche affectée ;
  - replanifier une tâche dépendante ;
  - ajouter une marge de sécurité ;
  - refuser la modification si elle crée un retard important ;
  - accepter la modification si elle n'a pas d'effet négatif.
- Les priorités doivent commencer à 1.

Règles de décision :
- isChangeRecommended = true si l'impact est positif ou neutre avec risque faible.
- isChangeRecommended = false si l'impact est négatif avec risque élevé.
- Pour risque moyen, décide selon le rapport entre bénéfice et retard.
- La raison doit être claire et exploitable par un chef de projet.

Simulation :
${JSON.stringify(simulation, null, 2)}

Réponds uniquement en JSON valide.
Aucun markdown.
Aucun texte avant ou après JSON.
Toutes les chaînes doivent être en français.
Si une liste n'a aucun élément pertinent, retourne [].
Respecte exactement la structure JSON.
N'ajoute aucune clé non demandée.

Structure JSON obligatoire :
{
  "impactType": "positive | neutral | negative",
  "riskPercent": 0,
  "riskLevel": "low | medium | high",
  "executiveSummary": "",
  "impactAnalysis": "",
  "affectedTasksAnalysis": [
    {
      "taskId": 0,
      "taskName": "",
      "impact": "",
      "risk": "",
      "recommendation": ""
    }
  ],
  "recommendations": [
    {
      "priority": 1,
      "action": "",
      "reason": ""
    }
  ],
  "decisionSupport": {
    "isChangeRecommended": true,
    "reason": ""
  }
}
`;
  }

  private async callOpenRouter(model: string, prompt: string): Promise<string> {
    if (!process.env.OPENROUTER_API_KEY) {
      throw new InternalServerErrorException(
        'OPENROUTER_API_KEY manquant dans .env',
      );
    }

    const maxAttempts = 3;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const res = await fetch(this.openRouterUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer':
              process.env.OPENROUTER_SITE_URL || 'http://localhost:3000',
            'X-Title': process.env.OPENROUTER_APP_NAME || 'Construction AI',
          },
          signal: AbortSignal.timeout(300000),
          body: JSON.stringify({
            model,
            messages: [
              {
                role: 'system',
                content:
                  'Tu réponds uniquement en JSON valide. Aucun markdown. Aucun texte hors JSON.',
              },
              {
                role: 'user',
                content: prompt,
              },
            ],
            temperature: 0,
            max_tokens: 4000,
          }),
        });

        if (!res.ok) {
          const errorText = await res.text();
          console.error('Erreur OpenRouter impact report:', errorText);

          throw new Error(
            `Erreur OpenRouter HTTP ${res.status} avec modèle ${model}`,
          );
        }

        const data = (await res.json()) as {
          choices?: Array<{
            message?: {
              content?: string;
            };
          }>;
        };

        const content = data.choices?.[0]?.message?.content;

        if (!content) {
          throw new Error(`Réponse vide OpenRouter avec modèle ${model}`);
        }

        return content;
      } catch (error) {
        console.error(
          `Tentative OpenRouter impact report ${attempt}/${maxAttempts} échouée:`,
          error,
        );

        if (attempt === maxAttempts) {
          throw new InternalServerErrorException(
            'Connexion OpenRouter impossible. Vérifie internet, DNS, proxy/VPN ou firewall.',
          );
        }

        await this.sleep(3000 * attempt);
      }
    }

    throw new InternalServerErrorException('Erreur OpenRouter inconnue');
  }

  async generateReport(simulation: unknown) {
    const prompt = this.buildPrompt(simulation);

    try {
      const response = await this.callOpenRouter(this.primaryModel, prompt);

      try {
        return this.safeParseJson(response);
      } catch (jsonError) {
        console.error('JSON principal impact report invalide:', response);
        throw jsonError;
      }
    } catch (primaryError) {
      console.error('Erreur modèle principal impact report:', primaryError);

      try {
        const fallbackResponse = await this.callOpenRouter(
          this.fallbackModel,
          prompt,
        );

        return this.safeParseJson(fallbackResponse);
      } catch (fallbackError) {
        console.error('Erreur modèle fallback impact report:', fallbackError);

        throw new InternalServerErrorException(
          'Rapport IA échoué : JSON invalide ou erreur OpenRouter',
        );
      }
    }
  }
}
