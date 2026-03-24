/* eslint-disable @typescript-eslint/no-unsafe-call */
import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SUPER_ADMIN_EMAIL || 'admin@test.com';
  const plainPassword = process.env.SUPER_ADMIN_PASSWORD || '123456';
  const hashedPassword = await bcrypt.hash(plainPassword, 10);

  // -----------------------------
  // Super Admin
  // -----------------------------
  const superAdmin = await prisma.user.upsert({
    where: { email },
    update: {
      name: 'Super Admin',
      password: hashedPassword,
      role: Role.SUPER_ADMIN,
      tenantId: null,
    },
    create: {
      name: 'Super Admin',
      email,
      password: hashedPassword,
      role: Role.SUPER_ADMIN,
      tenantId: null,
    },
  });

  console.log('Super Admin ready:', {
    id: superAdmin.id,
    email: superAdmin.email,
    role: superAdmin.role,
  });

  // -----------------------------
  // Reset popular flag for plans
  // -----------------------------
  await prisma.subscriptionPlan.updateMany({
    data: {
      isPopular: false,
    },
  });

  // -----------------------------
  // Subscription Plans
  // -----------------------------
  await prisma.subscriptionPlan.upsert({
    where: { name: 'Basic' },
    update: {
      price: 49,
      period: '/mois',
      icon: 'box',
      isPopular: false,
      usersLimit: '5',
      projectsLimit: '10',
      storageLimit: '10 GB',
      supportType: 'Email',
      features: [
        'Gestion de projets',
        'Planning de base',
        'Suivi des coûts',
        '10 GB de stockage',
        'Support par email',
      ],
    },
    create: {
      name: 'Basic',
      price: 49,
      period: '/mois',
      icon: 'box',
      isPopular: false,
      usersLimit: '5',
      projectsLimit: '10',
      storageLimit: '10 GB',
      supportType: 'Email',
      features: [
        'Gestion de projets',
        'Planning de base',
        'Suivi des coûts',
        '10 GB de stockage',
        'Support par email',
      ],
    },
  });

  await prisma.subscriptionPlan.upsert({
    where: { name: 'Professional' },
    update: {
      price: 199,
      period: '/mois',
      icon: 'box',
      isPopular: true,
      usersLimit: '25',
      projectsLimit: '50',
      storageLimit: '100 GB',
      supportType: 'Prioritaire',
      features: [
        'Tout Basic +',
        'Gestion des ressources',
        'Planning Gantt',
        'Rapports avancés',
        '100 GB de stockage',
        'Support prioritaire',
      ],
    },
    create: {
      name: 'Professional',
      price: 199,
      period: '/mois',
      icon: 'box',
      isPopular: true,
      usersLimit: '25',
      projectsLimit: '50',
      storageLimit: '100 GB',
      supportType: 'Prioritaire',
      features: [
        'Tout Basic +',
        'Gestion des ressources',
        'Planning Gantt',
        'Rapports avancés',
        '100 GB de stockage',
        'Support prioritaire',
      ],
    },
  });

  await prisma.subscriptionPlan.upsert({
    where: { name: 'Enterprise' },
    update: {
      price: 499,
      period: '/mois',
      icon: 'crown',
      isPopular: false,
      usersLimit: 'Illimité',
      projectsLimit: 'Illimité',
      storageLimit: 'Illimité',
      supportType: 'Dédié 24/7',
      features: [
        'Tout Professional +',
        'Utilisateurs illimités',
        'Projets illimités',
        'Stockage illimité',
        'API personnalisée',
        'Support dédié 24/7',
        'Formation personnalisée',
      ],
    },
    create: {
      name: 'Enterprise',
      price: 499,
      period: '/mois',
      icon: 'crown',
      isPopular: false,
      usersLimit: 'Illimité',
      projectsLimit: 'Illimité',
      storageLimit: 'Illimité',
      supportType: 'Dédié 24/7',
      features: [
        'Tout Professional +',
        'Utilisateurs illimités',
        'Projets illimités',
        'Stockage illimité',
        'API personnalisée',
        'Support dédié 24/7',
        'Formation personnalisée',
      ],
    },
  });

  console.log('Subscription plans seeded successfully.');

  // -----------------------------
  // Feature Modules
  // -----------------------------
  await prisma.featureModule.upsert({
    where: { name: 'Gestion de Projets' },
    update: {
      description: 'Créez et gérez vos projets de construction de A à Z',
      icon: 'briefcase',
      category: 'projects',
      isBaseModule: true,
      starterEnabled: true,
      professionalEnabled: true,
      enterpriseEnabled: true,
      features: [
        'Création et suivi de projets',
        'Phases et jalons',
        "Suivi de l'avancement",
        'Informations clients',
        'Documents associés',
      ],
    },
    create: {
      name: 'Gestion de Projets',
      description: 'Créez et gérez vos projets de construction de A à Z',
      icon: 'briefcase',
      category: 'projects',
      isBaseModule: true,
      starterEnabled: true,
      professionalEnabled: true,
      enterpriseEnabled: true,
      features: [
        'Création et suivi de projets',
        'Phases et jalons',
        "Suivi de l'avancement",
        'Informations clients',
        'Documents associés',
      ],
    },
  });

  await prisma.featureModule.upsert({
    where: { name: 'Planning & Gantt' },
    update: {
      description:
        'Planifiez vos tâches avec des diagrammes de Gantt interactifs',
      icon: 'calendar',
      category: 'planning',
      isBaseModule: false,
      starterEnabled: false,
      professionalEnabled: true,
      enterpriseEnabled: true,
      features: [
        'Diagramme de Gantt',
        'Dépendances entre tâches',
        "Calendrier d'équipe",
        'Vue timeline',
        'Export PDF',
      ],
    },
    create: {
      name: 'Planning & Gantt',
      description:
        'Planifiez vos tâches avec des diagrammes de Gantt interactifs',
      icon: 'calendar',
      category: 'planning',
      isBaseModule: false,
      starterEnabled: false,
      professionalEnabled: true,
      enterpriseEnabled: true,
      features: [
        'Diagramme de Gantt',
        'Dépendances entre tâches',
        "Calendrier d'équipe",
        'Vue timeline',
        'Export PDF',
      ],
    },
  });

  await prisma.featureModule.upsert({
    where: { name: 'Gestion des Coûts' },
    update: {
      description: 'Suivez budgets, dépenses et rentabilité en temps réel',
      icon: 'budget',
      category: 'budget',
      isBaseModule: true,
      starterEnabled: true,
      professionalEnabled: true,
      enterpriseEnabled: true,
      features: [
        'Budgets par projet',
        'Suivi des dépenses',
        'Prévision des coûts',
        'Alertes de dépassement',
        'Rapports financiers',
      ],
    },
    create: {
      name: 'Gestion des Coûts',
      description: 'Suivez budgets, dépenses et rentabilité en temps réel',
      icon: 'budget',
      category: 'budget',
      isBaseModule: true,
      starterEnabled: true,
      professionalEnabled: true,
      enterpriseEnabled: true,
      features: [
        'Budgets par projet',
        'Suivi des dépenses',
        'Prévision des coûts',
        'Alertes de dépassement',
        'Rapports financiers',
      ],
    },
  });

  await prisma.featureModule.upsert({
    where: { name: 'Gestion des Ressources' },
    update: {
      description: 'Gérez équipes, équipements et matériaux efficacement',
      icon: 'users',
      category: 'resources',
      isBaseModule: false,
      starterEnabled: false,
      professionalEnabled: true,
      enterpriseEnabled: true,
      features: [
        'Allocation des équipes',
        'Suivi des équipements',
        'Disponibilités',
        'Gestion des matériaux',
        'Charge de travail',
      ],
    },
    create: {
      name: 'Gestion des Ressources',
      description: 'Gérez équipes, équipements et matériaux efficacement',
      icon: 'users',
      category: 'resources',
      isBaseModule: false,
      starterEnabled: false,
      professionalEnabled: true,
      enterpriseEnabled: true,
      features: [
        'Allocation des équipes',
        'Suivi des équipements',
        'Disponibilités',
        'Gestion des matériaux',
        'Charge de travail',
      ],
    },
  });

  await prisma.featureModule.upsert({
    where: { name: 'Rapports Avancés' },
    update: {
      description:
        'Analysez vos performances avec des tableaux de bord détaillés',
      icon: 'chart',
      category: 'analytics',
      isBaseModule: false,
      starterEnabled: false,
      professionalEnabled: true,
      enterpriseEnabled: true,
      features: [
        'Tableaux de bord avancés',
        'Exports CSV/PDF',
        'Statistiques projets',
        'Analyse des coûts',
        'Indicateurs de performance',
      ],
    },
    create: {
      name: 'Rapports Avancés',
      description:
        'Analysez vos performances avec des tableaux de bord détaillés',
      icon: 'chart',
      category: 'analytics',
      isBaseModule: false,
      starterEnabled: false,
      professionalEnabled: true,
      enterpriseEnabled: true,
      features: [
        'Tableaux de bord avancés',
        'Exports CSV/PDF',
        'Statistiques projets',
        'Analyse des coûts',
        'Indicateurs de performance',
      ],
    },
  });

  await prisma.featureModule.upsert({
    where: { name: 'API Personnalisée' },
    update: {
      description: 'Connectez la plateforme à vos systèmes externes',
      icon: 'api',
      category: 'integration',
      isBaseModule: false,
      starterEnabled: false,
      professionalEnabled: false,
      enterpriseEnabled: true,
      features: [
        'Accès API sécurisé',
        'Webhooks',
        'Intégration ERP/CRM',
        'Synchronisation avancée',
        'Support technique dédié',
      ],
    },
    create: {
      name: 'API Personnalisée',
      description: 'Connectez la plateforme à vos systèmes externes',
      icon: 'api',
      category: 'integration',
      isBaseModule: false,
      starterEnabled: false,
      professionalEnabled: false,
      enterpriseEnabled: true,
      features: [
        'Accès API sécurisé',
        'Webhooks',
        'Intégration ERP/CRM',
        'Synchronisation avancée',
        'Support technique dédié',
      ],
    },
  });

  console.log('Feature modules seeded successfully.');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
