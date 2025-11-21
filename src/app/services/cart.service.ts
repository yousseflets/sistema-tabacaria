import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface CartItem {
  id: string;
  name: string;
  price: string;
  image?: string;
  qty?: number;
}

@Injectable({ providedIn: 'root' })
export class CartService {
  private itemsSubject = new BehaviorSubject<CartItem[]>([]);
  readonly items$ = this.itemsSubject.asObservable();

  readonly count$ = this.items$.pipe(
    // map to length
    // using simple subscription in components is fine
    // keep operator import minimal at usage sites if needed
    // We'll expose a helper method below
  );

  getItems() {
    return this.itemsSubject.getValue();
  }

  add(item: CartItem) {
    const items = this.itemsSubject.getValue().slice();
    const existing = items.find(i => i.id === item.id);
    if (existing) {
      existing.qty = (existing.qty || 1) + (item.qty || 1);
    } else {
      items.push({ ...item, qty: item.qty || 1 });
    }
    this.itemsSubject.next(items);
  }

  clear() {
    this.itemsSubject.next([]);
  }

  getCount() {
    return this.itemsSubject.getValue().reduce((s, i) => s + (i.qty || 1), 0);
  }
}
