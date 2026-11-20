import { supabase } from '@/lib/supabase';

export interface RealtimeTableWatch {
  table: string;
  event?: '*' | 'INSERT' | 'UPDATE' | 'DELETE';
  schema?: string;
  filter?: string;
  onEvent: () => void;
}

/**
 * Subscribes to one or more Postgres change watches on a single named channel,
 * coalescing rapid bursts within `debounceMs` into a single callback execution.
 */
export function subscribeCoalescedChannel(
  channelName: string,
  watches: RealtimeTableWatch[],
  debounceMs = 120,
): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const pendingCallbacks = new Set<() => void>();

  const flush = () => {
    timer = null;
    const callbacks = Array.from(pendingCallbacks);
    pendingCallbacks.clear();
    for (const cb of callbacks) {
      try {
        cb();
      } catch (err) {
        console.error(`Realtime callback error on ${channelName}:`, err);
      }
    }
  };

  const schedule = (cb: () => void) => {
    pendingCallbacks.add(cb);
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(flush, debounceMs);
  };

  const channel = supabase.channel(channelName);

  for (const watch of watches) {
    const config: {
      event: '*' | 'INSERT' | 'UPDATE' | 'DELETE';
      schema: string;
      table: string;
      filter?: string;
    } = {
      event: watch.event ?? '*',
      schema: watch.schema ?? 'public',
      table: watch.table,
    };

    if (watch.filter) {
      config.filter = watch.filter;
    }

    channel.on('postgres_changes', config, () => {
      schedule(watch.onEvent);
    });
  }

  channel.subscribe();

  return () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    pendingCallbacks.clear();
    void supabase.removeChannel(channel);
  };
}
