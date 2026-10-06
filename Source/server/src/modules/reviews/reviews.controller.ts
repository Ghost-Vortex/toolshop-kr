import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { AuthUser } from '../../common/interfaces/auth-user.interface';
import { CreateReviewDto } from './dto/create-review.dto';
import { Review } from './entities/review.entity';
import { ReviewsService } from './reviews.service';

/** Контроллер отзывов о товарах */
@ApiTags('Отзывы')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get('product/:productId')
  @Public()
  @ApiOperation({ summary: 'Отзывы о товаре' })
  @ApiOkResponse({ description: 'Список отзывов' })
  findByProduct(
    @Param('productId', new ParseUUIDPipe({ version: '4' })) productId: string,
  ): Review[] {
    return this.reviewsService.findByProduct(productId);
  }

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Публикация отзыва' })
  @ApiCreatedResponse({ description: 'Отзыв опубликован' })
  @ApiConflictResponse({ description: 'Отзыв на этот товар уже оставлен' })
  create(@Body() dto: CreateReviewDto, @CurrentUser() author: AuthUser): Review {
    return this.reviewsService.create(dto, author);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Удаление отзыва' })
  @ApiNoContentResponse({ description: 'Отзыв удалён' })
  remove(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() actor: AuthUser,
  ): void {
    this.reviewsService.remove(id, actor);
  }
}
