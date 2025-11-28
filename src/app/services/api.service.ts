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

  // Prefer backend route that returns products for a category resource.
  // Ex: GET /categories/:id/products
  getProductsByCategoryId(categoryId: number | string): Observable<Product[]> {
    return this.http.get<any>(`${this.base}/categories/${categoryId}/products`).pipe(
      map(res => (res && res.data) ? res.data as Product[] : res as Product[])
    );
  }
}
