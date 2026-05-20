#!/usr/bin/env python3
import re
with open('/root/.openclaw/workspace/pcie-knowledge-site/scripts/notion-sync.cjs', 'r') as f:
    content = f.read()

# The problematic line has mixed quotes
# Pattern: '# " + title + "\n"];'  (with escaped quotes inside single-quoted string)
# Fix: replace with a proper string concatenation
old_pattern = r"# \" \+ title \+ \"\\n\"\];"
new_str = "# ' + title + '\\n'];"
content = re.sub(old_pattern, new_str, content)

with open('/root/.openclaw/workspace/pcie-knowledge-site/scripts/notion-sync.cjs', 'w') as f:
    f.write(content)

print("Done")