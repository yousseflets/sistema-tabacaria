import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CATEGORIES } from '../data/categories';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './home.html',
  styleUrls: ['./home.scss']
})
export class Home {
  // expose full category objects so cards can link to the category page
  categories = CATEGORIES;

  products = Array.from({ length: 8 }).map((_, i) => ({
    id: i + 1,
    name: `Produto ${i + 1}`,
    price: (29.9 + i * 5).toFixed(2),
    image: `https://picsum.photos/seed/prod${i + 1}/400/300`
  }));

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
}
