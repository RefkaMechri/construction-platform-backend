import { Injectable, InternalServerErrorException } from '@nestjs/common';

@Injectable()
export class OpenRouterResourceService {
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

  private buildResourceAnalysisPrompt(data: unknown): string {
    return `
Tu es un expert senior en gestion des ressources pour chantiers de construction en Tunisie.

Objectif :
Analyser UNIQUEMENT currentProject.tasks afin d'évaluer la cohérence des ressources affectées et recommander les ressources manquantes ou excessives.

Données disponibles :
- currentProject : projet courant à analyser.
- currentProject.tasks : seules tâches à auditer.
- historicalProjects : projets terminés similaires venant de la base de données.
- resourceAnalysisHistory : anciennes analyses IA des ressources du même projet.

Utilisation des données :
- Analyse uniquement currentProject.tasks.
- Utilise historicalProjects uniquement comme référence historique.
- Utilise resourceAnalysisHistory uniquement pour détecter les problèmes répétés, corrigés ou aggravés.
- N'analyse jamais historicalProjects comme projets actifs.
- N'analyse jamais resourceAnalysisHistory comme état actuel du projet.
- Ne recopie pas les anciennes analyses sans vérifier avec les données actuelles.

Ce que historicalProjects peut aider à comparer :
- profils employés souvent utilisés pour des tâches similaires ;
- équipements souvent utilisés pour des tâches similaires ;
- matériaux souvent utilisés pour des tâches similaires ;
- quantités observées dans des tâches similaires ;
- cohérence entre durée de tâche et quantité de ressources.

Interdictions :
- N'invente jamais de tâche, projet, ressource ou affectation.
- N'utilise jamais des exemples fictifs comme "Task 1", "Project 1", "Equipment 1".
- Ne propose jamais une ressource incohérente avec la tâche courante.
- Ne propose pas d'électricien pour une tâche non électrique.
- Ne propose pas de plombier pour une tâche non plomberie.
- Ne propose pas d'équipement lourd si la tâche ne le justifie pas.
- Si l'information est insuffisante, indique le problème dans "problems" au lieu d'inventer.
- Si historicalProjects est vide, analyse uniquement selon les règles métier.
- Si resourceAnalysisHistory est vide, ignore l'historique des analyses.

Méthode d'analyse obligatoire :
1. Identifier la nature de chaque tâche selon son nom, sa description et sa phase.
2. Identifier les employés actuellement affectés.
3. Identifier les équipements actuellement affectés.
4. Identifier les matériaux actuellement affectés.
5. Comparer les ressources affectées avec les règles métier BTP Tunisie.
6. Comparer avec les tâches similaires dans historicalProjects si elles existent.
7. Vérifier si un problème était déjà présent dans resourceAnalysisHistory.
8. Déterminer les ressources manquantes, excessives ou incohérentes.
9. Donner une correction précise et actionnable.

Règles métier Tunisie :
- Terrassement : conducteur d’engin, manœuvre, chef d’équipe. Équipements : pelle mécanique, camion benne, compacteur.
- Fondations : maçon, coffreur, ferrailleur, aide-maçon. Matériaux : béton, acier, ciment, gravier, sable. Équipements : bétonnière, vibrateur béton.
- Maçonnerie : maçon, aide-maçon. Matériaux : brique, ciment, sable.
- Gros œuvre : maçon, coffreur, ferrailleur, chef d’équipe, aide-maçon. Équipements selon besoin : bétonnière, vibrateur béton, échafaudage.
- Électricité : électricien uniquement si tâche électrique.
- Plomberie : plombier uniquement si tâche plomberie.
- Enduit : maçon, aide-maçon. Matériaux : ciment, sable, mortier.
- Peinture : peintre, manœuvre.
- Carrelage : carreleur, aide-maçon. Matériaux : carrelage, colle, ciment-joint.
- Finition : profil adapté selon la nature exacte de la tâche.
- Nettoyage chantier : manœuvre.
- Réception/livraison : chef de projet, conducteur travaux ou responsable chantier ; pas de gros équipement nécessaire sauf indication contraire.

Règles pour les quantités :
- assignedQuantity = quantité réellement affectée dans currentProject.tasks.
- recommendedQuantity = quantité recommandée pour la tâche actuelle.
- missingQuantity = max(0, recommendedQuantity - assignedQuantity).
- Si aucune ressource n’est nécessaire, mets recommendedQuantity = 0.
- Ne mets pas missingQuantity négatif.
- Si la ressource affectée est incohérente, signale le problème même si la quantité est supérieure à 0.
- Les quantités recommandées doivent rester réalistes pour une tâche de construction.
- Justifie toute recommandation par la tâche, la phase, la durée, l'historique ou les règles métier.

Règles de risque :
- globalResourceRiskPercent et resourceRiskPercent doivent être entre 0 et 100.
- 0 à 30 = low.
- 31 à 70 = medium.
- 71 à 100 = high.
- globalRiskLevel doit correspondre à globalResourceRiskPercent.
- riskLevel de chaque tâche doit correspondre à resourceRiskPercent.
- Risque élevé si une tâche critique n'a aucune ressource essentielle.
- Risque moyen si les ressources existent mais sont insuffisantes ou partiellement incohérentes.
- Risque faible si les ressources sont cohérentes ou si la tâche ne nécessite pas beaucoup de ressources.
- Ne donne jamais 100 sauf si l'exécution de la tâche est pratiquement impossible avec les ressources actuelles.
- Ne donne jamais 0 si une information importante manque.

Règles pour l'historique des analyses :
- Si un problème actuel était déjà signalé dans resourceAnalysisHistory, mentionne-le dans problems ou taskRecommendation.
- Si un ancien problème n'existe plus dans les données actuelles, ne le considère pas comme problème actuel.
- Si un problème semble aggravé, explique pourquoi.
- Si tu ne peux pas vérifier un ancien problème, ne l'utilise pas comme preuve principale.

Règles de qualité :
- Chaque recommandation doit être précise et applicable.
- Évite les phrases vagues comme "améliorer les ressources".
- Donne des actions concrètes :
  - ajouter un profil précis ;
  - affecter un équipement précis ;
  - prévoir un matériau précis ;
  - vérifier la disponibilité ;
  - remplacer une ressource incohérente ;
  - augmenter ou réduire une quantité.
- Chaque action doit citer un taskId et taskName réels.
- Les priorités doivent commencer à 1.

Données :
${JSON.stringify(data, null, 2)}

Réponds uniquement en JSON valide.
Aucun markdown.
Aucun texte avant ou après JSON.
Toutes les chaînes doivent être en français.
Si une liste n'a aucun élément pertinent, retourne [].
Respecte exactement la structure JSON.
N'ajoute aucune clé non demandée.

Format JSON obligatoire :
{
  "globalResourceRiskPercent": 0,
  "globalRiskLevel": "low | medium | high",
  "summary": "",
  "historicalReferenceUsed": [
    {
      "historicalProjectId": 0,
      "historicalProjectName": "",
      "currentTaskId": 0,
      "currentTaskName": "",
      "similarHistoricalTaskName": "",
      "resourceType": "employee | equipment | material",
      "observedResource": "",
      "observedQuantity": 0,
      "conclusion": ""
    }
  ],
  "tasksAnalysis": [
    {
      "taskId": 0,
      "taskName": "",
      "phaseName": "",
      "resourceRiskPercent": 0,
      "riskLevel": "low | medium | high",
      "employeeResources": [
        {
          "profile": "",
          "assignedQuantity": 0,
          "recommendedQuantity": 0,
          "missingQuantity": 0,
          "reason": "",
          "suggestion": ""
        }
      ],
      "equipmentResources": [
        {
          "equipmentName": "",
          "assignedQuantity": 0,
          "recommendedQuantity": 0,
          "missingQuantity": 0,
          "reason": "",
          "suggestion": ""
        }
      ],
      "materialResources": [
        {
          "materialName": "",
          "unit": "",
          "assignedQuantity": 0,
          "recommendedQuantity": 0,
          "missingQuantity": 0,
          "reason": "",
          "suggestion": ""
        }
      ],
      "problems": [
        {
          "type": "employee | equipment | material | availability | overload",
          "severity": "low | medium | high",
          "problem": "",
          "reason": "",
          "impact": "",
          "preciseCorrection": ""
        }
      ],
      "taskRecommendation": ""
    }
  ],
  "priorityActions": [
    {
      "priority": 1,
      "taskId": 0,
      "taskName": "",
      "action": "",
      "reason": "",
      "expectedImpact": ""
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
        max_tokens: 8000,
      }),
    });

    const rawText = await res.text();

    if (!res.ok) {
      console.error(
        `Erreur OpenRouter HTTP ${res.status} avec ${model}:`,
        rawText,
      );

      throw new Error(
        `Erreur OpenRouter HTTP ${res.status} avec modèle ${model}`,
      );
    }

    let data: {
      choices?: Array<{
        message?: {
          content?: string;
          reasoning?: string;
        };
        finish_reason?: string;
      }>;
      error?: {
        message?: string;
        code?: string;
      };
    };

    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      data = JSON.parse(rawText);
    } catch {
      console.error('Réponse OpenRouter non JSON:', rawText);
      throw new Error(`Réponse OpenRouter non JSON avec modèle ${model}`);
    }

    if (data.error) {
      console.error(`Erreur OpenRouter modèle ${model}:`, data.error);
      throw new Error(
        data.error.message || `Erreur OpenRouter inconnue avec modèle ${model}`,
      );
    }

    const choice = data.choices?.[0];
    const content = choice?.message?.content?.trim();

    if (!content) {
      console.error(`Réponse OpenRouter vide avec modèle ${model}:`, {
        finishReason: choice?.finish_reason,
        rawResponse: data,
      });

      throw new Error(`Réponse vide OpenRouter avec modèle ${model}`);
    }

    return content;
  }

  async analyzeResources(data: unknown) {
    const prompt = this.buildResourceAnalysisPrompt(data);

    const models = [
      this.primaryModel,
      this.fallbackModel,
      process.env.OPENROUTER_SECOND_FALLBACK_MODEL || 'openrouter/free',
    ];

    let lastError: unknown = null;

    for (const model of models) {
      try {
        const response = await this.callOpenRouter(model, prompt);

        const parsed = this.safeParseJson(response) as {
          tasksAnalysis?: unknown;
        };

        if (!parsed.tasksAnalysis) {
          throw new Error('Structure IA invalide : tasksAnalysis manquant');
        }

        return parsed;
      } catch (error) {
        lastError = error;
        console.error(`Erreur analyse ressources avec modèle ${model}:`, error);
      }
    }

    console.error('Toutes les tentatives OpenRouter ont échoué:', lastError);

    throw new InternalServerErrorException(
      'Analyse ressources IA échouée : tous les modèles OpenRouter ont échoué ou ont retourné un JSON invalide.',
    );
  }
}
