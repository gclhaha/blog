# Syncronized原理

## 一个简单的例子来演示 Syncronized 的作用

```java
class BankAccount {
    private int balance = 0; // 账户余额

    // 存钱
    public synchronized void deposit(int amount) {
        balance += amount;
        System.out.println(Thread.currentThread().getName() + " 存入: " + amount + "，当前余额: " + balance);
    }

    // 取钱
    public synchronized void withdraw(int amount) {
        if (balance >= amount) {
            balance -= amount;
            System.out.println(Thread.currentThread().getName() + " 取出: " + amount + "，当前余额: " + balance);
        } else {
            System.out.println(Thread.currentThread().getName() + " 取钱失败，余额不足，当前余额: " + balance);
        }
    }
}

public class SynchronizedExample {
    public static void main(String[] args) {
        BankAccount account = new BankAccount();

        // 模拟多线程操作
        Thread t1 = new Thread(() -> {
            account.deposit(100);
            account.withdraw(50);
        }, "线程1");
        t1.start();

        Thread t2 = new Thread(() -> {
            account.deposit(200);
            account.withdraw(150);
        }, "线程2");
        t2.start();

        Thread t3 = new Thread(() -> {
            account.withdraw(50);
        }, "线程3");
        t3.start();
    }
}
```

从肉眼看，线程1操作完剩50，线程2操作完剩100，线程3操作完剩50。执行代码后，

输出结果：

```text
线程1 存入: 100，当前余额: 100
线程1 取出: 50，当前余额: 50
线程2 存入: 200，当前余额: 250
线程2 取出: 150，当前余额: 100
线程3 取出: 50，当前余额: 50
```

输出结果符合预期，其中`deposit`和`withdraw`方法都是同步方法，使用`synchronized`关键字修饰，这样就保证了在多线程环墋下，同一时刻只有一个线程可以访问这两个方法。

如果去掉 `synchronized` 关键字，那么输出结果可能会是：

```text
线程1 存入: 100，当前余额: 100
线程1 取出: 50，当前余额: 250
线程2 存入: 200，当前余额: 300
线程2 取出: 150，当前余额: 50
线程3 取出: 50，当前余额: 200
```

执行了很多次，即使没有 synchronized，结果可能看起来是“正确的”，但这是偶然的，不能保证在所有情况下都正确。

原因1: 线程切换的不可控性

多线程的执行顺序和切换点是不确定的，可能正好每次线程切换都“幸运地”避免了冲突。

原因2：线程冲突的表现依赖于具体环境

在简单的场景（如两三个线程）中，冲突的概率低，但随着线程数和操作的复杂度增加，冲突导致的不正确结果的概率会显著提高。

## 查看源码

使用 `javac SynchronizedExample.java` 可以看到编译后的字节码文件 SynchronizedExample.class 和 BackAccount.class，内容和源代码没有太大区别。

接下来使用 `javap -c BackAccount.class` 查看编译后的字节码文件，可以看到 `synchronized` 关键字在字节码中的表现：

BankAccount.class

