import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './about.html',
  styleUrls: ['./about.scss']
})
export class About {
  // simple contact data (could be moved to a config file)
  phone = '(11) 99763-0847';
  email = 'contato@lojadeexemplo.com.br';
  address = 'Rua Jayr de Lima Ferreira, 100 - Jardim Cintia, Mogi das Cruzes - SP';
  hours = [
    'Segunda - Sexta: 09:00 - 23:00',
    'Sábado: 09:00 - 23:00',
    'Domingo: 09:00 - 20:00'
  ];
}
