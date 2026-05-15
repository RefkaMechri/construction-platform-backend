import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

import { CreateAnomalieDto } from '../dto/create-anomalie.dto';
import { UpdateAnomalieDto } from '../dto/update-anomalie.dto';
import { AnomalieService } from '../services/anomalie.service';

@Controller('anomalies')
export class AnomalieController {
  constructor(private readonly anomalieService: AnomalieService) {}

  @Post('upload')
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: diskStorage({
        destination: './uploads/anomalies',
        filename: (_req, file, callback) => {
          const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1e9);

          const extension =
            extname(file.originalname) ||
            file.mimetype.replace('image/', '.').replace('jpeg', 'jpg');

          callback(null, `${uniqueName}${extension}`);
        },
      }),
      fileFilter: (_req, file, callback) => {
        if (!file.mimetype.match(/^image\/(jpg|jpeg|png|webp)$/)) {
          return callback(
            new Error('Seules les images sont autorisées.'),
            false,
          );
        }
        callback(null, true);
      },
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
    }),
  )
  uploadFiles(@UploadedFiles() files?: Express.Multer.File[]) {
    if (!files || files.length === 0) {
      throw new BadRequestException('Aucun fichier reçu.');
    }

    const baseUrl = process.env.API_PUBLIC_URL || 'http://localhost:8081';

    return files.map((file) => ({
      filename: file.filename,
      url: `${baseUrl}/uploads/anomalies/${file.filename}`,
    }));
  }

  @Post()
  create(@Body() dto: CreateAnomalieDto) {
    return this.anomalieService.create(dto);
  }

  @Get()
  findAll() {
    return this.anomalieService.findAll();
  }

  @Get('task/:taskId')
  findByTask(@Param('taskId', ParseIntPipe) taskId: number) {
    return this.anomalieService.findByTask(taskId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.anomalieService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAnomalieDto,
  ) {
    return this.anomalieService.update(id, dto);
  }

  @Patch(':id/resolve')
  resolve(@Param('id', ParseIntPipe) id: number) {
    return this.anomalieService.resolve(id);
  }

  @Patch(':id/reopen')
  reopen(@Param('id', ParseIntPipe) id: number) {
    return this.anomalieService.reopen(id);
  }

  @Delete(':id')
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.anomalieService.delete(id);
  }
}
