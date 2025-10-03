import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'node:path';
import { AppModule } from './app.module';
import logger from './shared/utils/logger';
import * as process from 'node:process';
import { connectDB } from './shared/database/db';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Get the config service to access environment variables properly
  const configService = app.get(ConfigService);

  // ENV fayldan port va IP ni to'g'ri o'qish
  const port = parseInt(configService.get<string>('APP_PORT') || '8989', 10);
  const serverIP = configService.get<string>('SERVER_IP') || '0.0.0.0';
  const baseURL = configService.get<string>('BASE_URL');

  console.log(`🔍 ENV APP_PORT: ${process.env.APP_PORT}`);
  console.log(`🔍 ENV SERVER_IP: ${process.env.SERVER_IP}`);
  console.log(`🔍 ENV BASE_URL: ${process.env.BASE_URL}`);
  console.log(`🔍 Final port: ${port}`);
  console.log(`🔍 Final server IP: ${serverIP}`);

  // Additional debug logging
  console.log(`🔍 About to listen on: ${serverIP}:${port}`);
  console.log(`🔍 serverIP type: ${typeof serverIP}`);
  console.log(`🔍 serverIP length: ${serverIP?.length}`);
  console.log(`🔍 serverIP === '213.230.110.176': ${serverIP === '213.230.110.176'}`);

  app.setGlobalPrefix('api');

  await connectDB();

  app.useStaticAssets(join(process.cwd(), 'public'));
  app.setViewEngine('ejs');
  app.setBaseViewsDir(join(process.cwd(), 'view'));

  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  logger.info(`Starting application on ${serverIP}:${port}`);

  try {
    // ENV fayldan olingan IP da listen qilish
    await app.listen(port, serverIP);

    logger.info(`✅ Server muvaffaqiyatli ishga tushdi: ${baseURL}`);
    console.log(`✅ Server muvaffaqiyatli ishga tushdi: ${baseURL}`);
    console.log(`🚀 Local: http://localhost:${port}/api`);
    console.log(`🌐 Network: ${baseURL}/api`);
    console.log(`📞 Click callback: ${baseURL}/api/click`);
    console.log(`💳 Payme callback: ${baseURL}/api/payme`);
  } catch (error) {
    logger.error(`❌ Failed to start application on ${serverIP}:${port}:`, error);
    throw error;
  }
}

bootstrap().catch((error) => {
  logger.error('Fatal error during bootstrap', error);
  process.exit(1);
});
