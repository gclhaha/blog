# Java JUC 集合

我们平时使用的大多都是ArrayList、HashMap等集合，这些集合都是非线程安全的，如果在多线程环境下使用，可能会出现问题。Java提供了一些线程安全的集合，如ConcurrentHashMap、CopyOnWriteArrayList等，这些集合都是基于JUC包下的。

使用的JDK版本：Oracle OpenJDK version 22.0.2

## JUC 集合 介绍

### ArrayBlockingQueue

由一个数组支持的有限阻塞队列。该队列按先进先出(FIFO)顺序排列元素。队列的头部是已经在队列上停留了最长时间的那个元素。队列的尾部是已经在队列上停留时间最短的那个元素。新元素插入到队列的尾部，而队列检索操作在队列的头部获取元素。
这是一个经典的“有界缓冲区”，其中固定大小的数组保存生产者插入并由消费者提取的元素。一旦创建，容量就无法更改。尝试将元素放入已满的队列将导致操作阻塞;尝试从空的队列中获取元素也会导致阻塞。
这个类支持一个可选的公平策略，用于排序等待的生产者和消费者线程。默认情况下，这种排序无法保证。但是，使用公平设置为 true构建的队列会按 FIFO 顺序授予线程访问权限公平性通常会降低吞吐量，但可以减少可变性并避免饥饿。
这个类及其迭代器实现了Collection和lterator接口的所有可选方法。

其中实现线程安全主要有两种方式：

第一种：

```java
public E poll() {
    final ReentrantLock lock = this.lock;
    lock.lock();
    try {
        return (count == 0) ? null : dequeue();
    } finally {
        lock.unlock();
    }
}
```

这种方式通过ReentrantLock的lock和unlock方法来保证线程安全。

第二种：

```java
public E take() throws InterruptedException {
    final ReentrantLock lock = this.lock;
    lock.lockInterruptibly();
    try {
        while (count == 0)
            notEmpty.await();
        return dequeue();
    } finally {
        lock.unlock();
    }
}
```

这种方式通过ReentrantLock的lockInterruptibly和unlock方法来保证线程安全。

lock() 方法是普通的获取锁的方式，如果锁不可用，调用线程将会阻塞，直到获取到锁。这个方法是不可中断的，也就是说，线程在等待获取锁时，无法响应中断请求，即使调用了 Thread.interrupt()，线程也会继续等待。

lockInterruptibly() 方法与 lock() 类似，但它允许在等待获取锁时可以响应中断请求。如果线程在等待锁时被中断，线程会抛出 InterruptedException，并停止等待。

`lock()`和`lockInterruptibly()`两种方法的区别：

| 特性         | `lock()`                                 | `lockInterruptibly()`                                              |
| ------------ | ---------------------------------------- | ------------------------------------------------------------------ |
| 是否可被中断 | 否                                       | 是                                                                 |
| 阻塞行为     | 一直阻塞，直到获取到锁为止               | 如果线程在等待锁时被中断，会抛出 `InterruptedException` 并停止等待 |
| 适用场景     | 适合那些即使被中断也必须等待获取锁的情况 | 适合需要在等待期间允许中断、灵活控制的场景                         |

### ConcurrentHashMap

[源码分析：ConcurrentHashMap](./concurrenthashmap.md)

### ConcurrentLinkedDeque

一个基于链接节点的无限并发双端队列。并发插入、删除和访问操作在多个线程之间安全执行。当多个线程共享对公共集合的访问时，ConcurrentLinkedDeque是一个合适的选择。与大多数其他并发集合实现一样，该类不允许使用 null 元素。

迭代器和分裂器具有弱一致性。

请注意，与大多数集合不同，size方法不是恒定时间操作。由于这些队列的异步性质，确定当前元素数量需要遍历元素，因此如果在遍历过程中修改此集合，则可能会报告不正确的结果。
添加、删除或检查多个元素的批量操作，如 addAll、removelf或 forEach，无法保证原子执行。例如，与 addAll 操作并发执行的 forEach 遍历可能只会观察到一些添加的元素。

