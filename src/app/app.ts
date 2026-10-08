import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface ReservationForm {
  vagaId: number | null;
  dataInicio: string;
  dataFim: string;
  precoReserva: number | null;
}

@Component({
  selector: 'app-root',
  imports: [DatePipe, DecimalPipe, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  private readonly http = inject(HttpClient);

  protected readonly currentStep = signal(1);
  protected readonly isSubmitting = signal(false);
  protected readonly submitState = signal<'idle' | 'success' | 'error'>('idle');
  protected readonly errorMessage = signal('');
  protected readonly reservationId = signal<number | null>(null);

  protected form: ReservationForm = {
    vagaId: null,
    dataInicio: '',
    dataFim: '',
    precoReserva: null
  };

  protected get isFormValid(): boolean {
    return Boolean(
      this.form.vagaId &&
      this.form.dataInicio &&
      this.form.dataFim &&
      this.form.precoReserva !== null &&
      this.form.precoReserva >= 0 &&
      new Date(this.form.dataInicio) < new Date(this.form.dataFim)
    );
  }

  protected get durationLabel(): string {
    if (!this.form.dataInicio || !this.form.dataFim) {
      return 'Defina o periodo para calcular';
    }

    const durationInHours =
      (new Date(this.form.dataFim).getTime() - new Date(this.form.dataInicio).getTime()) /
      (1000 * 60 * 60);

    if (durationInHours <= 0) {
      return 'O fim deve ser depois do inicio';
    }

    const hours = Math.floor(durationInHours);
    const minutes = Math.round((durationInHours - hours) * 60);
    return `${hours}h${minutes ? ` ${minutes}min` : ''} de uso`;
  }

  protected continueToReview(): void {
    this.submitState.set('idle');
    this.errorMessage.set('');

    if (this.isFormValid) {
      this.currentStep.set(2);
    }
  }

  protected editReservation(): void {
    this.currentStep.set(1);
    this.submitState.set('idle');
  }

  protected submitReservation(): void {
    if (!this.isFormValid || this.isSubmitting()) {
      return;
    }

    this.isSubmitting.set(true);
    this.submitState.set('idle');
    this.errorMessage.set('');

    this.http.post<{ id?: number }>('http://localhost:8080/reservas/nova-reserva', {
      usuarioId: 1,
      vagaId: this.form.vagaId,
      dataInicio: this.form.dataInicio,
      dataFim: this.form.dataFim,
      precoReserva: this.form.precoReserva
    }).subscribe({
      next: (reservation) => {
        this.reservationId.set(reservation.id ?? null);
        this.submitState.set('success');
        this.isSubmitting.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.isSubmitting.set(false);
        this.submitState.set('error');
        this.errorMessage.set(
          error.status === 0
            ? 'Nao foi possivel conectar a API. Verifique se o servico esta rodando em localhost:8080.'
            : error.error?.message ?? 'Nao foi possivel concluir a reserva. Revise os dados e tente novamente.'
        );
      }
    });
  }

  protected startAnotherReservation(): void {
    this.form = { vagaId: null, dataInicio: '', dataFim: '', precoReserva: null };
    this.currentStep.set(1);
    this.submitState.set('idle');
    this.reservationId.set(null);
  }
}
