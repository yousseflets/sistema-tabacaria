import { Component, OnInit, OnDestroy } from '@angular/core';
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
export class Home implements OnInit, OnDestroy {
  // expose full category objects so cards can link to the category page
  categories = CATEGORIES;

  // show 2 random products per category in the homepage carousel
  products = (() => {
    const list: any[] = [];
    this.categories.forEach((c, ci) => {
      for (let j = 0; j < 2; j++) {
        const idx = ci * 2 + j + 1;
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
    // shuffle list so items appear in mixed order
    for (let i = list.length - 1; i > 0; i--) {
      const r = Math.floor(Math.random() * (i + 1));
      [list[i], list[r]] = [list[r], list[i]];
    }
    return list;
  })();

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

  ngOnInit(): void {
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
      // if at end, go back to start
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
