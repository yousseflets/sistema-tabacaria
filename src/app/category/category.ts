import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { CATEGORIES } from '../data/categories';
import { Category as CategoryModel } from '../models/category';
import { CartService } from '../services/cart.service';
import { ApiService } from '../services/api.service';
import { API_BASE_URL } from '../app.config';
import { Product } from '../models/product';
import { catchError, switchMap } from 'rxjs/operators';
import { of, Subscription } from 'rxjs';

@Component({
	selector: 'app-category',
	standalone: true,
	imports: [CommonModule],
	templateUrl: './category.html',
	styleUrls: ['./category.scss']
})
export class Category implements OnInit, OnDestroy {
	name = '';
	loading = false;
	errorMessage = '';
	products: Product[] = [];
	visibleProducts: any[] = [];
	currentPage = 1;
	perPage = 12;

	// Server/local paging flags (used by template)
	useServerPaging = false;
	serverPage = 1;
	serverLastPage?: number;
	hasMore = false;

	private sub?: Subscription;
	private fallbackTimer?: any;

	constructor(
		private route: ActivatedRoute,
		private api: ApiService,
		private cart: CartService
	) {}

	ngOnInit(): void {
		this.sub = this.route.paramMap.pipe(
			switchMap((params: ParamMap) => {
				const categoryParam = params.get('category') || '';
				console.debug('[Category] route param category =', categoryParam);
				this.resetState();
				this.name = this.humanize(categoryParam);
				this.loading = true;
				this.errorMessage = '';

				return this.api.getCategories().pipe(
					switchMap(list => {
						const found = (list || []).find(c => (c.slug && c.slug === categoryParam) || (String(c.id) === categoryParam) || (c.name && c.name.toLowerCase() === categoryParam.toLowerCase()));
						console.debug('[Category] categories loaded count=', (list||[]).length, 'found=', found);
						if (found && (found as any).id) {
							this.name = found.name || this.name;
							const id = (found as any).id;
							// Try new route first: /products/category/{id}
							return this.api.getProductsByCategoryRoute(id).pipe(
								catchError(() => this.api.getProductsByCategoryId(id)),
								catchError(() => this.api.getProductsByCategory(id)),
								catchError(() => of([]))
							);
						}

						// Fallback: fetch all products and filter on client
						return this.api.getProducts().pipe(
							switchMap(all => of(this.filterProductsByParam(all || [], categoryParam)))
						);
					})
				);
			})
		).subscribe({
			next: (items: Product[]) => {
				console.debug('[Category] items loaded:', items && items.length, items && items.slice ? items.slice(0,5) : items);
				this.clearFallbackTimer();
				this.products = (items || []).map(it => ({ ...it, raw: it }));
				this.currentPage = 1;
				this.updateVisibleProducts();
				this.loading = false;
			},
			error: (err) => {
				console.error('[Category] failed to load products', err);
				this.clearFallbackTimer();
				this.errorMessage = 'Erro ao carregar produtos.';
				this.loading = false;
			}
		});

		// fallback: if nothing loaded in X ms, fetch all products and filter client-side
		this.fallbackTimer = setTimeout(() => {
			if ((this.products || []).length === 0) {
				console.debug('[Category] fallback timer fired - fetching all products');
				this.api.getProducts().subscribe({
					next: all => {
						const items = this.filterProductsByParam(all || [], this.name || '');
						this.products = (items || []).map(it => ({ ...it, raw: it }));
						this.updateVisibleProducts();
						this.loading = false;
					},
					error: e => {
						console.error('[Category] fallback getProducts failed', e);
						this.loading = false;
					}
				});
			}
		}, 1500);
	}

	ngOnDestroy(): void {
		this.sub?.unsubscribe();
		this.clearFallbackTimer();
	}

	private clearFallbackTimer() {
		if (this.fallbackTimer) {
			clearTimeout(this.fallbackTimer);
			this.fallbackTimer = undefined;
		}
	}

	addToCart(p: Product) {
		this.cart.add({ id: String(p.id), name: p.name, price: String(p.price), image: p.image, qty: 1 });
	}

	goToPage(page: number) {
		if (page < 1) return;
		this.currentPage = page;
		this.updateVisibleProducts();
	}

	private updateVisibleProducts() {
		const start = (this.currentPage - 1) * this.perPage;
		this.visibleProducts = this.products.slice(start, start + this.perPage);
	}

	private resetState() {
		this.products = [];
		this.visibleProducts = [];
		this.currentPage = 1;
		this.errorMessage = '';
		this.loading = false;
	}

	private humanize(slug: string) {
		if (!slug) return '';
		return slug.replace(/[-_]/g, ' ').replace(/\b\w/g, s => s.toUpperCase());
	}

	private filterProductsByParam(list: Product[], param: string): Product[] {
		const numeric = Number(param);
		return (list || []).filter(p => {
			const catId = (p as any).categoryId || (p as any).category_id || (p.category && (p.category as any).id) || (p.category && (p.category as any).slug);
			const brandId = (p as any).brandId || (p as any).brand_id || (p.brand && (p.brand as any).id);
			if (!param) return true;
			if (!isNaN(numeric) && numeric) {
				if (String(catId) === String(numeric)) return true;
				if (String(brandId) === String(numeric)) return true;
			}
			if (typeof catId === 'string' && catId.toLowerCase() === param.toLowerCase()) return true;
			if (p.category && (p.category as any).slug && String((p.category as any).slug).toLowerCase() === String(param).toLowerCase()) return true;
			if (p.name && String(p.name).toLowerCase().indexOf(param.toLowerCase()) !== -1) return true;
			if (p.brand && (p.brand as any).name && String((p.brand as any).name).toLowerCase().indexOf(param.toLowerCase()) !== -1) return true;
			return false;
		});
	}

	imageUrl(p: Product) {
		const img = (p as any).image || (p as any).raw?.image;
		if (!img) return '';
		// absolute URLs
		if (/^https?:\/\//i.test(img)) return img;
		// leading slash -> assume already absolute path on current host
		if (img.startsWith('/')) return img;
		// otherwise prefix with backend base (remove trailing /api if present)
		const base = String(API_BASE_URL).replace(/\/api\/?$/, '');
		return `${base}/${img}`;
	}

}

