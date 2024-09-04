# 源码分析：HashMap

HashMap是Java中，在没有并发的情况下最常用的非线性数据结构。

使用JDK版本：Oracle OpenJDK version 22.0.2

## hash 方法

先看注释

计算 key.hashCode() 并将哈希的较高位展开(异或)到较低位。由于该表使用二进制掩码，仅在当前掩码之上的位发生变化的哈希集合将始终发生冲突。(已知的例子包括小表中的连续整数的 Float 键集合。)因此，我们应用一种将较高位的影响向下传播的处理方式。在速度、实用性和位传播的质量之间存在权衡。由于许多常见的哈希集合已经合理分布(因此不会从传播中受益)，并且由于我们使用树来处理桶中的大量冲突，我们只是以最便宜的方式异或一些移位位，以减少系统性的损失，以及纳入最高位的影响，否则由于表边界，这些最高位永远不会在索引计算中使用。

```java
static final int hash(Object key) {
    int h;
    return (key == null) ? 0 : (h = key.hashCode()) ^ (h >>> 16);
}
```

简单来说，就是将高16位的值，通过异或运算，传播到低16位中。

## put 方法

```java
public V put(K key, V value) {
    return putVal(hash(key), key, value, false, true);
}
```

```java
/**
 * 实现 HashMap 中的 put 操作。此方法将键值对插入到哈希表中，
 * 处理哈希冲突，必要时调整表的大小，并返回旧值（如果键已存在），
 * 如果是新插入的键则返回 null。
 */
final V putVal(int hash, K key, V value, boolean onlyIfAbsent, boolean evict) {
    // 局部变量 tab 用来引用哈希表
    Node<K,V>[] tab; 
    // 局部变量 p 用来存储特定索引位置的节点
    Node<K,V> p;     
    // n 用来存储表的大小，i 用来存储在表中的索引位置
    int n, i;        

    // 如果表未初始化或大小为 0，则调用 resize 方法初始化或扩展表的大小
    if ((tab = table) == null || (n = tab.length) == 0)
        n = (tab = resize()).length;

    // 计算索引位置 (n - 1) & hash，并检查该位置是否为空
    if ((p = tab[i = (n - 1) & hash]) == null)
        // 如果为空，在该位置创建一个新的节点
        tab[i] = newNode(hash, key, value, null);
    else {
        // e 用来存储已存在的节点（如果找到）
        Node<K,V> e; 
        // k 用来存储已存在节点的键
        K k;         

        // 如果在计算出的索引位置已经存在键（链表的第一个节点）
        if (p.hash == hash &&
            ((k = p.key) == key || (key != null && key.equals(k))))
            e = p;
        // 如果节点类型是 TreeNode（树节点），在树中插入键值对
        else if (p instanceof TreeNode)
            e = ((TreeNode<K,V>)p).putTreeVal(this, tab, hash, key, value);
        else {
            // 否则通过链表遍历处理冲突，遍历链表直到找到匹配的键或到达链表末尾
            for (int binCount = 0; ; ++binCount) {
                // 如果到达链表末尾还未找到匹配的键，插入新节点
                if ((e = p.next) == null) {
                    p.next = newNode(hash, key, value, null);
                    // 如果链表长度超过 TREEIFY_THRESHOLD - 1，将链表转换为红黑树
                    if (binCount >= TREEIFY_THRESHOLD - 1)
                        treeifyBin(tab, hash);
                    break;
                }
                // 如果找到匹配的键，跳出循环
                if (e.hash == hash &&
                    ((k = e.key) == key || (key != null && key.equals(k))))
                    break;
                p = e;
            }
        }
        // 如果找到已有的键值对，则更新值并返回旧值
        if (e != null) {
            V oldValue = e.value;
            if (!onlyIfAbsent || oldValue == null)
                e.value = value;
            afterNodeAccess(e);
            return oldValue;
        }
    }
    // 增加修改计数器
    ++modCount;
    // 增加 HashMap 的大小，如果超过阈值，则调用 resize 扩展哈希表
    if (++size > threshold)
        resize();
    afterNodeInsertion(evict);
    return null;
}
```

