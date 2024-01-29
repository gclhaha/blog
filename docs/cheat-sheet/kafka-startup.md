# 搭建kafka测试环境

## 启动zookeeper

```bash
docker pull bitnami/zookeeper
```

```bash
docker run -d --name zookeeper \
    -e ALLOW_ANONYMOUS_LOGIN=yes \
    bitnami/zookeeper:latest
```

## 启动kafka

创建网络与连接

```bash
docker network create kafka-network
docker network connect kafka-network zookeeper
docker network connect kafka-network kafka
```

安装kafka

```bash
docker pull bitnami/kafka
```

启动kafka

```bash
docker run -d --name kafka --network kafka-network \
    -e KAFKA_ZOOKEEPER_CONNECT=zookeeper:2181 \
    -e KAFKA_LISTENERS=PLAINTEXT://:9092 \
    -e KAFKA_ADVERTISED_LISTENERS=PLAINTEXT://kafka:9092 \
    -e KAFKA_HEAP_OPTS="-Xmx512M -Xms512M" \
    -p 9092:9092 bitnami/kafka
```

在这个命令中，KAFKA_HEAP_OPTS 环境变量用于限制 Kafka 使用的 JVM 堆内存大小。