```java
Compiled from "SynchronizedExample.java"
class top.gclhaha.kafka.sync.BankAccount {
  top.gclhaha.kafka.sync.BankAccount();
    Code:
       0: aload_0
       1: invokespecial #1                  // Method java/lang/Object."<init>":()V
       4: aload_0
       5: iconst_0
       6: putfield      #2                  // Field balance:I
       9: return

  public synchronized void deposit(int);
    Code:
       0: aload_0
       1: dup
       2: getfield      #2                  // Field balance:I
       5: iload_1
       6: iadd
       7: putfield      #2                  // Field balance:I
      10: getstatic     #3                  // Field java/lang/System.out:Ljava/io/PrintStream;
      13: new           #4                  // class java/lang/StringBuilder
      16: dup
      17: invokespecial #5                  // Method java/lang/StringBuilder."<init>":()V
      20: invokestatic  #6                  // Method java/lang/Thread.currentThread:()Ljava/lang/Thread;
      23: invokevirtual #7                  // Method java/lang/Thread.getName:()Ljava/lang/String;
      26: invokevirtual #8                  // Method java/lang/StringBuilder.append:(Ljava/lang/String;)Ljava/lang/StringBuilder;
      29: ldc           #9                  // String  存入:
      31: invokevirtual #8                  // Method java/lang/StringBuilder.append:(Ljava/lang/String;)Ljava/lang/StringBuilder;
      34: iload_1
      35: invokevirtual #10                 // Method java/lang/StringBuilder.append:(I)Ljava/lang/StringBuilder;
      38: ldc           #11                 // String ，当前余额:
      40: invokevirtual #8                  // Method java/lang/StringBuilder.append:(Ljava/lang/String;)Ljava/lang/StringBuilder;
      43: aload_0
      44: getfield      #2                  // Field balance:I
      47: invokevirtual #10                 // Method java/lang/StringBuilder.append:(I)Ljava/lang/StringBuilder;
      50: invokevirtual #12                 // Method java/lang/StringBuilder.toString:()Ljava/lang/String;
      53: invokevirtual #13                 // Method java/io/PrintStream.println:(Ljava/lang/String;)V
      56: return

  public synchronized void withdraw(int);
    Code:
       0: aload_0
       1: getfield      #2                  // Field balance:I
       4: iload_1
       5: if_icmplt     67
       8: aload_0
       9: dup
      10: getfield      #2                  // Field balance:I
      13: iload_1
      14: isub
      15: putfield      #2                  // Field balance:I
      18: getstatic     #3                  // Field java/lang/System.out:Ljava/io/PrintStream;
      21: new           #4                  // class java/lang/StringBuilder
      24: dup
      25: invokespecial #5                  // Method java/lang/StringBuilder."<init>":()V
      28: invokestatic  #6                  // Method java/lang/Thread.currentThread:()Ljava/lang/Thread;
      31: invokevirtual #7                  // Method java/lang/Thread.getName:()Ljava/lang/String;
      34: invokevirtual #8                  // Method java/lang/StringBuilder.append:(Ljava/lang/String;)Ljava/lang/StringBuilder;
      37: ldc           #14                 // String  取出:
      39: invokevirtual #8                  // Method java/lang/StringBuilder.append:(Ljava/lang/String;)Ljava/lang/StringBuilder;
      42: iload_1
      43: invokevirtual #10                 // Method java/lang/StringBuilder.append:(I)Ljava/lang/StringBuilder;
      46: ldc           #11                 // String ，当前余额:
      48: invokevirtual #8                  // Method java/lang/StringBuilder.append:(Ljava/lang/String;)Ljava/lang/StringBuilder;
      51: aload_0
      52: getfield      #2                  // Field balance:I
      55: invokevirtual #10                 // Method java/lang/StringBuilder.append:(I)Ljava/lang/StringBuilder;
      58: invokevirtual #12                 // Method java/lang/StringBuilder.toString:()Ljava/lang/String;
      61: invokevirtual #13                 // Method java/io/PrintStream.println:(Ljava/lang/String;)V
      64: goto          104
      67: getstatic     #3                  // Field java/lang/System.out:Ljava/io/PrintStream;
      70: new           #4                  // class java/lang/StringBuilder
      73: dup
      74: invokespecial #5                  // Method java/lang/StringBuilder."<init>":()V
      77: invokestatic  #6                  // Method java/lang/Thread.currentThread:()Ljava/lang/Thread;
      80: invokevirtual #7                  // Method java/lang/Thread.getName:()Ljava/lang/String;
      83: invokevirtual #8                  // Method java/lang/StringBuilder.append:(Ljava/lang/String;)Ljava/lang/StringBuilder;
      86: ldc           #15                 // String  取钱失败，余额不足，当前余额:
      88: invokevirtual #8                  // Method java/lang/StringBuilder.append:(Ljava/lang/String;)Ljava/lang/StringBuilder;
      91: aload_0
      92: getfield      #2                  // Field balance:I
      95: invokevirtual #10                 // Method java/lang/StringBuilder.append:(I)Ljava/lang/StringBuilder;
      98: invokevirtual #12                 // Method java/lang/StringBuilder.toString:()Ljava/lang/String;
     101: invokevirtual #13                 // Method java/io/PrintStream.println:(Ljava/lang/String;)V
     104: return
}
```

可以方法上有 `synchronized` 关键字

synchronized 方法在字节码中没有显式的 monitorenter 和 monitorexit 指令。

JVM 会通过 ACC_SYNCHRONIZED 标志来保证方法的同步。

可以通过反汇编工具查看该标志，

接下来使用 `javap -v BackAccount.class` 查看

BankAccount.class

