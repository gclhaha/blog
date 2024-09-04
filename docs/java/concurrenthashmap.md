# 源码分析：ConcurrentHashMap

如果要用并发编程，就要用到ConcurrentHashMap，它是线程安全的HashMap实现。它的实现原理是分段锁，即将整个Map分成N个Segment，每个Segment都是一个小的HashMap，这样在读写时只锁定Segment，而不是整个Map。比使用Hashtable的性能更好，因为Hashtable在读写时锁定整个Map，也比使用Collections.synchronizedMap的性能更好，因为Collections.synchronizedMap只是简单的将操作加上synchronized而已，性能不好。

使用JDK版本：Oracle OpenJDK version 22.0.2

## 类注释

注释内容非常多，但是对于总体的了解很有用处，直接贴出原文。

### **1. 翻译**

ConcurrentHashMap 是一个支持高并发检索和更新操作的哈希表。它遵循与 Hashtable 相同的功能规范，并包含与 Hashtable 中每个方法相对应的方法版本。尽管所有操作都是线程安全的，但检索操作不涉及锁定，并且不支持以任何方式锁定整个表以阻止所有访问。在依赖于线程安全但不是同步细节的程序中，此类与 Hashtable 完全互操作。

检索操作（包括 get）通常不会阻塞，因此可能与更新操作（包括 put 和 remove）重叠。检索反映了在其开始时持有的最新完成的更新操作的结果。（更正式地说，给定键的更新操作与报告更新值的任何（非空）检索具有 happens-before 关系。）对于诸如 putAll 和 clear 之类的聚合操作，并发检索可能仅反映某些条目的插入或删除。类似地，迭代器、拆分器和枚举返回反映哈希表在迭代器/枚举创建时或之后某个时间点的状态的元素。它们不会抛出 ConcurrentModificationException。但是，迭代器被设计为一次只能被一个线程使用。请记住，包括 size、isEmpty 和 containsValue 在内的聚合状态方法的结果通常仅在映射不在其他线程中经历并发更新时才有效。否则，这些方法的结果会反映瞬态状态，这些状态可能足以用于监视或估计目的，但不适用于程序控制。

当存在太多冲突（即具有不同哈希码但落入相同槽位模表大小的键）时，表会动态扩展，预期平均效果是每个映射保持大约两个桶（对应于 0.75 的负载因子阈值用于调整大小）。随着映射的添加和删除，这种平均值可能会有很大差异，但总体而言，这保持了哈希表普遍接受的时间/空间权衡。但是，调整此哈希表或任何其他类型的大小可能是一个相对缓慢的操作。如果可能，最好提供大小估计作为可选的 initialCapacity 构造函数参数。一个额外的可选 loadFactor 构造函数参数提供了一种进一步自定义初始表容量的方法，方法是指定用于计算为给定元素数量分配的空间量的表密度。此外，为了与该类的先前版本兼容，构造函数可以选择性地指定预期的 concurrencyLevel 作为内部大小调整的额外提示。请注意，使用具有完全相同 hashCode() 的许多键无疑会降低任何哈希表的性能。为了减轻影响，当键是 Comparable 时，此类可以使用键之间的比较顺序来帮助打破联系。

可以创建 ConcurrentHashMap 的 Set 投影（使用 newKeySet() 或 newKeySet(int)），或者查看它（当仅对键感兴趣时，使用 keySet(Object)，而映射的值（可能暂时地）未使用或都采用相同的映射值）。

通过使用 java.util.concurrent.atomic.LongAdder 值并通过 computeIfAbsent 初始化，ConcurrentHashMap 可以用作可扩展的频率映射（一种直方图或多重集）。例如，要向 ConcurrentHashMap<String,LongAdder> freqs 添加计数，您可以使用 freqs.computeIfAbsent(key, k -> new LongAdder()).increment()；

此类及其视图和迭代器实现 Map 和 Iterator 接口的所有可选方法。

