import { Injectable, InternalServerErrorException } from '@nestjs/common';

@Injectable()
export class OllamaPlanningService {
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

  async analyzePlanning(planning: unknown) {
    const prompt = `
Tu es un expert senior en planification de projets de construction dans la pays tunisie.

Analyse UNIQUEMENT le planning fourni.
N'invente aucune phase, tâche, sous-tâche ou milestone.
Chaque remarque doit citer un élément réel du planning avec son id et son nom.

Objectif :
- calculer un pourcentage de risque de retard global
- détecter les tâches sous-estimées
- détecter les tâches surestimées
- expliquer les raisons précises
- proposer une durée corrigée quand c'est nécessaire
- proposer des améliorations concrètes et actionnables

Règles importantes :
- Ne donne pas de phrases générales.
- Si une tâche est sous-estimée, donne une durée recommandée en jours.
- Si une tâche est surestimée, donne une durée recommandée en jours.
- Si une milestone est risquée, explique pourquoi avec les tâches concernées.
- Les suggestions doivent être précises : quelle tâche modifier, quelle durée, quelle dépendance ou quelle action.
- Le risque doit être un nombre entre 0 et 100.
- Réponds uniquement en JSON valide. Pas de markdown. Pas de texte avant ou après.

Planning :
${JSON.stringify(planning, null, 2)}

Structure JSON obligatoire :
{
  "globalDelayRiskPercent": 0,
  "globalRiskLevel": "low | medium | high",
  "summary": "",
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
          num_predict: 1200,
        },
      }),
    });

    if (!response.ok) {
      throw new InternalServerErrorException('Erreur appel Ollama.');
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const data = await response.json();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const rawText = data.response;

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
