import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CATEGORIES } from '../data/categories';
import { Category as CategoryModel } from '../models/category';
import { map, switchMap, catchError } from 'rxjs/operators';
import { combineLatest, of, Observable } from 'rxjs';
import { ApiService } from '../services/api.service';
import { API_BASE_URL } from '../app.config';
import { Product } from '../models/product';
// imports consolidated above

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './home.html',
  styleUrls: ['./home.scss']
})
export class Home implements OnInit, OnDestroy {
  categories = CATEGORIES;
  categories$!: Observable<CategoryModel[]>;

  private fallbackProducts = (() => {
    const list: any[] = [];
    this.categories.forEach((c, ci) => {
      for (let j = 0; j < 2; j++) {
        const price = (29.9 + ((ci * 2 + j) % 6) * 5).toFixed(2);
        const seed = `${c.slug}-${Math.floor(Math.random() * 10000)}`;
        list.push({
          id: `${c.slug}-${j}`,
          category: c.slug,
          name: `${c.name} ${j + 1}`,
          price,
          image: `https://picsum.photos/seed/${seed}/400/300`
        });
      }
    });
    for (let i = list.length - 1; i > 0; i--) {
      const r = Math.floor(Math.random() * (i + 1));
      [list[i], list[r]] = [list[r], list[i]];
    }
    return list as Product[];
  })();

  products$!: Observable<Product[]>;
  grouped$!: Observable<Array<{ category: CategoryModel; products: Product[] }>>;

  testimonials = [
    { name: 'João', text: 'Melhor atendimento e produtos de qualidade.' },
    { name: 'Maria', text: 'Entrega rápida e embalagens seguras.' },
    { name: 'Carlos', text: 'Preços justos e variedade incrível.' }
  ];

  scroll(id: string, dir: 'left' | 'right') {
    const el = document.getElementById(id);
    if (!el) return;
    const amount = dir === 'left' ? -300 : 300;
    el.scrollBy({ left: amount, behavior: 'smooth' });
  }

  private autoTimer: any = null;
  private autoPaused = false;

  constructor(private api: ApiService) {}

  imageUrl(image?: string) {
    const origin = (API_BASE_URL || '').replace(/\/api\/?$/, '');
    if (!image) return '/assets/placeholder.png';
    if (image.startsWith('http') || image.startsWith('//')) return image;
    if (image.startsWith('storage/')) return origin + '/' + image;
    if (image.startsWith('/storage/')) return origin + image;
    if (image.startsWith('images/')) return origin + '/storage/' + image;
    if (image.startsWith('/images/')) return origin + '/storage' + image;

    // default: assume relative to origin
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

  ngOnInit(): void {
    // load categories from API (fallback to local CATEGORIES on error)
    this.categories$ = this.api.getCategories().pipe(
      catchError(() => of(CATEGORIES as CategoryModel[]))
    );
    this.products$ = this.api.getProducts().pipe(
      catchError(() => of(this.fallbackProducts))
    );

    // fetch a small page of products per category (server-side pagination) to improve load time
    this.grouped$ = this.categories$.pipe(
      switchMap(cats => {
        if (!cats || cats.length === 0) return of([]);
        const requests = cats.map(c =>
          this.api.getProductsByCategoryPaged((c.id as any) || c.slug, 1, 6).pipe(
            map(res => ({ category: c, products: res.items || [] })),
            catchError(() => of({ category: c, products: [] }))
          )
        );
        return combineLatest(requests).pipe(
          map(results => results.filter(g => g.products && g.products.length > 0))
        );
      })
    );

    this.startAuto();
  }

  ngOnDestroy(): void {
    if (this.autoTimer) clearInterval(this.autoTimer);
    this.autoTimer = null;
  }

  startAuto() {
    if (this.autoTimer) return;
    this.autoTimer = setInterval(() => {
      if (this.autoPaused) return;
      const el = document.getElementById('prod-list');
      if (!el) return;
      if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 10) {
        el.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        el.scrollBy({ left: 300, behavior: 'smooth' });
      }
    }, 3000);
  }

  pauseAuto() { this.autoPaused = true; }
  resumeAuto() { this.autoPaused = false; }
}
