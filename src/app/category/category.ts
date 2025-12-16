import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { CATEGORIES } from '../data/categories';
import { Category as CategoryModel } from '../models/category';
import { CartService } from '../services/cart.service';
import { ApiService } from '../services/api.service';
import { Product } from '../models/product';
import { catchError, finalize } from 'rxjs/operators';
import { of } from 'rxjs';
import { API_BASE_URL } from '../app.config';

@Component({
  selector: 'app-category',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './category.html',
  styleUrls: ['./category.scss']
})
export class Category {
  slug = '';
  name = '';
  loading = false;
  products = [] as Array<{ id: string; name: string; price: string; image: string; raw?: Product }>;
  // Client-side pagination to avoid rendering all items at once
  pageSize = 20;
  currentPage = 1;
  // Server-side pagination state
  useServerPaging = true;
  serverPage = 1;
  hasMore = true;
  serverLastPage: number | null = null;
  currentCategoryId: number | string | null = null;

  constructor(
    private route: ActivatedRoute,
    private cart: CartService,
    private api: ApiService
  ) {
    this.route.paramMap.subscribe(pm => {
      const s = pm.get('category') || '';
      this.updateForSlug(s);
    });
  }

  private updateForSlug(s: string) {
    this.slug = s;
    // fetch categories to find matching slug and then load products by category id
    this.api.getCategories().pipe(
      catchError(() => of(CATEGORIES as CategoryModel[]))
    ).subscribe(list => {
      const found = list.find(c => (c.slug || '').toLowerCase() === s.toLowerCase());
      this.name = found ? found.name : s.replace(/-/g, ' ');
      if (found && found.id) {
        this.currentCategoryId = found.id;
        // Try server-side pagination first; fallback to previous endpoints if unavailable.
        this.serverPage = 1;
        this.hasMore = true;
        this.loadProductsPage(found.id, 1);
      } else {
        // fallback: try to load and filter by category name from products
        this.loadProductsForCategoryName(this.name);
      }
    });
  }

  private loadProductsPage(categoryId: number | string, page = 1) {
    this.loading = true;
    this.api.getProductsByCategoryPaged(categoryId, page, this.pageSize).pipe(
      catchError(() => {
        // If paged route not available, fallback to existing category endpoints
        this.loadProductsByCategoryId(categoryId);
        return of({ items: [] as Product[], meta: undefined });
      }),
      finalize(() => { this.loading = false; })
    ).subscribe(result => {
      const list = (result && (result as any).items) ? (result as any).items as Product[] : [] as Product[];
      const meta = (result && (result as any).meta) ? (result as any).meta : undefined;

      const mapped = (list || []).map(p => ({
        id: String(p.id),
        name: p.name,
        price: (Number(p.price) || 0).toFixed(2),
        image: p.image || `https://picsum.photos/seed/${this.slug}${p.id}/400/300`,
        raw: p
      }));

      if (page === 1) this.products = mapped;
      else this.products = this.products.concat(mapped);

      // Determine hasMore using meta if provided, otherwise fall back to pageSize heuristic
      if (meta && typeof meta.current_page !== 'undefined' && typeof meta.last_page !== 'undefined') {
        this.serverPage = meta.current_page || page;
        this.serverLastPage = meta.last_page || null;
        this.hasMore = (meta.current_page || page) < (meta.last_page || (meta.current_page || page));
      } else {
        this.serverPage = page;
        this.serverLastPage = null;
        this.hasMore = mapped.length === this.pageSize;
      }
    });
  }

  // Navigate to a specific page (works for server or client paging)
  goToPage(page: number) {
    if (page < 1) return;
    if (this.useServerPaging && this.currentCategoryId) {
      // reset and load requested server page
      this.products = [];
      this.loadProductsPage(this.currentCategoryId, page);
      return;
    }

    // client-side: set current page (will expand visibleProducts)
    this.currentPage = page;
  }

  private loadProductsByCategoryId(categoryId: number | string) {
    this.loading = true;
    this.api.getProductsByCategory(categoryId).pipe(
      catchError(() => of([])),
      finalize(() => { this.loading = false; })
    ).subscribe(list => {
      this.products = (list || []).map(p => ({
        id: String(p.id),
        name: p.name,
        price: (Number(p.price) || 0).toFixed(2),
        image: p.image || `https://picsum.photos/seed/${this.slug}${p.id}/400/300`,
        raw: p
      }));
    });
  }

  private loadProductsForCategoryName(name: string) {
    this.loading = true;
    this.api.getProducts().pipe(
      catchError(() => of([])),
      finalize(() => { this.loading = false; })
    ).subscribe(list => {
      const targetName = (name || '').toLowerCase();
      const targetSlug = (this.slug || '').toLowerCase();

      const filtered = list.filter(p => {
        if (!p) return false;

        // If product has nested category object
        if (p.category && typeof p.category === 'object') {
          const catObj: any = p.category;
          if (catObj.name && String(catObj.name).toLowerCase() === targetName) return true;
          if (catObj.slug && String(catObj.slug).toLowerCase() === targetSlug) return true;
          if (catObj.id && String(catObj.id) === String(catObj.id)) return true;
        }

        // If product has category as id or slug fields
        if (p.categoryId && String(p.categoryId) === String(this.slug || p.categoryId)) return true;
        if ((p as any).category_id && String((p as any).category_id) === String(this.slug || (p as any).category_id)) return true;

        // If product stores category as string (slug)
        if (typeof p.category === 'string') {
          const c = String(p.category).toLowerCase();
          if (c === targetSlug || c === targetName) return true;
        }

        return false;
      });
      this.products = filtered.map(p => ({
        id: String(p.id),
        name: p.name,
        price: (Number(p.price) || 0).toFixed(2),
        image: p.image || `https://picsum.photos/seed/${this.slug}${p.id}/400/300`,
        raw: p
      }));
      this.currentPage = 1;
    });
  }

  // visible subset of products for the current page
  get visibleProducts() {
    if (this.useServerPaging) return this.products;
    const end = this.currentPage * this.pageSize;
    return this.products.slice(0, end);
  }

  loadMore() {
    if (this.useServerPaging && this.currentCategoryId && this.hasMore) {
      this.loadProductsPage(this.currentCategoryId, this.serverPage + 1);
      return;
    }

    this.currentPage += 1;
  }

  imageUrl(image?: string) {
    const origin = (API_BASE_URL || '').replace(/\/api\/?$/, '');
    if (!image) return `https://picsum.photos/400/300`;
    if (image.startsWith('http') || image.startsWith('//')) return image;

    if (image.startsWith('storage/')) return origin + '/' + image;
    if (image.startsWith('/storage/')) return origin + image;
    if (image.startsWith('images/')) return origin + '/storage/' + image;
    if (image.startsWith('/images/')) return origin + '/storage' + image;

    if (image.startsWith('/')) return origin + image;
    return origin + '/' + image;
  }

  handleImgError(ev: Event) {
    const img = ev.target as HTMLImageElement;
    if (img && img.src && !img.getAttribute('data-fallback')) {
      img.setAttribute('data-fallback', '1');
      img.src = '/assets/placeholder.png';
    }
  }

  addToCart(p: { id: string; name: string; price: string; image: string; raw?: Product }) {
    this.cart.add({ id: p.id, name: p.name, price: p.price, image: p.image, qty: 1 });
  }
}
