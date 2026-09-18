"""Generate the small article index consumed by the static site.

Each article keeps its content in Markdown. Only the front matter is used to
render cards; the browser still fetches the original Markdown for reading.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).parent
POSTS_DIR = ROOT / "posts"


def parse_front_matter(text: str, fallback_slug: str) -> dict:
    match = re.match(r"^---\s*\n(.*?)\n---\s*\n", text, re.S)
    data = {}
    if match:
        for line in match.group(1).splitlines():
            key, separator, value = line.partition(":")
            if not separator:
                continue
            value = value.strip().strip('"\'')
            if key.strip() == "tags":
                value = [tag.strip() for tag in value.strip("[]").split(",") if tag.strip()]
            data[key.strip()] = value
    data.setdefault("slug", fallback_slug)
    data.setdefault("date", fallback_slug[:10])
    data.setdefault("title", fallback_slug)
    data.setdefault("tags", ["学习记录"])
    data.setdefault("excerpt", "打开文章，查看本次学习记录。")
    return data


def main() -> None:
    posts = []
    for path in sorted(POSTS_DIR.glob("*.md"), reverse=True):
        slug = path.stem
        data = parse_front_matter(path.read_text(encoding="utf-8"), slug)
        data["file"] = path.relative_to(ROOT).as_posix()
        posts.append(data)
    (ROOT / "posts.json").write_text(json.dumps(posts, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Generated posts.json with {len(posts)} article(s).")


if __name__ == "__main__":
    main()
