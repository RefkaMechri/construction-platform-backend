import { Injectable, InternalServerErrorException } from '@nestjs/common';

@Injectable()
export class OpenRouterProjectProgressReportService {
  private readonly openRouterUrl =
    'https://openrouter.ai/api/v1/chat/completions';

  private readonly primaryModel =
    process.env.OPENROUTER_REPORT_MODEL ||
    process.env.OPENROUTER_MODEL ||
    'nvidia/nemotron-3-super:free';

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

    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');

    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
      throw new Error('Aucun JSON valide trouvé');
    }

    return cleaned.substring(firstBrace, lastBrace + 1);
  }

  private safeParseJson(text: string): unknown {
    return JSON.parse(this.extractJson(text));
  }

  private buildPrompt(dataForAI: unknown): string {
    return `
Tu es un chef de projet senior dans le domaine de la construction.

Ta mission est de transformer les données structurées du projet en un rapport d'avancement professionnel, rédigé comme un document destiné à la direction, au client et au chef de projet.

IMPORTANT :
- Ce rapport doit être principalement narratif.
- Ne fais pas un tableau de bord.
- Ne liste pas simplement des statistiques.
- Rédige des paragraphes professionnels.
- Explique clairement ce qui est réalisé, ce qui est en cours, ce qui n'a pas encore démarré, les points bloquants et la situation générale du projet.
- Si le projet n'a pas encore de phases ou de tâches, ne dis pas seulement "aucune donnée" : rédige une remarque professionnelle indiquant que le projet est créé mais que le planning opérationnel reste à compléter.
- N'invente jamais de données inexistantes.
- Utilise uniquement les données fournies.
- Le style doit être clair, formel et professionnel.
- Réponds uniquement en JSON valide.
- Aucun markdown.
- Aucun texte hors JSON.

Données projet :
${JSON.stringify(dataForAI, null, 2)}

Structure JSON obligatoire :
{
  "projectId": 0,
  "projectName": "",
  "projectCode": "",
  "reportTitle": "",
  "generatedAt": "",
  "globalStatus": "on_track | warning | critical",
  "overallProgress": 0,

  "executiveSummary": "",

  "progressReport": {
    "introduction": "",
    "completedWork": "",
    "ongoingWork": "",
    "pendingWork": "",
    "delaysAndBlockers": "",
    "milestonesAndAnomalies": "",
    "overallAssessment": ""
  },

  "recommendationsText": "",

  "conclusion": ""
}

Consignes de rédaction :

1. introduction :
Présente le projet, son code, son client si disponible, sa période prévisionnelle et son état général.

2. completedWork :
Décris les travaux, phases ou tâches terminés. Si rien n'est terminé, explique que l'exécution n'a pas encore produit d'éléments achevés.

3. ongoingWork :
Décris les phases ou tâches en cours. Si rien n'est en cours, indique-le professionnellement.

4. pendingWork :
Décris ce qui reste à démarrer ou à planifier.

5. delaysAndBlockers :
Décris les retards, tâches bloquées ou problèmes de planning. Si aucun retard n'existe, indique que rien de critique n'est signalé.

6. milestonesAndAnomalies :
Décris les jalons et anomalies. Si aucun jalon ou anomalie n'existe, indique que ces éléments ne sont pas encore renseignés.

7. overallAssessment :
Donne une appréciation globale du projet.

8. recommendationsText :
Rédige des recommandations opérationnelles sous forme de paragraphe professionnel, pas sous forme de tableau.

9. conclusion :
Termine par une conclusion claire et professionnelle.

Le rapport doit être suffisamment rédigé pour être copié dans un PDF.
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
          signal: AbortSignal.timeout(600000),
          body: JSON.stringify({
            model,
            messages: [
              {
                role: 'system',
                content:
                  'Tu rédiges des rapports professionnels en français. Tu réponds uniquement en JSON valide.',
              },
              {
                role: 'user',
                content: prompt,
              },
            ],
            temperature: 0.35,
            max_tokens: 9000,
          }),
        });

        if (!res.ok) {
          const errorText = await res.text();
          console.error('Erreur OpenRouter rapport avancement:', errorText);

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
          `Tentative OpenRouter rapport ${attempt}/${maxAttempts} échouée:`,
          error,
        );

        if (attempt === maxAttempts) {
          throw new InternalServerErrorException(
            'Connexion OpenRouter impossible pour le rapport d’avancement.',
          );
        }

        await this.sleep(3000 * attempt);
      }
    }

    throw new InternalServerErrorException('Erreur OpenRouter inconnue');
  }

  async generateProgressReport(dataForAI: unknown) {
    const prompt = this.buildPrompt(dataForAI);

    try {
      const response = await this.callOpenRouter(this.primaryModel, prompt);
      return this.safeParseJson(response);
    } catch (primaryError) {
      console.error('Erreur modèle principal rapport:', primaryError);

      try {
        const fallbackResponse = await this.callOpenRouter(
          this.fallbackModel,
          prompt,
        );

        return this.safeParseJson(fallbackResponse);
      } catch (fallbackError) {
        console.error('Erreur modèle fallback rapport:', fallbackError);

        throw new InternalServerErrorException(
          'Génération du rapport d’avancement échouée.',
        );
      }
    }
  }
}
