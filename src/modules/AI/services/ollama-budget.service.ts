/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, InternalServerErrorException } from '@nestjs/common';

@Injectable()
export class OllamaBudgetService {
  private extractJson(text: string) {
    const cleaned = text
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();

    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');

    if (firstBrace === -1 || lastBrace === -1) {
      throw new Error('Aucun JSON trouvé');
    }

    return cleaned.substring(firstBrace, lastBrace + 1);
  }

  private buildCompactBudget(budget: any) {
    return {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      project: budget.project,
      budget: {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        id: budget.budget?.id,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        directCostsTotal: budget.budget?.directCostsTotal,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        indirectCostsTotal: budget.budget?.indirectCostsTotal,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        contingencyRate: budget.budget?.contingencyRate,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        contingencyAmount: budget.budget?.contingencyAmount,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        contingencyUsed: budget.budget?.contingencyUsed,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        remainingContingency: budget.budget?.remainingContingency,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        totalBudget: budget.budget?.totalBudget,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        calculatedBudgetWithoutContingency:
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          budget.budget?.calculatedBudgetWithoutContingency,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        calculatedBudgetWithContingency:
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          budget.budget?.calculatedBudgetWithContingency,
        gapWithProjectDeclaredBudget:
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          budget.budget?.gapWithProjectDeclaredBudget,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        indirectItems: budget.budget?.indirectItems,
      },
    };
  }

  async analyzeBudget(budget: unknown) {
    const compactBudget = this.buildCompactBudget(budget);

    const prompt = `
Tu es un expert senior en estimation budgétaire de projets de construction en Tunisie.

Analyse uniquement le budget fourni.
Réponds uniquement en JSON valide.
Ne laisse jamais un champ texte vide.
Ne recopie pas les données : interprète les chiffres.
Ne génère pas une longue liste. Analyse seulement les postes les plus importants.

Budget :
${JSON.stringify(compactBudget, null, 2)}

Règles obligatoires :
- Chaque champ texte doit contenir une vraie analyse.
- Chaque recommandation doit contenir une action concrète.
- Utilise les montants DT et les pourcentages.
- Analyse selon le type du projet.
- Si le budget déclaré et le budget total sont différents, explique l’écart.
- Si la contingence est insuffisante ou élevée, explique pourquoi.
- Analyse seulement les 3 postes indirects les plus importants.
- Donne maximum 3 constats critiques.
- Donne maximum 3 recommandations finales.
- Termine toujours le JSON complètement.

Structure JSON obligatoire :
{
  "summary": {
    "status": "underestimated | overestimated | balanced | risky | insufficient_data",
    "riskLevel": "low | medium | high",
    "riskPercent": 0,
    "analysis": "",
    "mainReason": "",
    "mainRecommendation": ""
  },
  "budgetDiagnosis": {
    "declaredBudget": 0,
    "totalBudget": 0,
    "gapAmount": 0,
    "gapPercent": 0,
    "analysis": "",
    "reason": "",
    "recommendation": ""
  },
  "costStructureAnalysis": {
    "directCosts": 0,
    "directCostsPercent": 0,
    "indirectCosts": 0,
    "indirectCostsPercent": 0,
    "contingencyAmount": 0,
    "contingencyPercent": 0,
    "analysis": "",
    "reason": "",
    "recommendation": ""
  },
  "projectTypeAnalysis": {
    "projectType": "",
    "analysis": "",
    "specificRisk": "",
    "recommendation": ""
  },
  "criticalFindings": [
    {
      "title": "",
      "severity": "low | medium | high",
      "evidence": "",
      "reason": "",
      "impact": "",
      "recommendation": ""
    }
  ],
  "topIndirectItemsAnalysis": [
    {
      "itemId": 0,
      "label": "",
      "category": "",
      "amount": 0,
      "analysis": "",
      "recommendation": ""
    }
  ],
  "finalRecommendations": [
    {
      "priority": 1,
      "action": "",
      "reason": "",
      "financialImpact": "",
      "implementation": ""
    }
  ]
}
`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 300000);

    try {
      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          model: process.env.OLLAMA_MODEL || 'llama3.2:3b',
          prompt,
          stream: false,
          format: {
            type: 'object',
          },
          keep_alive: '10m',
          options: {
            temperature: 0.2,
            num_predict: 2000,
            num_ctx: 4096,
            num_thread: 4,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Erreur HTTP Ollama:', errorText);
        throw new InternalServerErrorException('Erreur appel Ollama.');
      }

      const data = await response.json();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const rawText = data.response;

      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return JSON.parse(this.extractJson(rawText));
      } catch (parseError) {
        console.error('JSON Ollama invalide:', rawText);
        console.error('Erreur parsing JSON:', parseError);

        throw new InternalServerErrorException(
          'Ollama a retourné un JSON invalide.',
        );
      }
    } catch (error) {
      console.error('Erreur Ollama:', error);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new InternalServerErrorException(
          'Ollama a dépassé le délai maximum.',
        );
      }

      if (error instanceof InternalServerErrorException) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Erreur pendant l’analyse du budget avec Ollama.',
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}