与 Hashtable 不同，但与 HashMap 不同，此类不允许将 null 用作键或值。

ConcurrentHashMap 支持一组顺序和并行批量操作，与大多数 Stream 方法不同，这些操作被设计为即使在由其他线程并发更新的映射中也能安全且通常明智地应用；例如，在计算共享注册表中值的快照摘要时。有三种类型的操作，每种操作都有四种形式，接受带有键、值、条目和（键，值）对作为参数和/或返回值的函数。由于 ConcurrentHashMap 的元素没有以任何特定方式排序，并且可以在不同的并行执行中按不同的顺序处理，因此提供的函数的正确性不应依赖于任何排序，也不应依赖于在计算过程中可能瞬时更改的任何其他对象或值；并且除了 forEach 操作之外，理想情况下应该是无副作用的。对 Map.Entry 对象的批量操作不支持方法 setValue。

forEach：对每个元素执行给定操作。一种变体形式在执行操作之前对每个元素应用给定转换。

search：返回在每个元素上应用给定函数后第一个可用的非空结果；当找到结果时跳过进一步搜索。

reduce：累积每个元素。提供的减少函数不能依赖于排序（更正式地说，它应该既是关联的又是可交换的）。有五种变体：

* 简单减少。（由于没有相应的返回类型，因此没有此方法的（键，值）函数参数形式。）
* 映射减少，它累积应用于每个元素的给定函数的结果。
* 使用给定基值减少为标量双精度、长整型和整型。

这些批量操作接受 parallelismThreshold 参数。如果当前映射大小估计小于给定阈值，则方法将按顺序进行。使用 Long.MAX_VALUE 的值会抑制所有并行化。使用 1 的值会导致通过将任务划分为足够多的子任务来实现最大程度的并行化，以充分利用用于所有并行计算的 ForkJoinPool.commonPool()。通常，您会首先选择其中一个极值，然后测量使用介于两者之间的值的性能，这些值会权衡开销与吞吐量。

批量操作的并发属性遵循 ConcurrentHashMap 的并发属性：从 get(key) 和相关访问方法返回的任何非空结果与相关的插入或更新具有 happens-before 关系。任何批量操作的结果反映了这些逐元素关系的组合（但除非以某种方式知道映射是静止的，否则不一定相对于整个映射是原子的）。相反，因为映射中的键和值永远不会为 null，所以 null 用作当前缺乏任何结果的可靠原子指示符。为了保持此属性，null 作为所有非标量减少操作的隐式基础。对于 double、long 和 int 版本，基础应该是这样一种基础，当与任何其他值组合时，会返回该其他值（更正式地说，它应该是减少的单位元）。大多数常见的减少具有这些属性；例如，使用基值 0 计算总和或使用基值 MAX_VALUE 计算最小值。

作为参数提供的搜索和转换函数应类似地返回 null 以指示缺少任何结果（在这种情况下，它不会被使用）。在映射减少的情况下，这也使转换能够充当过滤器，如果元素不应被组合，则返回 null（或在原始类型专业化的情况下，返回标识基础）。您可以通过在搜索或减少操作中使用它们之前根据此“null 表示现在没有东西在那里”规则自己组合它们来创建复合转换和过滤。

接受和/或返回 Entry 参数的方法维护键值关联。例如，当查找最大值的键时，它们可能很有用。请注意，“简单”Entry 参数可以使用 new AbstractMap.SimpleEntry(k,v) 提供。

批量操作可能突然完成，抛出在应用提供的函数时遇到的异常。在处理此类异常时请记住，其他并发执行的函数也可能已经抛出异常，或者如果第一个异常没有发生，它们也会抛出异常。

与顺序形式相比，并行形式的加速是常见的，但不能保证。如果对小型映射进行简短函数的并行操作，则如果并行化计算的底层工作比计算本身更昂贵，则可能比顺序形式执行得更慢。类似地，如果所有处理器都忙于执行无关的任务，则并行化可能不会导致太多实际的并行化。

