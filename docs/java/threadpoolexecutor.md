# 源码分析：ThreadPoolExecutor

用java，工作中必然会用到多线程去处理一些任务，对其大部分的理解就是几个参数，现在对其做更深入的了解。

使用JDK版本：Oracle OpenJDK version 22.0.2

## 类注释

java源码中的文档非常详细，在阅读代码之前，看一下类上或者属性上的注释，基本上能有个大致的了解。

以下是源码中的类注释：

ThreadPoolExecutor 是一个执行器服务，它使用一个或多个线程池来执行提交的任务。通常，你可以通过 Executors 工厂方法来配置线程池。

线程池解决两个问题：

1. **提高异步任务执行性能:** 减少每次任务调用的开销，尤其在处理大量异步任务时效果显著。
2. **管理资源:** 控制执行任务时所消耗的资源，包括线程。

每个 ThreadPoolExecutor 还维护一些基本统计信息，比如已完成的任务数量。

为了在各种情况下都能发挥作用，ThreadPoolExecutor 提供了许多可调节参数和扩展钩子。但是，程序员应该优先使用更方便的 Executors 工厂方法，例如 `Executors.newCachedThreadPool`（无界线程池，具有自动线程回收功能）、`Executors.newFixedThreadPool`（固定大小的线程池）和 `Executors.newSingleThreadExecutor`（单个后台线程），这些方法预先配置了最常见用例的设置。

如果你需要手动配置和调整 ThreadPoolExecutor，请遵循以下指南：

### 核心和最大池大小

ThreadPoolExecutor 会根据 `corePoolSize`（核心池大小，使用 `getCorePoolSize` 获取）和 `maximumPoolSize`（最大池大小，使用 `getMaximumPoolSize` 获取）设置的界限自动调整池大小（使用 `getPoolSize` 获取）。

当在 `execute(Runnable)` 方法中提交新任务时，如果运行的线程少于 `corePoolSize`，即使其他工作线程处于空闲状态，也会创建一个新线程来处理请求。否则，如果运行的线程少于 `maximumPoolSize`，只有当队列已满时，才会创建一个新线程来处理请求。通过将 `corePoolSize` 和 `maximumPoolSize` 设置为相同的值，你就可以创建一个固定大小的线程池。通过将 `maximumPoolSize` 设置为一个无界的值，例如 `Integer.MAX_VALUE`，你可以允许池容纳任意数量的并发任务。

通常情况下，核心和最大池大小只在构建时设置，但也可以使用 `setCorePoolSize` 和 `setMaximumPoolSize` 动态更改。

### 按需构建

默认情况下，即使是核心线程也会在有新任务到达时才创建和启动，但这可以通过 `prestartCoreThread` 或 `prestartAllCoreThreads` 方法动态覆盖。如果你用一个非空队列构建池，你可能想要预先启动线程。

### 创建新线程

新线程使用 `ThreadFactory` 创建。如果没有另外指定，则使用 `Executors.defaultThreadFactory`，它创建的所有线程都在同一个 `ThreadGroup` 中，具有相同的 `NORM_PRIORITY` 优先级和非守护进程状态。通过提供不同的 `ThreadFactory`，你可以更改线程的名称、线程组、优先级、守护进程状态等。如果 `ThreadFactory` 在被要求创建线程时返回 `null`，则执行器将继续，但可能无法执行任何任务。

线程应该拥有 "modifyThread" 的 `RuntimePermission`。如果工作线程或使用池的其他线程没有此权限，则服务可能会降级：配置更改可能不会及时生效，并且已关闭的池可能处于可以终止但未完成的状态。

### 保持活动时间

如果池中当前的线程数大于 `corePoolSize`，则如果这些多余的线程处于空闲状态的时间超过了 `keepAliveTime`（使用 `getKeepAliveTime(TimeUnit)` 获取），它们将被终止。这提供了一种在池没有被积极使用时减少资源消耗的方法。如果池后来变得更活跃，则会构造新的线程。此参数也可以使用 `setKeepAliveTime(long, TimeUnit)` 方法动态更改。使用 `Long.MAX_VALUE TimeUnit.NANOSECONDS` 的值可以有效地禁用空闲线程在关闭之前终止。默认情况下，保持活动策略仅在有超过 `corePoolSize` 线程时才适用，但可以使用 `allowCoreThreadTimeOut(boolean)` 方法将此超时策略应用于核心线程，只要 `keepAliveTime` 值不为零。

### 排队

任何 `BlockingQueue` 都可以用来传输和保存提交的任务。队列的使用与池的大小相关联：

* 如果运行的线程少于 `corePoolSize`，执行器总是优先添加新线程而不是排队。
* 如果运行的线程数大于等于 `corePoolSize`，执行器总是优先排队请求而不是添加新线程。
* 如果请求无法排队，则会创建一个新线程，除非这会导致超过 `maximumPoolSize`，在这种情况下，任务将被拒绝。

有三种常见的排队策略：

