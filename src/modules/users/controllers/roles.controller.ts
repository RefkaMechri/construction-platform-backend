import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../middlewares/jwt-auth.guard';

@Controller('admin/roles')
@UseGuards(JwtAuthGuard)
export class RolesController {
  @Get()
  getRoles() {
    return [
      {
        name: 'Admin entreprise',
        description: 'Gère les utilisateurs et les paramètres de l’entreprise.',
        permissions: [
          'Gérer utilisateurs',
          'Voir projets',
          'Modifier projets',
          'Voir planning',
        ],
      },
      {
        name: 'Directeur',
        description: 'Supervise les projets et consulte les rapports.',
        permissions: ['Voir projets', 'Voir rapports'],
      },
      {
        name: 'Chef de projet',
        description: 'Gère les projets et les tâches.',
        permissions: ['Créer projets', 'Modifier projets', 'Voir planning'],
      },
      {
        name: 'Conducteur de travaux',
        description: 'Suit l’exécution des travaux sur le chantier.',
        permissions: ['Voir projets', 'Voir planning'],
      },
      {
        name: 'Responsable ressources',
        description: 'Gère les ressources humaines et matérielles.',
        permissions: ['Gérer ressources', 'Voir projets'],
      },
      {
        name: 'Responsable budget',
        description: 'Suit les budgets et les dépenses.',
        permissions: ['Voir budget', 'Modifier budget'],
      },
    ];
  }
}