```java
Classfile /Users/gclhaha/Documents/develop/javaworkspace/github/kafka_demo/src/main/java/top/gclhaha/kafka/sync/BankAccount.class
  Last modified 2024-12-5; size 1098 bytes
  MD5 checksum dfee83f2ab249c9d791a00ae0b9a0b47
  Compiled from "SynchronizedExample.java"
class top.gclhaha.kafka.sync.BankAccount
  minor version: 0
  major version: 52
  flags: ACC_SUPER
Constant pool:
   #1 = Methodref          #17.#30        // java/lang/Object."<init>":()V
   #2 = Fieldref           #16.#31        // top/gclhaha/kafka/sync/BankAccount.balance:I
   #3 = Fieldref           #32.#33        // java/lang/System.out:Ljava/io/PrintStream;
   #4 = Class              #34            // java/lang/StringBuilder
   #5 = Methodref          #4.#30         // java/lang/StringBuilder."<init>":()V
   #6 = Methodref          #35.#36        // java/lang/Thread.currentThread:()Ljava/lang/Thread;
   #7 = Methodref          #35.#37        // java/lang/Thread.getName:()Ljava/lang/String;
   #8 = Methodref          #4.#38         // java/lang/StringBuilder.append:(Ljava/lang/String;)Ljava/lang/StringBuilder;
   #9 = String             #39            //  存入:
  #10 = Methodref          #4.#40         // java/lang/StringBuilder.append:(I)Ljava/lang/StringBuilder;
  #11 = String             #41            // ，当前余额:
  #12 = Methodref          #4.#42         // java/lang/StringBuilder.toString:()Ljava/lang/String;
  #13 = Methodref          #43.#44        // java/io/PrintStream.println:(Ljava/lang/String;)V
  #14 = String             #45            //  取出:
  #15 = String             #46            //  取钱失败，余额不足，当前余额:
  #16 = Class              #47            // top/gclhaha/kafka/sync/BankAccount
  #17 = Class              #48            // java/lang/Object
  #18 = Utf8               balance
  #19 = Utf8               I
  #20 = Utf8               <init>
  #21 = Utf8               ()V
  #22 = Utf8               Code
  #23 = Utf8               LineNumberTable
  #24 = Utf8               deposit
  #25 = Utf8               (I)V
  #26 = Utf8               withdraw
  #27 = Utf8               StackMapTable
  #28 = Utf8               SourceFile
  #29 = Utf8               SynchronizedExample.java
  #30 = NameAndType        #20:#21        // "<init>":()V
  #31 = NameAndType        #18:#19        // balance:I
  #32 = Class              #49            // java/lang/System
  #33 = NameAndType        #50:#51        // out:Ljava/io/PrintStream;
  #34 = Utf8               java/lang/StringBuilder
  #35 = Class              #52            // java/lang/Thread
  #36 = NameAndType        #53:#54        // currentThread:()Ljava/lang/Thread;
  #37 = NameAndType        #55:#56        // getName:()Ljava/lang/String;
  #38 = NameAndType        #57:#58        // append:(Ljava/lang/String;)Ljava/lang/StringBuilder;
  #39 = Utf8                存入:
  #40 = NameAndType        #57:#59        // append:(I)Ljava/lang/StringBuilder;
  #41 = Utf8               ，当前余额:
  #42 = NameAndType        #60:#56        // toString:()Ljava/lang/String;
  #43 = Class              #61            // java/io/PrintStream
  #44 = NameAndType        #62:#63        // println:(Ljava/lang/String;)V
  #45 = Utf8                取出:
  #46 = Utf8                取钱失败，余额不足，当前余额:
  #47 = Utf8               top/gclhaha/kafka/sync/BankAccount
  #48 = Utf8               java/lang/Object
  #49 = Utf8               java/lang/System
  #50 = Utf8               out
  #51 = Utf8               Ljava/io/PrintStream;
  #52 = Utf8               java/lang/Thread
  #53 = Utf8               currentThread
  #54 = Utf8               ()Ljava/lang/Thread;
  #55 = Utf8               getName
  #56 = Utf8               ()Ljava/lang/String;
  #57 = Utf8               append
  #58 = Utf8               (Ljava/lang/String;)Ljava/lang/StringBuilder;
  #59 = Utf8               (I)Ljava/lang/StringBuilder;
  #60 = Utf8               toString
  #61 = Utf8               java/io/PrintStream
  #62 = Utf8               println
  #63 = Utf8               (Ljava/lang/String;)V
{
  top.gclhaha.kafka.sync.BankAccount();
    descriptor: ()V
    flags:
    Code:
      stack=2, locals=1, args_size=1
         0: aload_0
         1: invokespecial #1                  // Method java/lang/Object."<init>":()V
         4: aload_0
         5: iconst_0
         6: putfield      #2                  // Field balance:I
         9: return
      LineNumberTable:
        line 4: 0
        line 5: 4

  public synchronized void deposit(int);
    descriptor: (I)V
    flags: ACC_PUBLIC, ACC_SYNCHRONIZED
    Code:
      stack=3, locals=2, args_size=2
         0: aload_0
         1: dup
         2: getfield      #2                  // Field balance:I
         5: iload_1
         6: iadd
         7: putfield      #2                  // Field balance:I
        10: getstatic     #3                  // Field java/lang/System.out:Ljava/io/PrintStream;
        13: new           #4                  // class java/lang/StringBuilder
        16: dup
        17: invokespecial #5                  // Method java/lang/StringBuilder."<init>":()V
        20: invokestatic  #6                  // Method java/lang/Thread.currentThread:()Ljava/lang/Thread;
        23: invokevirtual #7                  // Method java/lang/Thread.getName:()Ljava/lang/String;
        26: invokevirtual #8                  // Method java/lang/StringBuilder.append:(Ljava/lang/String;)Ljava/lang/StringBuilder;
        29: ldc           #9                  // String  存入:
        31: invokevirtual #8                  // Method java/lang/StringBuilder.append:(Ljava/lang/String;)Ljava/lang/StringBuilder;
        34: iload_1
        35: invokevirtual #10                 // Method java/lang/StringBuilder.append:(I)Ljava/lang/StringBuilder;
        38: ldc           #11                 // String ，当前余额:
        40: invokevirtual #8                  // Method java/lang/StringBuilder.append:(Ljava/lang/String;)Ljava/lang/StringBuilder;
        43: aload_0
        44: getfield      #2                  // Field balance:I
        47: invokevirtual #10                 // Method java/lang/StringBuilder.append:(I)Ljava/lang/StringBuilder;
        50: invokevirtual #12                 // Method java/lang/StringBuilder.toString:()Ljava/lang/String;
        53: invokevirtual #13                 // Method java/io/PrintStream.println:(Ljava/lang/String;)V
        56: return
      LineNumberTable:
        line 9: 0
        line 10: 10
        line 11: 56

  public synchronized void withdraw(int);
    descriptor: (I)V
    flags: ACC_PUBLIC, ACC_SYNCHRONIZED
    Code:
      stack=3, locals=2, args_size=2
         0: aload_0
         1: getfield      #2                  // Field balance:I
         4: iload_1
         5: if_icmplt     67
         8: aload_0
         9: dup
        10: getfield      #2                  // Field balance:I
        13: iload_1
        14: isub
        15: putfield      #2                  // Field balance:I
        18: getstatic     #3                  // Field java/lang/System.out:Ljava/io/PrintStream;
        21: new           #4                  // class java/lang/StringBuilder
        24: dup
        25: invokespecial #5                  // Method java/lang/StringBuilder."<init>":()V
        28: invokestatic  #6                  // Method java/lang/Thread.currentThread:()Ljava/lang/Thread;
        31: invokevirtual #7                  // Method java/lang/Thread.getName:()Ljava/lang/String;
        34: invokevirtual #8                  // Method java/lang/StringBuilder.append:(Ljava/lang/String;)Ljava/lang/StringBuilder;
        37: ldc           #14                 // String  取出:
        39: invokevirtual #8                  // Method java/lang/StringBuilder.append:(Ljava/lang/String;)Ljava/lang/StringBuilder;
        42: iload_1
        43: invokevirtual #10                 // Method java/lang/StringBuilder.append:(I)Ljava/lang/StringBuilder;
        46: ldc           #11                 // String ，当前余额:
        48: invokevirtual #8                  // Method java/lang/StringBuilder.append:(Ljava/lang/String;)Ljava/lang/StringBuilder;
        51: aload_0
        52: getfield      #2                  // Field balance:I
        55: invokevirtual #10                 // Method java/lang/StringBuilder.append:(I)Ljava/lang/StringBuilder;
        58: invokevirtual #12                 // Method java/lang/StringBuilder.toString:()Ljava/lang/String;
        61: invokevirtual #13                 // Method java/io/PrintStream.println:(Ljava/lang/String;)V
        64: goto          104
        67: getstatic     #3                  // Field java/lang/System.out:Ljava/io/PrintStream;
        70: new           #4                  // class java/lang/StringBuilder
        73: dup
        74: invokespecial #5                  // Method java/lang/StringBuilder."<init>":()V
        77: invokestatic  #6                  // Method java/lang/Thread.currentThread:()Ljava/lang/Thread;
        80: invokevirtual #7                  // Method java/lang/Thread.getName:()Ljava/lang/String;
        83: invokevirtual #8                  // Method java/lang/StringBuilder.append:(Ljava/lang/String;)Ljava/lang/StringBuilder;
        86: ldc           #15                 // String  取钱失败，余额不足，当前余额:
        88: invokevirtual #8                  // Method java/lang/StringBuilder.append:(Ljava/lang/String;)Ljava/lang/StringBuilder;
        91: aload_0
        92: getfield      #2                  // Field balance:I
        95: invokevirtual #10                 // Method java/lang/StringBuilder.append:(I)Ljava/lang/StringBuilder;
        98: invokevirtual #12                 // Method java/lang/StringBuilder.toString:()Ljava/lang/String;
       101: invokevirtual #13                 // Method java/io/PrintStream.println:(Ljava/lang/String;)V
       104: return
      LineNumberTable:
        line 15: 0
        line 16: 8
        line 17: 18
        line 19: 67
        line 21: 104
      StackMapTable: number_of_entries = 2
        frame_type = 251 /* same_frame_extended */
          offset_delta = 67
        frame_type = 36 /* same */
}
SourceFile: "SynchronizedExample.java"
```

