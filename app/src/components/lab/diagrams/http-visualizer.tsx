'use client'

/**
 * HTTP Visualizer - D3.js animated scenarios for HTTP protocol
 * Shows: request/response, status codes, HTTP/1.1 vs HTTP/2, TLS handshake,
 *        redirect chain, 4xx errors, 5xx errors, keep-alive connection reuse
 */

import { useEffect, useRef, useCallback, useState, useMemo } from 'react'
import * as d3 from 'd3'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Play, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react'

interface HttpVisualizerProps {
  className?: string
}

const WIDTH = 700
const HEIGHT = 420
const CLIENT_X = 100
const SERVER_X = 600
const PROXY_X = 350
const TIMELINE_Y_START = 120
const TIMELINE_Y_END = 380
const PACKET_RADIUS = 8

interface Scene {
  id: string
  title: string
  description: string
  type: 'request' | 'status' | 'version' | 'tls' | 'error'
  showProxy?: boolean
  steps: PacketStep[]
}

interface PacketStep {
  from: 'client' | 'proxy' | 'server'
  to: 'client' | 'proxy' | 'server'
  label: string
  subLabel?: string
  color: string
  delay: number
  duration: number
  lost?: boolean
}

const getX = (node: string): number => {
  switch (node) {
    case 'client': return CLIENT_X
    case 'proxy': return PROXY_X
    case 'server': return SERVER_X
    default: return CLIENT_X
  }
}

