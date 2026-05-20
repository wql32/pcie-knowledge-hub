#!/usr/bin/env python3
"""Notion to Markdown converter for PCIe Hub knowledge base."""

import os
import json
import requests
import sys
from pathlib import Path

NOTION_KEY = os.environ.get("NOTION_KEY", open(os.path.expanduser("~/.config/notion/api_key")).read().strip())
HEADERS = {
    "Authorization": f"Bearer {NOTION_KEY}",
    "Notion-Version": "2022-06-28",
    "Content-Type": "application/json"
}

def get_blocks(block_id, depth=0):
    """Fetch all blocks recursively from a page or block."""
    url = f"https://api.notion.com/v1/blocks/{block_id}/children?page_size=100"
    blocks = []
    
    while url:
        resp = requests.get(url, headers=HEADERS)
        if resp.status_code != 200:
            print(f"Error fetching {block_id}: {resp.status_code}", file=sys.stderr)
            break
        
        data = resp.json()
        for block in data.get("results", []):
            btype = block.get("type")
            content = block.get(btype, {})
            
            # Get rich text content
            rich_text = content.get("rich_text", [])
            text = "".join([t.get("plain_text", "") for t in rich_text])
            
            blocks.append({
                "type": btype,
                "text": text,
                "block_id": block.get("id"),
                "depth": depth,
                "has_children": block.get("has_children", False),
                "block_data": content
            })
            
            # Recursively fetch children
            if block.get("has_children"):
                children = get_blocks(block.get("id"), depth + 1)
                blocks.extend(children)
        
        # Handle pagination
        url = None
        if data.get("has_more"):
            url = f"https://api.notion.com/v1/blocks/{block_id}/children?page_size=100&start_cursor={data.get('next_cursor')}"
    
    return blocks

def blocks_to_markdown(blocks):
    """Convert Notion blocks to Markdown."""
    md_lines = []
    list_stack = []  # Stack to track list nesting
    prev_was_list = False
    
    for block in blocks:
        btype = block["type"]
        text = block["text"]
        depth = block["depth"]
        block_data = block["block_data"]
        
        # Close/open lists based on depth changes
        if depth == 0 and list_stack:
            list_stack = []
        
        # Heading blocks
        if btype == "heading_1":
            md_lines.append(f"# {text}")
        elif btype == "heading_2":
            md_lines.append(f"## {text}")
        elif btype == "heading_3":
            md_lines.append(f"### {text}")
        
        # Paragraph
        elif btype == "paragraph":
            if text.strip():
                md_lines.append(text)
            else:
                md_lines.append("")
        
        # Quote
        elif btype == "quote":
            md_lines.append(f"> {text}")
        
        # Callout
        elif btype == "callout":
            icon = block_data.get("icon", {})
            icon_text = ""
            if icon.get("emoji"):
                icon_text = icon["emoji"] + " "
            md_lines.append(f"> **{icon_text}** {text}")
        
        # Bulleted list
        elif btype == "bulleted_list_item":
            indent = "  " * depth
            md_lines.append(f"{indent}- {text}")
        
        # Numbered list
        elif btype == "numbered_list_item":
            indent = "  " * depth
            md_lines.append(f"{indent}1. {text}")
        
        # Code block
        elif btype == "code":
            lang = block_data.get("language", "")
            md_lines.append(f"```{lang}")
            md_lines.append(text)
            md_lines.append("```")
        
        # Divider
        elif btype == "divider":
            md_lines.append("---")
        
        # Image
        elif btype == "image":
            url = block_data.get("file", {}).get("url") or block_data.get("external_url", "")
            caption = "".join([t.get("plain_text", "") for t in block_data.get("caption", [])])
            if url:
                md_lines.append(f"![{caption}]({url})")
        
        # Toggle/accordion
        elif btype == "toggle":
            md_lines.append(f"<details><summary>{text}</summary>")
        
        # Table
        elif btype == "table":
            md_lines.append(f"<table>")
        
        # Skip child_page and child_database (they'll be fetched separately)
        elif btype == "child_page":
            pass  # Handled separately
        elif btype == "child_database":
            pass  # Handled separately
        else:
            if text.strip():
                md_lines.append(f"<!-- {btype}: {text} -->")
    
    return "\n".join(md_lines)

def fetch_page(page_id, title):
    """Fetch a complete Notion page and convert to Markdown."""
    blocks = get_blocks(page_id)
    md = blocks_to_markdown(blocks)
    return md

def main():
    # Key Notion pages to fetch
    pages = [
        ("31b1f64a-f1bd-815a-8b19-f5b4a44bb977", "🚀 PCIe Hub 学习中心", "pcie/hub-overview"),
        ("3181f64a-f1bd-81c2-9893-eea2b09219cf", "🚀 along 的 PCIe 7.0 知识库", "pcie/pcie7-knowledge"),
        ("3221f64a-f1bd-8171-8afb-f98425a3736c", "📘 PCIe TLP Byte Enable 规则详解", "pcie/tlp-byte-enable"),
        ("3221f64a-f1bd-81d4-b34a-c1c49619b521", "📘 PCIe Completion TLP 处理规则", "pcie/completion-tlp"),
        ("27f1f64a-f1bd-80fd-aae3-ec4e931ae977", "PCIE", "pcie/pcie-main"),
    ]
    
    output_dir = Path("/root/.openclaw/workspace/pcie-knowledge-site/docs")
    output_dir.mkdir(parents=True, exist_ok=True)
    
    for page_id, title, out_path in pages:
        print(f"Fetching: {title}...")
        try:
            md_content = fetch_page(page_id, title)
            
            # Add frontmatter
            full_content = f'''---
title: {title}
---

# {title}

{md_content}
'''
            
            out_file = output_dir / f"{out_path}.md"
            out_file.parent.mkdir(parents=True, exist_ok=True)
            out_file.write_text(full_content)
            print(f"  -> Saved to {out_file}")
        except Exception as e:
            print(f"  -> Error: {e}")

if __name__ == "__main__":
    main()