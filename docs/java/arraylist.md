# 源码分析：ArrayList

ArrayList 是 Java 中的一个动态数组，它提供了一种动态的方式来存储元素，与数组相比，它的容量可以动态增长。可以说是 Java 中最常用的有序集合。

使用JDK版本：Oracle OpenJDK version 22.0.2

## 重要内容

### 类说明

List接口的可变数组实现。实现所有可选的列表操作，并允许包括 null 在内的所有元素。除了实现 List 接口外，该类还提供了用于操作用于存储列表的内部数组大小的方法。(该类大致相当于 Vector，只是它不是同步的。)

size、isEmpty、get、set、iterator 和 listlterator 操作的时间复杂度为常数。add 操作的时间复杂度为平均常数，即添加n个元素需要0(n)的时间。所有其他操作的时间复杂度为线性时间(粗略地说)。与 LinkedList 实现相比，常数因子较低。每个ArrayList实例都有一个容量。容量是用于存储列表中元素的数组的大小。总是至少等于列表的大小。当向ArrayList添加元素时，其容量会自动增长。增长策略的细节没有规定，只知道添加一个元素具有恒定的摊销时间成本。

应用程序可以在使用确保Capacity操作添加大量元素之前增加ArrayList实例的容量。这可能会减少增量重新分配的数量。

请注意，此实现不是同步的。如果多个线程并发访问ArrayList实例，并且至少一个线程对列表进行结构化修改，则必须在外部进行同步。(结构化修改是添加或删除一个或多个元素或显式调整支持数组大小的任何操作;仅仅设置元素值不是结构化修改。)这通常是通过对自然封装列表的某个对象进行同步来完成的。如果不存在此类对象，则应使用 Collections.synchronizedList 方法“包裹”列表。最好在创建时这样做，以防止意外地对列表进行非同步访问:

list list= Collections.synchronizedList (new ArrayList (...));

这个类的 iterator 和 listlterator 方法返回的迭代器是快速失败的:如果在创建迭代器之后以任何方式(通过迭代器自己的 remove 或 add 方法除外)对列表进行结构化修改，则迭代器将抛出 ConcurrentModificationException。因此，面对并发修改，迭代器会快速而干净地失败，而不是冒着在未来的某个不确定的时间进行任意、非确定性行为的风险。
注意，不能保证迭代器的快速失败行为，因为一般来说，在未同步的并发修改存在的情况下不可能做出任何硬性保证。快速失败迭代器在最大努力的基础上抛出ConcurrentModificationException。因此，编写一个依赖此异常的程序是不正确的,迭代器的快速失败行为应仅用于检测错误。

这个类是Java集合框架的一个成员。

### 迭代器对象

```java
private class Itr implements Iterator<E> {
    int cursor;       // index of next element to return
    int lastRet = -1; // index of last element returned; -1 if no such
    int expectedModCount = modCount;

    // prevent creating a synthetic constructor
    Itr() {}

    public boolean hasNext() {
        return cursor != size;
    }

    @SuppressWarnings("unchecked")
    public E next() {
        checkForComodification();
        int i = cursor;
        if (i >= size)
            throw new NoSuchElementException();
        Object[] elementData = ArrayList.this.elementData;
        if (i >= elementData.length)
            throw new ConcurrentModificationException();
        cursor = i + 1;
        return (E) elementData[lastRet = i];
    }

    public void remove() {
        if (lastRet < 0)
            throw new IllegalStateException();
        checkForComodification();

        try {
            ArrayList.this.remove(lastRet);
            cursor = lastRet;
            lastRet = -1;
            expectedModCount = modCount;
        } catch (IndexOutOfBoundsException ex) {
            throw new ConcurrentModificationException();
        }
    }

    @Override
    public void forEachRemaining(Consumer<? super E> action) {
        Objects.requireNonNull(action);
        final int size = ArrayList.this.size;
        int i = cursor;
        if (i < size) {
            final Object[] es = elementData;
            if (i >= es.length)
                throw new ConcurrentModificationException();
            for (; i < size && modCount == expectedModCount; i++)
                action.accept(elementAt(es, i));
            // update once at end to reduce heap write traffic
            cursor = i;
            lastRet = i - 1;
            checkForComodification();
        }
    }

    final void checkForComodification() {
        if (modCount != expectedModCount)
            throw new ConcurrentModificationException();
    }
}

```

