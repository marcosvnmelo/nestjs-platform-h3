import { Kind } from 'graphql';

import { Scalar } from '@nestjs/graphql';

@Scalar('Date')
export class DateScalar {
  description = 'Date custom scalar type';

  parseValue(value: ConstructorParameters<typeof Date>[0]) {
    return new Date(value); // value from the client
  }

  serialize(value: Date) {
    return value.getTime(); // value sent to the client
  }

  parseLiteral(ast: { kind: Kind; value: string }) {
    if (ast.kind === Kind.INT) {
      return parseInt(ast.value, 10); // ast value is always in string format
    }
    return null;
  }
}
