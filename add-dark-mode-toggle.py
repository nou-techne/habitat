#!/usr/bin/env python3
"""
Add dark mode toggle to all HTML pages in Habitat docs
"""

import os
import re
from pathlib import Path

DARK_MODE_TOGGLE_AND_SCRIPT = '''  </div><!-- /site-controls -->
  <script>
  (function() {
    function toggleTheme() {
      var isDark = document.documentElement.getAttribute("data-theme") === "dark";
      var newTheme = isDark ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", newTheme);
      localStorage.setItem("theme", newTheme);
      lucide.createIcons();
    }
    var saved = localStorage.getItem("theme");
    if (saved === "dark" || (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      document.documentElement.setAttribute("data-theme", "dark");
    }
    window.toggleTheme = toggleTheme;
  })();
  </script>
'''

def add_dark_mode_toggle(html_path):
    """Add dark mode toggle to an HTML file if not already present"""
    with open(html_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Check if already has dark mode toggle
    if 'toggleTheme' in content:
        print(f"  ✓ {html_path} - already has dark mode toggle")
        return False
    
    # Check if has site-controls wrapper (from text-size control)
    if '<div class="text-size-control">' not in content:
        print(f"  ✗ {html_path} - missing text-size-control, skipping")
        return False
    
    # Find and wrap the text-size-control in site-controls if not already wrapped
    if '<div class="site-controls">' not in content:
        # Add site-controls wrapper and theme toggle before text-size-control
        pattern = r'(<!-- Text Size Adjustment Tool -->\s*)<div class="text-size-control">'
        replacement = r'\1<div class="site-controls">\n  <button class="theme-toggle" onclick="toggleTheme()" aria-label="Toggle dark mode">\n    <span class="icon-sun"><i data-lucide="sun"></i></span>\n    <span class="icon-moon"><i data-lucide="moon"></i></span>\n  </button>\n  <div class="text-size-control">'
        content = re.sub(pattern, replacement, content, count=1)
        
        # Add closing wrapper and toggleTheme script before the final lucide.createIcons() call
        pattern = r'(\s*window\.adjustTextSize = adjustTextSize;\s*}\)\(\);\s*</script>)\s*(<script>lucide\.createIcons\(\);</script>)'
        replacement = r'\1\n\n' + DARK_MODE_TOGGLE_AND_SCRIPT + r'\n\n\2'
        content = re.sub(pattern, replacement, content, count=1)
        
        with open(html_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print(f"  ✓ {html_path} - added dark mode toggle")
        return True
    else:
        # Already has site-controls, just check if toggle is present
        if '<button class="theme-toggle"' not in content:
            # Add theme toggle before text-size-control
            pattern = r'(<div class="site-controls">\s*)<div class="text-size-control">'
            replacement = r'\1<button class="theme-toggle" onclick="toggleTheme()" aria-label="Toggle dark mode">\n    <span class="icon-sun"><i data-lucide="sun"></i></span>\n    <span class="icon-moon"><i data-lucide="moon"></i></span>\n  </button>\n  <div class="text-size-control">'
            content = re.sub(pattern, replacement, content, count=1)
            
            # Add closing wrapper and script if not present
            if '</div><!-- /site-controls -->' not in content:
                pattern = r'(\s*window\.adjustTextSize = adjustTextSize;\s*}\)\(\);\s*</script>)\s*(<script>lucide\.createIcons\(\);</script>)'
                replacement = r'\1\n\n' + DARK_MODE_TOGGLE_AND_SCRIPT + r'\n\n\2'
                content = re.sub(pattern, replacement, content, count=1)
            
            with open(html_path, 'w', encoding='utf-8') as f:
                f.write(content)
            
            print(f"  ✓ {html_path} - added theme toggle button")
            return True
        else:
            print(f"  ✓ {html_path} - already complete")
            return False

def main():
    docs_dir = Path('/root/.openclaw/workspace/habitat/docs')
    html_files = list(docs_dir.rglob('*.html'))
    
    # Exclude the text-size-control.html file itself
    html_files = [f for f in html_files if f.name != 'text-size-control.html']
    
    print(f"Found {len(html_files)} HTML files")
    print()
    
    updated = 0
    skipped = 0
    
    for html_file in sorted(html_files):
        if add_dark_mode_toggle(html_file):
            updated += 1
        else:
            skipped += 1
    
    print()
    print(f"Updated: {updated}")
    print(f"Skipped: {skipped}")

if __name__ == '__main__':
    main()
