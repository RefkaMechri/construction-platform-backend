import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
  constructor(private readonly mailerService: MailerService) {}

  async sendUserCredentials(
    name: string,
    email: string,
    temporaryPassword: string,
  ) {
    await this.mailerService.sendMail({
      to: email,
      subject: '🔐 Vos identifiants de connexion',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; 
                    padding: 24px; border: 1px solid #e0e0e0; border-radius: 8px;">
          <h2 style="color: #333;">Bienvenue, ${name} 👋</h2>
          <p>Votre compte a été créé. Voici vos identifiants :</p>
          <table style="width: 100%; margin: 16px 0;">
            <tr>
              <td style="padding: 8px; font-weight: bold;">📧 Email :</td>
              <td style="padding: 8px;">${email}</td>
            </tr>
            <tr style="background: #f5f5f5;">
              <td style="padding: 8px; font-weight: bold;">🔑 Mot de passe :</td>
              <td style="padding: 8px;">${temporaryPassword}</td>
            </tr>
          </table>
          <p style="color: #e53935; font-size: 13px;">
            ⚠️ Changez votre mot de passe dès la première connexion.
          </p>
        </div>
      `,
    });
  }
  async sendTenantAdminCredentials(
    name: string,
    email: string,
    temporaryPassword: string,
    tenantName: string,
  ) {
    await this.mailerService.sendMail({
      to: email,
      subject: '🔐 Vos identifiants administrateur',
      html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto;
                  padding: 24px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #333;">Bienvenue, ${name} 👋</h2>
        <p>Votre espace <strong>${tenantName}</strong> a été créé avec succès.</p>
        <p>Voici vos identifiants administrateur :</p>
        <table style="width: 100%; margin: 16px 0;">
          <tr>
            <td style="padding: 8px; font-weight: bold;">📧 Email :</td>
            <td style="padding: 8px;">${email}</td>
          </tr>
          <tr style="background: #f5f5f5;">
            <td style="padding: 8px; font-weight: bold;">🔑 Mot de passe :</td>
            <td style="padding: 8px;">${temporaryPassword}</td>
          </tr>
        </table>
        <p style="color: #e53935; font-size: 13px;">
          ⚠️ Changez votre mot de passe dès la première connexion.
        </p>
      </div>
    `,
    });
  }
}