这个类及其迭代器实现了Deque和lterator接口的所有可选方法。

内存一致性影响:与其他并发集合一样，在将对象放入并发链式队列之前，线程中的操作发生在另一个线程中访问或删除该元素之后的操作之前。

使用了CAS实现了线程安全。

```java
private void linkFirst(E e) {
    final Node<E> newNode = newNode(Objects.requireNonNull(e));

    restartFromHead:
    for (;;)
        for (Node<E> h = head, p = h, q;;) {
            if ((q = p.prev) != null &&
                (q = (p = q).prev) != null)
                // Check for head updates every other hop.
                // If p == q, we are sure to follow head instead.
                p = (h != (h = head)) ? h : q;
            else if (p.next == p) // PREV_TERMINATOR
                continue restartFromHead;
            else {
                // p is first node
                NEXT.set(newNode, p); // CAS piggyback
                if (PREV.compareAndSet(p, null, newNode)) {
                    // Successful CAS is the linearization point
                    // for e to become an element of this deque,
                    // and for newNode to become "live".
                    if (p != h) // hop two nodes at a time; failure is OK
                        HEAD.weakCompareAndSet(this, h, newNode);
                    return;
                }
                // Lost CAS race to another thread; re-read prev
            }
        }
}
```

### ConcurrentLinkedQueue

基于链接节点的无限线程安全队列。此队列按 FIFO(先进先出)对元素进行排序。队列的头部是已经在队列中停留时间最长的元素。队列的尾部是已经在队列中停留最短时间的元素新元素插入到队列的尾部，而队列检索操作在队列的头部获取元素。当多个线程将共享对公共集合的访问时，ConcurrentLinkedQueue是一个合适的选择。与大多数其他并发集合实现一样，该类不允许使用 null 元素。

