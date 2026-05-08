/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { Injectable, InternalServerErrorException } from '@nestjs/common';

@Injectable()
export class OpenRouterBudgetService {
  private readonly openRouterUrl =
    'https://openrouter.ai/api/v1/chat/completions';

  private readonly primaryModel =
    process.env.OPENROUTER_MODEL || 'nvidia/nemotron-3-super:free';

  private readonly fallbackModel =
    process.env.OPENROUTER_FALLBACK_MODEL || 'openai/gpt-oss-120b:free';

  private readonly secondFallbackModel =
    process.env.OPENROUTER_SECOND_FALLBACK_MODEL || 'openrouter/free';

  private extractJson(text: string): string {
    const cleaned = text
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();

    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');

    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
      throw new Error('Aucun JSON trouvé');
    }

    return cleaned.substring(firstBrace, lastBrace + 1);
  }

  private safeParseJson(text: string): unknown {
    return JSON.parse(this.extractJson(text));
  }

  private buildCompactBudget(data: any) {
    return {
      project: data.budgetData?.project ?? data.project,
      budget: {
        id: data.budgetData?.budget?.id ?? data.budget?.id,
        directCostsTotal:
          data.budgetData?.budget?.directCostsTotal ??
          data.budget?.directCostsTotal,
        indirectCostsTotal:
          data.budgetData?.budget?.indirectCostsTotal ??
          data.budget?.indirectCostsTotal,
        contingencyRate:
          data.budgetData?.budget?.contingencyRate ??
          data.budget?.contingencyRate,
        contingencyAmount:
          data.budgetData?.budget?.contingencyAmount ??
          data.budget?.contingencyAmount,
        contingencyUsed:
          data.budgetData?.budget?.contingencyUsed ??
          data.budget?.contingencyUsed,
        remainingContingency:
          data.budgetData?.budget?.remainingContingency ??
          data.budget?.remainingContingency,
        totalBudget:
          data.budgetData?.budget?.totalBudget ?? data.budget?.totalBudget,
        calculatedBudgetWithoutContingency:
          data.budgetData?.budget?.calculatedBudgetWithoutContingency ??
          data.budget?.calculatedBudgetWithoutContingency,
        calculatedBudgetWithContingency:
          data.budgetData?.budget?.calculatedBudgetWithContingency ??
          data.budget?.calculatedBudgetWithContingency,
        gapWithProjectDeclaredBudget:
          data.budgetData?.budget?.gapWithProjectDeclaredBudget ??
          data.budget?.gapWithProjectDeclaredBudget,
        indirectItems:
          data.budgetData?.budget?.indirectItems ?? data.budget?.indirectItems,
      },
      budgetAnalysisHistory: data.budgetAnalysisHistory ?? [],
    };
  }

  private buildPrompt(data: unknown): string {
    const compactData = this.buildCompactBudget(data);

    return `
Tu es un expert senior en estimation budgétaire, contrôle des coûts et analyse financière de projets de construction en Tunisie.

Objectif :
Analyser uniquement le budget du projet fourni et produire une analyse financière claire, précise et actionnable.

Données disponibles :
- project : informations du projet.
- budget : budget actuel du projet.
- budgetAnalysisHistory : anciennes analyses IA du budget du même projet.

Utilisation des données :
- Analyse uniquement le budget actuel.
- Utilise budgetAnalysisHistory uniquement pour détecter les risques répétés, corrigés ou aggravés.
- Ne considère jamais budgetAnalysisHistory comme budget actuel.
- Ne recopie jamais une ancienne analyse sans vérifier avec les chiffres actuels.
- Si budgetAnalysisHistory est vide, ignore l'historique.

Règles strictes :
- Réponds uniquement en JSON valide.
- Aucun markdown.
- Aucun texte avant ou après JSON.
- Ne laisse jamais un champ texte vide.
- Ne recopie pas les données : interprète les chiffres.
- Utilise les montants en DT.
- Utilise les pourcentages quand c'est pertinent.
- Analyse selon le type du projet.
- Ne génère pas une longue liste.
- Analyse seulement les postes les plus importants.
- Donne maximum 3 constats critiques.
- Donne maximum 3 recommandations finales.
- Termine toujours le JSON complètement.

Méthode d'analyse obligatoire :
1. Vérifier la cohérence globale du budget :
   - coûts directs ;
   - coûts indirects ;
   - contingence ;
   - budget total ;
   - écart éventuel avec le budget déclaré.

2. Analyser la structure des coûts :
   - part des coûts directs ;
   - part des coûts indirects ;
   - part de la contingence ;
   - cohérence avec un projet BTP en Tunisie.

3. Analyser la contingence :
   - taux de contingence ;
   - montant total de contingence ;
   - contingence déjà utilisée ;
   - contingence restante ;
   - risque si la contingence restante est faible.

4. Analyser les postes indirects :
   - identifier les 3 postes indirects les plus importants ;
   - expliquer leur poids financier ;
   - signaler les postes anormalement élevés ou faibles.

5. Comparer avec budgetAnalysisHistory :
   - identifier les risques déjà signalés avant ;
   - dire s'ils sont toujours présents, améliorés ou aggravés ;
   - ne pas utiliser un ancien risque s'il n'est pas confirmé par les chiffres actuels.

6. Produire des recommandations concrètes :
   - ajuster la contingence ;
   - revoir un poste indirect ;
   - contrôler un coût direct ;
   - valider l'écart budgétaire ;
   - demander une justification financière ;
   - bloquer ou réviser le budget si le risque est élevé.

Règles de risque :
- riskPercent doit être entre 0 et 100.
- 0 à 30 = low.
- 31 à 65 = medium.
- 66 à 100 = high.
- riskLevel doit correspondre à riskPercent.
- Ne donne jamais 100 sauf si le budget est gravement incohérent.
- Ne donne jamais 0 si une donnée importante est manquante ou incohérente.
- Si la contingence restante est négative, le risque doit être au moins medium.
- Si les coûts indirects sont très élevés par rapport au budget total, le risque doit augmenter.
- Si le budget total est cohérent et la contingence suffisante, le risque doit rester low ou medium.

Règles pour les statuts :
- "balanced" si le budget semble cohérent.
- "underestimated" si le budget semble insuffisant.
- "overestimated" si certains postes semblent trop élevés.
- "risky" si le budget contient des incohérences ou une contingence faible.
- "insufficient_data" si les données ne permettent pas une analyse fiable.

Budget à analyser :
${JSON.stringify(compactData, null, 2)}

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
  "contingencyAnalysis": {
    "contingencyRate": 0,
    "contingencyAmount": 0,
    "contingencyUsed": 0,
    "remainingContingency": 0,
    "usedContingencyPercent": 0,
    "riskLevel": "low | medium | high",
    "analysis": "",
    "recommendation": ""
  },
  "projectTypeAnalysis": {
    "projectType": "",
    "analysis": "",
    "specificRisk": "",
    "recommendation": ""
  },
  "previousAnalysisInsights": [
    {
      "previousAnalysisId": 0,
      "createdAt": "",
      "repeatedRisk": "",
      "currentStatus": "still_present | improved | worsened | not_verifiable",
      "evidence": ""
    }
  ],
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
  }

  private async callOpenRouter(model: string, prompt: string): Promise<string> {
    if (!process.env.OPENROUTER_API_KEY) {
      throw new InternalServerErrorException(
        'OPENROUTER_API_KEY manquant dans .env',
      );
    }

    const response = await fetch(this.openRouterUrl, {
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
        temperature: 0.1,
        max_tokens: 5000,
      }),
    });

    const rawText = await response.text();

    if (!response.ok) {
      console.error(`Erreur OpenRouter HTTP ${response.status}:`, rawText);

      throw new Error(
        `Erreur OpenRouter HTTP ${response.status} avec modèle ${model}`,
      );
    }

    let data: {
      choices?: Array<{
        message?: {
          content?: string;
        };
        finish_reason?: string;
      }>;
      error?: {
        message?: string;
      };
    };

    try {
      data = JSON.parse(rawText);
    } catch {
      console.error('Réponse OpenRouter non JSON:', rawText);
      throw new Error(`Réponse OpenRouter non JSON avec modèle ${model}`);
    }

    if (data.error) {
      console.error(`Erreur OpenRouter modèle ${model}:`, data.error);
      throw new Error(data.error.message || 'Erreur OpenRouter inconnue');
    }

    const content = data.choices?.[0]?.message?.content?.trim();

    if (!content) {
      console.error(`Réponse OpenRouter vide avec modèle ${model}:`, data);
      throw new Error(`Réponse vide OpenRouter avec modèle ${model}`);
    }

    return content;
  }

  async analyzeBudget(data: unknown) {
    const prompt = this.buildPrompt(data);

    const models = [
      this.primaryModel,
      this.fallbackModel,
      this.secondFallbackModel,
    ];

    let lastError: unknown = null;

    for (const model of models) {
      try {
        const response = await this.callOpenRouter(model, prompt);

        const parsed = this.safeParseJson(response) as {
          summary?: unknown;
          budgetDiagnosis?: unknown;
          costStructureAnalysis?: unknown;
        };

        if (
          !parsed.summary ||
          !parsed.budgetDiagnosis ||
          !parsed.costStructureAnalysis
        ) {
          throw new Error('Structure IA invalide pour analyse budget');
        }

        return parsed;
      } catch (error) {
        lastError = error;
        console.error(`Erreur analyse budget avec modèle ${model}:`, error);
      }
    }

    console.error(
      'Toutes les tentatives OpenRouter budget ont échoué:',
      lastError,
    );

    throw new InternalServerErrorException(
      'Analyse budget IA échouée : tous les modèles OpenRouter ont échoué ou ont retourné un JSON invalide.',
    );
  }
}
