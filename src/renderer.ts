import http from 'http'
import Multee from 'multee'

const { createHandler, start } = Multee('worker')

export type RequestListener = (
  req: http.IncomingMessage,
  res: http.ServerResponse,
) => Promise<void> | void

type RenderOptions = {
  path?: string
  method?: string
  headers?: { [key: string]: any }
}

export type RenderResult = {
  statusCode: number
  headers: { [key: string]: any }
  body: any
}

let server: http.Server

export type InitArgs = { script: string; args?: any; customerServer?: string }

const init = createHandler('init', async (args: InitArgs | undefined) => {
  if (!args) throw new Error('args is required')
  const fn = require(args.script).default
  if (args.customerServer) {
    const getServer = require(args.customerServer).default
    const nextHandler = await fn(args.args)
    server = await getServer(nextHandler)
  } else {
    server = new http.Server(await fn(args.args)).listen(0)
  }
})

const render = createHandler(
  'renderer',
  async (options: RenderOptions | undefined): Promise<RenderResult> => {
    return new Promise((resolve, reject) => {
      const addr = server.address()
      if (typeof addr !== 'object' || !addr) {
        return reject('Failed to create server in renderer')
      }
      const args = { hostname: '127.0.0.1', port: addr.port, ...options }
      const req = http.request(args, res => {
        let body = Buffer.from('')
        res.on('data', chunk => (body = Buffer.concat([body, chunk])))
        res.on('end', () =>
          resolve({ headers: res.headers, statusCode: res.statusCode ?? 200, body }),
        )
      })
      req.on('error', e => reject(`Failed in renderer: ${e.message}`))
      req.end()
    })
  },
)

export default () => {
  const child = start(__filename)
  return {
    init: init(child),
    render: render(child),
    kill: () => child.terminate(),
  }
}
