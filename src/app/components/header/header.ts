import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CATEGORIES } from '../../data/categories';
import { CartService } from '../../services/cart.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterModule, CommonModule],
  templateUrl: './header.html',
  styleUrls: ['./header.scss']
})
export class Header {
  readonly categories = CATEGORIES;
  isProductsOpen = false;
  private closeTimer: any = null;
  cartCount = 0;

  constructor(private cart: CartService) {
    this.cart.items$.subscribe(items => {
      this.cartCount = items.reduce((s, i) => s + (i.qty || 1), 0);
    });
  }
  toSlug(name: string) {
    const found = CATEGORIES.find(c => c.name === name);
    return found ? found.slug : name.toLowerCase().replace(/\s+/g, '-');
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