可以看到方法上有 `ACC_SYNCHRONIZED` 标志。

对于带有 ACC_SYNCHRONIZED 标志的方法，JVM 在方法调用和返回时，会自动进行以下操作：

 1. 进入方法时：加锁
JVM 自动调用 monitorenter，尝试获取当前对象的 Monitor 锁。
 2. 退出方法时：解锁
JVM 自动调用 monitorexit，释放锁资源。

这部分逻辑由 JVM 的执行引擎实现，无需在字节码中显式插入 monitorenter 和 monitorexit 指令。

## JVM 内部的监视器锁（Monitor）机制

Java 中的 synchronized 是通过 JVM 的监视器锁（Monitor）实现的。每个对象都关联着一个 Monitor，它在对象头（Object Header）中记录了锁的状态。以下是几个核心概念：

1.1 对象头结构

Java 对象的内存布局中包含一个 对象头（Object Header）：

 • Mark Word：包含锁标志、偏向线程 ID、锁计数等信息。

 • Class Pointer：指向对象所属的类的元信息。

当对象被用作锁时，Mark Word 的内容会变化以反映当前锁的状态。

1.2 Monitor 的基本操作

监视器锁的核心操作包括：

monitorenter：

 • 线程试图获取对象的 Monitor。

 • 如果 Monitor 当前未被占用，线程成功获取锁。

 • 如果 Monitor 被其他线程占用，当前线程进入阻塞状态，等待锁的释放。

