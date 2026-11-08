// src/hooks/useClientes.ts
import { useEffect, useState, useCallback } from 'react';
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { db } from '@/services/firebase';
import type { Cliente, NuevoClienteInput } from '@/types';
import {
  actualizarCliente as actualizarClienteService,
  crearCliente as crearClienteService,
  eliminarCliente as eliminarClienteService,
  canjearRecompensaCliente as canjearRecompensaClienteService,
  ajustarSellosCliente as ajustarSellosClienteService,
} from '@/services/clientesService';
import { normalizarTelefono } from '@/utils/clienteUtils';

function parseDate(val: unknown): Date {
  if (!val) return new Date();
  if (val instanceof Date) return val;
  if (typeof val === 'object' && val !== null && 'toDate' in val && typeof (val as { toDate: () => Date }).toDate === 'function') {
    return (val as { toDate: () => Date }).toDate();
  }
  if (typeof val === 'string' || typeof val === 'number') {
    return new Date(val);
  }
  return new Date();
}

export function useClientes(negocioId: string) {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!negocioId) {
      setClientes([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const colRef = collection(db, 'clientes');
    // Consulta reactiva acotada por tenant
    const q = query(
      colRef,
      where('negocioId', '==', negocioId),
      orderBy('ultimoPedidoEn', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items: Cliente[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            negocioId: data.negocioId,
            nombre: data.nombre || 'Cliente sin nombre',
            telefono: data.telefono || '',
            email: data.email || undefined,
            direcciones: Array.isArray(data.direcciones) ? data.direcciones : [],
            barrio: data.barrio || undefined,
            totalPedidos: Number.isFinite(data.totalPedidos) ? data.totalPedidos : 0,
            totalConsumido: Number.isFinite(data.totalConsumido) ? data.totalConsumido : 0,
            primerPedidoEn: parseDate(data.primerPedidoEn),
            ultimoPedidoEn: parseDate(data.ultimoPedidoEn),
            loDeSiempre: data.loDeSiempre
              ? {
                  items: Array.isArray(data.loDeSiempre.items) ? data.loDeSiempre.items : [],
                  total: Number.isFinite(data.loDeSiempre.total) ? data.loDeSiempre.total : 0,
                  origen: data.loDeSiempre.origen,
                  actualizadoEn: parseDate(data.loDeSiempre.actualizadoEn),
                }
              : undefined,
            origenRegistro: data.origenRegistro || 'pos',
            notas: data.notas || undefined,
            creadoEn: parseDate(data.creadoEn),
            actualizadoEn: parseDate(data.actualizadoEn),

            // Centro de Fidelización VIP
            sellosActuales: Number.isFinite(data.sellosActuales) ? data.sellosActuales : 0,
            metaSellos: Number.isFinite(data.metaSellos) && data.metaSellos > 0 ? data.metaSellos : 6,
            recompensasDisponibles: Number.isFinite(data.recompensasDisponibles)
              ? data.recompensasDisponibles
              : 0,
            recompensasRedimidas: Number.isFinite(data.recompensasRedimidas)
              ? data.recompensasRedimidas
              : 0,
            nivelFidelizacion: data.nivelFidelizacion || undefined,
          };
        });
        setClientes(items);
        setLoading(false);
      },
      (err) => {
        console.warn('Error en suscripción de clientes con ordenamiento, reintentando:', err);
        // Fallback sin orderBy por si falta índice compuesto
        const fallbackQ = query(colRef, where('negocioId', '==', negocioId));
        return onSnapshot(
          fallbackQ,
          (snapFallback) => {
            const items: Cliente[] = snapFallback.docs.map((docSnap) => {
              const data = docSnap.data();
              return {
                id: docSnap.id,
                negocioId: data.negocioId,
                nombre: data.nombre || 'Cliente sin nombre',
                telefono: data.telefono || '',
                email: data.email || undefined,
                direcciones: Array.isArray(data.direcciones) ? data.direcciones : [],
                barrio: data.barrio || undefined,
                totalPedidos: Number.isFinite(data.totalPedidos) ? data.totalPedidos : 0,
                totalConsumido: Number.isFinite(data.totalConsumido) ? data.totalConsumido : 0,
                primerPedidoEn: parseDate(data.primerPedidoEn),
                ultimoPedidoEn: parseDate(data.ultimoPedidoEn),
                loDeSiempre: data.loDeSiempre
                  ? {
                      items: Array.isArray(data.loDeSiempre.items) ? data.loDeSiempre.items : [],
                      total: Number.isFinite(data.loDeSiempre.total) ? data.loDeSiempre.total : 0,
                      origen: data.loDeSiempre.origen,
                      actualizadoEn: parseDate(data.loDeSiempre.actualizadoEn),
                    }
                  : undefined,
                origenRegistro: data.origenRegistro || 'pos',
                notas: data.notas || undefined,
                creadoEn: parseDate(data.creadoEn),
                actualizadoEn: parseDate(data.actualizadoEn),

                // Centro de Fidelización VIP
                sellosActuales: Number.isFinite(data.sellosActuales) ? data.sellosActuales : 0,
                metaSellos:
                  Number.isFinite(data.metaSellos) && data.metaSellos > 0 ? data.metaSellos : 6,
                recompensasDisponibles: Number.isFinite(data.recompensasDisponibles)
                  ? data.recompensasDisponibles
                  : 0,
                recompensasRedimidas: Number.isFinite(data.recompensasRedimidas)
                  ? data.recompensasRedimidas
                  : 0,
                nivelFidelizacion: data.nivelFidelizacion || undefined,
              };
            });
            items.sort((a, b) => parseDate(b.ultimoPedidoEn).getTime() - parseDate(a.ultimoPedidoEn).getTime());
            setClientes(items);
            setLoading(false);
          },
          (finalErr) => {
            console.error('Error final cargando clientes:', finalErr);
            setError('No fue posible cargar el directorio de clientes');
            setLoading(false);
          }
        );
      }
    );

    return () => unsubscribe();
  }, [negocioId]);

  const buscarClientes = useCallback(
    (termino: string): Cliente[] => {
      const q = termino.trim().toLowerCase();
      if (!q) return clientes;
      const qNormPhone = normalizarTelefono(q);

      return clientes.filter((c) => {
        const coincideNombre = c.nombre.toLowerCase().includes(q);
        const coincideTelefono = qNormPhone
          ? c.telefono.includes(qNormPhone)
          : c.telefono.toLowerCase().includes(q);
        const coincideBarrio = c.barrio ? c.barrio.toLowerCase().includes(q) : false;
        const coincideDireccion = c.direcciones.some((d) => d.toLowerCase().includes(q));
        const coincideNotas = c.notas ? c.notas.toLowerCase().includes(q) : false;

        return (
          coincideNombre ||
          coincideTelefono ||
          coincideBarrio ||
          coincideDireccion ||
          coincideNotas
        );
      });
    },
    [clientes]
  );

  const crearCliente = useCallback(
    async (input: NuevoClienteInput) => {
      return await crearClienteService(negocioId, input);
    },
    [negocioId]
  );

  const actualizarCliente = useCallback(
    async (
      clienteId: string,
      updates: Partial<Pick<Cliente, 'nombre' | 'telefono' | 'email' | 'barrio' | 'notas' | 'direcciones'>>
    ) => {
      await actualizarClienteService(negocioId, clienteId, updates);
    },
    [negocioId]
  );

  const eliminarCliente = useCallback(
    async (clienteId: string) => {
      await eliminarClienteService(negocioId, clienteId);
    },
    [negocioId]
  );

  const canjearRecompensa = useCallback(
    async (clienteId: string, motivo?: string) => {
      return await canjearRecompensaClienteService(negocioId, clienteId, motivo);
    },
    [negocioId]
  );

  const ajustarSellos = useCallback(
    async (clienteId: string, deltaSellos: number, motivo?: string) => {
      return await ajustarSellosClienteService(negocioId, clienteId, deltaSellos, motivo);
    },
    [negocioId]
  );

  return {
    clientes,
    loading,
    error,
    buscarClientes,
    crearCliente,
    actualizarCliente,
    eliminarCliente,
    canjearRecompensa,
    ajustarSellos,
  };
}
