// 协作开发服务器：pnpm dev:collab
// y-websocket 兼容协议的 ws 服务（官方 bin/utils 的精简版），默认 127.0.0.1:1234，完全本地。
import { createServer } from 'node:http'
import { WebSocketServer } from 'ws'
import * as Y from 'yjs'
import * as syncProtocol from 'y-protocols/sync'
import * as awarenessProtocol from 'y-protocols/awareness'
import * as encoding from 'lib0/encoding'
import * as decoding from 'lib0/decoding'

const MESSAGE_SYNC = 0
const MESSAGE_AWARENESS = 1

/** @type {Map<string, {doc: Y.Doc, awareness: awarenessProtocol.Awareness, conns: Map<import('ws').WebSocket, Set<number>>}>} */
const rooms = new Map()

function send(conn, buf) {
  if (conn.readyState === 1) conn.send(buf, (err) => err && conn.close())
}

function getRoom(name) {
  let room = rooms.get(name)
  if (room) return room
  const doc = new Y.Doc()
  const awareness = new awarenessProtocol.Awareness(doc)
  awareness.setLocalState(null)
  const conns = new Map()
  room = { doc, awareness, conns }

  // 文档更新广播给房间内所有连接
  doc.on('update', (update) => {
    const enc = encoding.createEncoder()
    encoding.writeVarUint(enc, MESSAGE_SYNC)
    syncProtocol.writeUpdate(enc, update)
    const buf = encoding.toUint8Array(enc)
    for (const conn of conns.keys()) send(conn, buf)
  })

  // awareness 更新：记录每个连接控制的 clientId，并广播
  awareness.on('update', ({ added, updated, removed }, origin) => {
    const controlled = origin ? conns.get(origin) : undefined
    if (controlled) {
      for (const id of added) controlled.add(id)
      for (const id of removed) controlled.delete(id)
    }
    const changed = added.concat(updated, removed)
    const enc = encoding.createEncoder()
    encoding.writeVarUint(enc, MESSAGE_AWARENESS)
    encoding.writeVarUint8Array(
      enc,
      awarenessProtocol.encodeAwarenessUpdate(awareness, changed),
    )
    const buf = encoding.toUint8Array(enc)
    for (const conn of conns.keys()) send(conn, buf)
  })

  rooms.set(name, room)
  return room
}

function setupConn(conn, roomName) {
  const { doc, awareness, conns } = getRoom(roomName)
  conn.binaryType = 'arraybuffer'
  conns.set(conn, new Set())

  // 同步第一步：下发 state vector 请求
  {
    const enc = encoding.createEncoder()
    encoding.writeVarUint(enc, MESSAGE_SYNC)
    syncProtocol.writeSyncStep1(enc, doc)
    send(conn, encoding.toUint8Array(enc))
  }
  // 下发当前 awareness 全量
  const states = awareness.getStates()
  if (states.size > 0) {
    const enc = encoding.createEncoder()
    encoding.writeVarUint(enc, MESSAGE_AWARENESS)
    encoding.writeVarUint8Array(
      enc,
      awarenessProtocol.encodeAwarenessUpdate(awareness, [...states.keys()]),
    )
    send(conn, encoding.toUint8Array(enc))
  }

  conn.on('message', (data) => {
    const buf = new Uint8Array(data)
    const dec = decoding.createDecoder(buf)
    const enc = encoding.createEncoder()
    const type = decoding.readVarUint(dec)
    if (type === MESSAGE_SYNC) {
      encoding.writeVarUint(enc, MESSAGE_SYNC)
      syncProtocol.readSyncMessage(dec, enc, doc, conn)
      if (encoding.length(enc) > 1) send(conn, encoding.toUint8Array(enc))
    } else if (type === MESSAGE_AWARENESS) {
      awarenessProtocol.applyAwarenessUpdate(
        awareness,
        decoding.readVarUint8Array(dec),
        conn,
      )
    }
  })

  conn.on('close', () => {
    const controlled = conns.get(conn)
    conns.delete(conn)
    if (controlled) {
      awarenessProtocol.removeAwarenessStates(awareness, [...controlled], null)
    }
    // 房间保留在内存：断线重连/刷新后仍能拿到已同步的文档
    conn.close()
  })
}

const PORT = Number(process.env.DS_COLLAB_PORT ?? 1234)
const server = createServer((_req, res) => {
  res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' })
  res.end('DiagramStudio collab server\n')
})
const wss = new WebSocketServer({ server })
wss.on('connection', (conn, req) => {
  const room = (req.url ?? '/').slice(1).split('?')[0] || 'default'
  setupConn(conn, room)
})
server.listen(PORT, '127.0.0.1', () => {
  console.log(`[collab] y-websocket 兼容服务 ws://127.0.0.1:${PORT}`)
})
