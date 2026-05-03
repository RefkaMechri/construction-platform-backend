import { Injectable, InternalServerErrorException } from '@nestjs/common';

@Injectable()
export class OllamaPlanningService {
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

  async analyzePlanning(dataForAI: unknown) {
    const prompt = `
Tu es un expert senior en planification de projets de construction en Tunisie.

Objectif :
Analyser UNIQUEMENT selectedProject.
historicalProjects contient des projets terminés similaires provenant de la base de données.
Utilise historicalProjects uniquement comme référence pour comparer les durées réelles observées.
N'analyse jamais historicalProjects comme projets à auditer.
N'invente aucune phase, tâche, sous-tâche ou milestone.
Chaque remarque doit citer un élément réel de selectedProject avec son id et son nom.

Règles :
- Le risque doit être un nombre entre 0 et 100.
- Si une tâche est sous-estimée, donne une durée recommandée en jours.
- Si une tâche est surestimée, donne une durée recommandée en jours.
- Les recommandations doivent être précises et actionnables.
- Si historicalProjects est vide, base l'analyse uniquement sur selectedProject.
- Réponds uniquement en JSON valide.
- Aucun markdown.
- Aucun texte avant ou après JSON.

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

    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.OLLAMA_MODEL || 'llama3.1:8b',
        prompt,
        stream: false,
        format: 'json',
        options: {
          temperature: 0.1,
          num_predict: 2500,
        },
      }),
    });

    if (!response.ok) {
      throw new InternalServerErrorException('Erreur appel Ollama.');
    }

    const data = (await response.json()) as { response?: string };
    const rawText = data.response;

    if (!rawText) {
      throw new InternalServerErrorException('Réponse Ollama vide.');
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return JSON.parse(this.extractJson(rawText));
    } catch {
      console.log('Réponse brute Ollama:', rawText);
      throw new InternalServerErrorException(
        'Réponse Ollama invalide : JSON non parsable.',
      );
    }
  }
}
