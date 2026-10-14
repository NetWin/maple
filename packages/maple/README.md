# @netwin/maple

```sh
pnpm add @netwin/maple
```

```ts
import { execute } from '@netwin/maple';

const code = `
  const message = "Hello " + name;
  return message
`;

const result = execute(code, { name: 'Steve' });
//      ^ 'Hello Steve'
```

## License

MIT