其中比较重要的是迭代器的 remove 方法和 ArrayList 的 remove 方法区别，迭代器在删除元素后，cursor 指向被删除元素的位置，lastRet 为 -1，expectedModCount 为 modCount，这样可以保证迭代器的遍历不会受到影响。

如果ArrayList的 remove 方法，存在ConcurrentModificationException异常，IndexOutOfBoundsException异常。

```java
public E remove(int index) {
    Objects.checkIndex(index, size); //IndexOutOfBoundsException
    final Object[] es = elementData;

    @SuppressWarnings("unchecked") E oldValue = (E) es[index];
    fastRemove(es, index); //ConcurrentModificationException

    return oldValue;
}

public boolean remove(Object o) {
    final Object[] es = elementData;
    final int size = this.size;
    int i = 0;
    found: {
        if (o == null) {
            for (; i < size; i++)
                if (es[i] == null)
                    break found;
        } else {
            for (; i < size; i++)
                if (o.equals(es[i]))
                    break found;
        }
        return false;
    }
    fastRemove(es, i);
    return true;
}

private void fastRemove(Object[] es, int i) {
    modCount++; // 上面两个删除都调用这个方法，会增加 modCount，如果迭代器的 expectedModCount 不等于 modCount，抛出异常ConcurrentModificationException
    final int newSize;
    if ((newSize = size - 1) > i)
        System.arraycopy(es, i + 1, es, i, newSize - i);
    es[size = newSize] = null;
}
```

但是不管是迭代器的 remove 方法还是 ArrayList 的 remove 方法，都无法保证并发修改的情况下的正确性。

### 扩容方法

```java
private Object[] grow() {
    return grow(size + 1);
}

private Object[] grow(int minCapacity) {
    int oldCapacity = elementData.length;  // 获取当前数组的容量

    // 检查数组是否已经有内容或是否是一个空的默认数组
    if (oldCapacity > 0 || elementData != DEFAULTCAPACITY_EMPTY_ELEMENTDATA) {
        // 计算新的容量
        int newCapacity = ArraysSupport.newLength(oldCapacity,
                minCapacity - oldCapacity, /* minimum growth */
                oldCapacity >> 1           /* preferred growth */);
        // 将数组扩展到新的容量
        return elementData = Arrays.copyOf(elementData, newCapacity);
    } else {
        // 如果是空的默认数组，则将容量设置为默认容量或最小所需容量
        return elementData = new Object[Math.max(DEFAULT_CAPACITY, minCapacity)];
    }
}

public static int newLength(int oldLength, int minGrowth, int prefGrowth) {
    int prefLength = oldLength + Math.max(minGrowth, prefGrowth); // 计算首选长度，可能会溢出

    // 检查首选长度是否在合理范围内
    if (0 < prefLength && prefLength <= SOFT_MAX_ARRAY_LENGTH) {
        return prefLength;
    } else {
        // 如果首选长度超出合理范围，则调用 hugeLength 方法处理
        return hugeLength(oldLength, minGrowth);
    }
}

private static int hugeLength(int oldLength, int minGrowth) {
    int minLength = oldLength + minGrowth;  // 计算最小所需长度

    if (minLength < 0) { // 如果计算结果出现溢出（负数）
        throw new OutOfMemoryError(
            "Required array length " + oldLength + " + " + minGrowth + " is too large");
    } else if (minLength <= SOFT_MAX_ARRAY_LENGTH) { // SOFT_MAX_ARRAY_LENGTH 为 Integer.MAX_VALUE - 8
        // 如果最小长度在合理范围内，则返回最大安全长度
        return SOFT_MAX_ARRAY_LENGTH;
    } else {
        // 如果最小长度超过最大安全长度，则返回最小长度
        return minLength;
    }
}
```

