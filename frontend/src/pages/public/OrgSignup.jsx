import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useSignupOrg } from '@/api/auth';
import { useAuthStore } from '@/stores/authStore';
import { apiErrorMessage } from '@/api/client';

const schema = z.object({
  orgName: z.string().min(2, 'Required').max(100),
  slug: z
    .string()
    .min(2)
    .max(32)
    .regex(/^[a-z][a-z0-9-]+$/, 'Lowercase letters, digits and dashes only'),
  name: z.string().min(2, 'Required').max(100),
  email: z.string().email(),
  password: z.string().min(8, 'Min 8 characters').max(200),
});

export default function OrgSignup() {
  const setSession = useAuthStore((s) => s.setSession);
  const mutation = useSignupOrg();
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { orgName: '', slug: '', name: '', email: '', password: '' },
  });

  const onSubmit = async (values) => {
    try {
      const data = await mutation.mutateAsync(values);
      setSession(data);
      toast.success(`Organization "${data.org.name}" created`);
      // Redirect into the tenant's subdomain so the rest of the app picks it up.
      window.location.href = `${data.redirectUrl}/dashboard`;
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create your organization</CardTitle>
          <CardDescription>You'll be the first admin and can invite others next.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid gap-2">
              <Label htmlFor="orgName">Organization name</Label>
              <Input id="orgName" {...form.register('orgName')} placeholder="Acme Corp" />
              {form.formState.errors.orgName ? (
                <p className="text-xs text-destructive">{form.formState.errors.orgName.message}</p>
              ) : null}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="slug">Subdomain</Label>
              <div className="flex items-center gap-2">
                <Input id="slug" {...form.register('slug')} placeholder="acme" className="font-mono" />
                <span className="text-sm text-muted-foreground whitespace-nowrap">.localhost</span>
              </div>
              {form.formState.errors.slug ? (
                <p className="text-xs text-destructive">{form.formState.errors.slug.message}</p>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="name">Your name</Label>
                <Input id="name" {...form.register('name')} placeholder="Alice Admin" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...form.register('email')} placeholder="alice@acme.test" />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" {...form.register('password')} />
              {form.formState.errors.password ? (
                <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
              ) : null}
            </div>

            <Button type="submit" className="w-full" disabled={mutation.isPending}>
              {mutation.isPending ? 'Creating…' : 'Create organization'}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              Already have an organization?{' '}
              <Link to="/" className="underline">
                Visit your subdomain
              </Link>{' '}
              to sign in.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
