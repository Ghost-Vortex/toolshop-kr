import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator';

/** Данные для создания категории инструмента */
export class CreateCategoryDto {
  @ApiProperty({ description: 'Название категории', example: 'Электроинструмент' })
  @IsString({ message: 'Поле name должно быть строкой' })
  @IsNotEmpty({ message: 'Поле name обязательно для заполнения' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @Length(2, 60, { message: 'Название категории должно содержать от 2 до 60 символов' })
  name: string;

  @ApiProperty({ description: 'Символьный код категории (латиница, цифры, дефис)', example: 'power-tools' })
  @IsString({ message: 'Поле slug должно быть строкой' })
  @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/, {
    message: 'Поле slug может содержать только строчные латинские буквы, цифры и дефис',
  })
  @Length(2, 40, { message: 'Символьный код должен содержать от 2 до 40 символов' })
  slug: string;

  @ApiPropertyOptional({ description: 'Краткое описание категории' })
  @IsOptional()
  @IsString({ message: 'Поле description должно быть строкой' })
  @MaxLength(300, { message: 'Описание не может быть длиннее 300 символов' })
  description?: string = '';
}
