import { FrameHeader } from '@/shared/frame/frame-header';
import { FramePaper } from '@/shared/frame/frame-paper';
import { HlmAvatar, HlmAvatarFallback, HlmAvatarImage } from '@/shared/spartan/avatar';
import { ZardButtonComponent } from '@/shared/zard/components/button/button.component';
import { HlmSeparator } from '@/shared/spartan/separator';
import { ZardFormModule } from '@/shared/zard/components/form/form.module';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideImageUp, lucideUserRound } from '@ng-icons/lucide';
import { ZardInputDirective } from '@/shared/zard/components/input/input.directive';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import {
  FieldState,
  form,
  FormField,
  required,
  submit,
  validateStandardSchema,
} from '@angular/forms/signals';
import {
  AVATAR_EXTENSIONS,
  changePasswordSchema,
  updateAvatarSchema,
  updateProfileSchema,
} from '@shared/schemas';
import { z } from 'zod';
import { AuthService } from '../../../auth/auth.service';
import { avatarUrl, getInitials } from '../../../auth/auth.utils';
import { ProfileService } from '../../profile.service';

/** Schema local do formulário de senha: adiciona a confirmação (só existe na UI). */
const passwordFormSchema = changePasswordSchema
  .extend({ confirmPassword: z.string().min(1, 'Confirme a nova senha') })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'As senhas não conferem',
  });

