/**
 * Hardcoded HTTP sample capture (5 packets).
 * TCP 3-way handshake + HTTP GET request + HTTP 200 OK response.
 *
 * Client: 192.168.1.10:54321  →  Server: 1.1.1.1:80
 *
 * Handshake packets (0-2) come from http-capture-builders.ts.
 * This file owns HTTP data packets (3-4) and the final export.
 */

import type { DecodedPacket, DecodedLayer } from '../packet-types'
import {
  ETH_LEN, IP_LEN, TCP_LEN,
  MAC_CLIENT, MAC_SERVER, IP_CLIENT, IP_SERVER, PORT_CLIENT, PORT_SERVER,
  writeEthIPv4TCP, makeEthernetLayer, makeIPv4Layer, makeTCPLayer,
  ipFmt, makeSYN, makeSYNACK, makeACK,
} from './http-capture-builders'

// ---------------------------------------------------------------------------
// Packet 3: PSH+ACK  client → server  HTTP GET
// ---------------------------------------------------------------------------

function makeHTTPGet(): DecodedPacket {
  const httpPayload = 'GET / HTTP/1.1\r\nHost: example.com\r\n\r\n'
  const httpBytes = Array.from(httpPayload).map((c) => c.charCodeAt(0))
  const payloadLen = httpBytes.length  // 36
  const buf = new Uint8Array(ETH_LEN + IP_LEN + TCP_LEN + payloadLen)

  writeEthIPv4TCP(buf, MAC_CLIENT, MAC_SERVER, IP_CLIENT, IP_SERVER,
    PORT_CLIENT, PORT_SERVER, 1001, 2001, 0x18, payloadLen)
  httpBytes.forEach((b, i) => { buf[ETH_LEN + IP_LEN + TCP_LEN + i] = b })

  const tcpPayloadStart = ETH_LEN + IP_LEN + TCP_LEN
  const ts = '12:30:46.003000'
  const srcStr = ipFmt(IP_CLIENT)
  const dstStr = ipFmt(IP_SERVER)
  const firstLine = 'GET / HTTP/1.1'

  const httpLayer: DecodedLayer = {
    name: 'HTTP',
    fields: [
      { name: 'Request Line', value: firstLine, byteOffset: tcpPayloadStart, byteLength: firstLine.length },
      { name: 'Host', value: 'Host: example.com', byteOffset: tcpPayloadStart + firstLine.length + 2, byteLength: 17 },
    ],
  }

  return {
    index: 3, timestamp: ts, rawBytes: buf,
    summary: `${ts} IP ${srcStr}.${PORT_CLIENT} > ${dstStr}.${PORT_SERVER}: Flags [P.], seq 1001, length ${payloadLen}: ${firstLine}`,
    layers: [
      makeEthernetLayer(MAC_CLIENT, MAC_SERVER),
      makeIPv4Layer(srcStr, dstStr, IP_LEN + TCP_LEN + payloadLen),
      makeTCPLayer(PORT_CLIENT, PORT_SERVER, 1001, 2001, 0x18, '[P.]'),
      httpLayer,
    ],
  }
}

// ---------------------------------------------------------------------------
// Packet 4: PSH+ACK  server → client  HTTP 200 OK
// ---------------------------------------------------------------------------

function makeHTTP200(): DecodedPacket {
  const httpPayload =
    'HTTP/1.1 200 OK\r\nContent-Type: text/html\r\nContent-Length: 13\r\n\r\n<html></html>'
  const httpBytes = Array.from(httpPayload).map((c) => c.charCodeAt(0))
  const payloadLen = httpBytes.length
  const buf = new Uint8Array(ETH_LEN + IP_LEN + TCP_LEN + payloadLen)

  writeEthIPv4TCP(buf, MAC_SERVER, MAC_CLIENT, IP_SERVER, IP_CLIENT,
    PORT_SERVER, PORT_CLIENT, 2001, 1037, 0x18, payloadLen)
  httpBytes.forEach((b, i) => { buf[ETH_LEN + IP_LEN + TCP_LEN + i] = b })

  const tcpPayloadStart = ETH_LEN + IP_LEN + TCP_LEN
  const ts = '12:30:46.004000'
  const srcStr = ipFmt(IP_SERVER)
  const dstStr = ipFmt(IP_CLIENT)
  const firstLine = 'HTTP/1.1 200 OK'
  const ctHeader = 'Content-Type: text/html'
  const clHeader = 'Content-Length: 13'
  const ctOffset = tcpPayloadStart + firstLine.length + 2
  const clOffset = ctOffset + ctHeader.length + 2

  const httpLayer: DecodedLayer = {
    name: 'HTTP',
    fields: [
      { name: 'Status Line', value: firstLine, byteOffset: tcpPayloadStart, byteLength: firstLine.length },
      { name: 'Content-Type', value: ctHeader, byteOffset: ctOffset, byteLength: ctHeader.length },
      { name: 'Content-Length', value: clHeader, byteOffset: clOffset, byteLength: clHeader.length },
    ],
  }

  return {
    index: 4, timestamp: ts, rawBytes: buf,
    summary: `${ts} IP ${srcStr}.${PORT_SERVER} > ${dstStr}.${PORT_CLIENT}: Flags [P.], seq 2001, length ${payloadLen}: ${firstLine}`,
    layers: [
      makeEthernetLayer(MAC_SERVER, MAC_CLIENT),
      makeIPv4Layer(srcStr, dstStr, IP_LEN + TCP_LEN + payloadLen),
      makeTCPLayer(PORT_SERVER, PORT_CLIENT, 2001, 1037, 0x18, '[P.]'),
      httpLayer,
    ],
  }
}

// ---------------------------------------------------------------------------
// Exported sample capture
// ---------------------------------------------------------------------------

export const httpCapture: DecodedPacket[] = [
  makeSYN(),
  makeSYNACK(),
  makeACK(),
  makeHTTPGet(),
  makeHTTP200(),
]
