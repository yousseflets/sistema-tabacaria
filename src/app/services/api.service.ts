import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { Product } from '../models/product';
import { Category } from '../models/category';
import { API_BASE_URL } from '../app.config';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private base = API_BASE_URL;
  private productsByCategoryCache = new Map<string, import('../models/product').Product[]>();

  constructor(private http: HttpClient) {}

  getProducts(): Observable<Product[]> {
    return this.http.get<any>(`${this.base}/products`).pipe(
      map(res => (res && res.data) ? res.data as Product[] : res as Product[])
    );
  }

  getProduct(id: number | string): Observable<Product> {
    return this.http.get<any>(`${this.base}/products/${id}`).pipe(
      map(res => (res && res.data) ? res.data as Product : res as Product)
    );
  }

  getCategories(): Observable<Category[]> {
    return this.http.get<any>(`${this.base}/categories`).pipe(
      map(res => (res && res.data) ? res.data as Category[] : res as Category[]),
      map(list => {
        // Ensure every category has a slug so templates can rely on it
        return (list || []).map(c => {
          const source = (c.slug && String(c.slug)) || (c.name ? String(c.name) : String(c.id));
          const normalized = (typeof source === 'string')
            ? source.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            : String(source);
          const slug = normalized.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');
          return ({ ...c, slug } as Category);
        });
      })
    );
  }

  getProductsByCategory(categoryId: number | string): Observable<Product[]> {
    const key = String(categoryId);
    // simple in-memory cache using shareReplay so repeated navigations are fast
    const cached = (this as any)["_cache_products_" + key] as Observable<Product[]> | undefined;
    if (cached) return cached;

    const obs = this.http.get<any>(`${this.base}/products?categoryId=${categoryId}`).pipe(
      map(res => (res && res.data) ? res.data as Product[] : res as Product[]),
      shareReplay({ bufferSize: 1, refCount: true })
    );
    (this as any)["_cache_products_" + key] = obs;
    return obs;
  }

  // Server-side paged products for a category. Works with json-server using
  // nested filter `category.id` and `_page`/`_limit` query params.
  // Returns paged items and optional meta (compatible with Laravel/Pagination or json-server style)
  getProductsByCategoryPaged(categoryId: number | string, page = 1, limit = 20): Observable<{ items: Product[]; meta?: any }> {
    const key = `${categoryId}:page:${page}:limit:${limit}`;
    const cached = (this as any)["_cache_products_" + key] as Observable<{ items: Product[]; meta?: any }> | undefined;
    if (cached) return cached;

    // Try Laravel-style pagination first (category_id, page, per_page). Fall back to json-server style.
    const laravelUrl = `${this.base}/products?category_id=${categoryId}&page=${page}&per_page=${limit}`;
    const jsonServerUrl = `${this.base}/products?category.id=${categoryId}&_page=${page}&_limit=${limit}`;

    const obs = this.http.get<any>(laravelUrl).pipe(
      // If laravelUrl fails or returns unexpected shape, the catch in the caller will handle fallback.
      map(res => {
        if (res && res.data) return { items: res.data as Product[], meta: res.meta };
        // If backend returned array directly, treat as items
        if (Array.isArray(res)) return { items: res as Product[], meta: undefined };
        return { items: (res && res.items) ? res.items as Product[] : [] as Product[], meta: res && res.meta ? res.meta : undefined };
      }),
      shareReplay({ bufferSize: 1, refCount: true })
    );
    // Note: callers may choose to call jsonServerUrl instead if needed.
    (this as any)["_cache_products_" + key] = obs;
    return obs;
  }

  // Prefer backend route that returns products for a category resource.
  // Ex: GET /categories/:id/products
  getProductsByCategoryId(categoryId: number | string): Observable<Product[]> {
    return this.http.get<any>(`${this.base}/categories/${categoryId}/products`).pipe(
      map(res => (res && res.data) ? res.data as Product[] : res as Product[])
    );
  }
}
