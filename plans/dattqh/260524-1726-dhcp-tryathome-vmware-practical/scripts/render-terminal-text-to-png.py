#!/usr/bin/env python3
"""
render-terminal-text-to-png.py

Render text file (terminal output) thành PNG terminal-style (đen nền, sáng chữ,
monospace) để dùng làm reference screenshot cho lab content.

Usage:
    python render-terminal-text-to-png.py <input.txt> <output.png> [--title "Caption"]
"""

import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

# Terminal styling
BG_COLOR = (16, 16, 16)
FG_COLOR = (220, 220, 220)
TITLE_COLOR = (130, 200, 130)
LINE_PADDING = 4
PADDING_X = 20
PADDING_Y = 16

# Font candidates (Windows + Linux fallback)
FONT_CANDIDATES = [
    "C:/Windows/Fonts/consola.ttf",
    "C:/Windows/Fonts/cour.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf",
    "/System/Library/Fonts/Menlo.ttc",
]


def load_font(size: int) -> ImageFont.FreeTypeFont:
    for path in FONT_CANDIDATES:
        if Path(path).exists():
            return ImageFont.truetype(path, size=size)
    return ImageFont.load_default()


def render(input_path: str, output_path: str, title: str | None = None, font_size: int = 14) -> None:
    text = Path(input_path).read_text(encoding="utf-8")
    lines = text.split("\n")

    font = load_font(font_size)
    bbox = font.getbbox("M")
    char_w = bbox[2] - bbox[0]
    line_h = (bbox[3] - bbox[1]) + LINE_PADDING

    max_line_chars = max((len(line) for line in lines), default=80)
    img_w = PADDING_X * 2 + max_line_chars * char_w
    img_w = max(img_w, 900)

    n_lines = len(lines)
    if title:
        n_lines += 2
    img_h = PADDING_Y * 2 + n_lines * line_h

    img = Image.new("RGB", (img_w, img_h), BG_COLOR)
    draw = ImageDraw.Draw(img)

    y = PADDING_Y
    if title:
        draw.text((PADDING_X, y), title, fill=TITLE_COLOR, font=font)
        y += line_h * 2

    for line in lines:
        color = TITLE_COLOR if line.startswith("===") or line.startswith("---") else FG_COLOR
        draw.text((PADDING_X, y), line, fill=color, font=font)
        y += line_h

    img.save(output_path, optimize=True)
    print(f"[ok] {output_path} ({img_w}x{img_h})")


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)
    title = None
    for i, arg in enumerate(sys.argv):
        if arg == "--title" and i + 1 < len(sys.argv):
            title = sys.argv[i + 1]
    render(sys.argv[1], sys.argv[2], title=title)
