import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CartService } from '../../services/cart.service';
import { ApiService } from '../../services/api.service';
import { Category } from '../../models/category';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterModule, CommonModule],
  templateUrl: './header.html',
  styleUrls: ['./header.scss']
})
export class Header implements OnInit {
  categories: Category[] = [];
  isProductsOpen = false;
  private closeTimer: any = null;
  cartCount = 0;

  constructor(private cart: CartService, private api: ApiService) {
    this.cart.items$.subscribe(items => {
      this.cartCount = items.reduce((s, i) => s + (i.qty || 1), 0);
    });
  }

  ngOnInit(): void {
    this.api.getCategories().subscribe({
      next: list => {
        this.categories = (list || []).map(c => ({ ...c }));
      },
      error: e => {
        console.error('[Header] failed to load categories', e);
        // fallback to static list if needed
        // keep previous behavior by importing CATEGORIES if desired
      }
    });
  }
  toSlug(name: string) {
    const found = (this.categories || []).find(c => c.name === name);
    return found ? (found.slug || String(found.id)) : name.toLowerCase().replace(/\s+/g, '-');
  }

  openMenu() {
    if (this.closeTimer) {
      clearTimeout(this.closeTimer);
      this.closeTimer = null;
    }
    this.isProductsOpen = true;
  }

  cancelClose() {
    if (this.closeTimer) {
      clearTimeout(this.closeTimer);
      this.closeTimer = null;
    }
  }

  closeMenuDelayed(ms = 200) {
    if (this.closeTimer) clearTimeout(this.closeTimer);
    this.closeTimer = setTimeout(() => {
      this.isProductsOpen = false;
      this.closeTimer = null;
    }, ms);
  }

  closeMenuImmediate() {
    if (this.closeTimer) {
      clearTimeout(this.closeTimer);
      this.closeTimer = null;
    }
    this.isProductsOpen = false;
  }
}
