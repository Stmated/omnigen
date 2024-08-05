
export const Environment = {
  test: (process.env['MODE'] == 'test') || (process.env['NODE_ENV'] == 'test') || Boolean(process.env['TEST']) || Boolean(process.env['VITEST']) || (typeof (global as any).it === 'function'),
  debug: process.execArgv.some(arg => arg.startsWith('--inspect')) || /\b(?:debug|debugger)\b/.test(process.env['NODE_OPTIONS'] || ''),
};
