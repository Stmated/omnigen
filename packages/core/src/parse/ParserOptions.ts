import {
  getEnumValues, ToEnum,
  ZodCoercedBoolean,
  ZodOptions,
} from '../options';
import {z} from 'zod';

export const Direction = {
  IN: 'IN',
  OUT: 'OUT',
  BOTH: 'BOTH',
} as const;
export type Direction = ToEnum<typeof Direction>;

export const ZodParserOptions = ZodOptions.extend({

  relaxedLookup: ZodCoercedBoolean.default('t'),
  relaxedPlaceholders: ZodCoercedBoolean.default('t'),
  autoTypeHints: ZodCoercedBoolean.default('t'),
  relaxedUnknownTypes: ZodCoercedBoolean.default('f'),
  trustedClients: ZodCoercedBoolean.default('f'),
  preferredWrapMode: ZodCoercedBoolean.default('f'),

  /**
   * NOTE: `false` is not correct according to JsonSchema standard.
   *
   * TODO: Either we do not care, or we introduce a "strict" mode (and other modes) which can set other default values
   *        Maybe we should have some kind of global repository which we initialize, and fetch the default settings from? Would be global per run though...
   */
  defaultAdditionalProperties: ZodCoercedBoolean.default('f'),

  /**
   * The main notion of what you will be doing. Receiving things ('In', server), or sending things ('Out', client).
   * <ol>
   *  <li>'IN' if you are receiving in data from the outside (where you are a server, receiving from a client, and sending response back to a client).</li>
   *  <li>'OUT' if you are sending data out to a receiving end (where you are a client, sending to a server, and receiving a response from the server).</li>
   *  <li>'BOTH' if the generated classes should be able to handle both situations. This might mean less specific validations.</li>
   * </ol>
   * <p>
   *   Remember that the notion of 'request'/'response and 'in'/'out' will swap depending on who is sending what.
   *   The definition will be even more confusing if the server is sending back an asynchronous webhook after a client request.
   * </p>
   */
  direction: z.enum(getEnumValues(Direction)).default(Direction.OUT),
});

export type IncomingParserOptions = z.input<typeof ZodParserOptions>;
export type ParserOptions = z.infer<typeof ZodParserOptions>;
export type UnknownParserOptions = IncomingParserOptions | ParserOptions;

export const DEFAULT_PARSER_OPTIONS: ParserOptions = ZodParserOptions.parse({});
