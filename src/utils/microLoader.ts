type MicroLoaderPriority = "critical" | "high" | "normal" | "low";

type MicroTask = {
  id: string;
  priority: MicroLoaderPriority;
  run: () => void | Promise<void>;
};

type LoaderOptions = {
  chunkSize?: number;
  idleTimeoutMs?: number;
};

const PRIORITY_ORDER: MicroLoaderPriority[] = ["critical", "high", "normal", "low"];

function scheduleIdle(callback: () => void, timeoutMs = 120) {
  if (typeof window !== "undefined" && "requestIdleCallback" in window) {
    const ric = (window as Window & { requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => number }).requestIdleCallback;
    ric(callback, { timeout: timeoutMs });
    return;
  }

  globalThis.setTimeout(callback, 0);
}

function nextTick(callback: () => void) {
  if (typeof queueMicrotask === "function") {
    queueMicrotask(callback);
    return;
  }
  globalThis.setTimeout(callback, 0);
}

export function createMicroLoader(options?: LoaderOptions) {
  const chunkSize = Math.max(1, options?.chunkSize ?? 2);
  const idleTimeoutMs = Math.max(1, options?.idleTimeoutMs ?? 120);

  const queue = new Map<MicroLoaderPriority, MicroTask[]>(
    PRIORITY_ORDER.map((priority) => [priority, []] as const),
  );

  let running = false;

  const getNextBatch = () => {
    const batch: MicroTask[] = [];

    for (const priority of PRIORITY_ORDER) {
      const tasks = queue.get(priority)!;
      while (tasks.length > 0 && batch.length < chunkSize) {
        const next = tasks.shift();
        if (next) batch.push(next);
      }
      if (batch.length >= chunkSize) break;
    }

    return batch;
  };

  const pump = () => {
    if (running) return;
    running = true;

    const work = async () => {
      const batch = getNextBatch();
      if (!batch.length) {
        running = false;
        return;
      }

      await Promise.all(batch.map((task) => Promise.resolve(task.run()).catch(() => undefined)));
      scheduleIdle(work, idleTimeoutMs);
    };

    nextTick(() => scheduleIdle(work, idleTimeoutMs));
  };

  const addTask = (task: Omit<MicroTask, "id">) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    queue.get(task.priority)?.push({ ...task, id });
    pump();
    return id;
  };

  const clear = () => {
    PRIORITY_ORDER.forEach((priority) => queue.set(priority, []));
  };

  return {
    addTask,
    clear,
  };
}

export function runIdleTask(task: () => void | Promise<void>, timeoutMs = 120) {
  scheduleIdle(() => {
    void task();
  }, timeoutMs);
}
