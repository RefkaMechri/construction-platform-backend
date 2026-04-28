import { Injectable, InternalServerErrorException } from '@nestjs/common';

@Injectable()
export class OllamaResourceService {
  private extractJson(text: string) {
    const cleaned = text
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();

    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');

    if (start === -1 || end === -1) {
      throw new Error('JSON non trouvé');
    }

    return cleaned.substring(start, end + 1);
  }

  private buildResourceAnalysisPrompt(data: unknown): string {
    return `
Tu es un expert senior en gestion des ressources pour chantiers de construction en Tunisie.

Analyse uniquement les tâches fournies.
N'invente jamais de tâche, projet, ressource ou affectation.
N'utilise jamais des exemples comme "Task 1", "Project 1", "Equipment 1".
Retourne uniquement le JSON demandé.

Données à analyser :
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
- donne les ressources manquantes
- donne une correction précise
- si aucune ressource n’est nécessaire, mets recommendedQuantity = 0

Format JSON obligatoire :
{
  "globalResourceRiskPercent": 0,
  "globalRiskLevel": "low | medium | high",
  "summary": "",
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
  "priorityActions": []
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
          num_predict: 1200,
        },
      }),
    });

    if (!res.ok) {
      throw new InternalServerErrorException('Erreur Ollama');
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const dataRes = await res.json();

    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
      const parsed = JSON.parse(this.extractJson(dataRes.response));

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (!parsed.tasksAnalysis) {
        throw new Error('Structure IA invalide');
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return parsed;
    } catch {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      console.log('Réponse brute Ollama:', dataRes.response);
      throw new InternalServerErrorException('JSON invalide IA');
    }
  }
}
