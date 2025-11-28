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
        this.loading = true;
        // Try query param route first to avoid 404s from missing nested resource routes.
        // Fallback to /categories/:id/products if query route fails or returns empty.
        this.api.getProductsByCategory(found.id).pipe(
          catchError(() => this.api.getProductsByCategoryId(found.id)),
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
      } else {
        // fallback: try to load and filter by category name from products
        this.loadProductsForCategoryName(this.name);
      }
    });
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
    });
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
