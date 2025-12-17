import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, shareReplay, tap } from 'rxjs/operators';
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

  getProductEssencias(id: number | string): Observable<Product> {
    return this.http.get<any>(`${this.base}/products/${id}`).pipe(
      map(res => (res && res.data) ? res.data as Product : res as Product)
    );
  }

  getCategories(): Observable<Category[]> {
    return this.http.get<any>(`${this.base}/categories`).pipe(
      map(res => (res && res.data) ? res.data as Category[] : res as Category[]),
      map(list => {
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
    const cached = (this as any)["_cache_products_" + key] as Observable<Product[]> | undefined;
    if (cached) return cached;

    const obs = this.http.get<any>(`${this.base}/products?categoryId=${categoryId}`).pipe(
      map(res => (res && res.data) ? res.data as Product[] : res as Product[]),
      shareReplay({ bufferSize: 1, refCount: true })
    );
    (this as any)["_cache_products_" + key] = obs;
    return obs;
  }


  getProductsByCategoryPaged(categoryId: number | string, page = 1, limit = 20): Observable<{ items: Product[]; meta?: any }> {
    const key = `${categoryId}:page:${page}:limit:${limit}`;
    const cached = (this as any)["_cache_products_" + key] as Observable<{ items: Product[]; meta?: any }> | undefined;
    if (cached) return cached;

    const laravelUrl = `${this.base}/products?category_id=${categoryId}&page=${page}&per_page=${limit}`;
    const jsonServerUrl = `${this.base}/products?category.id=${categoryId}&_page=${page}&_limit=${limit}`;

    console.debug('[ApiService] getProductsByCategoryPaged ->', { laravelUrl, jsonServerUrl });

    const obs = this.http.get<any>(laravelUrl).pipe(
      tap(res => console.debug('[ApiService] response for paged products', { url: laravelUrl, res })),
      map(res => {
        if (res && res.data) return { items: res.data as Product[], meta: res.meta };
        if (Array.isArray(res)) return { items: res as Product[], meta: undefined };
        return { items: (res && res.items) ? res.items as Product[] : [] as Product[], meta: res && res.meta ? res.meta : undefined };
      }),
      shareReplay({ bufferSize: 1, refCount: true })
    );
    (this as any)["_cache_products_" + key] = obs;
    return obs;
  }


  getProductsByCategoryId(categoryId: number | string): Observable<Product[]> {
    return this.http.get<any>(`${this.base}/categories/${categoryId}/products`).pipe(
      map(res => (res && res.data) ? res.data as Product[] : res as Product[])
    );
  }

  getProductsByCategoryRoute(categoryId: number | string): Observable<Product[]> {
    const url = `${this.base}/products/category/${categoryId}`;
    console.debug('[ApiService] getProductsByCategoryRoute ->', url);
    return this.http.get<any>(url).pipe(
      tap(res => console.debug('[ApiService] response for products/category:', res && (res.data ? { dataLength: (res.data||[]).length } : typeof res))),
      map(res => (res && res.data) ? res.data as Product[] : res as Product[])
    );
  }
}
