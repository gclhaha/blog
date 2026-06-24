# 补救 构建监控平台查看系统运行与SQL执行情况

关于系统的可观测性，有logs（日志），traces（跟踪），metrics（指标）。

系统频繁宕机，可能的原因有：1.慢sql；2.代码语法调用低级，如循环调用外部api；3.循环调用sql语句。

为了从系统情况和代码两个层面对系统进行监控，需要通过log，traces，metrics来监控系统。

此篇不是说明搭建，而是对系统排查的过程进行记录和总结，提供一些参考参考。

## Prometheus、Grafana展示监控数据

在23年中下旬，遇到频繁宕机时，其中最严重的导致系统停机4、5个小时以上。当前公司内部只有ELK和Zipkin，可以查看细致的日志和调用链，但是无法查看系统当前的运行情况。所以搭建了指标系统，对服务器和重要服务进行监控。当发现系统负载较高是，可以排查到是具体的哪个服务产生了异常导致系统雪崩。进而可以使用zipkin和log进行细化排查。

## logs 搭建ELK（Elastic Search、Logstash、Kibana）构建日志监控系统

在入职公司时，已经搭建了ELK系统，可以通过Kibana监控系统的日志，分析错误。

### 切换数据源为druid，监控慢sql

当系统宕机，只看到满屏的服务降级，没有办法找到改进的方向。当前系统使用的是springboot默认的数据库连接HikariCP。HikariCP的性能比druid好，但是功能没有druid强大，我们需要对sql进行监控来调优。对部分系统服务更换druid也没有产生性能问题，就把所有的系统进行了更换。更换druid后，可以打开druid的打印sql功能，通过日志监控sql执行情况，也可以通过druid提供的监控面板对慢sql进行排序。

通过此举，除了部分统计sql优化比较困难，其余的慢sql都得到了优化。

## traces 使用Zipkin对调用链进行监控

除了优化sql外，代码因为个人能力，或者工期等原因，其中部分代码存在质量问题。

在入职公司时，已经搭建了zipkin，通过zipkin，可以查看调用时长最长的接口，再查看源码，寻找缓慢的原因。

如果肉眼无法查看到问题，可以通过arthas进行排查。

### arthas 阿里开源的java诊断工具

[arthas](https://arthas.aliyun.com/)是阿里开源的java诊断工具，可以通过arthas对java应用进行诊断，包括查看方法调用，修改变量值，查看线程状态等。

通过arthas提供的[IDEA插件](https://plugins.jetbrains.com/plugin/13581-arthas-idea)，生成trace命令，查看长耗时的部分，再进行优化。

## 总结

通过新搭建的promutheus，结合已有的ELk和Zipkin。并且切换为druid连接池提供有意义的慢sql日志信息。结合arthas进行代码排查。
