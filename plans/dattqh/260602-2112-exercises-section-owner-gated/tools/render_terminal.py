#!/usr/bin/env python3
"""Render a real terminal transcript (stdin) -> terminal-style PNG.

Usage:
  echo "<transcript>" | python render_terminal.py <out.png> "<title>"

Transcript convention:
  - A line matching a shell prompt (e.g. `user@host:~$ cmd`) is rendered as a
    command line: green user@host, blue path, white command.
  - Lines starting with `#` are dim comments.
  - Everything else is output (light gray).
Content must be REAL captured output — this only styles it as a terminal.
"""
import sys
import re
from PIL import Image, ImageDraw, ImageFont

FONT_REG = r"C:\Windows\Fonts\consola.ttf"
FONT_BLD = r"C:\Windows\Fonts\consolab.ttf"
FS = 22
PAD = 28
TITLEBAR = 52
LINE_H = FS + 8
WRAP = 92  # max chars per line before soft-wrap

# GitHub-dark-ish palette
BG = (13, 17, 23)
TITLE_BG = (22, 27, 34)
COL_OUT = (201, 209, 217)
COL_USERHOST = (63, 185, 80)     # green
COL_PATH = (88, 166, 255)        # blue
COL_DOLLAR = (139, 148, 158)
COL_CMD = (255, 255, 255)
COL_COMMENT = (110, 118, 129)
COL_TITLE = (139, 148, 158)
DOTS = [(255, 95, 86), (255, 189, 46), (39, 201, 63)]

PROMPT_RE = re.compile(r"^(\S+@\S+?)(:[^$#]*)?([$#])\s(.*)$")


def softwrap(line):
    if len(line) <= WRAP:
        return [line]
    out = []
    while len(line) > WRAP:
        out.append(line[:WRAP])
        line = line[WRAP:]
    out.append(line)
    return out


def main():
    out_path = sys.argv[1]
    title = sys.argv[2] if len(sys.argv) > 2 else "terminal"
    raw = sys.stdin.read().rstrip("\n").split("\n")

    # Expand wrapped lines, remember styling per visual line.
    vlines = []  # (kind, payload)
    for ln in raw:
        m = PROMPT_RE.match(ln)
        if m:
            # keep command line unwrapped-ish but still soft-wrap if huge
            for i, piece in enumerate(softwrap(ln)):
                vlines.append(("cmd" if i == 0 else "out", piece if i else m))
        elif ln.startswith("#"):
            for piece in softwrap(ln):
                vlines.append(("comment", piece))
        else:
            for piece in softwrap(ln):
                vlines.append(("out", piece))

    reg = ImageFont.truetype(FONT_REG, FS)
    bld = ImageFont.truetype(FONT_BLD, FS)
    char_w = reg.getbbox("M")[2]

    width = PAD * 2 + char_w * WRAP
    height = TITLEBAR + PAD * 2 + LINE_H * len(vlines)
    img = Image.new("RGB", (width, height), BG)
    d = ImageDraw.Draw(img)

    # Title bar
    d.rectangle([0, 0, width, TITLEBAR], fill=TITLE_BG)
    for i, c in enumerate(DOTS):
        cx = 24 + i * 26
        d.ellipse([cx, TITLEBAR // 2 - 8, cx + 16, TITLEBAR // 2 + 8], fill=c)
    tb = d.textbbox((0, 0), title, font=reg)
    d.text(((width - (tb[2] - tb[0])) // 2, (TITLEBAR - FS) // 2 - 2), title, font=reg, fill=COL_TITLE)

    y = TITLEBAR + PAD
    x0 = PAD
    for kind, payload in vlines:
        if kind == "cmd":
            m = payload
            userhost, path, sym, cmd = m.group(1), m.group(2) or "", m.group(3), m.group(4)
            x = x0
            d.text((x, y), userhost, font=bld, fill=COL_USERHOST); x += bld.getbbox(userhost)[2]
            if path:
                d.text((x, y), path, font=bld, fill=COL_PATH); x += bld.getbbox(path)[2]
            d.text((x, y), sym + " ", font=bld, fill=COL_DOLLAR); x += bld.getbbox(sym + " ")[2]
            d.text((x, y), cmd, font=bld, fill=COL_CMD)
        elif kind == "comment":
            d.text((x0, y), payload, font=reg, fill=COL_COMMENT)
        else:
            d.text((x0, y), payload, font=reg, fill=COL_OUT)
        y += LINE_H

    img.save(out_path)
    print(f"[render] {out_path}  {width}x{height}  ({len(vlines)} lines)")


if __name__ == "__main__":
    main()
