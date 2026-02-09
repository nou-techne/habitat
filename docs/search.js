// Simple client-side search
let searchIndex = [];

// Load search index
fetch('/search.json')
  .then(res => res.json())
  .then(data => { searchIndex = data; })
  .catch(() => console.log('Search index not available'));

// Search function
function performSearch(query) {
  if (!query || query.length < 2) return [];
  
  const lowerQuery = query.toLowerCase();
  const results = [];
  
  for (const item of searchIndex) {
    const titleMatch = item.title.toLowerCase().includes(lowerQuery);
    const keywordMatch = item.keywords.toLowerCase().includes(lowerQuery);
    
    if (titleMatch || keywordMatch) {
      results.push({
        ...item,
        score: titleMatch ? 10 : 5
      });
    }
  }
  
  return results.sort((a, b) => b.score - a.score).slice(0, 8);
}

// Render results
function renderResults(results) {
  const container = document.getElementById('search-results');
  
  if (results.length === 0) {
    container.innerHTML = '<div class="search-no-results">No results found</div>';
    container.classList.add('show');
    return;
  }
  
  container.innerHTML = results.map(r => `
    <a href="${r.url}" class="search-result-item">
      <div class="search-result-title">${r.title}</div>
      <div class="search-result-keywords">${r.keywords.split(' ').slice(0, 6).join(', ')}</div>
    </a>
  `).join('');
  
  container.classList.add('show');
}

// Attach event listeners
document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('search-input');
  const results = document.getElementById('search-results');
  
  if (!input) return;
  
  // Search on input
  input.addEventListener('input', (e) => {
    const query = e.target.value.trim();
    if (query.length < 2) {
      results.classList.remove('show');
      return;
    }
    renderResults(performSearch(query));
  });
  
  // Close on outside click
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.nav-search')) {
      results.classList.remove('show');
    }
  });
  
  // Keyboard shortcut (Cmd/Ctrl + K)
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      input.focus();
      input.select();
    }
    
    // Escape to close
    if (e.key === 'Escape' && document.activeElement === input) {
      input.blur();
      results.classList.remove('show');
    }
  });
});
