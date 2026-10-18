import { parse as acornParse, type Program } from 'acorn';
import { MapleError, MapleErrorCode } from './boundary/maple-error.ts';

/**
 * Parses source text into the ESTree `Program`, with the settings `run` uses: a top-level `return`
 * is allowed. Throws a `MapleError` with code `PARSE_ERROR` when the code does not parse.
 */
export function parse(code: string): Program {
  try {
    // Module mode makes the parser enforce strict-mode grammar; the evaluator rejects the rest
    return acornParse(code, {
      ecmaVersion: 'latest',
      sourceType: 'module',
      locations: true,
      allowReturnOutsideFunction: true
    });
  } catch (error) {
    throw toParseError(error);
  }
}

/** Acorn reports the position both in `loc` and as a message suffix; the suffix is dropped. */
function toParseError(error: unknown): MapleError {
  if (!(error instanceof SyntaxError)) {
    return new MapleError(MapleErrorCode.INTERNAL_ERROR, 'Parser failed', { cause: error });
  }
  const loc = hasLocation(error) ? error.loc : undefined;
  return new MapleError(MapleErrorCode.PARSE_ERROR, error.message.replace(/ \(\d+:\d+\)$/, ''), {
    line: loc?.line,
    column: loc?.column,
    cause: error
  });
}

/** Acorn does not export its error type, so the position is read through a guard. */
function hasLocation(
  error: SyntaxError
): error is SyntaxError & { loc: { line: number; column: number } } {
  return 'loc' in error && typeof error.loc === 'object' && error.loc !== null;
}
