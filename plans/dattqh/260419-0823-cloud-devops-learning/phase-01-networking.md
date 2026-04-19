---
phase: 01
title: Networking & OSI
status: in-progress
priority: P1
effort: medium
---

# Phase 01 — Networking & OSI

## Why
Dev không hiểu mạng → debug được ứng dụng chỉ ở tầng code. Biết network = tự debug connection refused, DNS fail, firewall block, latency cao.

## Overview
Học theo luồng: **packet đi từ browser đến server qua các layer nào** → từng giao thức giải quyết vấn đề gì.

## Topics & Todo

### 1. Lý thuyết OSI / TCP-IP
- [ ] Hiểu 7 layer OSI vs 4 layer TCP/IP (mapping)
- [ ] Mỗi layer giải quyết gì: L2 (MAC/switch), L3 (IP/router), L4 (TCP/UDP/port), L7 (HTTP/DNS)
- [ ] Encapsulation: header được bọc vào packet ra sao
- **Demo**: Mở Wireshark, ping 8.8.8.8, bóc tách Ethernet → IP → ICMP

### 2. IPv4 & Subnetting
- [ ] IP class A/B/C, private vs public, CIDR notation (/24)
- [ ] Subnet mask, network/broadcast/host address
- [ ] VLSM — chia subnet theo nhu cầu
- **Demo**: Dùng `subnet-calculator.html` chia /24 thành 4 subnet /26, gán IP 2 VM cùng subnet → ping được; khác subnet → không ping được (chưa có gateway)

### 3. TCP vs UDP
- [ ] Vì sao cần 2 protocol — TCP reliable (3-way handshake), UDP fast (fire-and-forget)
- [ ] Port 0-65535, well-known ports (80/443/22/53)
- [ ] Khi nào dùng TCP (web, ssh, db), khi nào UDP (DNS, streaming, game)
- **Demo**: `nc -l 9000` (TCP) vs `nc -u -l 9000` (UDP), capture Wireshark so sánh

### 4. ICMP / Ping
- [ ] Ping không phải "kiểm tra mạng" — là ICMP echo request/reply
- [ ] Traceroute hoạt động thế nào (TTL trick)
- **Demo**: `ping`, `traceroute 8.8.8.8`, capture + giải thích từng hop

### 5. ARP
- [ ] Tại sao cần ARP: IP là logic, MAC mới đi được trên LAN
- [ ] ARP cache, ARP spoofing concept
- **Demo**: `arp -a` trước/sau ping máy cùng LAN; clear cache + capture ARP request/reply

### 6. DHCP
- [ ] DORA flow: Discover / Offer / Request / Ack
- [ ] Lease time, DHCP relay
- **Demo**: VM set DHCP, Wireshark capture full DORA; đổi sang static IP so sánh

### 7. HTTP
- [ ] Request/Response structure (method, header, body, status code)
- [ ] HTTP/1.1 vs HTTP/2 vs HTTP/3 (nhận biết thôi)
- [ ] HTTPS = HTTP + TLS (handshake cơ bản)
- **Demo**: `curl -v https://example.com`, đọc từng dòng; Wireshark capture TLS handshake

### 8. DNS
- [ ] Resolver → Root → TLD → Authoritative
- [ ] Record types: A, AAAA, CNAME, MX, TXT, NS
- [ ] TTL, caching
- **Demo**: `dig example.com +trace`, `nslookup`, so sánh trước/sau flush DNS cache

## Checklist qua phase
- [ ] Vẽ được sơ đồ packet browser → server qua layers
- [ ] Tự chia subnet bằng tay (không cần tool)
- [ ] Capture + đọc được Wireshark: ARP, DHCP, DNS, HTTP
- [ ] Giải thích được "connection refused" vs "timeout" khác nhau chỗ nào

## Artifacts
- `D:\CONG VIEC\hoc-cloud-cho-dev\subnet-calculator.html` — subnet tool