@Component({
  selector: 'app-profile-page',
  imports: [
    FormField,
    FrameHeader,
    FramePaper,
    HlmAvatar,
    HlmAvatarImage,
    HlmAvatarFallback,
    ZardButtonComponent,
    HlmSeparator,
    ZardFormModule,
    NgIcon,
    ZardInputDirective,
  ],
  providers: [provideIcons({ lucideImageUp, lucideUserRound })],
  template: `
    <div>
      <app-frame-header>
        <ng-icon slot="icon" name="lucideUserRound" class="text-[length:--spacing(12)]" />
        <h1 slot="title">Perfil</h1>
        <p slot="subtitle">Atualize seus dados e sua senha</p>
      </app-frame-header>

      <app-frame-paper>
        <div class="w-full flex flex-col gap-8">
          <form (submit)="onProfileSubmit($event)" class="grid grid-cols-6 gap-8">
            <div class="col-span-6 flex items-center gap-6">
              @if (pendingAvatar(); as pending) {
                <img
                  [src]="pending.preview"
                  alt="Prévia do avatar"
                  class="size-16 rounded-full object-cover"
                />
              } @else {
                <hlm-avatar class="size-16">
                  @if (currentAvatarUrl(); as src) {
                    <img hlmAvatarImage [src]="src" [alt]="userName()" />
                  }
                  <span hlmAvatarFallback class="text-lg">{{ initials() }}</span>
                </hlm-avatar>
              }
              <div class="flex flex-col gap-2">
                <button type="button" z-button zType="outline" (click)="avatarInput.click()">
                  <ng-icon name="lucideImageUp" class="text-[length:--spacing(3.5)]" />
                  Trocar foto
                </button>
                <span class="text-xs text-muted-foreground">PNG, JPG ou WebP, até 5MB</span>
                @if (avatarError()) {
                  <span class="text-xs text-destructive">{{ avatarError() }}</span>
                }
              </div>
              <input
                #avatarInput
                type="file"
                class="hidden"
                [accept]="avatarAccept"
                (change)="onAvatarSelected($event)"
              />
            </div>

            <z-form-field class="col-span-3">
              <label for="name" z-form-label>Nome</label>
              <z-form-control [errorMessage]="errorOf(profileForm.name())">
                <input
                  z-input
                  type="text"
                  id="name"
                  [formField]="profileForm.name"
                  placeholder="Nome"
                />
              </z-form-control>
            </z-form-field>

            <z-form-field class="col-span-3">
              <label for="email" z-form-label>E-mail</label>
              <z-form-control>
                <input z-input type="email" id="email" [value]="userEmail()" disabled />
              </z-form-control>
              <span class="text-xs text-muted-foreground">
                O e-mail é sua credencial de acesso e não pode ser alterado.
              </span>
            </z-form-field>

            @if (profileError()) {
              <div
                class="col-span-6 rounded-md bg-destructive/10 border border-destructive/30 text-destructive text-sm px-3 py-2"
              >
                {{ profileError() }}
              </div>
            }
            @if (profileSaved()) {
              <div
                class="col-span-6 rounded-md bg-primary/10 border border-primary/30 text-sm px-3 py-2"
              >
                Perfil atualizado.
              </div>
            }

            <div class="col-span-6 flex flex-row-reverse">
              <button
                type="submit"
                z-button
                zType="default"
                [zLoading]="profileLoading()"
                [disabled]="profileForm().invalid()"
              >
                Salvar
              </button>
            </div>
          </form>

          <hlm-separator />

          <form (submit)="onPasswordSubmit($event)" class="grid grid-cols-6 gap-8">
            <div class="col-span-6">
              <h2 class="font-semibold">Alterar senha</h2>
              <p class="text-sm text-muted-foreground">
                Informe a senha atual para definir uma nova.
              </p>
            </div>

            <z-form-field class="col-span-2">
              <label for="currentPassword" z-form-label>Senha atual</label>
              <z-form-control [errorMessage]="errorOf(passwordForm.currentPassword())">
                <input
                  z-input
                  type="password"
                  id="currentPassword"
                  placeholder="••••••••"
                  [formField]="passwordForm.currentPassword"
                />
              </z-form-control>
            </z-form-field>

            <z-form-field class="col-span-2">
              <label for="newPassword" z-form-label>Nova senha</label>
              <z-form-control [errorMessage]="errorOf(passwordForm.newPassword())">
                <input
                  z-input
                  type="password"
                  id="newPassword"
                  placeholder="Mínimo de 8 caracteres"
                  [formField]="passwordForm.newPassword"
                />
              </z-form-control>
            </z-form-field>

            <z-form-field class="col-span-2">
              <label for="confirmPassword" z-form-label>Confirmar nova senha</label>
              <z-form-control [errorMessage]="errorOf(passwordForm.confirmPassword())">
                <input
                  z-input
                  type="password"
                  id="confirmPassword"
                  placeholder="Repita a nova senha"
                  [formField]="passwordForm.confirmPassword"
                />
              </z-form-control>
            </z-form-field>

            @if (passwordError()) {
              <div
                class="col-span-6 rounded-md bg-destructive/10 border border-destructive/30 text-destructive text-sm px-3 py-2"
              >
                {{ passwordError() }}
              </div>
            }
            @if (passwordChanged()) {
              <div
                class="col-span-6 rounded-md bg-primary/10 border border-primary/30 text-sm px-3 py-2"
              >
                Senha alterada.
              </div>
            }

            <div class="col-span-6 flex flex-row-reverse">
              <button
                type="submit"
                z-button
                zType="default"
                [zLoading]="passwordLoading()"
                [disabled]="passwordForm().invalid()"
              >
                Alterar senha
              </button>
            </div>
          </form>
        </div>
      </app-frame-paper>
    </div>
  `,
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class ProfilePage {
  readonly #auth = inject(AuthService);
  readonly #profile = inject(ProfileService);

  protected readonly avatarAccept = AVATAR_EXTENSIONS.join(',');

  protected readonly userName = computed(() => this.#auth.currentUser()?.name ?? '');
  protected readonly userEmail = computed(() => this.#auth.currentUser()?.email ?? '');
  protected readonly initials = computed(() => getInitials(this.userName()));
  protected readonly currentAvatarUrl = computed(() => avatarUrl(this.#auth.currentUser()));

  // ---- Seção Perfil (nome + avatar) ----

  protected readonly pendingAvatar = signal<{
    fileName: string;
    data: Uint8Array;
    preview: string;
  } | null>(null);
  protected readonly avatarError = signal('');
  protected readonly profileLoading = signal(false);
  protected readonly profileError = signal('');
  protected readonly profileSaved = signal(false);

  protected readonly profileModel = signal({ name: this.#auth.currentUser()?.name ?? '' });
  protected readonly profileForm = form(this.profileModel, (schemaPath) => {
    required(schemaPath.name, { message: 'O nome é obrigatório' });
    validateStandardSchema(schemaPath, updateProfileSchema);
  });

  protected async onAvatarSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    this.avatarError.set('');
    this.profileSaved.set(false);

    const data = new Uint8Array(await file.arrayBuffer());
    const parsed = updateAvatarSchema.safeParse({ fileName: file.name, data });
    if (!parsed.success) {
      this.avatarError.set(parsed.error.issues[0]?.message ?? 'Arquivo inválido');
      return;
    }

    this.pendingAvatar.set({ fileName: file.name, data, preview: await toDataUrl(file) });
  }

  protected onProfileSubmit(event: Event): void {
    event.preventDefault();
    submit(this.profileForm, async () => {
      this.profileLoading.set(true);
      this.profileError.set('');
      this.profileSaved.set(false);
      try {
        const pending = this.pendingAvatar();
        if (pending) {
          await this.#profile.updateAvatar(pending.fileName, pending.data);
          this.pendingAvatar.set(null);
        }
        await this.#profile.updateProfile(this.profileModel().name);
        this.profileSaved.set(true);
      } catch (err) {
        this.profileError.set(err instanceof Error ? err.message : 'Erro ao salvar o perfil');
      } finally {
        this.profileLoading.set(false);
      }
    });
  }

  // ---- Seção Alterar senha ----

  protected readonly passwordLoading = signal(false);
  protected readonly passwordError = signal('');
  protected readonly passwordChanged = signal(false);

  protected readonly passwordModel = signal({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  protected readonly passwordForm = form(this.passwordModel, (schemaPath) => {
    required(schemaPath.currentPassword, { message: 'A senha atual é obrigatória' });
    required(schemaPath.newPassword, { message: 'A nova senha é obrigatória' });
    required(schemaPath.confirmPassword, { message: 'Confirme a nova senha' });
    validateStandardSchema(schemaPath, passwordFormSchema);
  });

  protected onPasswordSubmit(event: Event): void {
    event.preventDefault();
    submit(this.passwordForm, async () => {
      this.passwordLoading.set(true);
      this.passwordError.set('');
      this.passwordChanged.set(false);
      try {
        const { currentPassword, newPassword } = this.passwordModel();
        await this.#profile.changePassword(currentPassword, newPassword);
        this.passwordModel.set({ currentPassword: '', newPassword: '', confirmPassword: '' });
        this.passwordForm().reset();
        this.passwordChanged.set(true);
      } catch (err) {
        this.passwordError.set(err instanceof Error ? err.message : 'Erro ao alterar a senha');
      } finally {
        this.passwordLoading.set(false);
      }
    });
  }

  /** Primeira mensagem de erro de um campo, apenas após ser tocado (vazia caso ok). */
  protected errorOf(field: FieldState<string>): string {
    if (!field.touched()) return '';
    return field.errors()[0]?.message ?? '';
  }
}

/** Lê o arquivo como data URL para a prévia local (sem passar pelo NgOptimizedImage). */
function toDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
