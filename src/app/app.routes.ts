import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./components/home/home.component').then(m => m.HomeComponent),
  },
  {
    path: 'lobby/:roomId',
    loadComponent: () =>
      import('./components/lobby/lobby.component').then(m => m.LobbyComponent),
  },
  {
    path: 'room/:roomId',
    loadComponent: () =>
      import('./components/room/room.component').then(m => m.RoomComponent),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
