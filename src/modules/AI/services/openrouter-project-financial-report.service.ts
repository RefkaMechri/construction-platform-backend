import { Injectable, InternalServerErrorException } from '@nestjs/common';

@Injectable()
export class OpenRouterProjectFinancialReportService {
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
Tu es un contrôleur financier senior spécialisé dans les projets de construction.

Ta mission est de transformer les données budgétaires structurées du projet en un rapport financier professionnel, rédigé comme un document destiné à la direction, au responsable financier et au chef de projet.

IMPORTANT :
- Ce rapport doit être principalement narratif.
- Ne fais pas un tableau de bord.
- Ne liste pas simplement des chiffres.
- Explique les chiffres dans des paragraphes professionnels.
- Analyse le budget prévu, le budget consommé, le budget restant, les écarts, les coûts directs, les frais indirects, les imprévus et les risques financiers.
- Si certaines données financières sont absentes, explique-le clairement de manière professionnelle.
- N'invente jamais de montant, taux ou poste budgétaire.
- Utilise uniquement les données fournies.
- Le style doit être clair, formel et professionnel.
- Réponds uniquement en JSON valide.
- Aucun markdown.
- Aucun texte hors JSON.

Données financières du projet :
${JSON.stringify(dataForAI, null, 2)}

Structure JSON obligatoire :
{
  "projectId": 0,
  "projectName": "",
  "projectCode": "",
  "reportTitle": "",
  "generatedAt": "",
  "financialStatus": "healthy | warning | critical",
  "consumptionRate": 0,
  "executiveSummary": "",
  "financialReport": {
    "budgetOverview": "",
    "directCostsAnalysis": "",
    "indirectCostsAnalysis": "",
    "varianceAnalysis": "",
    "budgetConsumptionAnalysis": "",
    "financialRisks": "",
    "forecastAnalysis": "",
    "overallAssessment": ""
  },
  "recommendationsText": "",
  "conclusion": ""
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
          signal: AbortSignal.timeout(600000),
          body: JSON.stringify({
            model,
            messages: [
              {
                role: 'system',
                content:
                  'Tu rédiges des rapports financiers professionnels en français. Tu réponds uniquement en JSON valide.',
              },
              {
                role: 'user',
                content: prompt,
              },
            ],
            temperature: 0.3,
            max_tokens: 9000,
          }),
        });

        if (!res.ok) {
          const errorText = await res.text();
          console.error('Erreur OpenRouter rapport financier:', errorText);

          throw new Error(
            `Erreur OpenRouter HTTP ${res.status} avec modèle ${model}`,
          );
        }

        const data = (await res.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };

        const content = data.choices?.[0]?.message?.content;

        if (!content) {
          throw new Error(`Réponse vide OpenRouter avec modèle ${model}`);
        }

        return content;
      } catch (error) {
        console.error(
          `Tentative OpenRouter rapport financier ${attempt}/${maxAttempts} échouée:`,
          error,
        );

        if (attempt === maxAttempts) {
          throw new InternalServerErrorException(
            'Connexion OpenRouter impossible pour le rapport financier.',
          );
        }

        await this.sleep(3000 * attempt);
      }
    }

    throw new InternalServerErrorException('Erreur OpenRouter inconnue');
  }

  async generateFinancialReport(dataForAI: unknown) {
    const prompt = this.buildPrompt(dataForAI);

    try {
      const response = await this.callOpenRouter(this.primaryModel, prompt);
      return this.safeParseJson(response);
    } catch (primaryError) {
      console.error('Erreur modèle principal rapport financier:', primaryError);

      try {
        const fallbackResponse = await this.callOpenRouter(
          this.fallbackModel,
          prompt,
        );

        return this.safeParseJson(fallbackResponse);
      } catch (fallbackError) {
        console.error(
          'Erreur modèle fallback rapport financier:',
          fallbackError,
        );

        throw new InternalServerErrorException(
          'Génération du rapport financier échouée.',
        );
      }
    }
  }
}
