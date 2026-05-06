import { useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Upload, X, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useCreateExpense } from '@/api/expenses';
import { CATEGORIES, formatDateInput } from '@/lib/format';
import { apiErrorMessage } from '@/api/client';

const schema = z.object({
  amount: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Enter a valid amount (e.g. 123.45)'),
  currency: z
    .string()
    .transform((v) => v.trim().toUpperCase())
    .pipe(z.string().length(3)),
  category: z.enum(CATEGORIES),
  description: z.string().min(1).max(500),
  expenseDate: z.string().min(8),
});

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_BYTES = 10 * 1024 * 1024;
const CURRENCIES = [
  'USD',
  'EUR',
  'GBP',
  'INR',
  'AUD',
  'CAD',
  'SGD',
  'JPY',
  'CNY',
  'AED',
].sort();

export default function NewExpense() {
  const navigate = useNavigate();
  const mutation = useCreateExpense();
  const fileRef = useRef(null);
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [currencyQuery, setCurrencyQuery] = useState('');

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      amount: '',
      currency: 'USD',
      category: 'TRAVEL',
      description: '',
      expenseDate: formatDateInput(),
    },
  });

  const filteredCurrencies = useMemo(() => {
    const q = currencyQuery.trim().toUpperCase();
    if (!q) return CURRENCIES;
    return CURRENCIES.filter((c) => c.includes(q));
  }, [currencyQuery]);

  const onPickFile = (f) => {
    if (!f) return;
    if (!ALLOWED_TYPES.includes(f.type)) {
      toast.error('Unsupported file type. Use JPG, PNG, WEBP, or PDF.');
      return;
    }
    if (f.size > MAX_BYTES) {
      toast.error('File too large (max 10 MB).');
      return;
    }
    setFile(f);
  };

  const onSubmit = async (values) => {
    const amountCents = Math.round(parseFloat(values.amount) * 100);
    try {
      await mutation.mutateAsync({
        data: {
          amountCents,
          currency: values.currency,
          category: values.category,
          description: values.description,
          expenseDate: values.expenseDate,
        },
        file,
      });
      toast.success('Expense submitted for review');
      navigate('/expenses');
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight font-heading">Submit an expense</h1>
        <p className="text-sm text-muted-foreground">
          Fill in the details and attach a receipt. Your expense will go to the approval queue.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Expense details</CardTitle>
          <CardDescription>All fields are required unless noted.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="grid gap-2 sm:col-span-1">
                <Label htmlFor="amount">Amount</Label>
                <Input id="amount" {...form.register('amount')} placeholder="0.00" inputMode="decimal" />
                {form.formState.errors.amount ? (
                  <p className="text-xs text-destructive">{form.formState.errors.amount.message}</p>
                ) : null}
              </div>
              <div className="grid gap-2">
                <Label>Currency</Label>
                <Select
                  value={form.watch('currency')}
                  onValueChange={(v) => form.setValue('currency', v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent side="bottom">
                    <div className="p-1">
                      <Input
                        value={currencyQuery}
                        onChange={(e) => setCurrencyQuery(e.target.value)}
                        placeholder="Search currency…"
                        className="h-8"
                      />
                    </div>

                    {filteredCurrencies.length ? (
                      filteredCurrencies.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        No matches
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Category</Label>
                <Select
                  value={form.watch('category')}
                  onValueChange={(v) => form.setValue('category', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pick one" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="expenseDate">Date</Label>
              <Input id="expenseDate" type="date" {...form.register('expenseDate')} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" rows={3} {...form.register('description')} placeholder="Lunch with a client" />
              {form.formState.errors.description ? (
                <p className="text-xs text-destructive">{form.formState.errors.description.message}</p>
              ) : null}
            </div>

            <div className="grid gap-2">
              <Label>Receipt (optional)</Label>
              <div
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  onPickFile(e.dataTransfer.files?.[0]);
                }}
                className={`flex flex-col items-center justify-center border border-dashed rounded-md py-8 text-sm cursor-pointer transition-colors ${
                  dragOver ? 'bg-accent border-accent-foreground' : 'hover:bg-accent/40'
                }`}
              >
                {file ? (
                  <div className="flex items-center gap-3">
                    <FileText className="size-5 text-muted-foreground" />
                    <div>
                      <div className="font-medium">{file.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {(file.size / 1024).toFixed(0)} KB · {file.type}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); setFile(null); }}
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <Upload className="size-5 text-muted-foreground mb-2" />
                    <span>Drag a receipt here, or click to choose</span>
                    <span className="text-xs text-muted-foreground mt-1">JPG, PNG, WEBP or PDF · max 10 MB</span>
                  </>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  className="hidden"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={(e) => onPickFile(e.target.files?.[0])}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => navigate('/expenses')}>Cancel</Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? 'Submitting…' : 'Submit expense'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