所有任务方法的所有参数都必须是非空的。

此类是 Java 集合框架的成员。

### **2. 重点**

* **高并发：** 支持高并发检索和更新操作，检索操作不涉及锁，更新操作在不影响检索的情况下进行。
* **线程安全：** 所有操作都线程安全，保证数据一致性。
* **动态扩展：** 当发生冲突时，表会动态扩展以保持效率。
* **批量操作：** 支持一组顺序和并行批量操作，允许在并发更新的情况下进行安全高效的处理。
* **性能优化：** 提供多种参数来控制表大小、负载因子等，以优化性能。
* **不接受 null 值：** 键和值均不能为 null。
* **与 Hashtable 兼容：** 与 Hashtable 功能兼容，但在同步细节方面有所区别。

## 概览注释

在类注释下放，刚进入类中，就又有一大段注释，Overview。读就完了，其针对类注释做了更详细的补充，直接贴出翻译后的内容。

这个哈希表的**主要设计目标**是**维护并发可读性**（通常是`get()`方法，但也包括迭代器和相关方法），**同时最大限度地减少更新操作的竞争**。**次要目标**是保持与`java.util.HashMap`相同的或更低的内存占用，并支持多个线程在空表上进行高效的初始插入操作。

这个映射通常用作**带桶的哈希表**。每个键值映射都存储在一个`Node`对象中。大多数节点是基本`Node`类的实例，包含**哈希值、键、值和下一个节点的指针**。但是，也存在一些子类：`TreeNode`以平衡树形式组织，而不是链表。`TreeBin`包含`TreeNode`集合的根节点。`ForwardingNode`在调整大小过程中放置在桶的头部。`ReservationNode`用作`computeIfAbsent`等方法在建立值时的占位符。`TreeBin`、`ForwardingNode`和`ReservationNode`不存储普通的用户键、值或哈希值，它们在搜索等操作中很容易识别，因为它们的哈希值字段为负数，键和值字段为`null`。（这些特殊节点要么不常见，要么是短暂的，因此携带一些未使用字段的影响可以忽略不计。）

表在第一次插入时懒惰地初始化为2的幂次方的尺寸。表中的每个桶通常包含一个`Node`链表（大多数情况下，链表只有0个或1个`Node`）。表访问需要使用volatile/原子读、写和CAS操作。由于没有其他方法能够避免额外的间接寻址，我们使用内部函数（`jdk.internal.misc.Unsafe`）操作。

我们使用`Node`哈希字段的**最高位（符号位）**用于控制目的，因为由于地址限制，该位本来就可用。哈希值为负数的节点在映射方法中会进行特殊处理或忽略。

在空桶中插入第一个节点（通过`put`或其变体）可以通过简单的CAS操作完成。在大多数键/哈希分布情况下，这是`put`操作最常见的用例。其他更新操作（插入、删除和替换）需要锁。我们不希望浪费空间将一个独立的锁对象与每个桶关联，因此使用桶链表的第一个节点作为锁。这些锁的锁定支持依赖于内置的“synchronized”监视器。

使用链表的第一个节点作为锁本身并不够：当一个节点被锁定后，任何更新操作都必须首先验证它在锁定后仍然是第一个节点，如果不是，则重试。由于新节点总是被追加到链表末尾，因此一旦一个节点成为桶中的第一个节点，它就会一直保持第一个，直到被删除或桶在调整大小后失效。

每个桶锁的主要缺点是，对同一个锁保护的桶链表中其他节点的更新操作可能会阻塞，例如当用户`equals()`或映射函数需要很长时间执行时。然而，从统计学上讲，在随机哈希码的情况下，这不是一个常见的问题。理想情况下，桶中节点的频率遵循泊松分布（http://en.wikipedia.org/wiki/Poisson_distribution），在平均情况下参数约为0.5，考虑到0.75的调整大小阈值，尽管由于调整大小粒度而存在很大的方差。忽略方差，列表大小为k的预期出现次数为（exp(-0.5) pow(0.5, k) / factorial(k)）。前几个值为：

