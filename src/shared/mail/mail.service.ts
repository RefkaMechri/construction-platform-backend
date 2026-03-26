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
  async sendResetPasswordEmail(email: string, resetLink: string) {
    await this.mailerService.sendMail({
      to: email,
      subject: '🔒 Réinitialisation du mot de passe',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto;
                    padding: 24px; border: 1px solid #e0e0e0; border-radius: 8px;">
          <h2 style="color: #333;">Réinitialisation du mot de passe</h2>
          <p>Vous avez demandé la réinitialisation de votre mot de passe.</p>
          <p>Cliquez sur le bouton ci-dessous pour définir un nouveau mot de passe :</p>

          <div style="margin: 24px 0; text-align: center;">
            <a href="${resetLink}"
               style="display: inline-block; background: #2563eb; color: white;
                      text-decoration: none; padding: 12px 20px; border-radius: 6px;
                      font-weight: bold;">
              Réinitialiser mon mot de passe
            </a>
          </div>

          <p style="font-size: 14px; color: #555;">
            Ou copiez-collez ce lien dans votre navigateur :
          </p>
          <p style="word-break: break-all; font-size: 13px; color: #2563eb;">
            ${resetLink}
          </p>

          <p style="color: #e53935; font-size: 13px; margin-top: 20px;">
            ⚠️ Ce lien expire dans 15 minutes.
          </p>

          <p style="font-size: 13px; color: #777;">
            Si vous n’êtes pas à l’origine de cette demande, ignorez cet email.
          </p>
        </div>
      `,
    });
  }
}
