import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useHistory } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, Mail, Lock } from 'lucide-react';
import { IonPage, IonContent, IonHeader, IonToolbar } from '@ionic/react';
import Input from '@components/ui/Input.js';
import Button from '@components/ui/Button.js';
import { useLoginMutation } from '@features/auth/hooks/useAuth.js';
import { VALIDATION, VALIDATION_ERRORS } from '@repo/constants';

const loginSchema = z.object({
  email: z.string().regex(VALIDATION.EMAIL, VALIDATION_ERRORS.EMAIL),
  password: z.string().min(VALIDATION.PASSWORD_MIN_LENGTH, VALIDATION_ERRORS.PASSWORD_MIN),
});

type FormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const history = useHistory();
  const loginMutation = useLoginMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(loginSchema),
  });

  function onSubmit(values: FormValues) {
    void loginMutation.mutateAsync(values).then(() => {
      history.push('/policies');
    });
  }

  return (
    <IonPage>
      <IonHeader className="ion-no-border" style={{ paddingTop: 'var(--safe-area-top)' }}>
        <IonToolbar
          style={{ '--background': 'var(--body-bg)' }}
          className="ion-no-padding border-none"
        />
      </IonHeader>
      <IonContent className="ion-padding-bottom">
        <div className="relative flex min-h-full items-center justify-center bg-body-bg p-4 overflow-hidden">
          {/* Subtle background glow decorative elements */}
          <div className="absolute -top-24 -left-20 h-72 w-72 rounded-full bg-slate/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-20 h-72 w-72 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="relative z-10 w-full max-w-sm"
          >
            <div className="rounded-2xl border border-line bg-surface p-8 shadow-xl">
              <div className="mb-8 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-[18px] bg-gradient-to-tr from-slate to-slate-soft text-white shadow-[0_8px_24px_rgba(15,118,110,0.30)]">
                  <ShieldCheck size={28} strokeWidth={2.2} />
                </div>
                <h1 className="text-2xl font-black tracking-tight text-ink">InsurTrack Pro</h1>
                <p className="mt-1 text-sm font-medium text-ink-soft">Sign in to access your portal</p>
              </div>

              <form
                onSubmit={(e) => {
                  void handleSubmit(onSubmit)(e);
                }}
                className="space-y-4"
                noValidate
              >
                <Input
                  label="Email"
                  type="email"
                  placeholder="agent@insurtrack.com"
                  leftElement={<Mail size={16} />}
                  error={errors.email?.message}
                  {...register('email')}
                  required
                />

                <Input
                  label="Password"
                  type="password"
                  placeholder="Enter your password"
                  leftElement={<Lock size={16} />}
                  error={errors.password?.message}
                  {...register('password')}
                  required
                />

                {loginMutation.isError && loginMutation.error instanceof Error && (
                  <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-center">
                    <p className="text-xs font-semibold text-red-fg">{loginMutation.error.message}</p>
                  </div>
                )}

                <Button type="submit" className="w-full h-11 text-sm font-bold shadow-md" disabled={loginMutation.isPending}>
                  {loginMutation.isPending ? 'Signing in...' : 'Sign in'}
                </Button>
              </form>
            </div>
          </motion.div>
        </div>
      </IonContent>
    </IonPage>
  );
}

