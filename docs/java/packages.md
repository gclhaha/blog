# Java JDK 包结构与内容简介

可能在平时开发中，基本都是使用一些常用的集合或工具类库，对于 JDK 的整体结构不会了解太多，除非特意去看，这里简单介绍一下 JDK 的包结构。

JDK 文档地址：[Oracle JDK version 22](https://docs.oracle.com/en/java/javase/22/docs/api/index.html)

## 结构简介

### Java SE 包功能一览表

| 包名 | 作用 |
|---|---|
| java.base | 定义 Java SE 平台的基础 API。 |
| java.compiler | 定义语言模型、注解处理和 Java 编译器 API。 |
| java.datatransfer | 定义用于在应用程序之间以及应用程序内部传输数据的 API。 |
| java.desktop | 定义 AWT 和 Swing 用户界面工具包，以及用于辅助功能、音频、图像、打印和 JavaBeans 的 API。 |
| java.instrument | 定义允许代理检测 JVM 上运行的程序的服务。 |
| java.logging | 定义 Java 日志 API。 |
| java.management | 定义 Java 管理扩展 (JMX) API。 |
| java.management.rmi | 定义用于 Java 管理扩展 (JMX) 远程 API 的 RMI 连接器。 |
| java.naming | 定义 Java 命名和目录接口 (JNDI) API。 |
| java.net.http | 定义 HTTP 客户端和 WebSocket API。 |
| java.prefs | 定义首选项 API。 |
| java.rmi | 定义远程方法调用 (RMI) API。 |
| java.scripting | 定义脚本 API。 |
| java.se | 定义 Java SE 平台的 API。 |
| java.security.jgss | 定义 IETF 通用安全服务 API (GSS-API) 的 Java 绑定。 |
| java.security.sasl | 定义 IETF 简单身份验证和安全层 (SASL) 的 Java 支持。 |
| java.smartcardio | 定义 Java 智能卡 I/O API。 |
| java.sql | 定义 JDBC API。 |
| java.sql.rowset | 定义 JDBC RowSet API。 |
| java.transaction.xa | 定义用于在 JDBC 中支持分布式事务的 API。 |
| java.xml | 定义用于 XML 处理的 Java API (JAXP)。 |
| java.xml.crypto | 定义用于 XML 密码学的 API。 |

### JDK 包功能一览表

| 包名 | 作用 |
|---|---|
| jdk.accessibility | 定义由辅助技术实现者使用的 JDK 实用程序类。 |
| jdk.attach | 定义附加 API。 |
| jdk.charsets | 提供 java.base 中不存在的字符集（主要是双字节和 IBM 字符集）。 |
| jdk.compiler | 定义系统 Java 编译器的实现及其命令行等效项 javac。 |
| jdk.crypto.cryptoki | 提供 SunPKCS11 安全提供程序的实现。 |
| jdk.dynalink | 定义用于对对象上的高级操作进行动态链接的 API。 |
| jdk.editpad | 提供 jdk.jshell 使用的编辑板服务的实现。 |
| jdk.hotspot.agent | 定义 HotSpot 可服务性代理的实现。 |
| jdk.httpserver | 定义特定于 JDK 的 HTTP 服务器 API，并提供用于运行最小 HTTP 服务器的 jwebserver 工具。 |
| jdk.incubator.vector | 定义用于表达可以在运行时可靠地编译为 SIMD 指令（例如 x64 上的 AVX 指令和 AArch64 上的 NEON 指令）的计算的 API。 |
| jdk.jartool | 定义用于操作 Java 归档 (JAR) 文件的工具，包括 jar 和 jarsigner 工具。 |
| jdk.javadoc | 定义系统文档工具的实现及其命令行等效项 javadoc。 |
| jdk.jcmd | 定义用于诊断和排除 JVM 故障的工具，例如 jcmd、jps、jstat 工具。 |
| jdk.jconsole | 定义用于监视和管理正在运行的应用程序的 JMX 图形工具 jconsole。 |
| jdk.jdeps | 定义用于分析 Java 库和程序中的依赖项的工具，包括 jdeps、javap 和 jdeprscan 工具。 |
| jdk.jdi | 定义 Java 调试接口。 |
| jdk.jdwp.agent | 提供 Java 调试线协议 (JDWP) 代理的实现。 |
| jdk.jfr | 定义 JDK Flight Recorder 的 API。 |
| jdk.jlink | 定义用于创建运行时映像的 jlink 工具、用于创建和操作 JMOD 文件的 jmod 工具，以及用于检查 JDK 实现特定的类和资源容器文件的 jimage 工具。 |
| jdk.jpackage | 定义 Java 打包工具 jpackage。 |
| jdk.jshell | 提供用于评估 Java 代码片段的 jshell 工具，并定义用于建模和执行片段的特定于 JDK 的 API。 |
| jdk.jsobject | 定义 JavaScript 对象的 API。 |
| jdk.jstatd | 定义 jstatd 工具，用于启动守护程序以使 jstat 工具能够远程监视 JVM 统计信息。 |
| jdk.localedata | 提供除美国语言环境之外的语言环境的语言环境数据。 |
| jdk.management | 定义用于 JVM 的特定于 JDK 的管理接口。 |
| jdk.management.agent | 定义 JMX 管理代理。 |
| jdk.management.jfr | 定义 JDK Flight Recorder 的管理接口。 |
| jdk.naming.dns | 提供 DNS Java 命名提供程序的实现。 |
| jdk.naming.rmi | 提供 RMI Java 命名提供程序的实现。 |
| jdk.net | 定义特定于 JDK 的网络 API。 |
| jdk.nio.mapmode | 定义特定于 JDK 的文件映射模式。 |
| jdk.sctp | 定义特定于 JDK 的 SCTP API。 |
| jdk.security.auth | 提供 javax.security.auth.* 接口和各种身份验证模块的实现。 |
| jdk.security.jgss | 定义 GSS-API 的 JDK 扩展和 SASL GSSAPI 机制的实现。 |
| jdk.xml.dom | 定义 W3C 文档对象模型 (DOM) API 的子集，该子集不是 Java SE API 的一部分。 |
| jdk.zipfs | 提供 Zip 文件系统提供程序的实现。 |

## java.base 包内容介绍

我们在开发中，最常用的就是 java.base 包，集合、工具类、常用对象、多线程都在这里。

| 包名 | 作用 |
|---|---|
| `java.io` | 提供通过数据流、序列化和文件系统进行系统输入和输出的类。 |
| `java.lang` | 提供 Java 编程语言设计基础的类。 |
| `java.lang.annotation` | 为 Java 编程语言注解功能提供库支持。 |
| `java.lang.classfilePREVIEW` | **预览版**: 提供类文件解析、生成和转换库。 |
| `java.lang.classfile.attributePREVIEW` | **预览版**: 为 `java.lang.classfilePREVIEW` 库提供描述类文件属性的接口。 |
| `java.lang.classfile.componentsPREVIEW` | **预览版**: 提供在 `java.lang.classfilePREVIEW` 库之上构建的特定组件、转换和工具。 |
| `java.lang.classfile.constantpoolPREVIEW` | **预览版**:  为 `java.lang.classfilePREVIEW` 库提供描述类文件常量池条目的接口。 |
| `java.lang.classfile.instructionPREVIEW` | **预览版**: 为 `java.lang.classfilePREVIEW` 库提供描述代码指令的接口。 |
| `java.lang.constant` | 用于表示运行时实体（如类或方法句柄）和类文件实体（如常量池条目或 invokedynamic 调用点）的名义描述符的类和接口。 |
| `java.lang.foreign` | 提供对 Java 运行时外部的内存和函数的低级访问。 |
| `java.lang.invoke` | `java.lang.invoke` 包提供了与 Java 虚拟机交互的低级原语。 |
| `java.lang.module` | 支持模块描述符并通过解析和服务绑定创建模块配置的类。 |
| `java.lang.ref` | 提供引用对象类，这些类支持与垃圾回收器进行有限程度的交互。 |
| `java.lang.reflect` | 提供用于获取有关类和对象的反射信息的类和接口。 |
| `java.lang.runtime` | `java.lang.runtime` 包为 Java 语言提供低级运行时支持。 |
| `java.math` | 提供用于执行任意精度整数算法 (`BigInteger`) 和任意精度十进制算法 (`BigDecimal`) 的类。 |
| `java.net` | 提供用于实现网络应用程序的类。 |
| `java.net.spi` | `java.net` 包的服务提供程序类。 |
| `java.nio` | 定义缓冲区（数据容器），并概述其他 NIO 包。 |
| `java.nio.channels` | 定义通道（表示与能够执行 I/O 操作的实体（如文件和套接字）的连接）; 定义选择器，用于多路复用、非阻塞 I/O 操作。 |
| `java.nio.channels.spi` | `java.nio.channels` 包的服务提供程序类。 |
| `java.nio.charset` | 定义字符集、解码器和编码器，用于在字节和 Unicode 字符之间进行转换。 |
| `java.nio.charset.spi` | `java.nio.charset` 包的服务提供程序类。 |
| `java.nio.file` | 定义 Java 虚拟机用于访问文件、文件属性和文件系统的接口和类。 |
| `java.nio.file.attribute` | 提供对文件和文件系统属性的访问的接口和类。 |
| `java.nio.file.spi` | `java.nio.file` 包的服务提供程序类。 |
| `java.security` | 提供用于安全框架的类和接口。 |
| `java.security.cert` | 提供用于解析和管理证书、证书撤销列表 (CRL) 和证书路径的类和接口。 |
| `java.security.interfaces` |  提供用于生成 RSA（Rivest、Shamir 和 Adleman 非对称密码算法）密钥（如 RSA 实验室技术说明 PKCS#1 中定义）和 DSA（数字签名算法）密钥（如 NIST 的 FIPS-186 中定义）的接口。 |
| `java.security.spec` | 提供用于密钥规范和算法参数规范的类和接口。 |
| `java.text` | 提供以独立于自然语言的方式处理文本、日期、数字和消息的类和接口。 |
| `java.text.spi` | `java.text` 包中类的服务提供程序类。 |
| `java.time` | 用于日期、时间、时刻和持续时间的主要 API。 |
| `java.time.chrono` | 适用于默认 ISO 以外的日历系统的通用 API。 |
| `java.time.format` | 提供用于打印和解析日期和时间的类。 |
| `java.time.temporal` | 使用字段和单位以及日期时间调整器访问日期和时间。 |
| `java.time.zone` | 支持时区及其规则。 |
| `java.util` | 包含集合框架、一些国际化支持类、服务加载器、属性、随机数生成、字符串解析和扫描类、base64 编码和解码、位数组以及几个其他杂项实用程序类。 |
| `java.util.concurrent` | 并发编程中常用的实用程序类。 |
| `java.util.concurrent.atomic` |  支持对单个变量进行无锁线程安全编程的一小组类。 |
| `java.util.concurrent.locks` | 提供用于锁定和等待条件的框架的接口和类，该框架不同于内置同步和监视器。 |
| `java.util.function` | 函数式接口为 lambda 表达式和方法引用提供目标类型。 |
| `java.util.jar` | 提供用于读取和写入 JAR（Java 归档）文件格式的类，该格式基于标准 ZIP 文件格式，并带有一个可选的清单文件。 |
| `java.util.random` | 此包包含支持随机数生成的通用 API 的类和接口。 |
| `java.util.regex` | 用于将字符序列与正则表达式指定的模式进行匹配的类。 |
| `java.util.spi` | `java.util` 包中类的服务提供程序类。 |
| `java.util.stream` | 支持对元素流进行函数式操作的类，例如对集合进行 map-reduce 转换。 |
| `java.util.zip` | 提供用于读取和写入标准 ZIP 和 GZIP 文件格式的类。 |
| `javax.crypto` | 提供用于加密操作的类和接口。 |
| `javax.crypto.interfaces` | 为 Diffie-Hellman 密钥提供接口，如 RSA 实验室的 PKCS #3 中定义。 |
| `javax.crypto.spec` | 提供用于密钥规范和算法参数规范的类和接口。 |
| `javax.net` | 提供用于网络应用程序的类。 |
| `javax.net.ssl` | 提供用于安全套接字包的类。 |
| `javax.security.auth` | 此包提供用于身份验证和授权的框架。 |
| `javax.security.auth.callback` | 此包提供服务与应用程序交互以检索信息（例如，包括用户名或密码的身份验证数据）或显示信息（例如，错误和警告消息）所需的类。 |
| `javax.security.auth.login` | 此包提供可插拔身份验证框架。 |
| `javax.security.auth.spi` | 此包提供用于实现可插拔身份验证模块的接口。 |
| `javax.security.auth.x500` | 此包包含应使用其在 Subject 中存储 X500 Principal 和 X500 私钥凭据的类。 |
| `javax.security.cert` | 提供用于公钥证书的类。 |

其中就有很熟悉的lang包、util包、juc包等。
