import { Injectable, InternalServerErrorException } from '@nestjs/common';

@Injectable()
export class OpenRouterPlanningService {
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
Tu es un expert senior en planification, contrôle délais et analyse de risques pour des projets de construction en Tunisie.

Contexte métier :
Tu analyses des plannings de projets de construction contenant des phases, tâches, sous-tâches, jalons, dates prévisionnelles, dates baseline, dépendances et historiques de projets similaires terminés.

Objectif principal :
Analyser UNIQUEMENT selectedProject afin d'identifier :
- les risques de retard réels ;
- les tâches probablement sous-estimées ;
- les tâches probablement surestimées ;
- les jalons à risque ;
- les dépendances manquantes, incohérentes ou dangereuses ;
- les écarts par rapport aux projets historiques terminés ;
- les risques répétés déjà signalés dans les anciennes analyses ;
- les corrections concrètes à appliquer dans le planning.

Données disponibles :
- selectedProject : projet actuel à auditer.
- historicalProjects : projets terminés similaires provenant de la base de données.
- planningAnalysisHistory : anciennes analyses IA du même projet.

Règles strictes d'utilisation des données :
- Analyse uniquement selectedProject.
- Utilise selectedProject comme seule source du planning actuel.
- Utilise historicalProjects uniquement comme référence comparative de durées observées.
- Utilise planningAnalysisHistory uniquement pour identifier les risques déjà détectés, persistants, améliorés ou aggravés.
- N'analyse jamais historicalProjects comme projets actifs.
- N'analyse jamais planningAnalysisHistory comme planning actuel.
- N'invente jamais de phase, tâche, sous-tâche, jalon, date, dépendance ou durée.
- Chaque remarque doit citer un élément réel de selectedProject avec son id et son nom.
- Si une information manque, indique clairement que le risque est basé sur une donnée manquante.
- Si tu n'as pas assez d'évidence pour classer une tâche comme sous-estimée ou surestimée, ne l'ajoute pas dans les listes underestimatedTasks ou overestimatedTasks.

Méthode d'analyse obligatoire :
1. Vérifie la cohérence globale du projet :
   - startDate et endDate du projet ;
   - durée totale du projet ;
   - cohérence entre dates du projet, phases, tâches, sous-tâches et jalons ;
   - écarts entre dates actuelles et baseline si baselineStartDate ou baselineEndDate existent.

2. Analyse les phases :
   - phases très courtes par rapport aux tâches qu'elles contiennent ;
   - phases dont les tâches dépassent les dates de phase ;
   - phases sans tâches ;
   - phases dont la durée est incohérente avec des projets historiques similaires.

3. Analyse les tâches :
   - tâche sans startDate ou endDate ;
   - tâche avec durationDays null, négatif ou très faible ;
   - tâche dont les sous-tâches dépassent sa durée ;
   - tâche liée à un jalon proche ou critique ;
   - tâche qui commence avant la fin de ses prédécesseurs ;
   - tâche sans dépendance alors qu'elle semble logiquement dépendre d'une tâche précédente ;
   - tâche avec durée anormalement courte ou longue par rapport à historicalProjects.

4. Analyse les sous-tâches :
   - sous-tâche hors période de la tâche parent ;
   - sous-tâche avec durée incohérente ;
   - sous-tâches dont la somme ou la logique dépasse la durée de la tâche parent.

5. Analyse les milestones :
   - milestone dont dueDate est avant la fin des tâches associées ;
   - milestone sans tâche associée ;
   - milestone critique proche avec tâches non terminées ;
   - milestone lié à des tâches sous-estimées ou dépendances problématiques.

6. Analyse les dépendances :
   - prédécesseur qui finit après le début de la tâche courante ;
   - dépendance manquante probable entre tâches successives d'une même phase ;
   - lagDays incohérent ;
   - tâche critique sans prédécesseur alors qu'elle semble dépendre d'une préparation précédente ;
   - succession logique construction non respectée.

7. Compare avec historicalProjects :
   - compare uniquement les éléments similaires par nom, type de phase, nature de tâche ou ordre logique ;
   - utilise les durées historiques observées comme référence, pas comme vérité absolue ;
   - si plusieurs références historiques existent, privilégie la tendance la plus fréquente ;
   - si l'historique n'est pas comparable, ne force pas la comparaison ;
   - indique précisément quel projet historique et quelle durée historique soutiennent la conclusion.

8. Compare avec planningAnalysisHistory :
   - identifie les risques répétés ;
   - indique si le risque semble toujours présent, amélioré, aggravé ou non vérifiable ;
   - ne recopie pas aveuglément les anciennes analyses ;
   - valide chaque ancien risque avec l'état actuel de selectedProject.

Règles métier construction en Tunisie :
- Terrassement vient généralement avant fondations.
- Fondations viennent avant élévation, maçonnerie et structure.
- Gros œuvre vient avant second œuvre.
- Électricité et plomberie doivent généralement être coordonnées avant enduit, peinture ou finitions.
- Carrelage vient généralement après chape et avant certaines finitions.
- Peinture vient généralement après enduit et préparation des surfaces.
- Réception ou livraison ne doit pas être planifiée avant la fin des tâches critiques.
- Une tâche technique courte mais dépendante peut créer un risque élevé si elle bloque un jalon.

Règles de calcul du risque :
- Le risque doit être un nombre entre 0 et 100.
- 0 à 30 = low.
- 31 à 65 = medium.
- 66 à 100 = high.
- globalRiskLevel doit correspondre à globalDelayRiskPercent.
- Une incohérence bloquante sur une tâche critique doit avoir un riskPercent élevé.
- Une simple donnée manquante sans impact visible doit avoir un riskPercent modéré ou faible.
- Ne donne pas 100 sauf si le retard ou l'incohérence est quasiment certain.
- Ne donne pas 0 si une date, durée ou dépendance importante est manquante.
- Le risque global doit être cohérent avec les risques détaillés.

Règles pour les durées recommandées :
- recommendedDurationDays doit être un entier positif.
- Pour une tâche sous-estimée :
  recommendedDurationDays > currentDurationDays.
- Pour une tâche surestimée :
  recommendedDurationDays < currentDurationDays.
- differenceDays doit être la différence absolue entre recommendedDurationDays et currentDurationDays.
- Si currentDurationDays est null, ne mets pas la tâche dans underestimatedTasks ou overestimatedTasks ; mets plutôt le problème dans delayRiskReasons ou dependencyIssues.
- La durée recommandée doit être justifiée par :
  - comparaison historique ;
  - logique métier construction ;
  - complexité de la tâche ;
  - sous-tâches associées ;
  - dépendances ou milestone lié.

Règles de qualité des recommandations :
- Chaque recommandation doit être précise, opérationnelle et applicable par un chef de projet.
- Évite les phrases vagues comme "améliorer le planning" ou "suivre la tâche".
- Donne une correction concrète : modifier une date, allonger une durée, ajouter une dépendance, vérifier un jalon, replanifier une tâche.
- Chaque action doit viser un élément réel de selectedProject.
- Ne recommande pas une action générale sans targetElementId.
- Les priorités doivent commencer à 1 et suivre l'ordre d'urgence.

Règles de sortie :
- Réponds uniquement en JSON valide.
- Aucun markdown.
- Aucun texte avant ou après JSON.
- Toutes les chaînes doivent être en français.
- Ne mets jamais de commentaires dans le JSON.
- Ne termine jamais la réponse avant de fermer toutes les accolades JSON.
- Si une liste n'a aucun élément pertinent, retourne une liste vide [].
- Respecte exactement les noms des clés JSON demandées.
- N'ajoute aucune clé en dehors de la structure demandée.

Données :
${JSON.stringify(dataForAI, null, 2)}

Structure JSON obligatoire :
{
  "projectId": 0,
  "projectName": "",
  "projectCode": "",
  "globalDelayRiskPercent": 0,
  "globalRiskLevel": "low | medium | high",
  "summary": "",
  "planningHealth": {
    "hasMissingDates": false,
    "hasBaselineDeviation": false,
    "hasDependencyProblems": false,
    "hasMilestoneProblems": false,
    "hasHistoricalDeviation": false,
    "mainConcern": ""
  },
  "historicalReferenceUsed": [
    {
      "historicalProjectId": 0,
      "historicalProjectName": "",
      "similarElementName": "",
      "historicalDurationDays": 0,
      "currentElementId": 0,
      "currentElementName": "",
      "currentDurationDays": 0,
      "conclusion": ""
    }
  ],
  "previousAnalysisInsights": [
    {
      "previousAnalysisId": 0,
      "createdAt": "",
      "repeatedRisk": "",
      "currentStatus": "still_present | improved | worsened | not_verifiable",
      "evidence": ""
    }
  ],
  "delayRiskReasons": [
    {
      "reason": "",
      "evidence": "",
      "impact": ""
    }
  ],
  "underestimatedTasks": [
    {
      "taskId": 0,
      "taskName": "",
      "currentDurationDays": 0,
      "recommendedDurationDays": 0,
      "differenceDays": 0,
      "riskPercent": 0,
      "reason": "",
      "impact": "",
      "preciseCorrection": ""
    }
  ],
  "overestimatedTasks": [
    {
      "taskId": 0,
      "taskName": "",
      "currentDurationDays": 0,
      "recommendedDurationDays": 0,
      "differenceDays": 0,
      "riskPercent": 0,
      "reason": "",
      "impact": "",
      "preciseCorrection": ""
    }
  ],
  "milestoneRisks": [
    {
      "milestoneId": 0,
      "milestoneName": "",
      "riskPercent": 0,
      "reason": "",
      "relatedTaskIds": [],
      "preciseCorrection": ""
    }
  ],
  "dependencyIssues": [
    {
      "taskId": 0,
      "taskName": "",
      "riskPercent": 0,
      "missingOrProblematicDependency": "",
      "reason": "",
      "preciseCorrection": ""
    }
  ],
  "baselineDeviations": [
    {
      "elementType": "project | phase | task | subtask",
      "elementId": 0,
      "elementName": "",
      "baselineStartDate": "",
      "baselineEndDate": "",
      "currentStartDate": "",
      "currentEndDate": "",
      "delayDays": 0,
      "riskPercent": 0,
      "reason": "",
      "preciseCorrection": ""
    }
  ],
  "dateConsistencyIssues": [
    {
      "elementType": "phase | task | subtask | milestone",
      "elementId": 0,
      "elementName": "",
      "issue": "",
      "evidence": "",
      "riskPercent": 0,
      "preciseCorrection": ""
    }
  ],
  "criticalPathConcerns": [
    {
      "taskId": 0,
      "taskName": "",
      "reason": "",
      "blockingImpact": "",
      "riskPercent": 0,
      "preciseCorrection": ""
    }
  ],
  "improvementSuggestions": [
    {
      "priority": 1,
      "title": "",
      "targetElementType": "project | phase | task | subtask | milestone",
      "targetElementId": 0,
      "targetElementName": "",
      "currentSituation": "",
      "recommendedAction": "",
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
          console.error('Erreur OpenRouter planning:', errorText);

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
          `Tentative OpenRouter planning ${attempt}/${maxAttempts} échouée:`,
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

  async analyzePlanning(dataForAI: unknown) {
    const prompt = this.buildPrompt(dataForAI);

    try {
      const response = await this.callOpenRouter(this.primaryModel, prompt);

      try {
        return this.safeParseJson(response);
      } catch (jsonError) {
        console.error('JSON principal planning invalide:', response);
        throw jsonError;
      }
    } catch (primaryError) {
      console.error('Erreur modèle principal planning:', primaryError);

      try {
        const fallbackResponse = await this.callOpenRouter(
          this.fallbackModel,
          prompt,
        );

        return this.safeParseJson(fallbackResponse);
      } catch (fallbackError) {
        console.error('Erreur modèle fallback planning:', fallbackError);

        throw new InternalServerErrorException(
          'Analyse planning IA échouée : JSON invalide ou erreur OpenRouter',
        );
      }
    }
  }
}