const SCENES: Scene[] = [
  // ========== BASIC REQUEST/RESPONSE ==========
  {
    id: 'http-basic',
    title: 'Basic Request/Response',
    description: 'Client gửi HTTP Request (method + path + headers). Server xử lý và trả Response (status line + headers + body). Đây là chu trình cơ bản nhất.',
    type: 'request',
    steps: [
      { from: 'client', to: 'server', label: 'GET /api/users', subLabel: 'HTTP Request', color: '#3b82f6', delay: 0, duration: 800 },
      { from: 'server', to: 'client', label: '200 OK', subLabel: 'HTTP Response', color: '#22c55e', delay: 1000, duration: 800 },
    ],
  },
  {
    id: 'http-methods',
    title: 'HTTP Methods — CRUD',
    description: 'GET: đọc (idempotent). POST: tạo mới. PUT: thay thế toàn bộ (idempotent). PATCH: cập nhật một phần. DELETE: xoá (idempotent). Idempotent = gọi nhiều lần cùng kết quả.',
    type: 'request',
    steps: [
      { from: 'client', to: 'server', label: 'GET /users/1', subLabel: 'Read', color: '#3b82f6', delay: 0, duration: 600 },
      { from: 'server', to: 'client', label: '200 OK', subLabel: '{user data}', color: '#22c55e', delay: 700, duration: 500 },
      { from: 'client', to: 'server', label: 'DELETE /users/1', subLabel: 'Remove', color: '#ef4444', delay: 1400, duration: 600 },
      { from: 'server', to: 'client', label: '204 No Content', subLabel: 'Deleted ✓', color: '#22c55e', delay: 2100, duration: 500 },
    ],
  },
  {
    id: 'post-vs-put',
    title: 'POST vs PUT — Idempotency',
    description: 'POST không idempotent: gọi 2 lần = tạo 2 resource. PUT idempotent: gọi 2 lần = cùng 1 kết quả. Retry logic: PUT an toàn retry, POST cần idempotency key.',
    type: 'request',
    steps: [
      { from: 'client', to: 'server', label: 'POST /users', subLabel: '{name: "Alice"}', color: '#f59e0b', delay: 0, duration: 600 },
      { from: 'server', to: 'client', label: '201 Created', subLabel: 'id: 1', color: '#22c55e', delay: 700, duration: 500 },
      { from: 'client', to: 'server', label: 'POST /users (retry)', subLabel: '{name: "Alice"}', color: '#f59e0b', delay: 1400, duration: 600 },
      { from: 'server', to: 'client', label: '201 Created', subLabel: 'id: 2 ⚠️ Duplicate!', color: '#ef4444', delay: 2100, duration: 500 },
    ],
  },
  {
    id: 'content-type',
    title: 'Content-Type Header',
    description: 'Content-Type nói server "body là gì". JSON: application/json. Form: application/x-www-form-urlencoded. Multipart: multipart/form-data (upload file). Thiếu header → server không parse được body.',
    type: 'request',
    steps: [
      { from: 'client', to: 'server', label: 'POST /api', subLabel: 'No Content-Type!', color: '#3b82f6', delay: 0, duration: 700 },
      { from: 'server', to: 'client', label: '400 Bad Request', subLabel: 'Cannot parse body', color: '#ef4444', delay: 800, duration: 700 },
      { from: 'client', to: 'server', label: 'POST /api', subLabel: 'Content-Type: json', color: '#3b82f6', delay: 1800, duration: 700 },
      { from: 'server', to: 'client', label: '200 OK', subLabel: 'Body parsed ✓', color: '#22c55e', delay: 2600, duration: 700 },
    ],
  },

  // ========== STATUS CODES ==========
  {
    id: 'status-2xx',
    title: '2xx Success Codes',
    description: '200 OK: thành công có body. 201 Created: resource mới tạo + Location header. 204 No Content: thành công không có body (dùng cho DELETE, PUT). Client phải handle đúng từng loại.',
    type: 'status',
    steps: [
      { from: 'client', to: 'server', label: 'GET /resource', subLabel: 'Read', color: '#3b82f6', delay: 0, duration: 600 },
      { from: 'server', to: 'client', label: '200 OK', subLabel: '+ body', color: '#22c55e', delay: 700, duration: 600 },
      { from: 'client', to: 'server', label: 'POST /resource', subLabel: 'Create', color: '#3b82f6', delay: 1500, duration: 600 },
      { from: 'server', to: 'client', label: '201 Created', subLabel: 'Location: /1', color: '#22c55e', delay: 2200, duration: 600 },
    ],
  },
  {
    id: 'status-301-302',
    title: '301 vs 302 Redirect',
    description: '301 Permanent: browser cache vĩnh viễn, SEO transfer. 302 Temporary: không cache, original URL vẫn valid. Dùng sai → SEO penalty hoặc cache stale redirect.',
    type: 'status',
    showProxy: true,
    steps: [
      { from: 'client', to: 'proxy', label: 'GET /old', subLabel: 'HTTP', color: '#3b82f6', delay: 0, duration: 500 },
      { from: 'proxy', to: 'client', label: '301 Moved', subLabel: 'Location: /new', color: '#f59e0b', delay: 600, duration: 500 },
      { from: 'client', to: 'proxy', label: 'GET /new', subLabel: 'Follow', color: '#3b82f6', delay: 1300, duration: 500 },
      { from: 'proxy', to: 'server', label: 'Forward', color: '#6b7280', delay: 1900, duration: 400 },
      { from: 'server', to: 'client', label: '200 OK', subLabel: 'Final', color: '#22c55e', delay: 2400, duration: 600 },
    ],
  },
  {
    id: 'status-304',
    title: '304 Not Modified — Caching',
    description: 'Client gửi If-None-Match (ETag) hoặc If-Modified-Since. Server so sánh: nếu chưa đổi → 304 không body. Client dùng bản cache. Tiết kiệm bandwidth lớn.',
    type: 'status',
    steps: [
      { from: 'client', to: 'server', label: 'GET /data', subLabel: 'First request', color: '#3b82f6', delay: 0, duration: 600 },
      { from: 'server', to: 'client', label: '200 OK', subLabel: 'ETag: "abc123"', color: '#22c55e', delay: 700, duration: 600 },
      { from: 'client', to: 'server', label: 'GET /data', subLabel: 'If-None-Match: "abc123"', color: '#3b82f6', delay: 1600, duration: 600 },
      { from: 'server', to: 'client', label: '304 Not Modified', subLabel: 'No body, use cache', color: '#06b6d4', delay: 2300, duration: 600 },
    ],
  },
  {
    id: 'status-4xx',
    title: '4xx Client Errors',
    description: '400: request sai format. 401: chưa authenticate. 403: authenticated nhưng không có quyền. 404: resource không tồn tại. 422: validation fail. Debug: đọc response body.',
    type: 'error',
    steps: [
      { from: 'client', to: 'server', label: 'GET /secure', subLabel: 'No token', color: '#3b82f6', delay: 0, duration: 600 },
      { from: 'server', to: 'client', label: '401 Unauthorized', subLabel: 'Need auth', color: '#f59e0b', delay: 700, duration: 600 },
      { from: 'client', to: 'server', label: 'GET /admin', subLabel: 'role=user', color: '#3b82f6', delay: 1500, duration: 600 },
      { from: 'server', to: 'client', label: '403 Forbidden', subLabel: 'Need admin', color: '#ef4444', delay: 2200, duration: 600 },
    ],
  },
  {
    id: 'status-429',
    title: '429 Rate Limiting',
    description: 'Server giới hạn số request/thời gian. Trả 429 + Retry-After header. Client phải implement exponential backoff. Retry ngay → bị ban. API gateway thường handle rate limit.',
    type: 'error',
    steps: [
      { from: 'client', to: 'server', label: 'GET /api (×100)', subLabel: 'Rapid fire', color: '#3b82f6', delay: 0, duration: 500 },
      { from: 'server', to: 'client', label: '429 Too Many', subLabel: 'Retry-After: 60', color: '#ef4444', delay: 600, duration: 600 },
      { from: 'client', to: 'server', label: 'GET /api', subLabel: 'Wait 60s...', color: '#6b7280', delay: 1500, duration: 500, lost: true },
      { from: 'client', to: 'server', label: 'GET /api', subLabel: 'After cooldown', color: '#3b82f6', delay: 2300, duration: 500 },
      { from: 'server', to: 'client', label: '200 OK', subLabel: 'Allowed ✓', color: '#22c55e', delay: 2900, duration: 500 },
    ],
  },
  {
    id: 'status-5xx',
    title: '5xx Server Errors',
    description: '500: exception chưa handle. 502: gateway nhận được invalid response từ upstream. 503: service unavailable (overload/maintenance). 504: gateway timeout. Cần check server logs.',
    type: 'error',
    showProxy: true,
    steps: [
      { from: 'client', to: 'proxy', label: 'GET /api', color: '#3b82f6', delay: 0, duration: 500 },
      { from: 'proxy', to: 'server', label: 'Forward', color: '#6b7280', delay: 600, duration: 400 },
      { from: 'server', to: 'proxy', label: 'Crash!', subLabel: 'Connection refused', color: '#ef4444', delay: 1100, duration: 300, lost: true },
      { from: 'proxy', to: 'client', label: '502 Bad Gateway', subLabel: 'Upstream error', color: '#ef4444', delay: 1500, duration: 600 },
    ],
  },

  // ========== HTTP VERSIONS ==========
  {
    id: 'http1-blocking',
    title: 'HTTP/1.1 HOL Blocking',
    description: 'HTTP/1.1: 1 request tại 1 thời điểm trên 1 connection. Request 2 chờ Request 1 xong. Browser mở 6 connections/domain để workaround. Vẫn có giới hạn.',
    type: 'version',
    steps: [
      { from: 'client', to: 'server', label: 'GET /style.css', subLabel: 'Request 1', color: '#8b5cf6', delay: 0, duration: 700 },
      { from: 'server', to: 'client', label: '200 OK', subLabel: 'Response 1', color: '#8b5cf6', delay: 800, duration: 700 },
      { from: 'client', to: 'server', label: 'GET /script.js', subLabel: 'Request 2 (wait)', color: '#6b7280', delay: 1700, duration: 700 },
      { from: 'server', to: 'client', label: '200 OK', subLabel: 'Response 2', color: '#6b7280', delay: 2500, duration: 700 },
    ],
  },
  {
    id: 'http2-multiplex',
    title: 'HTTP/2 Multiplexing',
    description: 'HTTP/2: nhiều stream song song trên 1 TCP. Binary frames với Stream ID. HPACK nén headers. Không HOL blocking ở L7. Cần HTTPS (ALPN negotiation).',
    type: 'version',
    steps: [
      { from: 'client', to: 'server', label: 'Stream 1: css', subLabel: 'HTTP/2', color: '#06b6d4', delay: 0, duration: 600 },
      { from: 'client', to: 'server', label: 'Stream 2: js', subLabel: 'Concurrent!', color: '#06b6d4', delay: 100, duration: 600 },
      { from: 'server', to: 'client', label: 'Stream 1 resp', subLabel: '200', color: '#22c55e', delay: 700, duration: 600 },
      { from: 'server', to: 'client', label: 'Stream 2 resp', subLabel: '200', color: '#22c55e', delay: 800, duration: 600 },
    ],
  },
  {
    id: 'keep-alive',
    title: 'Keep-Alive Connection',
    description: 'HTTP/1.1 Keep-Alive: tái sử dụng TCP connection. Tránh 3-way handshake mỗi request. Header Connection: keep-alive. nginx: keepalive_timeout 75s default.',
    type: 'version',
    steps: [
      { from: 'client', to: 'server', label: 'TCP Handshake', subLabel: 'SYN/ACK', color: '#6b7280', delay: 0, duration: 500 },
      { from: 'client', to: 'server', label: 'GET /page', subLabel: 'keep-alive', color: '#3b82f6', delay: 600, duration: 500 },
      { from: 'server', to: 'client', label: '200 OK', color: '#22c55e', delay: 1200, duration: 500 },
      { from: 'client', to: 'server', label: 'GET /img', subLabel: 'Reuse conn!', color: '#3b82f6', delay: 1900, duration: 500 },
      { from: 'server', to: 'client', label: '200 OK', subLabel: 'No handshake', color: '#22c55e', delay: 2500, duration: 500 },
    ],
  },

  // ========== TLS/HTTPS ==========
  {
    id: 'tls-handshake',
    title: 'TLS Handshake',
    description: 'ClientHello: cipher suites, SNI. ServerHello: chosen cipher + certificate. Key Exchange: ECDHE derive session key. Finished: bắt đầu encrypt. 1-RTT với TLS 1.3.',
    type: 'tls',
    steps: [
      { from: 'client', to: 'server', label: 'ClientHello', subLabel: 'ciphers, SNI', color: '#10b981', delay: 0, duration: 600 },
      { from: 'server', to: 'client', label: 'ServerHello+Cert', subLabel: 'cipher, cert', color: '#10b981', delay: 700, duration: 600 },
      { from: 'client', to: 'server', label: 'Key Exchange', subLabel: 'verify, derive', color: '#10b981', delay: 1500, duration: 600 },
      { from: 'server', to: 'client', label: 'Finished', subLabel: 'encrypt ready ✓', color: '#22c55e', delay: 2200, duration: 600 },
    ],
  },
  {
    id: 'tls-cert-error',
    title: 'TLS Certificate Error',
    description: 'Cert expired: Not After đã qua. Cert mismatch: domain không khớp SAN. CA untrusted: self-signed hoặc CA lạ. Handshake fail ngay bước verify cert.',
    type: 'tls',
    steps: [
      { from: 'client', to: 'server', label: 'ClientHello', subLabel: 'SNI: api.example.com', color: '#10b981', delay: 0, duration: 600 },
      { from: 'server', to: 'client', label: 'Certificate', subLabel: 'CN: *.other.com', color: '#f59e0b', delay: 700, duration: 600 },
      { from: 'client', to: 'server', label: 'Verify FAIL!', subLabel: 'Domain mismatch', color: '#ef4444', delay: 1500, duration: 300, lost: true },
      { from: 'server', to: 'client', label: 'TLS Alert', subLabel: 'Connection closed', color: '#ef4444', delay: 1900, duration: 500 },
    ],
  },
  {
    id: 'tls-alpn',
    title: 'ALPN — HTTP/2 Negotiation',
    description: 'Application-Layer Protocol Negotiation: client gửi protocols hỗ trợ (h2, http/1.1) trong ClientHello. Server chọn protocol. Cần ALPN để enable HTTP/2.',
    type: 'tls',
    steps: [
      { from: 'client', to: 'server', label: 'ClientHello', subLabel: 'ALPN: h2, http/1.1', color: '#10b981', delay: 0, duration: 600 },
      { from: 'server', to: 'client', label: 'ServerHello', subLabel: 'ALPN: h2 ✓', color: '#10b981', delay: 700, duration: 600 },
      { from: 'client', to: 'server', label: 'Handshake done', subLabel: 'HTTP/2 enabled', color: '#06b6d4', delay: 1500, duration: 600 },
      { from: 'server', to: 'client', label: 'HTTP/2 Ready', subLabel: 'Multiplexing on', color: '#22c55e', delay: 2200, duration: 600 },
    ],
  },

  // ========== ADVANCED PATTERNS ==========
  {
    id: 'cors-preflight',
    title: 'CORS Preflight',
    description: 'Cross-origin request với custom headers/methods → browser gửi OPTIONS trước. Server phải trả Access-Control-Allow-*. Preflight cache với max-age. Đây không phải request thất bại.',
    type: 'request',
    steps: [
      { from: 'client', to: 'server', label: 'OPTIONS /api', subLabel: 'Preflight', color: '#f59e0b', delay: 0, duration: 600 },
      { from: 'server', to: 'client', label: '204 No Content', subLabel: 'CORS headers', color: '#22c55e', delay: 700, duration: 600 },
      { from: 'client', to: 'server', label: 'POST /api', subLabel: 'Actual request', color: '#3b82f6', delay: 1500, duration: 600 },
      { from: 'server', to: 'client', label: '200 OK', subLabel: 'Response', color: '#22c55e', delay: 2200, duration: 600 },
    ],
  },
  {
    id: 'auth-bearer',
    title: 'Bearer Token Auth',
    description: 'Client gửi Authorization: Bearer <token>. Server validate token (JWT/opaque). Token expired → 401. Token valid nhưng wrong scope → 403. Refresh token flow riêng.',
    type: 'request',
    steps: [
      { from: 'client', to: 'server', label: 'POST /login', subLabel: 'credentials', color: '#3b82f6', delay: 0, duration: 600 },
      { from: 'server', to: 'client', label: '200 OK', subLabel: 'token: eyJ...', color: '#22c55e', delay: 700, duration: 600 },
      { from: 'client', to: 'server', label: 'GET /api', subLabel: 'Bearer eyJ...', color: '#3b82f6', delay: 1500, duration: 600 },
      { from: 'server', to: 'client', label: '200 OK', subLabel: 'Authorized ✓', color: '#22c55e', delay: 2200, duration: 600 },
    ],
  },
  {
    id: 'expect-100',
    title: '100 Continue',
    description: 'Client gửi Expect: 100-continue trước khi gửi body lớn. Server trả 100 Continue nếu OK để nhận body. Hoặc 417 nếu reject. Tránh gửi file lớn rồi mới biết bị reject.',
    type: 'request',
    steps: [
      { from: 'client', to: 'server', label: 'POST /upload', subLabel: 'Expect: 100-continue', color: '#3b82f6', delay: 0, duration: 600 },
      { from: 'server', to: 'client', label: '100 Continue', subLabel: 'OK to send body', color: '#06b6d4', delay: 700, duration: 500 },
      { from: 'client', to: 'server', label: 'Body: 50MB file', subLabel: 'Uploading...', color: '#3b82f6', delay: 1400, duration: 800 },
      { from: 'server', to: 'client', label: '201 Created', subLabel: 'Upload complete', color: '#22c55e', delay: 2300, duration: 600 },
    ],
  },
  {
    id: 'compression',
    title: 'HTTP Compression',
    description: 'Client gửi Accept-Encoding: gzip, br. Server compress response và trả Content-Encoding header. gzip phổ biến. Brotli (br) tốt hơn cho text. Giảm 60-80% bandwidth.',
    type: 'request',
    steps: [
      { from: 'client', to: 'server', label: 'GET /data.json', subLabel: 'Accept-Encoding: gzip', color: '#3b82f6', delay: 0, duration: 600 },
      { from: 'server', to: 'client', label: '200 OK', subLabel: 'Content-Encoding: gzip', color: '#22c55e', delay: 700, duration: 600 },
      { from: 'client', to: 'server', label: 'Received', subLabel: '100KB → 25KB', color: '#06b6d4', delay: 1500, duration: 300, lost: true },
    ],
  },
  {
    id: 'chunked',
    title: 'Chunked Transfer',
    description: 'Transfer-Encoding: chunked cho response không biết size trước. Server gửi từng chunk với size prefix. Final chunk size=0. Dùng cho streaming, SSE, large responses.',
    type: 'request',
    steps: [
      { from: 'client', to: 'server', label: 'GET /stream', color: '#3b82f6', delay: 0, duration: 500 },
      { from: 'server', to: 'client', label: 'Chunk 1', subLabel: 'Transfer-Encoding: chunked', color: '#22c55e', delay: 600, duration: 400 },
      { from: 'server', to: 'client', label: 'Chunk 2', subLabel: '...streaming...', color: '#22c55e', delay: 1100, duration: 400 },
      { from: 'server', to: 'client', label: 'Chunk 3', subLabel: '...more data...', color: '#22c55e', delay: 1600, duration: 400 },
      { from: 'server', to: 'client', label: 'Final (0)', subLabel: 'Stream end', color: '#06b6d4', delay: 2100, duration: 400 },
    ],
  },
  {
    id: 'websocket',
    title: 'WebSocket Upgrade',
    description: 'HTTP request với Upgrade: websocket, Connection: Upgrade. Server trả 101 Switching Protocols. Sau đó full-duplex communication trên cùng TCP connection.',
    type: 'version',
    steps: [
      { from: 'client', to: 'server', label: 'GET /ws', subLabel: 'Upgrade: websocket', color: '#3b82f6', delay: 0, duration: 600 },
      { from: 'server', to: 'client', label: '101 Switching', subLabel: 'Upgrade accepted', color: '#10b981', delay: 700, duration: 600 },
      { from: 'client', to: 'server', label: 'WS Message', subLabel: 'Full duplex ↔', color: '#8b5cf6', delay: 1500, duration: 500 },
      { from: 'server', to: 'client', label: 'WS Message', subLabel: 'Bidirectional', color: '#8b5cf6', delay: 1600, duration: 500 },
    ],
  },
  {
    id: 'proxy-forward',
    title: 'Reverse Proxy',
    description: 'nginx/Caddy nhận request, forward đến upstream app server. X-Forwarded-For, X-Real-IP headers để app biết client IP thật. proxy_pass trong nginx config.',
    type: 'request',
    showProxy: true,
    steps: [
      { from: 'client', to: 'proxy', label: 'GET /api', subLabel: 'IP: 203.0.113.5', color: '#3b82f6', delay: 0, duration: 500 },
      { from: 'proxy', to: 'server', label: 'GET /api', subLabel: 'X-Forwarded-For: 203...', color: '#6b7280', delay: 600, duration: 500 },
      { from: 'server', to: 'proxy', label: '200 OK', color: '#22c55e', delay: 1200, duration: 500 },
      { from: 'proxy', to: 'client', label: '200 OK', subLabel: 'Response', color: '#22c55e', delay: 1800, duration: 500 },
    ],
  },

  // ========== SECURITY ==========
  {
    id: 'hsts',
    title: 'HSTS — Force HTTPS',
    description: 'Strict-Transport-Security header: browser tự động chuyển HTTP→HTTPS mà không cần redirect. max-age=31536000 (1 năm). includeSubDomains. preload list của browser.',
    type: 'tls',
    steps: [
      { from: 'client', to: 'server', label: 'GET / (HTTPS)', color: '#10b981', delay: 0, duration: 600 },
      { from: 'server', to: 'client', label: '200 OK', subLabel: 'HSTS: max-age=1y', color: '#22c55e', delay: 700, duration: 600 },
      { from: 'client', to: 'server', label: 'GET / (HTTP)', subLabel: 'Next visit...', color: '#3b82f6', delay: 1600, duration: 300, lost: true },
      { from: 'client', to: 'server', label: 'Auto → HTTPS', subLabel: 'Browser redirect', color: '#10b981', delay: 2000, duration: 600 },
    ],
  },
  {
    id: 'mixed-content',
    title: 'Mixed Content Block',
    description: 'HTTPS page load HTTP resource → browser block. Active mixed content (scripts, iframes): blocked. Passive (images): warning/blocked. Upgrade-Insecure-Requests header.',
    type: 'error',
    steps: [
      { from: 'client', to: 'server', label: 'GET /page', subLabel: 'HTTPS', color: '#10b981', delay: 0, duration: 600 },
      { from: 'server', to: 'client', label: '200 OK', subLabel: '<script src="http://...">', color: '#22c55e', delay: 700, duration: 600 },
      { from: 'client', to: 'server', label: 'GET script', subLabel: 'HTTP ⚠️', color: '#ef4444', delay: 1500, duration: 300, lost: true },
      { from: 'server', to: 'client', label: 'BLOCKED!', subLabel: 'Mixed content', color: '#ef4444', delay: 1900, duration: 500 },
    ],
  },
  {
    id: 'csrf-token',
    title: 'CSRF Token Validation',
    description: 'Server gửi CSRF token trong form/cookie. Client gửi lại token trong request. Server validate token match. Ngăn cross-site request giả mạo.',
    type: 'request',
    steps: [
      { from: 'client', to: 'server', label: 'GET /form', color: '#3b82f6', delay: 0, duration: 500 },
      { from: 'server', to: 'client', label: '200 OK', subLabel: 'csrf_token: abc123', color: '#22c55e', delay: 600, duration: 500 },
      { from: 'client', to: 'server', label: 'POST /submit', subLabel: 'X-CSRF-Token: abc123', color: '#3b82f6', delay: 1300, duration: 500 },
      { from: 'server', to: 'client', label: '200 OK', subLabel: 'Token valid ✓', color: '#22c55e', delay: 1900, duration: 500 },
    ],
  },
  {
    id: 'same-origin',
    title: 'Same-Origin Policy',
    description: 'Browser chặn script đọc response từ origin khác (khác domain/port/protocol). Bảo vệ sensitive data. CORS cho phép cross-origin có kiểm soát.',
    type: 'error',
    steps: [
      { from: 'client', to: 'server', label: 'fetch(other-origin)', subLabel: 'From app.com', color: '#3b82f6', delay: 0, duration: 600 },
      { from: 'server', to: 'client', label: '200 OK', subLabel: 'No CORS headers', color: '#22c55e', delay: 700, duration: 600 },
      { from: 'client', to: 'server', label: 'Read response', subLabel: 'JS tries to access', color: '#ef4444', delay: 1500, duration: 300, lost: true },
      { from: 'server', to: 'client', label: 'BLOCKED!', subLabel: 'Same-origin policy', color: '#ef4444', delay: 1900, duration: 500 },
    ],
  },

  // ========== CACHING ADVANCED ==========
  {
    id: 'cache-control',
    title: 'Cache-Control Directives',
    description: 'no-store: không cache. no-cache: cache nhưng phải validate. max-age=3600: cache 1h. private: chỉ browser cache. public: proxy có thể cache.',
    type: 'status',
    steps: [
      { from: 'client', to: 'server', label: 'GET /api/data', color: '#3b82f6', delay: 0, duration: 600 },
      { from: 'server', to: 'client', label: '200 OK', subLabel: 'Cache-Control: max-age=3600', color: '#22c55e', delay: 700, duration: 600 },
      { from: 'client', to: 'server', label: 'GET /api/data', subLabel: '30 min later...', color: '#6b7280', delay: 1500, duration: 300, lost: true },
      { from: 'server', to: 'client', label: 'From cache!', subLabel: 'No network request', color: '#06b6d4', delay: 1900, duration: 500 },
    ],
  },
  {
    id: 'cdn-cache',
    title: 'CDN Edge Caching',
    description: 'CDN cache response ở edge servers gần user. Cache-Control: public, s-maxage=86400 cho CDN. Purge cache khi deploy. Giảm load origin server.',
    type: 'status',
    showProxy: true,
    steps: [
      { from: 'client', to: 'proxy', label: 'GET /static/js', subLabel: 'User in VN', color: '#3b82f6', delay: 0, duration: 400 },
      { from: 'proxy', to: 'client', label: 'HIT', subLabel: 'CDN edge cache', color: '#22c55e', delay: 500, duration: 400 },
      { from: 'client', to: 'proxy', label: 'GET /static/js', subLabel: 'User in US', color: '#3b82f6', delay: 1100, duration: 400 },
      { from: 'proxy', to: 'server', label: 'MISS', subLabel: 'Fetch origin', color: '#f59e0b', delay: 1600, duration: 400 },
      { from: 'server', to: 'client', label: '200 OK', subLabel: 'Cached at edge', color: '#22c55e', delay: 2100, duration: 500 },
    ],
  },
  {
    id: 'stale-revalidate',
    title: 'Stale-While-Revalidate',
    description: 'Trả cache cũ ngay lập tức, đồng thời fetch mới ở background. stale-while-revalidate=60. User thấy fast response, next request có data mới.',
    type: 'status',
    steps: [
      { from: 'client', to: 'server', label: 'GET /data', subLabel: 'Cache stale', color: '#3b82f6', delay: 0, duration: 400 },
      { from: 'server', to: 'client', label: 'Stale response', subLabel: 'Instant! (from cache)', color: '#f59e0b', delay: 500, duration: 400 },
      { from: 'client', to: 'server', label: 'Background fetch', subLabel: 'Revalidate async', color: '#6b7280', delay: 600, duration: 600 },
      { from: 'server', to: 'client', label: '200 OK (fresh)', subLabel: 'Update cache', color: '#22c55e', delay: 1300, duration: 500 },
    ],
  },

  // ========== MORE AUTH ==========
  {
    id: 'basic-auth',
    title: 'HTTP Basic Auth',
    description: 'Authorization: Basic base64(user:pass). Simple nhưng không secure (credentials mỗi request). Chỉ dùng với HTTPS. Server trả 401 + WWW-Authenticate.',
    type: 'request',
    steps: [
      { from: 'client', to: 'server', label: 'GET /secure', subLabel: 'No auth', color: '#3b82f6', delay: 0, duration: 500 },
      { from: 'server', to: 'client', label: '401 Unauthorized', subLabel: 'WWW-Authenticate: Basic', color: '#f59e0b', delay: 600, duration: 500 },
      { from: 'client', to: 'server', label: 'GET /secure', subLabel: 'Basic dXNlcjpwYXNz', color: '#3b82f6', delay: 1300, duration: 500 },
      { from: 'server', to: 'client', label: '200 OK', subLabel: 'Authenticated ✓', color: '#22c55e', delay: 1900, duration: 500 },
    ],
  },
  {
    id: 'oauth2-flow',
    title: 'OAuth2 Auth Code Flow',
    description: 'Redirect to auth server → user login → auth code → exchange for token. Secure cho web apps. PKCE cho mobile/SPA. Authorization header với access_token.',
    type: 'request',
    showProxy: true,
    steps: [
      { from: 'client', to: 'proxy', label: 'GET /oauth/auth', subLabel: 'client_id, redirect', color: '#3b82f6', delay: 0, duration: 500 },
      { from: 'proxy', to: 'client', label: '302 Redirect', subLabel: 'Login page', color: '#f59e0b', delay: 600, duration: 500 },
      { from: 'client', to: 'proxy', label: 'POST /oauth/token', subLabel: 'code=xyz', color: '#3b82f6', delay: 1300, duration: 500 },
      { from: 'proxy', to: 'client', label: '200 OK', subLabel: 'access_token: eyJ...', color: '#22c55e', delay: 1900, duration: 500 },
    ],
  },
  {
    id: 'refresh-token',
    title: 'Token Refresh Flow',
    description: 'Access token expired (401) → dùng refresh token lấy access token mới. Refresh token có expiry dài hơn. Rotate refresh token mỗi lần dùng.',
    type: 'request',
    steps: [
      { from: 'client', to: 'server', label: 'GET /api', subLabel: 'Bearer expired_token', color: '#3b82f6', delay: 0, duration: 500 },
      { from: 'server', to: 'client', label: '401 Expired', subLabel: 'Token invalid', color: '#f59e0b', delay: 600, duration: 500 },
      { from: 'client', to: 'server', label: 'POST /refresh', subLabel: 'refresh_token', color: '#3b82f6', delay: 1300, duration: 500 },
      { from: 'server', to: 'client', label: '200 OK', subLabel: 'new access_token', color: '#22c55e', delay: 1900, duration: 500 },
    ],
  },
  {
    id: 'session-cookie',
    title: 'Session Cookie',
    description: 'Server tạo session ID, gửi trong Set-Cookie. Browser tự gửi cookie mỗi request. HttpOnly, Secure, SameSite flags bảo vệ cookie.',
    type: 'request',
    steps: [
      { from: 'client', to: 'server', label: 'POST /login', subLabel: 'credentials', color: '#3b82f6', delay: 0, duration: 500 },
      { from: 'server', to: 'client', label: '200 OK', subLabel: 'Set-Cookie: sid=abc; HttpOnly', color: '#22c55e', delay: 600, duration: 500 },
      { from: 'client', to: 'server', label: 'GET /dashboard', subLabel: 'Cookie: sid=abc', color: '#3b82f6', delay: 1300, duration: 500 },
      { from: 'server', to: 'client', label: '200 OK', subLabel: 'Session valid ✓', color: '#22c55e', delay: 1900, duration: 500 },
    ],
  },

  // ========== MORE STATUS CODES ==========
  {
    id: 'status-206',
    title: '206 Partial Content',
    description: 'Range request: Range: bytes=0-1023. Server trả 206 với Content-Range. Dùng cho: resume download, video streaming, large file chunks.',
    type: 'status',
    steps: [
      { from: 'client', to: 'server', label: 'GET /video.mp4', subLabel: 'Range: bytes=0-1M', color: '#3b82f6', delay: 0, duration: 600 },
      { from: 'server', to: 'client', label: '206 Partial', subLabel: 'Content-Range: 0-1M/100M', color: '#06b6d4', delay: 700, duration: 600 },
      { from: 'client', to: 'server', label: 'GET /video.mp4', subLabel: 'Range: bytes=1M-2M', color: '#3b82f6', delay: 1500, duration: 600 },
      { from: 'server', to: 'client', label: '206 Partial', subLabel: 'Next chunk', color: '#06b6d4', delay: 2200, duration: 600 },
    ],
  },
  {
    id: 'status-408',
    title: '408 Request Timeout',
    description: 'Server đợi client gửi request quá lâu (idle timeout). Khác với 504 (gateway timeout). Client nên retry. Connection có thể bị close.',
    type: 'error',
    steps: [
      { from: 'client', to: 'server', label: 'POST /upload', subLabel: 'Start...', color: '#3b82f6', delay: 0, duration: 600 },
      { from: 'client', to: 'server', label: '(waiting...)', subLabel: 'Client idle', color: '#6b7280', delay: 800, duration: 800, lost: true },
      { from: 'server', to: 'client', label: '408 Timeout', subLabel: 'Server gave up', color: '#ef4444', delay: 1800, duration: 600 },
    ],
  },
  {
    id: 'status-413',
    title: '413 Payload Too Large',
    description: 'Request body vượt quá server limit. nginx: client_max_body_size. Dùng chunked upload hoặc multipart cho file lớn. Không retry với cùng payload.',
    type: 'error',
    steps: [
      { from: 'client', to: 'server', label: 'POST /upload', subLabel: 'Body: 100MB', color: '#3b82f6', delay: 0, duration: 600 },
      { from: 'server', to: 'client', label: '413 Too Large', subLabel: 'Max: 10MB', color: '#ef4444', delay: 700, duration: 600 },
      { from: 'client', to: 'server', label: 'POST /upload', subLabel: 'Chunked: 5MB part', color: '#3b82f6', delay: 1500, duration: 600 },
      { from: 'server', to: 'client', label: '200 OK', subLabel: 'Chunk accepted', color: '#22c55e', delay: 2200, duration: 600 },
    ],
  },
  {
    id: 'status-504',
    title: '504 Gateway Timeout',
    description: 'Gateway/proxy đợi upstream quá lâu mà không có response. Khác 408 (client timeout) và 502 (bad response). Check upstream performance.',
    type: 'error',
    showProxy: true,
    steps: [
      { from: 'client', to: 'proxy', label: 'GET /slow-api', color: '#3b82f6', delay: 0, duration: 500 },
      { from: 'proxy', to: 'server', label: 'Forward', color: '#6b7280', delay: 600, duration: 500 },
      { from: 'server', to: 'proxy', label: '(processing...)', subLabel: '60s timeout', color: '#6b7280', delay: 1200, duration: 600, lost: true },
      { from: 'proxy', to: 'client', label: '504 Gateway Timeout', subLabel: 'Upstream slow', color: '#ef4444', delay: 1900, duration: 600 },
    ],
  },

  // ========== REAL-WORLD PATTERNS ==========
  {
    id: 'graphql',
    title: 'GraphQL over HTTP',
    description: 'Single POST /graphql endpoint. Query trong body JSON. Response chứa data + errors. Không dùng HTTP status cho business errors (luôn 200).',
    type: 'request',
    steps: [
      { from: 'client', to: 'server', label: 'POST /graphql', subLabel: 'query { users {...} }', color: '#e535ab', delay: 0, duration: 600 },
      { from: 'server', to: 'client', label: '200 OK', subLabel: '{"data": {...}}', color: '#22c55e', delay: 700, duration: 600 },
      { from: 'client', to: 'server', label: 'POST /graphql', subLabel: 'mutation { create }', color: '#e535ab', delay: 1500, duration: 600 },
      { from: 'server', to: 'client', label: '200 OK', subLabel: '{"errors": [...]}', color: '#f59e0b', delay: 2200, duration: 600 },
    ],
  },
  {
    id: 'pagination',
    title: 'REST Pagination',
    description: 'Offset: ?page=2&limit=20. Cursor: ?cursor=abc123. Link header với rel=next, prev. Total count trong header hoặc body. Cursor tốt hơn cho real-time data.',
    type: 'request',
    steps: [
      { from: 'client', to: 'server', label: 'GET /users?page=1', subLabel: 'limit=20', color: '#3b82f6', delay: 0, duration: 500 },
      { from: 'server', to: 'client', label: '200 OK', subLabel: 'Link: </users?page=2>; rel=next', color: '#22c55e', delay: 600, duration: 500 },
      { from: 'client', to: 'server', label: 'GET /users?page=2', subLabel: 'Next page', color: '#3b82f6', delay: 1300, duration: 500 },
      { from: 'server', to: 'client', label: '200 OK', subLabel: 'X-Total-Count: 100', color: '#22c55e', delay: 1900, duration: 500 },
    ],
  },
  {
    id: 'multipart-upload',
    title: 'Multipart File Upload',
    description: 'Content-Type: multipart/form-data. Mỗi part có boundary separator. File binary + metadata trong cùng request. enctype="multipart/form-data" trong HTML form.',
    type: 'request',
    steps: [
      { from: 'client', to: 'server', label: 'POST /upload', subLabel: 'multipart/form-data', color: '#3b82f6', delay: 0, duration: 600 },
      { from: 'client', to: 'server', label: '--boundary', subLabel: 'Part 1: metadata', color: '#8b5cf6', delay: 200, duration: 400 },
      { from: 'client', to: 'server', label: '--boundary', subLabel: 'Part 2: file.jpg', color: '#8b5cf6', delay: 700, duration: 600 },
      { from: 'server', to: 'client', label: '201 Created', subLabel: 'File uploaded ✓', color: '#22c55e', delay: 1500, duration: 600 },
    ],
  },
  {
    id: 'long-polling',
    title: 'Long Polling',
    description: 'Client request, server hold connection cho đến có data mới hoặc timeout. Client ngay lập tức request lại. Simple real-time fallback cho WebSocket.',
    type: 'request',
    steps: [
      { from: 'client', to: 'server', label: 'GET /events', subLabel: 'Wait for updates', color: '#3b82f6', delay: 0, duration: 500 },
      { from: 'server', to: 'client', label: '(holding...)', subLabel: '30s max', color: '#6b7280', delay: 600, duration: 800, lost: true },
      { from: 'server', to: 'client', label: '200 OK', subLabel: 'New event!', color: '#22c55e', delay: 1600, duration: 500 },
      { from: 'client', to: 'server', label: 'GET /events', subLabel: 'Reconnect immediately', color: '#3b82f6', delay: 2200, duration: 500 },
    ],
  },
  {
    id: 'sse',
    title: 'Server-Sent Events',
    description: 'text/event-stream response. Server push data xuống, connection mở. Đơn giản hơn WebSocket, chỉ server→client. EventSource API trong browser.',
    type: 'version',
    steps: [
      { from: 'client', to: 'server', label: 'GET /events', subLabel: 'Accept: text/event-stream', color: '#3b82f6', delay: 0, duration: 500 },
      { from: 'server', to: 'client', label: '200 OK', subLabel: 'text/event-stream', color: '#22c55e', delay: 600, duration: 400 },
      { from: 'server', to: 'client', label: 'data: {...}', subLabel: 'Event 1', color: '#8b5cf6', delay: 1100, duration: 400 },
      { from: 'server', to: 'client', label: 'data: {...}', subLabel: 'Event 2', color: '#8b5cf6', delay: 1600, duration: 400 },
      { from: 'server', to: 'client', label: 'data: {...}', subLabel: 'Event 3 (streaming)', color: '#8b5cf6', delay: 2100, duration: 400 },
    ],
  },
  {
    id: 'content-negotiation',
    title: 'Content Negotiation',
    description: 'Accept header: client preferred format (json, xml, html). Accept-Language: locale. Accept-Encoding: compression. Server chọn best match, trả Vary header.',
    type: 'request',
    steps: [
      { from: 'client', to: 'server', label: 'GET /data', subLabel: 'Accept: application/json', color: '#3b82f6', delay: 0, duration: 600 },
      { from: 'server', to: 'client', label: '200 OK', subLabel: 'Content-Type: json', color: '#22c55e', delay: 700, duration: 600 },
      { from: 'client', to: 'server', label: 'GET /data', subLabel: 'Accept: text/xml', color: '#3b82f6', delay: 1500, duration: 600 },
      { from: 'server', to: 'client', label: '200 OK', subLabel: 'Content-Type: xml', color: '#22c55e', delay: 2200, duration: 600 },
    ],
  },
  {
    id: 'head-request',
    title: 'HEAD Request',
    description: 'Giống GET nhưng không có body trong response. Dùng để check: resource exist? size (Content-Length)? last modified? Tiết kiệm bandwidth.',
    type: 'request',
    steps: [
      { from: 'client', to: 'server', label: 'HEAD /file.zip', subLabel: 'No body wanted', color: '#3b82f6', delay: 0, duration: 600 },
      { from: 'server', to: 'client', label: '200 OK', subLabel: 'Content-Length: 500MB', color: '#22c55e', delay: 700, duration: 600 },
      { from: 'client', to: 'server', label: 'HEAD /old-file', color: '#3b82f6', delay: 1500, duration: 600 },
      { from: 'server', to: 'client', label: '404 Not Found', subLabel: 'Headers only', color: '#f59e0b', delay: 2200, duration: 600 },
    ],
  },

  // ========== INFRASTRUCTURE ==========
  {
    id: 'health-check',
    title: 'Health Check Endpoint',
    description: 'GET /health → 200 khi healthy, 503 khi not ready. Load balancer poll endpoint này. Readiness probe (K8s). Không return 200 nếu dependencies down.',
    type: 'status',
    showProxy: true,
    steps: [
      { from: 'proxy', to: 'server', label: 'GET /health', subLabel: 'LB probe', color: '#6b7280', delay: 0, duration: 400 },
      { from: 'server', to: 'proxy', label: '200 OK', subLabel: '{"status": "healthy"}', color: '#22c55e', delay: 500, duration: 400 },
      { from: 'proxy', to: 'server', label: 'GET /health', subLabel: '10s later', color: '#6b7280', delay: 1100, duration: 400 },
      { from: 'server', to: 'proxy', label: '503 Unavailable', subLabel: 'DB down!', color: '#ef4444', delay: 1600, duration: 400 },
      { from: 'proxy', to: 'client', label: 'Remove server', subLabel: 'From rotation', color: '#f59e0b', delay: 2100, duration: 400 },
    ],
  },
  {
    id: 'circuit-breaker',
    title: 'Circuit Breaker',
    description: 'Sau N failures liên tiếp → circuit OPEN → fail fast không gọi. Sau timeout → HALF-OPEN → thử 1 request. Success → CLOSED. Ngăn cascade failure.',
    type: 'error',
    showProxy: true,
    steps: [
      { from: 'client', to: 'proxy', label: 'GET /api', color: '#3b82f6', delay: 0, duration: 400 },
      { from: 'proxy', to: 'server', label: 'Forward', color: '#6b7280', delay: 500, duration: 300 },
      { from: 'server', to: 'proxy', label: 'FAIL ×5', subLabel: 'Circuit OPEN', color: '#ef4444', delay: 900, duration: 300 },
      { from: 'client', to: 'proxy', label: 'GET /api', subLabel: 'Next request', color: '#3b82f6', delay: 1400, duration: 400 },
      { from: 'proxy', to: 'client', label: '503 Fast fail', subLabel: 'No upstream call', color: '#f59e0b', delay: 1900, duration: 400 },
    ],
  },
  {
    id: 'retry-backoff',
    title: 'Retry with Backoff',
    description: 'Exponential backoff: 1s, 2s, 4s, 8s... + jitter (random). Tránh thundering herd. Max retries = 3-5. Chỉ retry 5xx và network errors, không retry 4xx.',
    type: 'error',
    steps: [
      { from: 'client', to: 'server', label: 'GET /api', subLabel: 'Attempt 1', color: '#3b82f6', delay: 0, duration: 500 },
      { from: 'server', to: 'client', label: '503 Unavailable', color: '#ef4444', delay: 600, duration: 400 },
      { from: 'client', to: 'server', label: 'Retry', subLabel: 'Wait 1s + jitter', color: '#f59e0b', delay: 1200, duration: 500 },
      { from: 'server', to: 'client', label: '503 Unavailable', color: '#ef4444', delay: 1800, duration: 400 },
      { from: 'client', to: 'server', label: 'Retry', subLabel: 'Wait 2s + jitter', color: '#f59e0b', delay: 2500, duration: 500 },
      { from: 'server', to: 'client', label: '200 OK', subLabel: 'Success! ✓', color: '#22c55e', delay: 3100, duration: 400 },
    ],
  },
  {
    id: 'canary-release',
    title: 'Canary Release',
    description: 'Route 5% traffic đến version mới (canary). Monitor errors/latency. Nếu OK → tăng dần lên 100%. Nếu fail → rollback ngay. Feature flags tương tự.',
    type: 'status',
    showProxy: true,
    steps: [
      { from: 'client', to: 'proxy', label: 'GET /api', subLabel: 'User A', color: '#3b82f6', delay: 0, duration: 400 },
      { from: 'proxy', to: 'server', label: 'Route to v2', subLabel: '5% canary', color: '#f59e0b', delay: 500, duration: 400 },
      { from: 'server', to: 'client', label: '200 OK (v2)', color: '#22c55e', delay: 1000, duration: 400 },
      { from: 'client', to: 'proxy', label: 'GET /api', subLabel: 'User B', color: '#3b82f6', delay: 1600, duration: 400 },
      { from: 'proxy', to: 'server', label: 'Route to v1', subLabel: '95% stable', color: '#6b7280', delay: 2100, duration: 400 },
      { from: 'server', to: 'client', label: '200 OK (v1)', color: '#22c55e', delay: 2600, duration: 400 },
    ],
  },
  {
    id: 'idempotency-key',
    title: 'Idempotency Key',
    description: 'Client gửi Idempotency-Key header unique cho mỗi request. Server lưu key + response. Nếu retry cùng key → trả cached response. Quan trọng cho payments.',
    type: 'request',
    steps: [
      { from: 'client', to: 'server', label: 'POST /payment', subLabel: 'Idempotency-Key: xyz', color: '#3b82f6', delay: 0, duration: 600 },
      { from: 'server', to: 'client', label: '200 OK', subLabel: 'Payment processed', color: '#22c55e', delay: 700, duration: 500 },
      { from: 'client', to: 'server', label: 'POST /payment', subLabel: 'Retry same key: xyz', color: '#f59e0b', delay: 1500, duration: 600 },
      { from: 'server', to: 'client', label: '200 OK', subLabel: 'Cached response (no dup)', color: '#06b6d4', delay: 2200, duration: 500 },
    ],
  },
  {
    id: 'http3-quic',
    title: 'HTTP/3 QUIC',
    description: 'HTTP/3 dùng QUIC (UDP) thay TCP. 0-RTT connection. Không có TCP head-of-line blocking. Tích hợp TLS 1.3. Nhanh hơn trên mạng lossy.',
    type: 'version',
    steps: [
      { from: 'client', to: 'server', label: 'QUIC Initial', subLabel: '0-RTT possible', color: '#06b6d4', delay: 0, duration: 500 },
      { from: 'server', to: 'client', label: 'QUIC Handshake', subLabel: 'TLS 1.3 integrated', color: '#06b6d4', delay: 600, duration: 500 },
      { from: 'client', to: 'server', label: 'Stream 1', subLabel: 'HTTP/3 request', color: '#22c55e', delay: 1200, duration: 400 },
      { from: 'client', to: 'server', label: 'Stream 2', subLabel: 'No HOL blocking', color: '#22c55e', delay: 1300, duration: 400 },
      { from: 'server', to: 'client', label: 'Responses', subLabel: 'Multiplexed', color: '#22c55e', delay: 1800, duration: 500 },
    ],
  },
]

