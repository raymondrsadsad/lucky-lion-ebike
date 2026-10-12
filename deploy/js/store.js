/* store.js — loads the real content (products.json + content.json) once, cached. */
const STORE = {
  products: null,
  content: null,
  async load() {
    if (this.products && this.content) return this;
    const [p, c] = await Promise.all([
      fetch('data/products.json').then(r => r.json()),
      fetch('data/content.json').then(r => r.json())
    ]);
    this.products = p;
    this.content = c;
    return this;
  },
  modelById(id) { return (this.products?.models || []).find(m => m.id === id); },
  modelsByWheel(w) { return (this.products?.models || []).filter(m => m.wheels === w); },
  peso(n) { return '₱' + Number(n).toLocaleString('en-PH'); }
};