monitorexit：

 • 释放当前持有的 Monitor。

 • 如果有线程在等待此 Monitor，通知其中一个线程获取锁。

JVM 中每个 Monitor 是由 C++ 实现的 ObjectMonitor 对象管理。

1.3 JVM 锁的实现

偏向锁（Biased Locking）

 • 原理：如果一个线程多次访问某个锁，对其进行偏向优化，减少 CAS（Compare-And-Swap）操作。

 • 实现：当线程第一次获取锁时，将其线程 ID 写入对象头的 Mark Word。后续该线程获取锁时，不需要进行同步操作，直接进入临界区。

 • 退出偏向锁：如果另一个线程尝试获取锁，则撤销偏向锁，并升级为轻量级锁。

轻量级锁（Lightweight Locking）

 • 原理：通过 CAS 操作，减少重量级锁的线程阻塞。

 • 实现：线程获取锁时，创建一个锁记录（Lock Record）并将其存储在当前线程的栈帧中。使用 CAS 将对象头中的 Mark Word 替换为指向锁记录的指针。

 • 锁竞争：如果多个线程尝试获取锁，则升级为重量级锁。

重量级锁（Heavyweight Locking）

 • 原理：依赖操作系统的互斥机制（Mutex），对线程进行阻塞和唤醒。

 • 实现：当轻量级锁竞争失败时，进入重量级锁状态。操作系统通过线程切换调度保证互斥，代价较高。

## javap 常见选项

 • -c：反编译成字节码指令。

 • -v：显示详细信息，包括类的标志、方法标志等。

 • -l：显示局部变量表。

 • -s：显示方法的签名信息。
