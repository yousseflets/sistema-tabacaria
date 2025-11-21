import { Routes } from '@angular/router';
import { Home } from './home/home';
import { Category } from './category/category';
import { Cart } from './cart/cart';

export const routes: Routes = [
	{ path: '', component: Home },
	{ path: 'produtos', component: Home },
	{ path: 'produtos/:category', component: Category },
	{ path: 'carrinho', component: Cart },
];
