import { Injectable, InternalServerErrorException } from '@nestjs/common';

@Injectable()
export class OllamaResourceService {
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

  private buildResourceAnalysisPrompt(data: unknown): string {
    return `
Tu es un expert senior en gestion des ressources pour chantiers de construction en Tunisie.

Objectif :
Analyser UNIQUEMENT currentProject.tasks.

historicalProjects contient des projets terminés similaires venant de la base de données.
Utilise historicalProjects uniquement comme référence historique pour améliorer les recommandations :
- profils employés souvent utilisés pour des tâches similaires
- équipements souvent utilisés pour des tâches similaires
- matériaux souvent utilisés pour des tâches similaires
- quantités observées dans des tâches similaires

Interdictions :
- N'analyse jamais historicalProjects comme projets à auditer.
- N'invente jamais de tâche, projet, ressource ou affectation.
- N'utilise jamais des exemples comme "Task 1", "Project 1", "Equipment 1".
- Ne propose une ressource que si elle est cohérente avec la tâche courante.
- Si historicalProjects est vide, analyse uniquement selon les règles métier.

Données :
${JSON.stringify(data, null, 2)}

Règles métier Tunisie :
- Terrassement : conducteur d’engin, manœuvre, chef d’équipe. Équipements : pelle mécanique, camion benne, compacteur.
- Fondations : maçon, coffreur, ferrailleur, aide-maçon. Matériaux : béton, acier, ciment, gravier, sable. Équipements : bétonnière, vibrateur béton.
- Maçonnerie : maçon, aide-maçon. Matériaux : brique, ciment, sable.
- Électricité : électricien seulement si tâche électrique.
- Plomberie : plombier seulement si tâche plomberie.
- Peinture : peintre, manœuvre.
- Carrelage : carreleur, aide-maçon.

Pour chaque tâche :
- compare ressources affectées vs ressources recommandées
- utilise l'historique seulement comme référence
- cite les projets historiques utilisés si pertinent
- donne les ressources manquantes
- donne une correction précise
- si aucune ressource n’est nécessaire, mets recommendedQuantity = 0

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

  async analyzeResources(data: unknown) {
    const prompt = this.buildResourceAnalysisPrompt(data);

    const res = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(300000),
      body: JSON.stringify({
        model: process.env.OLLAMA_MODEL || 'llama3.1:8b',
        prompt,
        stream: false,
        format: 'json',
        options: {
          temperature: 0,
          num_predict: 2500,
        },
      }),
    });

    if (!res.ok) {
      throw new InternalServerErrorException('Erreur Ollama');
    }

    const dataRes = (await res.json()) as { response?: string };

    if (!dataRes.response) {
      throw new InternalServerErrorException('Réponse Ollama vide');
    }

    try {
      const parsed = JSON.parse(this.extractJson(dataRes.response)) as {
        tasksAnalysis?: unknown;
      };

      if (!parsed.tasksAnalysis) {
        throw new Error('Structure IA invalide');
      }

      return parsed;
    } catch {
      console.log('Réponse brute Ollama:', dataRes.response);
      throw new InternalServerErrorException('JSON invalide IA');
    }
  }
}
