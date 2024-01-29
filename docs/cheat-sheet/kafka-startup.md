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

## 使用Docker Compose

使用 Docker Compose 的优点之一就是它管理了网络和服务之间的依赖关系，使得整个过程更加简洁和自动化。

创建一个Docker Compose 文件，名称为 docker-compose-kafka-dev.yml

```bash
version: '3'

services:
  zookeeper:
    image: bitnami/zookeeper:latest
    environment:
      - ALLOW_ANONYMOUS_LOGIN=yes
    networks:
      - kafka-network

  kafka:
    image: bitnami/kafka:latest
    environment:
      - KAFKA_ZOOKEEPER_CONNECT=zookeeper:2181
      - KAFKA_LISTENERS=PLAINTEXT://:9092
      - KAFKA_ADVERTISED_LISTENERS=PLAINTEXT://localhost:9092
      - KAFKA_HEAP_OPTS=-Xmx512M -Xms512M
    ports:
      - "9092:9092"
    depends_on:
      - zookeeper
    networks:
      - kafka-network

networks:
  kafka-network:
    driver: bridge

```

启动容器

```bash
docker compose -f docker-compose-kafka-dev.yml up -d
```

### 创建topic

进入容器

```bash
docker exec -it [KAFKA_CONTAINER_NAME] /bin/bash
```

KAFKA_CONTAINER_NAME 可使用 `docker ps` 查看

创建topic

```bash
kafka-topics.sh --create --topic your-topic-name --bootstrap-server localhost:9092 --partitions 1 --replication-factor 1
```

查看topic

```bash
kafka-topics.sh --list --bootstrap-server localhost:9092
```

## 代码示例

生产者
/provider/main.go

```go
package main

import (
	"fmt"
	"log"
	"net/http"

	"github.com/Shopify/sarama"
)

var producer sarama.SyncProducer

func main() {
	var err error
	producer, err = sarama.NewSyncProducer([]string{"localhost:9092"}, nil)
	if err != nil {
		log.Fatalf("Error creating Kafka producer: %s", err)
	}
	defer producer.Close()

	http.HandleFunc("/send", sendMessage)
	log.Fatal(http.ListenAndServe(":8080", nil))
}

func sendMessage(w http.ResponseWriter, r *http.Request) {
	message := r.URL.Query().Get("message")
	if message == "" {
		http.Error(w, "Missing message", http.StatusBadRequest)
		return
	}

	_, _, err := producer.SendMessage(&sarama.ProducerMessage{
		Topic: "your-topic-name",
		Value: sarama.StringEncoder(message),
	})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	fmt.Fprintf(w, "Message sent: %s", message)
}
```

消费者
/consumer/main.go

```go
package main

import (
	"fmt"
	"log"

	"github.com/Shopify/sarama"
)

func main() {
	consumer, err := sarama.NewConsumer([]string{"localhost:9092"}, nil)
	if err != nil {
		log.Fatalf("Error creating Kafka consumer: %s", err)
	}
	defer consumer.Close()

	partitionConsumer, err := consumer.ConsumePartition("your-topic-name", 0, sarama.OffsetNewest)
	if err != nil {
		log.Fatalf("Error creating Kafka partition consumer: %s", err)
	}
	defer partitionConsumer.Close()

	for message := range partitionConsumer.Messages() {
		fmt.Printf("Received message: %s\n", string(message.Value))
	}
}

```

测试请求

```bash
curl localhost:8080/send?message=hello
```

终端返回： Message sent: hello

消费者控制台输出： Received message: hello