整体流程解释

1.哈希表的初始化或扩展：
    •如果哈希表尚未初始化或其大小为0，则通过 resize() 方法进行初始化或扩展。

2.计算索引位置：
    •使用 (n - 1) & hash 计算插入位置的索引 i，并根据哈希表的长度 n 和给定的哈希值确定插入位置。

3.处理哈希冲突：
    •如果计算出的索引位置为空，直接在该位置插入新节点。
    •如果该位置已经存在节点，则判断：
    •若存在相同的键，更新对应的值。
    •若为树节点（红黑树），在树中进行插入。
    •若为链表，遍历链表处理冲突，如果链表过长，将其转换为红黑树。

4.更新哈希表结构：
    •如果插入新节点导致哈希表大小超过阈值 threshold，则进行扩容。
    •更新修改计数器 modCount，用于并发修改检测。
    •根据情况调用 afterNodeAccess(e) 和 afterNodeInsertion(evict)，这些方法通常用于子类的特殊处理。

5.返回结果：
    •如果是新插入的键，返回 null。
    •如果是更新现有的键，返回旧值。

## get 方法

先看注释

返回指定密钥映射到的值，如果此映射不包含密钥映照，则返回null。
更正式地说，如果此映射包含从键k到值v的映射，使得(key==null? k==null:keyequals(k))，则此方法返回v;否则返回 null。(最多可以有这样一个映射。)
返回值为 null 不一定表示映射中不包含键的映射;也有可能映射将键显式映射为 null。可以使用 containsKey 操作来区分这两种情况。

其中有个面试会问到的点，就是HashMap是允许key和value为null的，但是key只能有一个为null，value可以有多个为null。

```java
public V get(Object key) {
    Node<K,V> e;
    return (e = getNode(hash(key), key)) == null ? null : e.value;
}
```

```java
/**
 * 根据给定的键获取哈希表中的节点。
 * 如果找到对应的键，则返回该键对应的节点，否则返回 null。
 */
final Node<K,V> getNode(Object key) {
    // 定义变量 tab 表示哈希表，first 表示桶中的第一个节点，e 表示当前遍历的节点，n 表示表的长度，hash 表示键的哈希值，k 表示当前节点的键
    Node<K,V>[] tab; 
    Node<K,V> first, e; 
    int n, hash; 
    K k;

    // 判断哈希表是否初始化且长度大于 0，并且检查键对应的桶是否为空
    if ((tab = table) != null && (n = tab.length) > 0 &&
        // 计算哈希值并定位到对应桶中的第一个节点
        (first = tab[(n - 1) & (hash = hash(key))]) != null) {
        
        // 如果第一个节点的哈希值匹配并且键相等，直接返回该节点
        if (first.hash == hash && 
            ((k = first.key) == key || (key != null && key.equals(k))))
            return first;

        // 如果桶中的第一个节点有后续节点，则继续查找
        if ((e = first.next) != null) {
            // 如果第一个节点是树节点，则调用树的查找方法
            if (first instanceof TreeNode)
                return ((TreeNode<K,V>)first).getTreeNode(hash, key);
            
            // 否则，遍历链表查找匹配的键
            do {
                // 如果找到匹配的键，返回对应的节点
                if (e.hash == hash &&
                    ((k = e.key) == key || (key != null && key.equals(k))))
                    return e;
            } while ((e = e.next) != null); // 继续遍历下一个节点
        }
    }
    // 如果未找到匹配的键，返回 null
    return null;
}
```

1. 哈希表的初始化和桶查找：
    •首先检查哈希表 table 是否已初始化，并且其长度 n 是否大于 0。
    •如果哈希表尚未初始化或其长度为 0，则直接返回 null，表示未找到节点。
    •如果哈希表已初始化且长度大于 0，继续执行以下步骤。

