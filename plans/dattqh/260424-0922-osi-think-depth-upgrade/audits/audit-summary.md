# Audit Summary — 7 Labs (OSI Think-Depth Upgrade)

## Ranked Priority Table

| Rank | Lab | Total Score | M | T | W | C | B | Key Issues |
|------|-----|-------------|---|---|---|---|---|------------|
| 1 | `dns` | 7/10 | 2 | 2 | 1 | 2 | 0 | 9/12 tldr rows uncited; "thám tử" analogy framing; 10 RFC anchors missing |
| 2 | `icmp-ping` | 7/10 | 2 | 1 | 2 | 1 | 1 | Banned phrase "nhiều người"; `<code>` HTML tag in tldr; walkthrough thin on mechanics |
| 3 | `http` | 6/10 | 2 | 1 | 1 | 2 | 0 | `<code>` HTML tags in 2 walkthrough why fields; 0/11 tldr RFC cites; "~30-50%" unsourced |
| 4 | `arp` | 6/10 | 2 | 1 | 1 | 2 | 0 | 0/7 tldr RFC cites; ~1ms cache hit claim unsourced; 5 high-value misconceptions |
| 5 | `dhcp` | 5/10 | 2 | 1 | 1 | 1 | 0 | Partial cite coverage (1/7 tldr, 1/7 walkthrough); T1/T2 RFC 2131 §4.4.5 missing |
| 6 | `tcp-udp` | 5/10 | 2 | 1 | 1 | 1 | 0 | 0/6 tldr RFC cites; "hàng tỷ query/giây" unsourced; TIME_WAIT RFC 793 cite good in step[7] |
| 7 | `subnet-cidr` | 5/10 | 2 | 1 | 0 | 1 | 1 | "bạn" banned pronoun in tldr[5]; 0/7 walkthrough violations (math-only acceptable); 6 tldr rows need cites |

## Phase 5 Effort Estimate

| Lab | Misconceptions | TL;DR rows to fix | Walkthrough steps to fix | Effort |
|-----|---------------|-------------------|--------------------------|--------|
| `dns` | 5 new | 9 / 12 | 3 / 7 | 1.0h |
| `icmp-ping` | 5 new | 4 / 6 | 3 / 6 | 0.75h |
| `http` | 5 new | 7 / 11 | 3 / 7 | 0.75h |
| `arp` | 5 new | 4 / 7 | 3 / 7 | 0.75h |
| `dhcp` | 5 new | 4 / 7 | 3 / 7 | 0.5h |
| `tcp-udp` | 5 new | 5 / 6 | 3 / 7 | 0.5h |
| `subnet-cidr` | 5 new | 6 / 14 | 0 / 7 | 0.5h |
| **Total** | **35 items** | **39 rows** | **18 steps** | **4.75h** |

> **FLAG**: Total estimate 4.75h exceeds the 4h ceiling. Recommend descoping to hit ≤4h:
> - Option A: Drop `dns` misconceptions from 5→3 items (saves ~0.25h) + batch RFC cite additions across all labs in one pass (saves ~0.5h) → **~4h**
> - Option B: Defer `subnet-cidr` (lowest score impact, math-heavy, banned phrase is a 1-line fix) to a separate cleanup pass → saves 0.5h → **~4.25h**
> - Option C (recommended): Do Option A + fix `subnet-cidr` banned phrase inline during tldr cite pass → **≤4h**

## Cross-Lab Patterns

**Banned phrases found:**
- `icmp-ping` step[1].why: "Nhiều người nhầm" — replace with factual framing
- `subnet-cidr` tldr[5].why: "bạn curl" — replace with "khi curl từ laptop"

**HTML tags in why fields (should be plain text):**
- `icmp-ping` tldr[0].why: `<code>ping</code>` → `ping`
- `http` step[1].why: `<code>curl -v</code>` → `curl -v`
- `http` step[4].why: `<code>openssl s_client</code>` → `openssl s_client`

**Unsourced quantitative claims to fix or remove:**
- `arp` step[1].why: "~1ms cache hit"
- `icmp-ping` tldr[5].why: "ping Singapore→Europe ~200ms"
- `http` tldr[8].why: "~30-50% nhanh hơn H1"
- `tcp-udp` tldr[4].why: "hàng tỷ query/giây"
- `dns` tldr[2].why: "hàng trăm anycast instance"

**Universal gap: misconceptions field** — all 7 labs missing, M=2 each. 35 total items to draft; average 5/lab. Highest-value candidates are in `arp` (ARP spoofing, gratuitous ARP) and `icmp-ping` (ping≠connectivity, TTL semantics).

## RFC Anchor Cheatsheet for Phase 5

| Lab | Primary RFCs |
|-----|-------------|
| `arp` | RFC 826, RFC 5227, RFC 4861 §7.3 |
| `dhcp` | RFC 2131 (§4.1, §4.3, §4.4.5), RFC 2132, RFC 3046 |
| `dns` | RFC 1034 (§3.5, §4.3.2, §5.3.1), RFC 1035 §4.1.1, RFC 2181 §10.1, RFC 2308 §3, RFC 7208, RFC 6376, RFC 7489, RFC 8484 |
| `http` | RFC 9110 (§6, §15), RFC 9112 §9.3, RFC 9113, RFC 7541, RFC 7301, RFC 8446 §4 |
| `icmp-ping` | RFC 792, RFC 791 §3.2, RFC 1191 |
| `subnet-cidr` | RFC 791 §3.2, RFC 1918 §3, RFC 4632, RFC 3022, RFC 5735 §3 |
| `tcp-udp` | RFC 9293 (§3.1, §3.3, §3.5), RFC 768, RFC 6298 §2, RFC 9000, RFC 9114, RFC 4987 |
