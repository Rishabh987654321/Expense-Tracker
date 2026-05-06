import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useLogin } from '@/api/auth';
import { apiErrorMessage } from '@/api/client';
import { tenantUrl } from '@/lib/tenant';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const slugSchema = z
  .string()
  .min(2)
  .max(32)
  .regex(/^[a-z][a-z0-9-]+$/, 'Lowercase letters, digits and dashes only');

export default function Login({ slug, publicHost }) {
  const navigate = useNavigate();
  const location = useLocation();
  const mutation = useLogin();

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });
  const slugForm = useForm({
    resolver: zodResolver(z.object({ slug: slugSchema })),
    defaultValues: { slug: '' },
  });

  const onLogin = async (values) => {
    try {
      const data = await mutation.mutateAsync(values);
      toast.success(`Welcome back, ${data.user.name.split(' ')[0]}`);
      const target = location.state?.from?.pathname || '/dashboard';
      navigate(target, { replace: true });
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  const goToTenant = (values) => {
    window.location.href = tenantUrl(values.slug.toLowerCase(), '/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{publicHost ? 'Sign in to your organization' : 'Sign in'}</CardTitle>
          <CardDescription>
            {publicHost
              ? 'Enter your organization slug to continue.'
              : `Logging into ${slug ? `${slug}.localhost` : 'your organization'}.`}
          </CardDescription>
        </CardHeader>

        {publicHost ? (
          <>
            <CardContent>
              <form className="space-y-4" onSubmit={slugForm.handleSubmit(goToTenant)}>
                <div className="grid gap-2">
                  <Label htmlFor="slug">Organization subdomain</Label>
                  <div className="flex items-center gap-2">
                    <Input id="slug" {...slugForm.register('slug')} placeholder="acme" className="font-mono" />
                    <span className="text-sm text-muted-foreground whitespace-nowrap">.localhost</span>
                  </div>
                  {slugForm.formState.errors.slug ? (
                    <p className="text-xs text-destructive">
                      {slugForm.formState.errors.slug.message}
                    </p>
                  ) : null}
                </div>
                <Button type="submit" className="w-full">Continue</Button>
              </form>
            </CardContent>
            <CardFooter className="text-xs text-muted-foreground justify-center">
              Don't have one?&nbsp;
              <Link to="/signup" className="underline">Create an organization</Link>.
            </CardFooter>
          </>
        ) : (
          <CardContent>
            <Alert className="mb-4">
              <AlertTitle>Tenant: {slug}</AlertTitle>
              <AlertDescription className="text-xs">
                Wrong organization?&nbsp;
                <a href={tenantUrl('app', '/login')} className="underline">
                  Switch
                </a>.
              </AlertDescription>
            </Alert>
            <form className="space-y-4" onSubmit={form.handleSubmit(onLogin)}>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" autoComplete="email" {...form.register('email')} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" autoComplete="current-password" {...form.register('password')} />
              </div>
              <Button type="submit" className="w-full" disabled={mutation.isPending}>
                {mutation.isPending ? 'Signing in…' : 'Sign in'}
              </Button>
            </form>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