2. 计算索引位置：

    •通过 (n - 1) & hash 计算键对应的索引位置 i。这里的 n 是哈希表的长度，hash 是通过 hash(key) 计算得到的键的哈希值。
    •根据计算出的索引位置 i，获取桶中的第一个节点 first。

3. 检查第一个节点：

    •检查 first 是否为 null。
    •如果 first 不为 null，继续检查其哈希值 hash 和键 key 是否与查询的键匹配。
    •如果匹配，直接返回 first 节点，表示查找成功。

4. 遍历链表或查找红黑树：

    •如果 first 节点不匹配，并且其后续节点 next 不为 null，说明该位置存在冲突，需进一步处理。
    •检查 first 是否为 TreeNode 类型。
    •如果是 TreeNode 类型，表示此位置已经是红黑树结构，调用 getTreeNode 方法在树中查找。
    •如果不是 TreeNode，则表示此位置为链表结构，遍历链表中的每一个节点：
    •对于每个节点，检查其哈希值 hash 和键 key 是否与查询的键匹配。
    •如果找到匹配的节点，立即返回该节点。

5. 返回结果：

    •如果遍历或树查找未找到匹配的节点，返回 null，表示查找失败。
    •如果找到匹配的节点，在对应的步骤中已返回该节点。

## 重要结构 Node

面试题上都说，HashMap底层是数组加链表，其中**table**属性是一个**Node**数组，**Node**是一个静态内部类，它是HashMap的基本存储单元。源码如下

```java
static class Node<K,V> implements Map.Entry<K,V> {
    final int hash;
    final K key;
    V value;
    Node<K,V> next;

    Node(int hash, K key, V value, Node<K,V> next) {
        this.hash = hash;
        this.key = key;
        this.value = value;
        this.next = next;
    }

    public final K getKey()        { return key; }
    public final V getValue()      { return value; }
    public final String toString() { return key + "=" + value; }

    public final int hashCode() {
        return Objects.hashCode(key) ^ Objects.hashCode(value);
    }

    public final V setValue(V newValue) {
        V oldValue = value;
        value = newValue;
        return oldValue;
    }

    public final boolean equals(Object o) {
        if (o == this)
            return true;

        return o instanceof Map.Entry<?, ?> e
                && Objects.equals(key, e.getKey())
                && Objects.equals(value, e.getValue());
    }
}
```

可以看出，Node是一个单向链表，它包含了key、value、hash和next属性。其中，key和value是Map.Entry接口的实现，hash是key的hashCode()方法的返回值，next是下一个Node节点的引用。

## 重要结构 TreeNode

当链表长度超过阈值 TREEIFY_THRESHOLD 时（默认为8），链表会转换为红黑树。红黑树的实现是 TreeNode 类，它是 Node 类的子类。源码如下

```java
static final class TreeNode<K,V> extends LinkedHashMap.Entry<K,V> {
        TreeNode<K,V> parent;  // red-black tree links
        TreeNode<K,V> left;
        TreeNode<K,V> right;
        TreeNode<K,V> prev;    // needed to unlink next upon deletion
        boolean red;
        //... 省略部分代码，其中是红黑树的实现，Node和TreeNode的转换
}
```

只列出了属性，**parent**用于红黑树结构，**prev**用于链表结构。即使变成树，在恢复链表的时候需要使用，所以也要维护。

## 使用注意事项

1. **HashMap**是非线程安全的，如果需要在多线程环境下使用，可以使用 **ConcurrentHashMap**或者通过**Collections.synchronizedMap**方法创建线程安全的 **HashMap**。实现原理很粗暴，就是在方法上加synchronized。
2. **HashMap**的默认初始容量为16，负载因子为0.75，即当哈希表中的元素个数超过容量的75%时，会进行扩容。在知道所需容量的情况下，可以通过构造函数指定初始容量。
