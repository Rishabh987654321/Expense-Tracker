import { useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useAcceptInvite } from '@/api/auth';
import { apiErrorMessage } from '@/api/client';

const schema = z.object({
  name: z.string().min(2).max(100),
  password: z.string().min(8).max(200),
});

export default function AcceptInvite() {
  const { token } = useParams();
  const mutation = useAcceptInvite();

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { name: '', password: '' },
  });

  const onSubmit = async (values) => {
    try {
      const data = await mutation.mutateAsync({ token, ...values });
      toast.success('Account created');
      window.location.href = `${data.redirectUrl}/dashboard`;
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Accept your invitation</CardTitle>
          <CardDescription>
            Set your name and password to join the organization.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid gap-2">
              <Label htmlFor="name">Your name</Label>
              <Input id="name" {...form.register('name')} placeholder="Your name" />
              {form.formState.errors.name ? (
                <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
              ) : null}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" {...form.register('password')} />
              {form.formState.errors.password ? (
                <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
              ) : null}
            </div>
            <Button type="submit" className="w-full" disabled={mutation.isPending}>
              {mutation.isPending ? 'Joining…' : 'Join organization'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
