import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CartService, CartItem } from '../services/cart.service';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './cart.html',
  styleUrls: ['./cart.scss']
})
export class Cart {
  private cepTimer: any = null;
  items: CartItem[] = [];
  showConfirm = false;
  // checkout modal state
  showCheckout = false;
  // address fields
  cep = '';
  street = '';
  number = '';
  complement = '';
  neighborhood = '';
  city = '';
  state = '';
  get address() {
    const parts = [] as string[];
    if (this.street) parts.push(this.street + (this.number ? `, ${this.number}` : ''));
    if (this.complement) parts.push(this.complement);
    if (this.neighborhood) parts.push(this.neighborhood);
    if (this.city || this.state) parts.push([this.city, this.state].filter(Boolean).join(' - '));
    return parts.join(' - ');
  }
  // whether delivery fee should be calculated automatically from address
  autoCalculateDelivery = true;
  payment: 'dinheiro' | 'pix' | 'credito' | 'debito' = 'pix';
  estimatedAppFare = 0; // valor informado do Uber/99
  deliveryFee = 0;
  // store origin address (saida)
  readonly storeAddress = 'Rua Jayr de Lima Ferreira, 100 - Jardim Cintia, Mogi das Cruzes - SP, 08830-265';

  constructor(private cart: CartService) {
    this.cart.items$.subscribe(items => (this.items = items));
  }

  increase(i: CartItem) {
    this.cart.add({ ...i, qty: 1 });
  }

  decrease(i: CartItem) {
    // decrease by setting qty -1: naive implementation
    const current = this.cart.getItems();
    const found = current.find(x => x.id === i.id);
    if (!found) return;
    if ((found.qty || 1) <= 1) {
      // remove
      const remaining = current.filter(x => x.id !== i.id);
      // replace
      // direct nexting for simplicity
      (this.cart as any).itemsSubject.next(remaining);
    } else {
      found.qty = (found.qty || 1) - 1;
      (this.cart as any).itemsSubject.next(current);
    }
  }

  remove(i: CartItem) {
    const remaining = this.cart.getItems().filter(x => x.id !== i.id);
    (this.cart as any).itemsSubject.next(remaining);
  }

  clear() {
    this.cart.clear();
  }

  total() {
    return this.cart.getItems().reduce((s, it) => s + (parseFloat(it.price) * (it.qty || 1)), 0).toFixed(2);
  }

  openCheckout() {
    this.showCheckout = true;
    this.updateDeliveryFee();
  }

  closeCheckout() {
    this.showCheckout = false;
  }

  updateDeliveryFee() {
    if (this.autoCalculateDelivery) {
      this.autoCalculateDeliveryFee();
      return;
    }
    const est = Number(this.estimatedAppFare) || 0;
    // simple policy: delivery fee equals 60% of app fare, min 5
    const fee = Math.max(5, est * 0.6);
    this.deliveryFee = Number(fee.toFixed(2));
  }

  async lookupCep() {
    const cepOnly = (this.cep || '').replace(/\D/g, '');
    if (!cepOnly || cepOnly.length !== 8) return;
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cepOnly}/json/`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.erro) return;
      this.street = data.logradouro || '';
      this.neighborhood = data.bairro || '';
      this.city = data.localidade || '';
      this.state = data.uf || '';
      if (this.autoCalculateDelivery) this.autoCalculateDeliveryFee();
    } catch (e) {
      // ignore network errors silently for now
      console.error('CEP lookup failed', e);
    }
  }

  onCepInput() {
    // debounce the CEP input and trigger lookup automatically when 8 digits entered
    if (this.cepTimer) clearTimeout(this.cepTimer);
    const cepOnly = (this.cep || '').replace(/\D/g, '');
    if (cepOnly.length === 8) {
      this.cepTimer = window.setTimeout(() => {
        this.lookupCep();
        this.cepTimer = null;
      }, 400);
    }
  }

  ngOnDestroy(): void {
    if (this.cepTimer) {
      clearTimeout(this.cepTimer);
      this.cepTimer = null;
    }
  }

  onAddressChange() {
    if (this.autoCalculateDelivery) {
      this.updateDeliveryFee();
    }
  }

  autoCalculateDeliveryFee() {
    const storeCity = 'Mogi das Cruzes';
    const storeState = 'SP';
    const c = (this.city || '').toLowerCase();
    const s = (this.state || '').toUpperCase();
    let fee = 50;
    if (c.includes(storeCity.toLowerCase())) {
      fee = 15;
    } else if (s === storeState) {
      fee = 30;
    } else {
      fee = 50;
    }
    this.deliveryFee = fee;
  }

  async finalizeAsImage() {
    const subtotal = parseFloat(this.total());
    const grand = subtotal;
    const phone = '5511997630847';
    const lines: string[] = [];
    lines.push('Pedido de Compra');
    lines.push('-------------------------');
    this.items.forEach(it => {
      lines.push(`${it.name} x${it.qty || 1} - R$ ${(parseFloat(it.price) * (it.qty || 1)).toFixed(2)}`);
    });
    lines.push('-------------------------');
    lines.push(`Total: R$ ${grand.toFixed(2)}`);
    lines.push(`Endereço: ${this.address || '-'}`);
    lines.push(`Forma de Pagamento: ${this.payment}`);

    const msg = lines.join('\n');
    const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, '_blank');
    this.closeCheckout();
  }

  openConfirm() {
    this.showConfirm = true;
  }

  cancelConfirm() {
    this.showConfirm = false;
  }

  confirmFinalize() {
    // close confirm modal then finalize
    this.showConfirm = false;
    this.finalizeAsImage();
  }

  itemTotal(it: CartItem) {
    return (parseFloat(it.price) * (it.qty || 1)).toFixed(2);
  }
}