该实现采用了一种高效的非阻塞算法，该算法基于Maged M.Michael和Michael L.Scott在 [《简单、快速和实用的非阻塞和阻塞并发队列算法7》](http://www.cs.rochester.edu/~scott/papers/1996_PODC_queues.pdf)中描述的一种算法。

迭代器是弱一致的，返回反映队列在某个时间点或自创建迭代器以来的状态的元素。它们不会抛出java.util.ConcurrentModificationException，并且可以与其他操作并发进行。自迭代器创建以来包含在队列中的元素将准确返回一次。

请注意，与大多数集合不同，size方法不是恒定时间操作。由于这些队列的异步性质，确定当前元素数量需要遍历元素，因此如果在遍历过程中修改此集合，则可能会报告不正确的结果。

添加、删除或检查多个元素的批量操作，如addAll、removelf或 forEach，无法保证原子执行。例如，与 addAIl 操作并发执行的 forEach 遍历可能只会观察到一些添加的元素。

这个类及其迭代器实现了队列和迭代器接口的所有可选方法。内存一致性影响:与其他并发集合一样，在将对象放入并发链式队列之前，线程中的操作发生在从另一个线程中访问或删除该元素之后的操作之前。

```java
public boolean offer(E e) {
    final Node<E> newNode = new Node<E>(Objects.requireNonNull(e));

    for (Node<E> t = tail, p = t;;) {
        Node<E> q = p.next;
        if (q == null) {
            // p is last node
            if (NEXT.compareAndSet(p, null, newNode)) {
                // Successful CAS is the linearization point
                // for e to become an element of this queue,
                // and for newNode to become "live".
                if (p != t) // hop two nodes at a time; failure is OK
                    TAIL.weakCompareAndSet(this, t, newNode);
                return true;
            }
            // Lost CAS race to another thread; re-read next
        }
        else if (p == q)
            // We have fallen off list.  If tail is unchanged, it
            // will also be off-list, in which case we need to
            // jump to head, from which all live nodes are always
            // reachable.  Else the new tail is a better bet.
            p = (t != (t = tail)) ? t : head;
        else
            // Check for tail updates after two hops.
            p = (p != t && t != (t = tail)) ? t : q;
    }
}
```

使用cas实现线程安全。

### ConcurrentSkipListMap

Key和Value都不能为空，否则NPE。

```java
public V put(K key, V value) {
    if (value == null)
        throw new NullPointerException();
    return doPut(key, value, false);
}
```

```java
private V doPut(K key, V value, boolean onlyIfAbsent) {
    if (key == null)
        throw new NullPointerException();
    Comparator<? super K> cmp = comparator;
    for (;;) {
        Index<K,V> h; Node<K,V> b;
        VarHandle.acquireFence();
        int levels = 0;                    // number of levels descended
        if ((h = head) == null) {          // try to initialize
            Node<K,V> base = new Node<K,V>(null, null, null);
            h = new Index<K,V>(base, null, null);
            b = (HEAD.compareAndSet(this, null, h)) ? base : null;
        }
        else {
            for (Index<K,V> q = h, r, d;;) { // count while descending
                while ((r = q.right) != null) {
                    Node<K,V> p; K k;
                    if ((p = r.node) == null || (k = p.key) == null ||
                        p.val == null)
                        RIGHT.compareAndSet(q, r, r.right);
                    else if (cpr(cmp, key, k) > 0)
                        q = r;
                    else
                        break;
                }
                if ((d = q.down) != null) {
                    ++levels;
                    q = d;
                }
                else {
                    b = q.node;
                    break;
                }
            }
        }
        if (b != null) {
            Node<K,V> z = null;              // new node, if inserted
            for (;;) {                       // find insertion point
                Node<K,V> n, p; K k; V v; int c;
                if ((n = b.next) == null) {
                    if (b.key == null)       // if empty, type check key now
                        cpr(cmp, key, key);
                    c = -1;
                }
                else if ((k = n.key) == null)
                    break;                   // can't append; restart
                else if ((v = n.val) == null) {
                    unlinkNode(b, n);
                    c = 1;
                }
                else if ((c = cpr(cmp, key, k)) > 0)
                    b = n;
                else if (c == 0 &&
                            (onlyIfAbsent || VAL.compareAndSet(n, v, value)))
                    return v;

                if (c < 0 &&
                    NEXT.compareAndSet(b, n,
                                        p = new Node<K,V>(key, value, n))) {
                    z = p;
                    break;
                }
            }

            if (z != null) {
                int lr = ThreadLocalRandom.nextSecondarySeed();
                if ((lr & 0x3) == 0) {       // add indices with 1/4 prob
                    int hr = ThreadLocalRandom.nextSecondarySeed();
                    long rnd = ((long)hr << 32) | ((long)lr & 0xffffffffL);
                    int skips = levels;      // levels to descend before add
                    Index<K,V> x = null;
                    for (;;) {               // create at most 62 indices
                        x = new Index<K,V>(z, x, null);
                        if (rnd >= 0L || --skips < 0)
                            break;
                        else
                            rnd <<= 1;
                    }
                    if (addIndices(h, skips, x, cmp) && skips < 0 &&
                        head == h) {         // try to add new level
                        Index<K,V> hx = new Index<K,V>(z, x, null);
                        Index<K,V> nh = new Index<K,V>(h.node, h, hx);
                        HEAD.compareAndSet(this, h, nh);
                    }
                    if (z.val == null)       // deleted while adding indices
                        findPredecessor(key, cmp); // clean
                }
                addCount(1L);
                return null;
            }
        }
    }
}
```

使用cas实现线程安全。

### ConcurrentSkipListSet

一种基于并发跳过列表映射的可扩展并发导航集实现。
根据所使用构造函数的不同，集合中的元素会按照其自然顺序或通过在创建集合时提供的比较器来保持排序。
这种实现为包含、添加和删除操作及其变体提供了预期的平均对数(n)时间成本。插入、删除和访问操作由多个线程安全地并发执行。

迭代器和分裂器具有弱一致性

递增的有序视图及其迭代器比递减的视图快

请注意，与大多数集合不同，size方法不是恒定时间操作。由于这些集合的异步性质，确定当前元素数量需要遍历元素，因此如果在遍历过程中修改此集合，则可能会报告不正确的结果。
添加、删除或检查多个元素的批量操作，例如addAll、removelf或 forEach，无法保证原子执行。例如，与 addAIl 操作并发执行的 forEach 遍历可能只会观察到一些添加的元素。
这个类及其迭代器实现了 Set 和 lterator接口的所有可选方法。与大多数其他并发集合实现一样，这个类不允许使用 null 元素，因为 null 参数和返回值无法可靠地与缺少元素区分开来。

使用了ConcurrentSkipListMap的Key实现Set

### CopyOnWriteArrayList

一个线程安全的 ArrayList 变体，其中所有的修改操作（如 add、set 等）都是通过对底层数组创建一个新副本来实现的。通常这种操作代价较高，但在遍历操作远多于修改操作时，它可能比其他方案更高效。当你无法或不想对遍历操作进行同步处理时，它非常有用，因为它可以防止多个线程之间的干扰。它的“快照”风格迭代器方法在创建迭代器时使用对数组状态的引用。在迭代器的生命周期内，这个数组不会发生变化，因此不会出现干扰，迭代器也保证不会抛出 ConcurrentModificationException。迭代器不会反映自其创建以来对列表的任何添加、删除或修改操作。迭代器本身的元素修改操作（如 remove、set 和 add）不支持，这些方法将抛出 UnsupportedOperationException。

所有元素都允许，包括 null。

内存一致性效果：与其他并发集合一样，在一个线程中将对象放入 CopyOnWriteArrayList 之前的操作发生在另一个线程访问或删除该元素之后的操作之前

```java
public boolean add(E e) {
    synchronized (lock) {
        Object[] es = getArray();
        int len = es.length;
        es = Arrays.copyOf(es, len + 1);
        es[len] = e;
        setArray(es);
        return true;
    }
}
```

使用synchronized关键字实现线程安全。

### CopyOnWriteArraySet

这是一个使用内部 `CopyOnWriteArrayList` 实现其所有操作的 `Set`。因此，它具有相同的基本特性：

- 它最适合用于集合大小通常保持较小、只读操作远多于修改操作的应用场景，并且在遍历时需要防止线程之间的干扰。
- 它是线程安全的。
- 修改操作（如 `add`、`set`、`remove` 等）代价较高，因为这些操作通常需要复制整个底层数组。
- 迭代器不支持修改操作 `remove`。
- 通过迭代器遍历速度快，且不会遇到其他线程的干扰。迭代器依赖于在构造时拍摄的数组快照，这些快照在迭代器的生命周期内不会改变。

示例用法：以下代码示例使用一个写时复制的集合来维护一组 `Handler` 对象，以便在状态更新时执行某些操作。

```java
class X {
    private final CopyOnWriteArraySet<Handler> handlers
      = new CopyOnWriteArraySet<>();
    public void addHandler(Handler h) { handlers.add(h); }
 
    private long internalState;
    private synchronized void changeState() { internalState = ...; }
 
    public void update() {
      changeState();
      for (Handler handler : handlers)
        handler.handle();
    }
}
```

CopyOnWriteArraySet 和 CopyOnWriteArrayList 一样，在修改操作时采取了“写时复制”的策略：每当集合进行 写操作（如 add()、remove() 等）时，都会复制当前底层的数组，创建一个新的副本，在新副本上进行修改。修改完成后，将这个新的数组替换原来的数组。由于所有的 读操作（如 get()、contains() 等）都是在不变的数组上进行的，所以这些操作可以并发执行，无需加锁，保证了线程安全。

```java
public boolean addIfAbsent(E e) {
    // 副本
    Object[] snapshot = getArray();
    return indexOfRange(e, snapshot, 0, snapshot.length) < 0
        && addIfAbsent(e, snapshot);
}

private boolean addIfAbsent(E e, Object[] snapshot) {
    // synchronized 保证线程安全
    synchronized (lock) {
        Object[] current = getArray();
        int len = current.length;
        if (snapshot != current) {
            // Optimize for lost race to another addXXX operation
            int common = Math.min(snapshot.length, len);
            for (int i = 0; i < common; i++)
                if (current[i] != snapshot[i]
                    && Objects.equals(e, current[i]))
                    return false;
            if (indexOfRange(e, current, common, len) >= 0)
                    return false;
        }
        // 将数据复制到新数组
        Object[] newElements = Arrays.copyOf(current, len + 1);
        newElements[len] = e;
        setArray(newElements);
        return true;
    }
}
```

### LinkedBlockingDeque

一个基于链节点的可选边界阻塞双端队列。

可选的容量上限构造函数参数用于防止过度扩展。如果未指定容量，则默认值为 `Integer.MAX_VALUE`。在每次插入时，动态创建链节点，除非此操作会使双端队列的容量超过上限。

大多数操作的时间复杂度是常数时间（不考虑阻塞所耗时间）。例外情况包括 `remove`、`removeFirstOccurrence`、`removeLastOccurrence`、`contains`、`iterator`、`remove()` 以及批量操作，这些操作的时间复杂度为线性时间。

该类及其迭代器实现了 `Collection` 和 `Iterator` 接口的所有可选方法。

```java
public boolean offerFirst(E e) {
    if (e == null) throw new NullPointerException();
    Node<E> node = new Node<E>(e);
    final ReentrantLock lock = this.lock;
    lock.lock();
    try {
        return linkFirst(node);
    } finally {
        lock.unlock();
    }
}
```

通过 ReentrantLock 实现线程安全。

### LinkedBlockingQueue

一个基于链节点的可选边界阻塞队列。该队列按*FIFO**（先进先出）顺序排列元素。队列的头部是存在队列中时间最长的元素，尾部是存在时间最短的元素。新元素被插入到队列的尾部，而队列的检索操作则从队列的头部获取元素。链式队列通常比基于数组的队列有更高的吞吐量，但在大多数并发应用中性能的可预测性较差。

可选的容量上限构造函数参数用于防止队列的过度扩展。如果未指定容量，则默认值为 `Integer.MAX_VALUE`。每次插入时都会动态创建链节点，除非此操作会导致队列容量超过上限。

`LinkedBlockingQueue` 是 Java 的 `java.util.concurrent` 包中提供的一个线程安全的阻塞队列。它基于**链表结构**，并且可以选择有界或无界。为了保证线程安全，`LinkedBlockingQueue` 采用了**锁机制**和**条件变量**来协调多线程之间的并发访问。下面将详细解释其线程安全实现原理。

`LinkedBlockingQueue` 采用了**两个独立的锁**来实现线程安全：

-*`takeLock`**：用于控制出队操作的锁。当线程调用 `take()` 或 `poll()` 等取出元素的方法时，会获得 `takeLock` 锁来保证数据安全。
-*`putLock`**：用于控制入队操作的锁。当线程调用 `put()` 或 `offer()` 等插入元素的方法时，会获得 `putLock` 锁来保证线程安全。

通过使用两个独立的锁，`LinkedBlockingQueue` 可以让**插入操作和取出操作并发进行**，从而提高性能。

除了使用锁，`LinkedBlockingQueue` 还使用了**两个条件变量**，与 `takeLock` 和 `putLock` 相关联，用于在队列满或空时进行线程等待与通知：

-*notEmpty**：当队列为空时，调用 `take()` 的线程会进入等待状态，直到有新元素插入队列。插入元素后，`put()` 操作会通知 `notEmpty` 以唤醒等待线程。
-*notFull**：当队列达到容量上限时，调用 `put()` 的线程会进入等待状态，直到有元素被取出。取出元素后，`take()` 操作会通知 `notFull` 以唤醒等待线程。

-*插入元素（`put()` 方法）**：
  1. 线程获取 `putLock`，防止其他线程同时插入。
  2. 检查队列是否已满，如果满了则进入 `notFull` 等待。
  3. 如果未满，则在尾节点插入新元素。
  4. 插入成功后，释放 `putLock`，并通过 `notEmpty` 通知等待的取元素线程。

-*取出元素（`take()` 方法）**：
  1. 线程获取 `takeLock`，防止其他线程同时取出。
  2. 检查队列是否为空，如果为空则进入 `notEmpty` 等待。
  3. 如果不为空，则从头节点取出元素。
  4. 取出成功后，释放 `takeLock`，并通过 `notFull` 通知等待的插入线程。

下面是一个简单的 `LinkedBlockingQueue` 示例，展示了如何在多线程环境中使用它：

```java
import java.util.concurrent.LinkedBlockingQueue;

public class LinkedBlockingQueueExample {
    public static void main(String[] args) throws InterruptedException {
        LinkedBlockingQueue<Integer> queue = new LinkedBlockingQueue<>(10); // 容量为10的有界队列

        // 生产者线程
        Thread producer = new Thread(() -> {
            try {
                for (int i = 0; i < 20; i++) {
                    System.out.println("Producing: " + i);
                    queue.put(i);  // 插入元素到队列中
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        });

        // 消费者线程
        Thread consumer = new Thread(() -> {
            try {
                for (int i = 0; i < 20; i++) {
                    Integer item = queue.take();  // 从队列中取出元素
                    System.out.println("Consuming: " + item);
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        });

        producer.start();
        consumer.start();

        producer.join();
        consumer.join();
    }
}
```

`LinkedBlockingQueue` 通过以下机制保证线程安全：

1.*独立的锁机制**：使用 `putLock` 和 `takeLock` 分别控制插入和取出操作，防止竞争条件。
2.*条件变量**：通过 `notEmpty` 和 `notFull` 控制队列满和空时的线程等待和唤醒。
3.*FIFO 顺序**：保证元素按照先进先出的顺序插入和取出。

### LinkedTransferQueue

基于链节点的无界传输队列。此队列按照先进先出（FIFO）的顺序对任意给定的生产者的元素进行排序。队列的头部是某个生产者在队列中存留时间最长的元素，而尾部是某个生产者在队列中存留时间最短的元素。

请注意，与大多数集合不同的是，`size` 方法并不是常数时间操作。由于这些队列的异步特性，确定当前元素的数量需要遍历所有元素，因此如果在遍历期间修改了该集合，可能会报告不准确的结果。

添加、移除或检查多个元素的批量操作，例如 `addAll`、`removeIf` 或 `forEach`，并不保证是原子操作。例如，`forEach` 遍历与 `addAll` 操作并发进行时，可能只会观察到部分添加的元素。

此类及其迭代器实现了集合接口和迭代器接口中的所有可选方法。

内存一致性效应：与其他并发集合一样，将对象放入 `LinkedTransferQueue` 的操作之前在线程中的行为发生在另一个线程访问或移除该元素之后的行为之前。

```java
final Object xfer(Object e, long ns) {
    boolean haveData = (e != null);
    Object m;                           // the match or e if none
    DualNode s = null, p;               // enqueued node and its predecessor
    restart: for (DualNode prevp = null;;) {
        DualNode h, t, q;
        if ((h = head) == null &&       // initialize unless immediate
            (ns == 0L ||
                (h = cmpExHead(null, s = new DualNode(e, haveData))) == null)) {
            p = null;                   // no predecessor
            break;                      // else lost init race
        }
        p = (t = tail) != null && t.isData == haveData && t != prevp ? t : h;
        prevp = p;                      // avoid known self-linked tail path
        do {
            m = p.item;
            q = p.next;
            if (p.isData != haveData && haveData != (m != null) &&
                p.cmpExItem(m, e) == m) {
                Thread w = p.waiter;    // matched complementary node
                if (p != h && h == cmpExHead(h, (q == null) ? p : q))
                    h.next = h;         // advance head; self-link old
                LockSupport.unpark(w);
                return m;
            } else if (q == null) {
                if (ns == 0L)           // try to append unless immediate
                    break restart;
                if (s == null)
                    s = new DualNode(e, haveData);
                if ((q = p.cmpExNext(null, s)) == null) {
                    if (p != t)
                        cmpExTail(t, s);
                    break restart;
                }
            }
        } while (p != (p = q));         // restart if self-linked
    }
    if (s == null || ns <= 0L)
        m = e;                          // don't wait
    else if ((m = s.await(e, ns, this,  // spin if at or near head
                            p == null || p.waiter == null)) == e)
        unsplice(p, s);                 // cancelled
    else if (m != null)
        s.selfLinkItem();

    return m;
}
```

cmpExNext、cmpExItem、cmpExHead 都是compareAndExchange，使用CAS实现线程安全。

### PriorityBlockingQueue

一个无界阻塞队列，使用与 `PriorityQueue` 类相同的排序规则，并提供阻塞的检索操作。虽然此队列在逻辑上是无界的，但由于资源耗尽（导致 `OutOfMemoryError`），尝试添加元素可能会失败。此类不允许插入 `null` 元素。依赖于自然顺序的优先级队列也不允许插入不可比较的对象（否则会导致 `ClassCastException`）。

此类及其迭代器实现了集合和迭代器接口中的所有可选方法。`iterator()` 方法提供的迭代器和 `spliterator()` 方法提供的分割迭代器不保证按照任何特定顺序遍历 `PriorityBlockingQueue` 的元素。如果需要有序遍历，可以考虑使用 `Arrays.sort(pq.toArray())`。此外，可以使用 `drainTo` 方法按优先顺序移除某些或所有元素并将它们放入另一个集合。

此类上的操作不保证对具有相同优先级的元素进行排序。如果需要强制执行排序，可以定义自定义类或比较器，使用次要键来打破主要优先级值中的平局。例如，以下是一个对可比较元素应用先进先出的平局处理规则的类。要使用它，可以插入 `FIFOEntry(anEntry)`，而不是普通的条目对象。

```java
class FIFOEntry<E extends Comparable<? super E>>
     implements Comparable<FIFOEntry<E>> {
    static final AtomicLong seq = new AtomicLong();
    final long seqNum;
    final E entry;
    public FIFOEntry(E entry) {
        seqNum = seq.getAndIncrement();
        this.entry = entry;
    }
    public E getEntry() { return entry; }
    public int compareTo(FIFOEntry<E> other) {
        int res = entry.compareTo(other.entry);
        if (res == 0 && other.entry != this.entry)
          res = (seqNum < other.seqNum ? -1 : 1);
        return res;
   }
}
```

```java
public boolean offer(E e) {
    if (e == null)
        throw new NullPointerException();
    final ReentrantLock lock = this.lock;
    lock.lock();
    int n, cap;
    Object[] es;
    while ((n = size) >= (cap = (es = queue).length))
        tryGrow(es, cap);
    try {
        final Comparator<? super E> cmp;
        if ((cmp = comparator) == null)
            siftUpComparable(n, e, es);
        else
            siftUpUsingComparator(n, e, es, cmp);
        size = n + 1;
        notEmpty.signal();
    } finally {
        lock.unlock();
    }
    return true;
}
```

使用ReentrantLock和实现线程安全。
