import { Injectable, InternalServerErrorException } from '@nestjs/common';

@Injectable()
export class OpenRouterPortfolioService {
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

  private buildPrompt(data: unknown): string {
    return `
Tu es un expert senior en gestion multi-projets de construction en Tunisie.

Objectif principal :
Analyser les projets EN_COURS et proposer des décisions précises de priorisation des ressources :
- réaffectation des employés
- réaffectation des équipements
- identification des pénuries critiques
- actions prioritaires pour réduire les retards

Données disponibles :
- currentProjects : projets actuellement EN_COURS
- historicalProjects : projets TERMINE utilisés uniquement comme référence historique
- availableEmployees : employés disponibles ou déjà affectés
- availableEquipment : équipements disponibles ou déjà affectés

Règles strictes :
- Analyse uniquement currentProjects.
- N'analyse jamais historicalProjects comme projets actifs.
- Utilise historicalProjects seulement pour comparer les besoins réels observés.
- N'invente jamais de projet, tâche, employé, équipement ou ressource.
- Chaque action doit citer des IDs réels présents dans les données.
- Chaque recommandation doit préciser la tâche cible exacte.
- Ne propose pas de réaffectation si le projet source devient plus critique que le projet cible.
- Ne donne jamais une raison vague comme "réduire le risque global".
- Chaque justification doit être compréhensible par un chef de projet humain sans interprétation.

Critères de priorité :
1. Tâche urgente avec date proche.
2. Tâche sans ressource affectée.
3. Tâche avec milestone proche.
4. Projet avec retard ou risque plus élevé.
5. Ressource rare.
6. Possibilité de déplacer la ressource sans bloquer le projet source.

Pour chaque réaffectation employé, tu dois expliquer :
- quel employé ou profil déplacer
- de quel projet source
- vers quel projet cible
- vers quelle tâche exacte
- pourquoi cette tâche est prioritaire
- pourquoi prendre depuis ce projet source
- combien de ressources sont actuellement affectées
- combien sont recommandées
- l'impact attendu
- le risque si l'action n'est pas appliquée

Pour chaque réaffectation équipement, tu dois expliquer :
- quel équipement déplacer
- de quel projet source
- vers quel projet cible
- vers quelle tâche exacte
- pourquoi cette tâche est prioritaire
- pourquoi cet équipement est pertinent
- pourquoi le projet source peut s'en passer
- l'impact attendu
- le risque si l'action n'est pas appliquée

Règles métier Tunisie :
- Terrassement : conducteur d’engin, manœuvre, chef d’équipe. Équipements : pelle mécanique, camion benne, compacteur.
- Fondations : maçon, coffreur, ferrailleur, aide-maçon. Matériaux : béton, acier, ciment, gravier, sable. Équipements : bétonnière, vibrateur béton.
- Maçonnerie : maçon, aide-maçon. Matériaux : brique, ciment, sable.
- Électricité : électricien uniquement pour tâche électrique.
- Plomberie : plombier uniquement pour tâche plomberie.
- Peinture : peintre, manœuvre.
- Carrelage : carreleur, aide-maçon.

Données :
${JSON.stringify(data, null, 2)}

Réponds uniquement avec un JSON valide.
Aucun markdown.
Aucun texte avant ou après.
Ne termine jamais la réponse avant de fermer toutes les accolades JSON.

Structure JSON obligatoire :
{
  "portfolioResourceRiskPercent": 0,
  "globalRiskLevel": "low | medium | high",
  "summary": "",
  "criticalProjects": [
    {
      "projectId": 0,
      "projectName": "",
      "riskPercent": 0,
      "priority": 1,
      "mainCriticalTaskId": 0,
      "mainCriticalTaskName": "",
      "reason": "",
      "businessImpact": ""
    }
  ],
  "employeeReallocationActions": [
    {
      "priority": 1,
      "employeeId": 0,
      "employeeName": "",
      "employeeProfile": "",
      "fromProjectId": 0,
      "fromProjectName": "",
      "fromTaskId": 0,
      "fromTaskName": "",
      "toProjectId": 0,
      "toProjectName": "",
      "targetTaskId": 0,
      "targetTaskName": "",
      "taskStartDate": "",
      "taskEndDate": "",
      "currentAssignedEmployees": 0,
      "recommendedEmployees": 0,
      "missingEmployees": 0,
      "reason": "",
      "whyThisSourceProject": "",
      "whyThisTargetProject": "",
      "expectedImpact": "",
      "riskIfNotApplied": ""
    }
  ],
  "equipmentReallocationActions": [
    {
      "priority": 1,
      "equipmentId": 0,
      "equipmentName": "",
      "equipmentCategory": "",
      "fromProjectId": 0,
      "fromProjectName": "",
      "fromTaskId": 0,
      "fromTaskName": "",
      "toProjectId": 0,
      "toProjectName": "",
      "targetTaskId": 0,
      "targetTaskName": "",
      "taskStartDate": "",
      "taskEndDate": "",
      "currentAssignedEquipment": 0,
      "recommendedEquipment": 0,
      "missingEquipment": 0,
      "reason": "",
      "whyThisSourceProject": "",
      "whyThisTargetProject": "",
      "expectedImpact": "",
      "riskIfNotApplied": ""
    }
  ],
  "resourcesShortage": [
    {
      "resourceType": "employee | equipment",
      "resourceName": "",
      "missingQuantity": 0,
      "affectedProjectIds": [],
      "affectedTaskIds": [],
      "reason": "",
      "recommendedAction": ""
    }
  ],
  "priorityActions": [
    {
      "priority": 1,
      "projectId": 0,
      "projectName": "",
      "taskId": 0,
      "taskName": "",
      "actionType": "employee_reallocation | equipment_reallocation | recruitment | rental | keep_resource",
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
                  'Tu réponds uniquement en JSON valide. Aucun markdown. Aucun texte hors JSON.',
              },
              {
                role: 'user',
                content: prompt,
              },
            ],
            temperature: 0.1,
            max_tokens: 12000,
          }),
        });

        if (!res.ok) {
          const errorText = await res.text();
          console.error('Erreur OpenRouter:', errorText);

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
          `Tentative OpenRouter ${attempt}/${maxAttempts} échouée:`,
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

  async analyzePortfolio(data: unknown) {
    const prompt = this.buildPrompt(data);

    try {
      const response = await this.callOpenRouter(this.primaryModel, prompt);
      try {
        return this.safeParseJson(response);
      } catch (jsonError) {
        console.error('JSON principal invalide:', response);
        throw jsonError;
      }
    } catch (primaryError) {
      console.error('Erreur modèle principal:', primaryError);

      try {
        const fallbackResponse = await this.callOpenRouter(
          this.fallbackModel,
          prompt,
        );

        return this.safeParseJson(fallbackResponse);
      } catch (fallbackError) {
        console.error('Erreur modèle fallback:', fallbackError);

        throw new InternalServerErrorException(
          'Analyse IA échouée : JSON invalide ou erreur OpenRouter',
        );
      }
    }
  }
}