export function HttpVisualizer({ className }: HttpVisualizerProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [sceneIdx, setSceneIdx] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const animationRef = useRef<ReturnType<typeof setTimeout>[]>([])

  const currentScene = useMemo(() => SCENES[sceneIdx], [sceneIdx])

  const stopAnimation = useCallback(() => {
    animationRef.current.forEach(clearTimeout)
    animationRef.current = []
    const svg = d3.select(svgRef.current)
    svg.selectAll('.packet').interrupt().remove()
    svg.selectAll('.packet-label').interrupt().remove()
    svg.selectAll('.timeline-marker').interrupt().remove()
  }, [])

  const animateScene = useCallback((scene: Scene) => {
    const svg = d3.select(svgRef.current)
    if (!svg.node()) return

    svg.selectAll('.packet').remove()
    svg.selectAll('.packet-label').remove()
    svg.selectAll('.timeline-marker').remove()

    const packetsLayer = svg.select('.packets-layer')
    const stepHeight = (TIMELINE_Y_END - TIMELINE_Y_START) / (scene.steps.length + 1)

    scene.steps.forEach((step, idx) => {
      const timeout = setTimeout(() => {
        const startX = getX(step.from)
        const endX = getX(step.to)
        const y = TIMELINE_Y_START + stepHeight * (idx + 1)

        if (step.lost) {
          packetsLayer.append('text')
            .attr('class', 'packet-label')
            .attr('x', (startX + endX) / 2)
            .attr('y', y)
            .attr('text-anchor', 'middle')
            .attr('fill', step.color)
            .attr('font-size', '12px')
            .attr('font-weight', 'bold')
            .style('opacity', 0)
            .text(step.label)
            .transition()
            .duration(300)
            .style('opacity', 1)

          if (step.subLabel) {
            packetsLayer.append('text')
              .attr('class', 'packet-label')
              .attr('x', (startX + endX) / 2)
              .attr('y', y + 16)
              .attr('text-anchor', 'middle')
              .attr('fill', step.color)
              .attr('font-size', '10px')
              .style('opacity', 0)
              .text(step.subLabel)
              .transition()
              .duration(300)
              .style('opacity', 0.7)
          }
          return
        }

        // Packet circle
        const packet = packetsLayer.append('g')
          .attr('class', 'packet')
          .attr('transform', `translate(${startX}, ${y})`)

        packet.append('circle')
          .attr('r', PACKET_RADIUS)
          .attr('fill', step.color)
          .attr('filter', 'url(#glow)')

        packet.append('circle')
          .attr('r', PACKET_RADIUS / 3)
          .attr('fill', 'white')

        packet
          .transition()
          .duration(step.duration)
          .ease(d3.easeLinear)
          .attr('transform', `translate(${endX}, ${y})`)
          .on('end', function () {
            const ripple = packetsLayer.append('circle')
              .attr('class', 'packet')
              .attr('cx', endX)
              .attr('cy', y)
              .attr('r', PACKET_RADIUS)
              .attr('fill', 'none')
              .attr('stroke', step.color)
              .attr('stroke-width', 2)

            ripple
              .transition()
              .duration(400)
              .attr('r', PACKET_RADIUS * 3)
              .style('opacity', 0)
              .remove()
          })

        // Label
        const labelX = (startX + endX) / 2
        const labelY = y - 15
        packetsLayer.append('text')
          .attr('class', 'packet-label')
          .attr('x', labelX)
          .attr('y', labelY)
          .attr('text-anchor', 'middle')
          .attr('fill', step.color)
          .attr('font-size', '12px')
          .attr('font-weight', 'bold')
          .style('opacity', 0)
          .text(step.label)
          .transition()
          .duration(200)
          .style('opacity', 1)

        if (step.subLabel) {
          packetsLayer.append('text')
            .attr('class', 'packet-label')
            .attr('x', labelX)
            .attr('y', labelY + 14)
            .attr('text-anchor', 'middle')
            .attr('fill', step.color)
            .attr('font-size', '10px')
            .attr('font-family', 'monospace')
            .style('opacity', 0)
            .text(step.subLabel)
            .transition()
            .duration(200)
            .style('opacity', 0.7)
        }

        // Timeline dashed line
        packetsLayer.append('line')
          .attr('class', 'timeline-marker')
          .attr('x1', startX)
          .attr('y1', y)
          .attr('x2', endX)
          .attr('y2', y)
          .attr('stroke', step.color)
          .attr('stroke-width', 1)
          .attr('stroke-dasharray', '4 4')
          .style('opacity', 0)
          .transition()
          .delay(step.duration)
          .duration(200)
          .style('opacity', 0.3)
      }, step.delay)

      animationRef.current.push(timeout)
    })
  }, [])

  // Initialize SVG defs + layers
  useEffect(() => {
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const defs = svg.append('defs')
    const filter = defs.append('filter')
      .attr('id', 'glow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%')

    filter.append('feGaussianBlur')
      .attr('stdDeviation', '3')
      .attr('result', 'coloredBlur')

    const feMerge = filter.append('feMerge')
    feMerge.append('feMergeNode').attr('in', 'coloredBlur')
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic')

    svg.append('rect').attr('width', WIDTH).attr('height', HEIGHT).attr('fill', 'transparent')
    svg.append('g').attr('class', 'static-layer')
    svg.append('g').attr('class', 'packets-layer')
  }, [])

  // Draw static nodes based on current scene
  useEffect(() => {
    const svg = d3.select(svgRef.current)
    const staticLayer = svg.select('.static-layer')
    staticLayer.selectAll('*').remove()

    const drawNode = (x: number, label: string, icon?: string) => {
      staticLayer.append('rect')
        .attr('x', x - 45).attr('y', 40)
        .attr('width', 90).attr('height', 50)
        .attr('rx', 8)
        .attr('fill', 'currentColor')
        .attr('class', 'text-muted')
        .attr('opacity', 0.2)

      staticLayer.append('text')
        .attr('x', x).attr('y', 70)
        .attr('text-anchor', 'middle')
        .attr('class', 'fill-foreground')
        .attr('font-size', '13px')
        .attr('font-weight', 'bold')
        .text(icon ? `${icon} ${label}` : label)

      staticLayer.append('line')
        .attr('x1', x).attr('y1', TIMELINE_Y_START)
        .attr('x2', x).attr('y2', TIMELINE_Y_END)
        .attr('stroke', 'currentColor')
        .attr('class', 'text-muted-foreground')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '8 4')
    }

    drawNode(CLIENT_X, 'Client', '💻')
    drawNode(SERVER_X, 'Server', '🖥️')

    if (currentScene.showProxy) {
      drawNode(PROXY_X, 'Nginx/LB', '🔀')
    }

    // Time axis label
    staticLayer.append('text')
      .attr('x', 40)
      .attr('y', (TIMELINE_Y_START + TIMELINE_Y_END) / 2)
      .attr('text-anchor', 'middle')
      .attr('class', 'fill-muted-foreground')
      .attr('font-size', '12px')
      .attr('transform', `rotate(-90, 40, ${(TIMELINE_Y_START + TIMELINE_Y_END) / 2})`)
      .text('Time →')

    // Type badge
    const typeColors: Record<string, string> = {
      request: '#3b82f6',
      status: '#22c55e',
      version: '#06b6d4',
      tls: '#10b981',
      error: '#ef4444',
    }
    const typeLabels: Record<string, string> = {
      request: 'REQUEST',
      status: 'STATUS',
      version: 'HTTP VER',
      tls: 'TLS',
      error: 'ERROR',
    }
    const badgeX = currentScene.showProxy ? PROXY_X : (CLIENT_X + SERVER_X) / 2

    staticLayer.append('rect')
      .attr('x', badgeX - 40).attr('y', 45)
      .attr('width', 80).attr('height', 24)
      .attr('rx', 12)
      .attr('fill', typeColors[currentScene.type])
      .attr('opacity', 0.2)

    staticLayer.append('text')
      .attr('x', badgeX).attr('y', 62)
      .attr('text-anchor', 'middle')
      .attr('fill', typeColors[currentScene.type])
      .attr('font-size', '11px')
      .attr('font-weight', 'bold')
      .text(typeLabels[currentScene.type])
  }, [currentScene])

  // Trigger animation when isPlaying changes
  useEffect(() => {
    if (isPlaying) {
      animateScene(currentScene)
      const totalDuration = Math.max(...currentScene.steps.map((s) => s.delay + s.duration)) + 500
      const timeout = setTimeout(() => setIsPlaying(false), totalDuration)
      return () => clearTimeout(timeout)
    }
  }, [isPlaying, currentScene, animateScene])

  const handlePlay = () => { stopAnimation(); setIsPlaying(true) }
  const handlePrev = () => { stopAnimation(); setIsPlaying(false); setSceneIdx((p) => (p - 1 + SCENES.length) % SCENES.length) }
  const handleNext = () => { stopAnimation(); setIsPlaying(false); setSceneIdx((p) => (p + 1) % SCENES.length) }
  const handleReset = () => { stopAnimation(); setIsPlaying(false); setSceneIdx(0) }

  return (
    <div className={cn('space-y-4', className)}>
      <svg
        ref={svgRef}
        width={WIDTH}
        height={HEIGHT}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full max-w-full border border-border rounded-lg bg-background"
      />

      <div className="bg-muted/30 rounded-lg p-4">
        <h4 className="font-semibold text-sm mb-1">{currentScene.title}</h4>
        <p className="text-sm text-muted-foreground">{currentScene.description}</p>
      </div>

      <div className="flex items-center justify-center gap-2">
        <Button size="sm" variant="outline" onClick={handleReset} title="Reset">
          <RotateCcw className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="outline" onClick={handlePrev} title="Scene trước">
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <Button size="sm" onClick={handlePlay} disabled={isPlaying}>
          <Play className="w-4 h-4 mr-1" />
          Play
        </Button>
        <Button size="sm" variant="outline" onClick={handleNext} title="Scene sau">
          <ChevronRight className="w-4 h-4" />
        </Button>
        <span className="text-sm text-muted-foreground px-2">
          {sceneIdx + 1}/{SCENES.length}
        </span>
      </div>

      <div className="flex flex-wrap justify-center gap-1">
        {SCENES.map((scene, idx) => (
          <button
            key={scene.id}
            onClick={() => { stopAnimation(); setIsPlaying(false); setSceneIdx(idx) }}
            className={cn(
              'text-xs px-2 py-1 rounded transition-colors',
              idx === sceneIdx
                ? scene.type === 'error'
                  ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400'
                  : scene.type === 'tls'
                    ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                    : scene.type === 'version'
                      ? 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-400'
                      : 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
                : 'bg-muted hover:bg-muted/80'
            )}
          >
            {scene.title}
          </button>
        ))}
      </div>
    </div>
  )
}
