import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Swagger config
  const config = new DocumentBuilder()
    .setTitle('Construction Platform API')
    .setDescription('API documentation for the Construction Platform backend')
    .setVersion('1.0')
    .addBearerAuth() // Pour JWT si tu l’ajoutes plus tard
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document); // URL: /docs

  await app.listen(3000);
}
bootstrap();
