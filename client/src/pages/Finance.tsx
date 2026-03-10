import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '../lib/axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Landmark, Wallet, HandCoins, CircleDollarSign } from 'lucide-react';
import LogoImage from '../assets/Logo.webp';
import { Footer } from '../components/Footer';

interface FinanceSummary {
  ordersCount: number;
  grossSales: number;
  platformRevenue: number;
  sellerNetTotal: number;
  feePercentage: number;
}

interface SellerBalance {
  sellerId: number;
  sellerUsername: string;
  sellerEmail: string;
  grossSales: number;
  platformFeeTotal: number;
  sellerNetTotal: number;
  pendingPayoutAmount: number;
  paidPayoutAmount: number;
  ordersCount: number;
  itemsCount: number;
}

interface Payout {
  id: number;
  sellerId: number;
  sellerUsername: string;
  sellerEmail: string;
  totalAmount: number;
  status: 'pending' | 'paid' | string;
  notes?: string;
  createdAt: string;
  processedAt?: string;
  itemsCount: number;
}

export default function Finance() {
  const queryClient = useQueryClient();
  const [notesBySeller, setNotesBySeller] = useState<Record<number, string>>({});

  const summaryQuery = useQuery({
    queryKey: ['finance-summary'],
    queryFn: async () => {
      const res = await api.get<FinanceSummary>('/orders/finance/summary');
      return res.data;
    },
  });

  const sellersQuery = useQuery({
    queryKey: ['finance-sellers'],
    queryFn: async () => {
      const res = await api.get<{ sellers: SellerBalance[] }>('/orders/finance/sellers');
      return res.data.sellers;
    },
  });

  const payoutsQuery = useQuery({
    queryKey: ['finance-payouts'],
    queryFn: async () => {
      const res = await api.get<{ payouts: Payout[] }>('/orders/finance/payouts');
      return res.data.payouts;
    },
  });

  const createPayoutMutation = useMutation({
    mutationFn: async ({ sellerId, notes }: { sellerId: number; notes?: string }) => {
      const res = await api.post('/orders/finance/payouts/create', { sellerId, notes });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Payout creado correctamente');
      queryClient.invalidateQueries({ queryKey: ['finance-sellers'] });
      queryClient.invalidateQueries({ queryKey: ['finance-payouts'] });
      queryClient.invalidateQueries({ queryKey: ['finance-summary'] });
    },
    onError: (error: unknown) => {
      const message =
        typeof error === 'object' &&
        error !== null &&
        'response' in error &&
        typeof (error as { response?: { data?: { error?: string } } }).response?.data?.error === 'string'
          ? (error as { response?: { data?: { error?: string } } }).response?.data?.error
          : 'No se pudo crear el payout';
      toast.error(message);
    },
  });

  const markPaidMutation = useMutation({
    mutationFn: async (payoutId: number) => {
      const res = await api.patch(`/orders/finance/payouts/${payoutId}/mark-paid`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Payout marcado como pagado');
      queryClient.invalidateQueries({ queryKey: ['finance-sellers'] });
      queryClient.invalidateQueries({ queryKey: ['finance-payouts'] });
      queryClient.invalidateQueries({ queryKey: ['finance-summary'] });
    },
    onError: (error: unknown) => {
      const message =
        typeof error === 'object' &&
        error !== null &&
        'response' in error &&
        typeof (error as { response?: { data?: { error?: string } } }).response?.data?.error === 'string'
          ? (error as { response?: { data?: { error?: string } } }).response?.data?.error
          : 'No se pudo actualizar el payout';
      toast.error(message);
    },
  });

  const pendingPayouts = useMemo(
    () => (payoutsQuery.data || []).filter((p) => p.status === 'pending'),
    [payoutsQuery.data]
  );

  const loading = summaryQuery.isPending || sellersQuery.isPending || payoutsQuery.isPending;

  return (
    <div className="min-h-screen flex flex-col bg-[#FBFBFB]">
      <header className="sticky top-0 z-10 w-full border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center hover:opacity-80 transition-opacity">
            <img src={LogoImage} alt="MiVitrina Logo" className="h-12 w-auto object-contain" />
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" className="font-semibold border-[#EACED7] text-[#9B5F71] hover:bg-[#FDF6F8]">
              <Link to="/profile">Mi perfil</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8">
        <Link to="/profile" className="mb-6 inline-flex items-center gap-2 text-[#C05673] hover:text-[#B04B68]">
          <ArrowLeft className="h-5 w-5" />
          Volver al perfil
        </Link>

        <div className="mb-6">
          <h1 className="text-3xl font-black text-slate-900">Finanzas de plataforma</h1>
          <p className="text-slate-500">Control de comisión ({summaryQuery.data?.feePercentage ?? 3}%) y pagos a vendedores.</p>
        </div>

        {loading ? (
          <Card className="border-slate-200">
            <CardContent className="py-12 text-center text-slate-500">Cargando datos financieros...</CardContent>
          </Card>
        ) : (
          <>
            <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4 mb-8">
              <Card className="border-slate-200">
                <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Ventas brutas</CardTitle></CardHeader>
                <CardContent className="flex items-center justify-between">
                  <p className="text-2xl font-bold text-slate-900">${Number(summaryQuery.data?.grossSales || 0).toLocaleString()}</p>
                  <CircleDollarSign className="h-6 w-6 text-slate-400" />
                </CardContent>
              </Card>

              <Card className="border-slate-200">
                <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Ingreso plataforma</CardTitle></CardHeader>
                <CardContent className="flex items-center justify-between">
                  <p className="text-2xl font-bold text-[#C05673]">${Number(summaryQuery.data?.platformRevenue || 0).toLocaleString()}</p>
                  <Landmark className="h-6 w-6 text-[#9B5F71]" />
                </CardContent>
              </Card>

              <Card className="border-slate-200">
                <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Neto vendedores</CardTitle></CardHeader>
                <CardContent className="flex items-center justify-between">
                  <p className="text-2xl font-bold text-slate-900">${Number(summaryQuery.data?.sellerNetTotal || 0).toLocaleString()}</p>
                  <Wallet className="h-6 w-6 text-slate-400" />
                </CardContent>
              </Card>

              <Card className="border-slate-200">
                <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Órdenes completadas</CardTitle></CardHeader>
                <CardContent className="flex items-center justify-between">
                  <p className="text-2xl font-bold text-slate-900">{Number(summaryQuery.data?.ordersCount || 0)}</p>
                  <HandCoins className="h-6 w-6 text-slate-400" />
                </CardContent>
              </Card>
            </section>

            <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <Card className="border-slate-200">
                <CardHeader>
                  <CardTitle>Balance por vendedor</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(sellersQuery.data || []).length === 0 && (
                    <p className="text-sm text-slate-500">Aún no hay ventas completadas.</p>
                  )}

                  {(sellersQuery.data || []).map((seller) => (
                    <div key={seller.sellerId} className="rounded-xl border border-slate-200 p-4 space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold text-slate-900">{seller.sellerUsername}</p>
                          <p className="text-xs text-slate-500">{seller.sellerEmail}</p>
                        </div>
                        <Badge variant="secondary" className="bg-[#FDF6F8] text-[#9B5F71] border-[#EAD1D9]">
                          Pendiente: ${seller.pendingPayoutAmount.toLocaleString()}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-sm text-slate-600">
                        <p>Ventas: <span className="font-semibold text-slate-900">${seller.grossSales.toLocaleString()}</span></p>
                        <p>Comisión web: <span className="font-semibold text-slate-900">${seller.platformFeeTotal.toLocaleString()}</span></p>
                        <p>Neto vendedor: <span className="font-semibold text-slate-900">${seller.sellerNetTotal.toLocaleString()}</span></p>
                        <p>Pagado: <span className="font-semibold text-slate-900">${seller.paidPayoutAmount.toLocaleString()}</span></p>
                      </div>

                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Input
                          placeholder="Nota opcional del payout"
                          value={notesBySeller[seller.sellerId] || ''}
                          onChange={(e) =>
                            setNotesBySeller((prev) => ({
                              ...prev,
                              [seller.sellerId]: e.target.value,
                            }))
                          }
                        />
                        <Button
                          disabled={seller.pendingPayoutAmount <= 0 || createPayoutMutation.isPending}
                          onClick={() =>
                            createPayoutMutation.mutate({
                              sellerId: seller.sellerId,
                              notes: notesBySeller[seller.sellerId] || undefined,
                            })
                          }
                          className="bg-[#C05673] hover:bg-[#B04B68]"
                        >
                          Crear payout
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="border-slate-200">
                <CardHeader>
                  <CardTitle>Payouts pendientes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {pendingPayouts.length === 0 && (
                    <p className="text-sm text-slate-500">No hay payouts pendientes.</p>
                  )}

                  {pendingPayouts.map((payout) => (
                    <div key={payout.id} className="rounded-xl border border-slate-200 p-4 flex items-center justify-between gap-4">
                      <div>
                        <p className="font-semibold text-slate-900">#{payout.id} · {payout.sellerUsername}</p>
                        <p className="text-xs text-slate-500">{payout.sellerEmail}</p>
                        <p className="text-sm text-slate-700 mt-1">
                          ${payout.totalAmount.toLocaleString()} · {payout.itemsCount} ítems
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        className="border-green-200 text-green-700 hover:bg-green-50"
                        disabled={markPaidMutation.isPending}
                        onClick={() => markPaidMutation.mutate(payout.id)}
                      >
                        Marcar pagado
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </section>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
