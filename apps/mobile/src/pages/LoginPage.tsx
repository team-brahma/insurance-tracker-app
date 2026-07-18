import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useHistory } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck } from 'lucide-react';
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
        <div className="flex min-h-full items-center justify-center bg-body-bg p-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-sm"
          >
            <div className="rounded-2xl border border-line bg-surface p-8 shadow-lg">
              <div className="mb-8 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-[18px] bg-slate text-white shadow-[0_8px_24px_rgba(15,118,110,0.30)]">
                  <ShieldCheck size={28} strokeWidth={2} />
                </div>
                <h1 className="text-xl font-black tracking-tight text-ink">InsurTrack Pro</h1>
                <p className="mt-1 text-sm text-ink-soft">Sign in to your account</p>
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
                  error={errors.email?.message}
                  {...register('email')}
                  required
                />

                <Input
                  label="Password"
                  type="password"
                  placeholder="Enter your password"
                  error={errors.password?.message}
                  {...register('password')}
                  required
                />

                {loginMutation.isError && loginMutation.error instanceof Error && (
                  <p className="text-xs font-medium text-red-fg">{loginMutation.error.message}</p>
                )}

                <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
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
