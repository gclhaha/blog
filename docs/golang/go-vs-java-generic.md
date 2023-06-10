# Go与Java泛型原理简介
本人从毕业后从事Java开发工作，大概从2021年下半年开始体验和学习Go语言
前几个月Go 1.18实现了泛型，好奇具体实现之余，发现Java的泛型原理自己也不明白，前段时间查阅了一下，还是想记录下来，就有了这篇博客
## Go泛型原理
### 虚拟方法表（Virtual Method Table）
泛型函数被修改成只接受指针作为参数的方式。然后，这些值被分配到堆上，这些值的指针被传递给泛型函数。这样做是因为指针看起来总是一样的，不管它指向的是什么类型。
如果这些值是对象，该函数只有一个指向对象的指针，不知道它们的方法在哪里。因此，它需要一个可以查询方法的内存地址的表格：Virtual Method Table。推导这些指针和调用虚拟函数要比直接调用函数慢，而且使用 Virtual Method Table 会阻止编译器进行优化。
### 单态化（Monomorphization）
就像蜡印一样。如果泛型规定的类型都是基本类型，编译器为每个被调用的数据类型生成一个泛型函数的副本。

```go
func max[T Numeric](a, b T) T {
    // ...
}

larger := max(3, 5)
```
经过单态化后

```go
func maxInt(a, b int) int {
    // ...
}

larger := maxInt(3, 5)
```
最大的优势是，Monomorphization 带来的运行时性能明显好于使用 Virtual Method Table。直接方法调用不仅更有效率，而且还能适用整个编译器的优化链。不过，这样做的代价是编译时长，为所有相关类型生成泛型函数的副本是非常耗时的。

### go使用混合模式
Go 使用单态化，但试图减少需要生成的函数副本的数量。它不是为每个类型创建一个副本，而是为内存中的每个布局生成一个副本：int、float64、Node 和其他所谓的 "值类型" 在内存中看起来都不一样，因此泛型函数将为所有这些类型复制副本。

与值类型相反，指针和接口在内存中总是有相同的布局。编译器将为指针和接口的调用生成一个泛型函数的副本。就像 Virtual Method Table 一样，泛型函数接收指针，因此需要一个表来动态地查找方法地址。在 Go 实现中的字典与虚拟方法表的性能特点相同。
## Java泛型原理--类型擦除
并不是真正的泛型，所有的泛型类型都会被处理成Object类型。泛型信息对 Java 编译器可以见，对 Java 虚拟机不可见。如果是有继承关系，则会多一个桥接方法,如下：

``` java
public int compareTo(User user) {
	return name.compareTo(user.name);
}

 // 桥接方法
public volatile int compareTo(Object obj) {
	return compareTo((User)obj);
}
```

如有错误，欢迎指正
## 参考链接
[Java 中泛型的实现原理](https://www.cnblogs.com/robothy/p/13949788.html)


[简单易懂的 Go 泛型使用和实现原理介绍](https://developer.51cto.com/article/708128.html)


