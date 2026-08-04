(() => {
  const progress = document.querySelector('[data-reading-progress]');
  const article = document.querySelector('.article-content');
  if (progress && article) {
    const update = () => {
      const start = article.offsetTop;
      const end = start + article.offsetHeight - innerHeight;
      const value = Math.max(0, Math.min(1, (scrollY - start) / Math.max(1, end - start)));
      progress.style.transform = `scaleX(${value})`;
    };
    addEventListener('scroll', update, { passive: true });
    addEventListener('resize', update);
    update();
  }

  const search = document.querySelector('[data-search]');
  const cards = [...document.querySelectorAll('[data-article-card]')];
  if (search) {
    search.addEventListener('input', () => {
      const q = search.value.trim().toLowerCase();
      cards.forEach(card => {
        card.hidden = q && !card.textContent.toLowerCase().includes(q);
      });
    });
  }

  const content = document.querySelector('.article-content');
  const toc = document.querySelector('[data-toc]');
  if (content && toc) {
    const headings = [...content.querySelectorAll('h2')];
    headings.forEach((heading, index) => {
      if (!heading.id) heading.id = `section-${index + 1}`;
      const link = document.createElement('a');
      link.href = `#${heading.id}`;
      link.textContent = heading.textContent;
      toc.appendChild(link);
    });
  }
})();