* **直接传递:**  `SynchronousQueue` 是一个很好的工作队列默认选择，它将任务直接传递给线程，而不保留它们。这里，如果立即没有线程可用运行任务，则尝试排队任务会失败，因此会创建一个新线程。此策略避免了在处理可能具有内部依赖性的请求集时发生死锁。直接传递通常需要无界的 `maximumPoolSizes` 来避免拒绝新的提交任务。这反过来又承认了当命令的到达速度平均快于处理速度时，线程数量可能无限增长。
* **无界队列:** 使用无界队列（例如没有预定义容量的 `LinkedBlockingQueue`）会导致新任务在所有 `corePoolSize` 线程都繁忙时在队列中等待。因此，永远不会创建超过 `corePoolSize` 的线程。（`maximumPoolSize` 的值因此没有影响。）这可能适用于每个任务都完全独立于其他任务，因此任务不会影响彼此的执行；例如，在网页服务器中。虽然这种排队方式可以有效地平滑掉瞬时的请求突发，但当命令的到达速度平均快于处理速度时，它承认了工作队列可能无限增长。
* **有界队列:** 有界队列（例如 `ArrayBlockingQueue`）与有限的 `maximumPoolSizes` 一起使用时，有助于防止资源耗尽，但可能更难调整和控制。队列大小和最大池大小可以相互取舍：使用大型队列和小型池可以最大限度地减少 CPU 使用率、操作系统资源和上下文切换开销，但可能导致吞吐量人工降低。如果任务经常阻塞（例如，如果它们是 I/O 绑定的），系统可能能够为比你允许的更多线程安排时间。使用小型队列通常需要更大的池大小，这会使 CPU 更加繁忙，但可能会遇到不可接受的调度开销，这也会降低吞吐量。

### 拒绝的任务

在 `execute(Runnable)` 方法中提交的新任务将在执行器被关闭时被拒绝，以及当执行器对最大线程数和工作队列容量都使用有限边界并且处于饱和状态时被拒绝。在这两种情况下，`execute` 方法都会调用其 `RejectedExecutionHandler` 的 `rejectedExecution(Runnable, ThreadPoolExecutor)` 方法。提供了四种预定义的处理程序策略：

* 在默认的 `ThreadPoolExecutor.AbortPolicy` 中，处理程序在拒绝时抛出一个 `RejectedExecutionException` 运行时异常。
* 在 `ThreadPoolExecutor.CallerRunsPolicy` 中，调用 `execute` 的线程本身运行该任务。这提供了一种简单的反馈控制机制，可以减缓新任务提交的速度。
* 在 `ThreadPoolExecutor.DiscardPolicy` 中，无法执行的任务被简单地丢弃。此策略仅适用于任务完成从未被依赖的那些罕见情况。
* 在 `ThreadPoolExecutor.DiscardOldestPolicy` 中，如果执行器没有关闭，工作队列头部任务将被丢弃，然后重新执行（这可能会再次失败，导致重复）。此策略很少被接受。在几乎所有情况下，你都应该取消任务以在任何等待其完成的组件中引发异常，以及/或记录失败，如 `ThreadPoolExecutor.DiscardOldestPolicy` 文档中所述。

可以定义和使用其他类型的 `RejectedExecutionHandler` 类。这样做需要一些谨慎，尤其是在策略被设计为仅在特定容量或排队策略下工作时。

### 钩子方法

此类提供受保护的覆盖方法 `beforeExecute(Thread, Runnable)` 和 `afterExecute(Runnable, Throwable)`，它们在每个任务执行之前和之后被调用。这些方法可以用来操作执行环境；例如，重新初始化 `ThreadLocals`、收集统计信息或添加日志条目。此外，可以覆盖 `terminated` 方法以执行在执行器完全终止后需要完成的任何特殊处理。

如果钩子、回调或 `BlockingQueue` 方法抛出异常，内部工作线程可能会因此失败、突然终止并可能被替换。

### 队列维护

`getQueue()` 方法允许访问工作队列，以便进行监控和调试。强烈建议不要将此方法用于任何其他目的。提供两个方法 `remove(Runnable)` 和 `purge`，以帮助在大量排队的任务被取消时进行存储回收。

### 回收

在程序中不再被引用并且没有剩余线程的池可能会被回收（垃圾回收），而无需显式关闭。你可以通过设置适当的保持活动时间、使用零核心线程的下界以及/或设置 `allowCoreThreadTimeOut(boolean)` 来配置池，以允许所有未使用的线程最终死亡。

### 扩展示例

此类的大多数扩展都覆盖了一个或多个受保护的钩子方法。例如，以下是一个添加了简单暂停/恢复功能的子类：

```java
class PausableThreadPoolExecutor extends ThreadPoolExecutor {
    private boolean isPaused;
    private ReentrantLock pauseLock = new ReentrantLock();
    private Condition unpaused = pauseLock.newCondition();

    public PausableThreadPoolExecutor(...) {
        super(...);
    }

    protected void beforeExecute(Thread t, Runnable r) {
        super.beforeExecute(t, r);
        pauseLock.lock();
        try {
            while (isPaused) unpaused.await();
        } catch (InterruptedException ie) {
            t.interrupt();
        } finally {
            pauseLock.unlock();
        }
    }

    public void pause() {
        pauseLock.lock();
        try {
            isPaused = true;
        } finally {
            pauseLock.unlock();
        }
    }

    public void resume() {
        pauseLock.lock();
        try {
            isPaused = false;
            unpaused.signalAll();
        } finally {
            pauseLock.unlock();
        }
    }
}
```

**自版本:** 1.5

**作者:** Doug Lea
