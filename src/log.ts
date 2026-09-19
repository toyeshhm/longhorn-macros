type Fields = Record<string, string | number | boolean | null>
type Level = 'info' | 'warn' | 'error'
function emit(level: Level, event: string, fields: Fields = {}): void {
  const line = JSON.stringify({ ts: new Date().toISOString(), level, event, ...fields })
  if (level === 'info') console.info(line)
  else if (level === 'warn') console.warn(line)
  else console.error(line)
}
export const log = {
  info: (event: string, fields?: Fields) => { emit('info', event, fields) },
  warn: (event: string, fields?: Fields) => { emit('warn', event, fields) },
  error: (event: string, fields?: Fields) => { emit('error', event, fields) },
}
