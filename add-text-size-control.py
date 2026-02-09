#!/usr/bin/env python3
"""
Add text-size control to all HTML pages in Habitat docs
"""

import os
import re
from pathlib import Path

TEXT_SIZE_CONTROL = '''
  <!-- Text Size Adjustment Tool -->
  <div class="text-size-control">
    <button class="text-size-btn" onclick="adjustTextSize('decrease')" aria-label="Decrease text size">
      <i data-lucide="minus"></i>
    </button>
    <button class="text-size-btn active" onclick="adjustTextSize('reset')" aria-label="Reset text size">
      <i data-lucide="type"></i>
    </button>
    <button class="text-size-btn" onclick="adjustTextSize('increase')" aria-label="Increase text size">
      <i data-lucide="plus"></i>
    </button>
  </div>
  <script>
  (function() {
    const sizes = ['small', 'normal', 'large'];
    const fontSizes = { small: '15px', normal: '16px', large: '18px' };
    
    function adjustTextSize(action) {
      let currentSize = localStorage.getItem('textSize') || 'normal';
      let newSize = currentSize;
      
      if (action === 'decrease') {
        if (currentSize === 'normal') newSize = 'small';
        else if (currentSize === 'large') newSize = 'normal';
      } else if (action === 'increase') {
        if (currentSize === 'small') newSize = 'normal';
        else if (currentSize === 'normal') newSize = 'large';
      } else if (action === 'reset') {
        newSize = 'normal';
      }
      
      localStorage.setItem('textSize', newSize);
      applyTextSize(newSize);
      updateButtons(newSize);
    }
    
    function applyTextSize(size) {
      document.documentElement.style.fontSize = fontSizes[size];
    }
    
    function updateButtons(size) {
      const buttons = document.querySelectorAll('.text-size-btn');
      buttons.forEach(btn => btn.classList.remove('active'));
      
      if (size === 'small') buttons[0].classList.add('active');
      else if (size === 'normal') buttons[1].classList.add('active');
      else if (size === 'large') buttons[2].classList.add('active');
    }
    
    // Initialize on page load
    const savedSize = localStorage.getItem('textSize') || 'normal';
    applyTextSize(savedSize);
    
    // Update buttons after lucide icons are loaded
    document.addEventListener('DOMContentLoaded', () => {
      updateButtons(savedSize);
    });
    
    // Make function globally available
    window.adjustTextSize = adjustTextSize;
  })();
  </script>
'''

def add_text_size_control(html_path):
    """Add text-size control to an HTML file if not already present"""
    with open(html_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Skip if already has text-size-control
    if 'text-size-control' in content:
        print(f"  ✓ {html_path} - already has text-size control")
        return False
    
    # Find the position before the last <script>lucide.createIcons()</script>
    # Insert the text-size control before it
    pattern = r'(\s*<script>lucide\.createIcons\(\);</script>\s*</body>)'
    
    if re.search(pattern, content):
        new_content = re.sub(
            pattern,
            TEXT_SIZE_CONTROL + r'\1',
            content
        )
        
        with open(html_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        
        print(f"  ✓ {html_path} - added text-size control")
        return True
    else:
        print(f"  ✗ {html_path} - could not find insertion point")
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
        if add_text_size_control(html_file):
            updated += 1
        else:
            skipped += 1
    
    print()
    print(f"Updated: {updated}")
    print(f"Skipped: {skipped}")

if __name__ == '__main__':
    main()
