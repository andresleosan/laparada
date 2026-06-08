import { useState, useCallback } from 'react';
import {
  actualizarEstadoEntrega,
  getMensajesPendientes,
  getMetricasEntrega,
  EstadoEntrega,
} from '../services/messageDeliveryService';
import {
  enablePaymentRetry,
  disablePaymentRetry,
  getRetryablePayments,
  getRetryStatistics,
} from '../services/paymentRetryService';

/**
 * Hook para gestionar entregas de mensajes y reintentos de pagos
 */
export function useAdvancedIntegrations() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ===== MENSAJE DELIVERY =====

  const updateMessageStatus = useCallback(
    async (mensajeId: string, estado: EstadoEntrega) => {
      setLoading(true);
      setError(null);
      try {
        await actualizarEstadoEntrega(mensajeId, estado);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error updating message status');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const getPendingMessages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      return await getMensajesPendientes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching pending messages');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const getDeliveryMetrics = useCallback(
    async (fechaInicio?: Date, fechaFin?: Date) => {
      setLoading(true);
      setError(null);
      try {
        return await getMetricasEntrega(fechaInicio, fechaFin);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error fetching delivery metrics');
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // ===== PAYMENT RETRY =====

  const enableRetryForPayment = useCallback(
    async (transactionId: string) => {
      setLoading(true);
      setError(null);
      try {
        await enablePaymentRetry(transactionId);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error enabling payment retry');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const disableRetryForPayment = useCallback(
    async (transactionId: string) => {
      setLoading(true);
      setError(null);
      try {
        await disablePaymentRetry(transactionId);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error disabling payment retry');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const fetchRetryablePayments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      return await getRetryablePayments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching retryable payments');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRetryStatistics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      return await getRetryStatistics();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching retry statistics');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    // State
    loading,
    error,
    // Message delivery functions
    updateMessageStatus,
    getPendingMessages,
    getDeliveryMetrics,
    // Payment retry functions
    enableRetryForPayment,
    disableRetryForPayment,
    fetchRetryablePayments,
    fetchRetryStatistics,
  };
}
