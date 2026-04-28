import { Injectable, InternalServerErrorException } from '@nestjs/common';

@Injectable()
export class OllamaImpactReportService {
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

  async generateReport(simulation: unknown) {
    const prompt = ` 
Tu es un expert senior en planification de projets de construction en Tunisie dans le domaine du BTP.

Analyse cette simulation de modification des dates d'une tâche.
Le backend a déjà calculé les tâches affectées et le décalage du projet.

Important :
- L’impact d’une modification n’est pas forcément négatif.
- Il peut y avoir :
  * un gain (optimisation du planning)
  * aucun impact (tâche non critique)
  * un risque (retard, effet domino)

Ton rôle :
- qualifier l’impact (positif, neutre ou négatif)
- expliquer clairement les conséquences
- identifier les tâches dépendantes affectées
- évaluer le niveau de risque réel (pas systématiquement élevé)
- proposer des recommandations concrètes et actionnables
- déterminer si la modification est pertinente

Règles d’analyse :
- Si la tâche n’est pas sur le chemin critique → risque faible
- Si la modification réduit la durée globale → impact positif
- Si elle crée un décalage en chaîne → analyser la propagation
- Ne pas exagérer le risque inutilement
- Justifier chaque conclusion

Simulation :
${JSON.stringify(simulation, null, 2)}

Réponds uniquement en JSON valide :

{
  "impactType": "positive | neutral | negative",
  "riskPercent": 0,
  "riskLevel": "low | medium | high",
  "executiveSummary": "",
  "impactAnalysis": "",
  "affectedTasksAnalysis": [
    {
      "taskId": 0,
      "taskName": "",
      "impact": "",
      "risk": "",
      "recommendation": ""
    }
  ],
  "recommendations": [
    {
      "priority": 1,
      "action": "",
      "reason": ""
    }
  ],
  "decisionSupport": {
    "isChangeRecommended": true,
    "reason": ""
  }
}
`;

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
      throw new InternalServerErrorException('Erreur appel Ollama.');
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const data = await res.json();

    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
      return JSON.parse(this.extractJson(data.response));
    } catch {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      console.log('Réponse brute Ollama:', data.response);
      throw new InternalServerErrorException('JSON IA invalide.');
    }
  }
}
