import { faker } from '@faker-js/faker';

import { identity } from '.';

describe('identity', () => {
  it('Should return the input', () => {
    const input = faker.number.int();
    const output = identity(input);

    expect(output).toBe(input);
  });
});