当添加元素到 ArrayList 时，如果`add()`时元素数量和当前容量相等，或者在`addAll()`时，需要的新添加的元素长度大于可用长度，就会调用 grow 方法，扩容容量。步骤是：先对当前数据的长度进行判断，如果是默认空数组，就会扩容到默认容量或者最小所需容量。如果不是默认空数组，就会使用 `ArraysSupport.newLength()` 计算新的容量，然后将数组扩展到新的容量。

先分析一下`ArraysSupport.newLength()`的三个方法参数，`oldLength`是当前数组的长度。`minGrowth`是最小增长量，为`minCapacity - oldCapacity`,也就是要扩容的长度，其中`minCapacity`是`add`方法的size+1或者`addAll`时计算的所需最小容量，size+新添加元素的长度。`prefGrowth`是首选增长量，右移了一位，等于除2，比如原始长度10，推荐扩容量就是5，最终就是15，扩容了1.5倍。

`ArraysSupport.newLength()`的流程，首先计算首选长度，如果首选长度在合理范围内（大于0 并小于等于 SOFT_MAX_ARRAY_LENGTH Integer.MAX_VALUE - 8），就返回推荐长度。否则就调用`hugeLength()`方法处理。`hugeLength()`方法计算最小所需长度（原始长度+最小扩容长度），如果计算结果出现溢出（负数），就抛出`OutOfMemoryError`异常。如果最小长度在合理范围内（SOFT_MAX_ARRAY_LENGTH 为 Integer.MAX_VALUE - 8），就返回最大安全长度。如果最小长度超过最大安全长度，就返回最小长度。

其中添加`SOFT_MAX_ARRAY_LENGTH`的判断的原因在其注释上做了说明。数组增长计算所施加的软最大数组长度。某些JVM(例如HotSpot)具有实现限制，这将导致
OutOfMemoryError("请求的数组大小超过VM限制") 。MAXVALUE 即使有足够的可用堆。实际的限制可能取决于某些JVM实现特有的特性，例如对象头大小。软极大值的选择是保守的，以便小于可能遇到的任何实现限制。

## 使用注意事项

- 不要在 ArrayList的for i 循环，或者增强for循环中使用 remove 方法。应该使用迭代器的 remove 方法，或者使用stream的 filter 方法。

```java
List<String> list = new ArrayList<>();
list.add("a");
list.add("b");
list.add("c");
list.add("d");

// 应避免的删除方式
for (int i = 0; i < list.size(); i++) {
    if (list.get(i).equals("a")) {
        list.remove(i);
    }
}

// 应避免的删除方式 继承了Iterable接口的类，增强for循环会优化成迭代器，但是不推荐这样使用，不优雅
for (String s : list) {
    if (s.equals("a")) {
        list.remove(s);
    }
}

// 正确的删除方式   
Iterator<String> iterator = list.iterator();
while (iterator.hasNext()) {
    if (iterator.next().equals("a")) {
        iterator.remove();
    }
}

// 正确的删除方式
list.removeIf(s -> s.equals("a"));

// 正确的删除方式
list.stream().filter(s -> !s.equals("a")).collect(Collectors.toList());

```

- ArrayList 是非线程安全的，如果需要线程安全的 List，可以使用 Collections.synchronizedList 方法包装 ArrayList，或者使用 CopyOnWriteArrayList。

```java
// 线程安全的 List。 除了返回ListIterator的方法，其他方法都加了synchronized关键字，读写都会加锁。
List<String> list = Collections.synchronizedList(new ArrayList<>());

// 线程安全的 List。 写操作时，会复制一个新的数组，读操作不会加锁。
CopyOnWriteArrayList<String> cowList = new CopyOnWriteArrayList<>();
```
