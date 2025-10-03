import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import {UzCardApiController} from "./uzcard.controller";
import {UzCardApiService} from "./uzcard.service";

@Module({
  imports: [
    HttpModule,
    ConfigModule
  ],
  controllers: [UzCardApiController],
  providers: [UzCardApiService],
  exports: [UzCardApiService]
})
export class UzCardApiModule {}