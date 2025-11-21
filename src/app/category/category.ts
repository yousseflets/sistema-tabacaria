import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { CATEGORIES } from '../data/categories';
import { CartService } from '../services/cart.service';

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
  products = [] as Array<{ id: string; name: string; price: string; image: string }>;

  constructor(private route: ActivatedRoute, private cart: CartService) {
    // subscribe to paramMap so component reacts when route param changes
    this.route.paramMap.subscribe(pm => {
      const s = pm.get('category') || '';
      this.updateForSlug(s);
    });
  }

  private updateForSlug(s: string) {
    this.slug = s;
    const found = CATEGORIES.find(c => c.slug === s);
    this.name = found ? found.name : s.replace(/-/g, ' ');
    this.products = Array.from({ length: 8 }).map((_, i) => ({
      id: `${s}-${i + 1}`,
      name: `${this.name} Produto ${i + 1}`,
      price: (29.9 + i * 5).toFixed(2),
      image: `https://picsum.photos/seed/${s}${i}/400/300`
    }));
  }

  addToCart(p: { id: string; name: string; price: string; image: string }) {
    this.cart.add({ id: p.id, name: p.name, price: p.price, image: p.image, qty: 1 });
  }
}
