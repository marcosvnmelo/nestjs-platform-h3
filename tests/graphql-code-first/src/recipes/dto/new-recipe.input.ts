import { Type } from 'class-transformer';
import { Length, MaxLength } from 'class-validator';

import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class NewRecipeInput {
  @Field()
  @MaxLength(30)
  title!: string;

  @Field({ nullable: true })
  @Length(30, 255)
  description?: string;

  @Type(() => String)
  @Field((_type) => [String])
  ingredients!: string[];
}
