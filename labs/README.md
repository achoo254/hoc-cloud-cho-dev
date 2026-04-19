# Learning Labs — WHY-first

Mỗi lab = 1 file HTML tự chứa cho 1 buổi học. Cấu trúc cố định:
**Hero → TL;DR → Core → Playground → Walkthrough → Quiz → Flashcards (SM-2) → Try at home**

Tất cả đều có field `why` bắt buộc. Template sẽ warn trong console nếu thiếu.

## Chạy

```bash
cd labs
python -m http.server 8000
# mở http://localhost:8000 → dashboard
```

Cần local server (không double-click file) vì lab dùng ES modules + fetch relative path.

## Cấu trúc

```
labs/
├── index.html                  # Dashboard: tiến độ, SRS due, lab list
├── _shared/
│   ├── lab-template.css        # Theme dark + WHY-first styling
│   └── lab-template.js         # Runtime: quiz, flashcard SM-2, clipboard, progress
├── 01-networking/
│   ├── 01-osi-packet-journey.html
│   └── ...
├── 02-linux/
└── ...
```

## Viết 1 lab mới

1. Copy file `01-networking/01-osi-packet-journey.html` làm boilerplate
2. Sửa `<title>`, hero, và `<script type="application/json" id="lab-data">`
3. Tùy chỉnh Playground (phần JS dưới cùng) cho topic cụ thể
4. Thêm entry vào `index.html` → mảng `CATALOG`
5. Mở DevTools console — phải không có warning `WHY missing`

### Schema `lab-data`

```json
{
  "title": "...",
  "tldr": [{ "what": "...", "why": "..." }],
  "walkthrough": [{ "step": 1, "what": "...", "why": "...", "code": "..." }],
  "quiz": [{
    "q": "...", "options": [...], "correct": 0,
    "whyCorrect": "...",
    "whyOthersWrong": { "1": "...", "2": "...", "3": "..." }
  }],
  "flashcards": [{ "front": "...", "back": "...", "why": "..." }],
  "tryAtHome": [{ "why": "...", "cmd": "..." }]
}
```

## Nguyên tắc WHY-first

Mọi block lý thuyết đều PHẢI kèm `why`:

| Element | WHY trả lời câu hỏi |
|---------|---------------------|
| TL;DR row | Tại sao cần biết dòng này? |
| Walkthrough step | Tại sao phải làm bước này? Bỏ qua thì sao? |
| Quiz | Tại sao đáp án đúng là đúng? Tại sao các đáp án khác sai? |
| Flashcard | Tại sao fact này quan trọng, dùng lúc nào? |
| Try-at-home cmd | Tại sao gõ lệnh này giúp hiểu bản chất? |

Nút **💡 Ẩn WHY** ở góc phải để tự test: tắt WHY → trả lời → bật lại kiểm tra.

## Spaced Repetition (SM-2)

- 4 nút rating sau khi lật thẻ: **Again** (0), **Hard** (1), **Good** (2), **Easy** (3)
- Thuật toán SM-2 tính khoảng thời gian tới lần ôn tiếp theo
- Lưu localStorage: `lab:srs:<labId>:<cardIndex>`
- Dashboard aggregate tổng số thẻ due hôm nay qua tất cả lab

## Progress tracking

Tất cả lưu ở localStorage, không backend:
- `lab:meta:<labId>` — lần truy cập gần nhất
- `lab:quiz:<labId>` — câu trả lời quiz + điểm
- `lab:srs:<labId>:<i>` — trạng thái SM-2 từng thẻ

Clear tất cả: DevTools → Application → Local Storage → delete all `lab:*`.