- 0: 0.60653066
- 1: 0.30326533
- 2: 0.07581633
- 3: 0.01263606
- 4: 0.00157952
- 5: 0.00015795
- 6: 0.00001316
- 7: 0.00000094
- 8: 0.00000006
- 更多：百万分之一以下

两个线程访问不同元素的锁冲突概率在随机哈希码下大约为1 / (8 * #元素)。

在实际应用中遇到的哈希码分布有时会显著偏离均匀随机分布。这包括N > (1<<30)的情况，因此一些键必须发生冲突。类似地，对于将多个键设计为具有相同哈希码或仅在屏蔽的最高位不同的哈希码的愚蠢或恶意使用情况。因此，我们使用一种辅助策略，当桶中的节点数量超过阈值时应用该策略。这些`TreeBin`使用平衡树来存储节点（一种特殊的红黑树），将搜索时间限制在O(log N)。`TreeBin`中的每个搜索步骤至少是普通链表中搜索步骤的两倍慢，但考虑到N不能超过(1<<64)（在用完地址之前），这将搜索步骤、锁持有时间等限制在合理的常数范围内（最坏情况下约检查100个节点），只要键是可比较的（这非常常见--String、Long等）。`TreeBin`节点（`TreeNode`）也维护与普通节点相同的“next”遍历指针，因此可以像普通节点一样在迭代器中进行遍历。

当占用率超过某个百分比阈值（名义上为0.75，但见下文）时，表将被调整大小。任何注意到桶已满的线程都可以在启动线程分配并设置替换数组后协助调整大小。但是，这些其他线程可以继续插入等操作，而不是阻塞。使用`TreeBin`可以保护我们在调整大小过程中出现过满的最坏情况影响。调整大小通过将桶逐个从旧表转移到新表进行。但是，线程在执行此操作之前，会声明要转移的索引的小块（通过`transferIndex`字段），从而减少了竞争。`sizeCtl`字段中的一个代号确保调整大小不会重叠。因为我们使用2的幂次方扩展，所以每个桶中的元素要么保持在相同的索引处，要么移动一个2的幂次方偏移量。我们通过捕获可以重用旧节点的情况来消除不必要的节点创建，因为它们的`next`字段不会改变。平均而言，当表翻倍时，只有大约六分之一的节点需要克隆。它们替换的节点将在不再被任何可能正在并发遍历表的读者线程引用的那一刻成为垃圾可回收的。在转移后，旧表桶仅包含一个特殊的转发节点（哈希字段为“MOVED”），其键包含新表。在遇到转发节点时，访问和更新操作将使用新表重新开始。

每次桶转移都需要其桶锁，这可能会在调整大小过程中等待锁而阻塞。但是，由于其他线程可以加入并帮助调整大小而不是争抢锁，因此随着调整大小的进行，平均总等待时间会变短。转移操作还必须确保旧表和新表中所有可访问的桶都可以被任何遍历使用。这是部分通过从最后一个桶（`table.length - 1`）向上遍历到第一个桶来实现的。在看到转发节点时，遍历（见`Traverser`类）会安排移动到新表而不重新访问节点。为了确保即使节点被无序移动也不跳过任何中间节点，在遍历过程中第一次遇到转发节点时会创建一个栈（见`TableStack`类），以在稍后处理当前表时保留其位置。这些保存/恢复机制的必要性相对较少，但如果遇到一个转发节点，通常还会遇到更多。因此，`Traverser`使用简单的缓存机制来避免创建太多新的`TableStack`节点。（感谢 Peter Levart 建议在这里使用栈。）

遍历方案也适用于桶范围的局部遍历（通过`Traverser`的另一个构造函数），以支持分区的聚合操作。此外，只读操作在被转发到空表时会放弃，这为支持关闭式清除提供了支持，但这目前尚未实现。

懒惰表初始化可以最大限度地减少使用前的内存占用，并且还避免在第一次操作来自`putAll`、带映射参数的构造函数或反序列化时进行调整大小。这些情况试图覆盖初始容量设置，但在出现竞争的情况下，不会产生任何负面影响。

元素计数使用`LongAdder`的专用版本维护。我们需要包含一个专用版本，而不是直接使用`LongAdder`，以便访问隐式的竞争感知，这会导致创建多个`CounterCell`。计数器机制避免了更新操作的竞争，但如果在并发访问期间过于频繁地读取，可能会遇到缓存抖动。为了避免过于频繁地读取，只有在向一个已经包含两个或多个节点的桶添加元素时，才会尝试在竞争条件下调整大小。在均匀哈希分布下，这在阈值处发生的概率约为13%，这意味着只有大约八分之一的`put`操作会检查阈值（在调整大小后，只有更少的操作会检查）。

`TreeBin`使用特殊形式的比较进行搜索和相关操作（这也是我们无法使用现有集合（如`TreeMap`）的主要原因）。`TreeBin`包含可比较元素，但也可能包含其他元素，以及可比较但可能不适用于相同`T`的可比较元素，因此我们不能在它们之间调用`compareTo`。为了处理这种情况，树主要按哈希值排序，然后按`Comparable.compareTo`排序（如果适用）。在节点上的查找操作中，如果元素不可比较或比较结果为0，那么如果哈希值相等，则可能需要搜索左右两个子节点。（这对应于如果所有元素都是不可比较的并且哈希值相等，则需要进行的完整链表搜索。）在插入操作中，为了保持在重新平衡操作中的总排序（或尽可能接近于此），我们将类和`identityHashCodes`作为比较结果相同的元素的断路器。红黑平衡代码从预先存在的 JDK 集合（ http://gee.cs.oswego.edu/dl/classes/collections/RBCell.java ）更新，该代码 wiederum 基于 Cormen、Leiserson 和 Rivest 的“算法导论”（CLR）。

`TreeBin`还需要额外的锁定机制。虽然即使在更新过程中，读者也始终可以通过链表进行遍历，但树遍历则不行，这主要是因为树旋转可能会改变根节点及其链接。`TreeBin`包含一个简单的读写锁机制，寄生于主桶同步策略：与插入或删除相关的结构调整已经使用桶锁（因此不会与其他写入操作冲突），但必须等待正在进行的读取操作完成。由于只有一个这样的等待者，我们使用一个简单的方案，使用一个“waiter”字段来阻塞写入者。但是，读者永远不需要阻塞。如果根锁被持有，他们会沿着慢速遍历路径（通过`next`指针）继续，直到锁可用或链表耗尽，以先发生的为准。这些情况并不快，但最大限度地提高了聚合预期吞吐量。

维持与该类的先前版本的 API 和序列化兼容性引入了几个怪癖。主要是：

- 我们保留了但未使用与并发级别相关的构造函数参数。
- 我们接受了一个`loadFactor`构造函数参数，但只将其应用于初始表容量（这是我们唯一可以保证满足该参数的时候）。
- 我们还声明了一个未使用的“Segment”类，该类仅在序列化时以最小形式实例化。

此外，仅仅为了与该类的先前版本兼容，它扩展了`AbstractMap`，即使它的所有方法都被重写了，所以它只是一个无用的负担。

该文件经过组织，使得阅读比其他方式更容易：首先是主要的静态声明和实用程序，然后是字段，然后是主要的公共方法（将多个公共方法分解成内部方法），然后是调整大小方法、树、遍历器和批量操作。

## 重要方法

### spread

先看注释

散列值(XOR)将高位散列值向低位散列值扩展，并将最高位强制为 0。由于该表使用二进制掩码，因此仅在当前掩码之上的位发生变化的散列值集合将始终发生冲突。(已知的例子包括小表中的连续整数组成的 Float键集合。)因此，我们应用一种将高位散列值的影响向下扩展的转换。在速度、实用性和位扩展的质量之间存在权衡。由于许多常见的散列值集合已经合理分布(因此无法从扩展中受益)，并且由于我们使用树来处理桶中的大量冲突，因此我们只是以最便宜的方式对某些移位位进行 XOR运算，以减少系统性损失，以及将最高位的影响纳入考虑范围，否则由于表边界，这些最高位永远不会在索引计算中使用。

```java
static final int spread(int h) {
    // HASH_BITS 为 0x7fffffff int的最大值
    return (h ^ (h >>> 16)) & HASH_BITS;
}
```

### get

```java
public V get(Object key) {
    Node<K,V>[] tab; Node<K,V> e, p; int n, eh; K ek;
    int h = spread(key.hashCode());
    if ((tab = table) != null && (n = tab.length) > 0 &&
        (e = tabAt(tab, (n - 1) & h)) != null) {
        if ((eh = e.hash) == h) {
            if ((ek = e.key) == key || (ek != null && key.equals(ek)))
                return e.val;
        }
        else if (eh < 0)
            return (p = e.find(h, key)) != null ? p.val : null;
        while ((e = e.next) != null) {
            if (e.hash == h &&
                ((ek = e.key) == key || (ek != null && key.equals(ek))))
                return e.val;
        }
    }
    return null;
}
```

### put

```java
public V put(K key, V value) {
    return putVal(key, value, false);
}

final V putVal(K key, V value, boolean onlyIfAbsent) {
    // 如果 key 或 value 为 null，则抛出空指针异常
    if (key == null || value == null) throw new NullPointerException();
    
    // 计算 key 的哈希值并进行哈希扰动
    int hash = spread(key.hashCode());
    int binCount = 0;
    
    // 无限循环，用于查找或插入节点
    for (Node<K,V>[] tab = table;;) {
        Node<K,V> f; int n, i, fh; K fk; V fv;
        
        // 如果哈希表为空或大小为 0，则初始化哈希表
        if (tab == null || (n = tab.length) == 0)
            tab = initTable();
        // 如果目标槽位为空，则尝试将新节点放入该槽位
        else if ((f = tabAt(tab, i = (n - 1) & hash)) == null) {
            if (casTabAt(tab, i, null, new Node<K,V>(hash, key, value)))
                break;  // 在没有锁的情况下成功添加到空槽位，跳出循环
        }
        // 如果发现槽位正在转移，则帮助转移
        else if ((fh = f.hash) == MOVED)
            tab = helpTransfer(tab, f);
        // 如果槽位上已有节点且满足条件，则返回已有的值（onlyIfAbsent 为 true 时不覆盖旧值）
        else if (onlyIfAbsent 
                    && fh == hash
                    && ((fk = f.key) == key || (fk != null && key.equals(fk)))
                    && (fv = f.val) != null)
            return fv;
        else {
            V oldVal = null;
            synchronized (f) {
                // 对槽位上的节点进行同步操作
                if (tabAt(tab, i) == f) {
                    // 如果槽位上的节点是链表节点
                    if (fh >= 0) {
                        binCount = 1;
                        for (Node<K,V> e = f;; ++binCount) {
                            K ek;
                            // 如果找到相同哈希值和键的节点，则更新其值
                            if (e.hash == hash &&
                                ((ek = e.key) == key ||
                                    (ek != null && key.equals(ek)))) {
                                oldVal = e.val;
                                if (!onlyIfAbsent)
                                    e.val = value;
                                break;
                            }
                            // 否则继续遍历链表，直到链表末端，插入新节点
                            Node<K,V> pred = e;
                            if ((e = e.next) == null) {
                                pred.next = new Node<K,V>(hash, key, value);
                                break;
                            }
                        }
                    }
                    // 如果槽位上的节点是红黑树节点
                    else if (f instanceof TreeBin) {
                        Node<K,V> p;
                        binCount = 2;
                        // 插入红黑树并返回旧值
                        if ((p = ((TreeBin<K,V>)f).putTreeVal(hash, key,
                                                        value)) != null) {
                            oldVal = p.val;
                            if (!onlyIfAbsent)
                                p.val = value;
                        }
                    }
                    // 如果槽位上的节点是保留节点，则抛出异常
                    else if (f instanceof ReservationNode)
                        throw new IllegalStateException("Recursive update");
                }
            }
            // 如果插入的节点数达到 TREEIFY_THRESHOLD 则转换为红黑树
            if (binCount != 0) {
                if (binCount >= TREEIFY_THRESHOLD)
                    treeifyBin(tab, i);
                if (oldVal != null)
                    return oldVal;
                break;
            }
        }
    }
    // 增加哈希表的元素计数并检查是否需要扩容
    addCount(1L, binCount);
    return null;
}

private final void addCount(long x, int check) {
    CounterCell[] cs; long b, s;
    
    // 尝试直接更新 baseCount，如果失败或存在 counterCells，则使用分段计数
    if ((cs = counterCells) != null ||
        !U.compareAndSetLong(this, BASECOUNT, b = baseCount, s = b + x)) {
        
        CounterCell c; long v; int m;
        boolean uncontended = true;
        
        // 如果 counterCells 不存在或未找到对应的槽位，或者 CAS 操作失败，则使用 fullAddCount 处理
        if (cs == null || (m = cs.length - 1) < 0 ||
            (c = cs[ThreadLocalRandom.getProbe() & m]) == null ||
            !(uncontended =
              U.compareAndSetLong(c, CELLVALUE, v = c.value, v + x))) {
            fullAddCount(x, uncontended);
            return;
        }
        
        // 如果 check 小于等于 1，则直接返回
        if (check <= 1)
            return;
        
        // 计算当前的总计数
        s = sumCount();
    }
    
    // 如果 check 大于等于 0，且总计数达到或超过扩容阈值，则进行扩容检查
    if (check >= 0) {
        Node<K,V>[] tab, nt; int n, sc;
        
        // 如果当前容量小于最大容量且总计数超出阈值，开始扩容
        while (s >= (long)(sc = sizeCtl) && (tab = table) != null &&
               (n = tab.length) < MAXIMUM_CAPACITY) {
            
            // 获取扩容戳记
            int rs = resizeStamp(n) << RESIZE_STAMP_SHIFT;
            
            // 如果已经在扩容中，或无法扩容，则退出循环
            if (sc < 0) {
                if (sc == rs + MAX_RESIZERS || sc == rs + 1 ||
                    (nt = nextTable) == null || transferIndex <= 0)
                    break;
                
                // 否则，增加正在扩容的线程数，并继续扩容
                if (U.compareAndSetInt(this, SIZECTL, sc, sc + 1))
                    transfer(tab, nt);
            }
            // 如果不在扩容中，则启动扩容
            else if (U.compareAndSetInt(this, SIZECTL, sc, rs + 2))
                transfer(tab, null);
            
            // 更新总计数
            s = sumCount();
        }
    }
}
    
```

流程总结

1. 检查参数：首先检查传入的 key 和 value 是否为空，如果为空则抛出 NullPointerException。
2. 计算哈希值：对 key 的哈希值进行扰动，以减少哈希冲突。
3. 初始化或获取表：检查哈希表是否为空，若为空则进行初始化；否则根据哈希值找到对应槽位。
4. 插入节点：
    • 如果槽位为空，直接尝试插入节点（无锁）。
    • 如果槽位正在扩容，则参与扩容。
    • 如果槽位上已有节点，判断是否要替换节点的值，或者将新节点插入到链表或红黑树中。
5. 转换链表为红黑树：如果链表中的节点数超过阈值（TREEIFY_THRESHOLD），则将链表转换为红黑树。
6. 更新计数：成功插入节点后，更新哈希表的元素计数，并检查是否需要扩容。
7. 返回旧值或 null：如果插入前已有相同 key 的节点，则返回旧值；否则返回 null。
