import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, shareReplay, tap, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
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
      tap(res => console.debug('[ApiService] getProducts response shape:', Array.isArray(res) ? 'array' : (res && res.data) ? 'data' : typeof res)),
      map(res => this.normalizeList(res)),
      catchError(err => {
        console.error('[ApiService] getProducts error', err);
        return throwError(() => err);
      })
    );
  }

  getProductEssencias(id: number | string): Observable<Product> {
    return this.http.get<any>(`${this.base}/products/${id}`).pipe(
      map(res => (res && res.data) ? res.data as Product : res as Product),
      catchError(err => {
        console.error('[ApiService] getProductEssencias error', err);
        return throwError(() => err);
      })
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
      tap(res => console.debug('[ApiService] getProductsByCategory (query) response shape:', res && res.data ? 'data' : Array.isArray(res) ? 'array' : typeof res)),
      map(res => this.normalizeList(res)),
      catchError(err => {
        console.error('[ApiService] getProductsByCategory (query) error', err);
        return throwError(() => err);
      }),
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
      tap(res => console.debug('[ApiService] response for paged products', { url: laravelUrl, shape: (res && res.data) ? 'data' : Array.isArray(res) ? 'array' : (res && res.items) ? 'items' : typeof res })),
      map(res => this.normalizePaged(res)),
      catchError(err => {
        console.error('[ApiService] getProductsByCategoryPaged error', err);
        return throwError(() => err);
      }),
      shareReplay({ bufferSize: 1, refCount: true })
    );
    (this as any)["_cache_products_" + key] = obs;
    return obs;
  }


  getProductsByCategoryId(categoryId: number | string): Observable<Product[]> {
    return this.http.get<any>(`${this.base}/categories/${categoryId}/products`).pipe(
      map(res => this.normalizeList(res)),
      catchError(err => {
        console.error('[ApiService] getProductsByCategoryId error', err);
        return throwError(() => err);
      })
    );
  }

  getProductsByCategoryRoute(categoryId: number | string): Observable<Product[] | { items: Product[]; meta?: any }> {
    const key = `route:${String(categoryId)}`;
    const cached = (this as any)['_cache_products_' + key] as Observable<Product[] | { items: Product[]; meta?: any }> | undefined;
    if (cached) return cached;

    const url = `${this.base}/products/category/${categoryId}`;
    console.debug('[ApiService] getProductsByCategoryRoute ->', url);
    const obs = this.http.get<any>(url).pipe(
      tap(res => console.debug('[ApiService] response for products/category:', res && (res.data ? { dataLength: (res.data||[]).length, meta: !!res.meta } : typeof res)) ),
      map(res => {
        // if backend returns paged shape { data: [...], meta: {...} }
        if (res && res.data && Array.isArray(res.data)) {
          return { items: res.data as Product[], meta: res.meta };
        }
        // if it returns items
        if (res && res.items && Array.isArray(res.items)) {
          return { items: res.items as Product[], meta: res.meta };
        }
        // otherwise return array or empty
        if (Array.isArray(res)) return res as Product[];
        return this.normalizeList(res);
      }),
      catchError(err => {
        console.error('[ApiService] getProductsByCategoryRoute error', err);
        return throwError(() => err);
      }),
      shareReplay({ bufferSize: 1, refCount: true })
    );
    (this as any)['_cache_products_' + key] = obs;
    return obs;
  }

  // helper to normalize list-shaped responses
  private normalizeList(res: any): Product[] {
    if (!res) return [];
    if (Array.isArray(res)) return res as Product[];
    if (res.data && Array.isArray(res.data)) return res.data as Product[];
    if (res.items && Array.isArray(res.items)) return res.items as Product[];
    // if it's an object containing data in nested fields, try to find first array
    for (const k of Object.keys(res)) {
      if (Array.isArray(res[k])) return res[k] as Product[];
    }
    return [];
  }

  // helper to normalize paged responses
  private normalizePaged(res: any): { items: Product[]; meta?: any } {
    if (!res) return { items: [], meta: undefined };
    if (Array.isArray(res)) return { items: res as Product[], meta: undefined };
    if (res.data && Array.isArray(res.data)) return { items: res.data as Product[], meta: res.meta };
    if (res.items && Array.isArray(res.items)) return { items: res.items as Product[], meta: res.meta };
    // fallback: try to extract first array
    for (const k of Object.keys(res)) {
      if (Array.isArray(res[k])) return { items: res[k] as Product[], meta: res.meta };
    }
    return { items: [], meta: res && res.meta ? res.meta : undefined };
  }
}
