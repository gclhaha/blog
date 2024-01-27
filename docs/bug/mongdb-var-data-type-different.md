# MongoDB 字段中数据类型不一致序列化异常排查与处理

背景如下，因为项目迁移愿意，一个使用Mongodb的业务拥有C#和Java两组Api。Java Api开发和测试都很顺利。上线一段时间后，客服反馈记录都不见了。查看数据库发现，时间字段拥有两种格式，其中一种是数组类型（如：[636693353404905287, 480]），另一种是日期类型（如：0001-01-01T00:00:00Z）

## 排查原因

首先看了原有C#代码的逻辑，使用的是DateTimeOffset类型存入的数据库。Java使用的是LocalDateTime类型。经过调用Api测试后，发现使用C#接口创建的数据，是数组格式。接下来就是在Java中对这个Document的序列化进行处理。

## 解决方案

首先看到[636693353404905287, 480]，想到的就是时间戳，第二位应该保存的是时区。写了一个测试方法，将636693353404905287转为LocalDatetime，初步测试，将初始时间1901-01-01，时区偏移为480分钟。经过多种类型的测试，转化为了正确的时间（人工记忆创建记录的时间）。

知道了如何转化，就要在java解析时使用自定义的序列化器。

首先创建List转LocalDateTime的序列化器

```java
import org.springframework.core.convert.converter.Converter;
import org.springframework.data.convert.ReadingConverter;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;

/**
 *
 *
 * 包含如下格式脏数据，[636693353404905287, 480], 经测试是旧版c#接口导致的，并试验起始时间是"0001-01-01T00:00:00Z"
 * 并且此时间戳不需要进行时区转换
 */
@ReadingConverter
public class ArrayListToLocalDateTimeConverter implements Converter<List<Object>, LocalDateTime> {

    @Override
    public LocalDateTime convert(List<Object> source) {
        if (source.size() >= 2 && source.get(0) instanceof Long) {
            long timestamp = (Long) source.get(0);
            // 假设起始时间是"1601-01-01T00:00:00Z"，请根据需要进行调整
            Instant startInstant = Instant.parse("0001-01-01T00:00:00Z");
            // 注意：原始时间戳可能需要根据实际情况调整计算方式
            Instant actualInstant = startInstant.plusMillis(timestamp / 10_000);
            return LocalDateTime.ofInstant(actualInstant, ZoneOffset.UTC);
        }
        throw new IllegalArgumentException("Invalid source for conversion: " + source);
    }
}
```

然后在MongoDB的配置类中注册

```java
import com.mongodb.MongoClientURI;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.data.mongodb.MongoDbFactory;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.SimpleMongoDbFactory;
import org.springframework.data.mongodb.core.convert.MappingMongoConverter;
import org.springframework.data.mongodb.core.convert.MongoCustomConversions;

import java.util.Arrays;

@Configuration
public class MongoConfig {


    @Value("${spring.data.mongodb.uri}")
    private String uri;


    @Bean(name = "mongoTemplate")
    @Primary
    public MongoTemplate mongoTemplate() {
        MongoTemplate template = new MongoTemplate(mongoDbFactory());
        customizeMongoTemplate(template);
        return template;
    }

    @Bean
    @Primary
    public MongoDbFactory mongoDbFactory() {
        return new SimpleMongoDbFactory(new MongoClientURI(uri));
    }

    /**
     * 为了解决mongodb中的时间戳转换问题
     */
    @Bean
    public MongoCustomConversions mongoCustomConversions() {
        return new MongoCustomConversions(Arrays.asList(
                new ArrayListToLocalDateTimeConverter()
        ));
    }

    private void customizeMongoTemplate(MongoTemplate template) throws Exception {
        MappingMongoConverter converter = (MappingMongoConverter) template.getConverter();
        converter.setCustomConversions(mongoCustomConversions());
        converter.afterPropertiesSet();
    }

}
```

uri：其中uri时从配置文件中读取的，mongo 的数据库连接。
mongoTemplate：注入MongoTemplate，用于操作数据库。
mongoCustomConversions：注入自定义的转换器，用于将数据库中的数据转换为Java中的数据。
customizeMongoTemplate：将自定义的转换器注入到MongoTemplate中。

这种是单数据源配置，如果要有多数据源，将MongoTemplate和MongoDbFactory复制，的注入名称修改为不同的名称即可。

## 总结

经过配置，如果类型是数组，则会触发进行解析。该字段正常的数据可以直接映射。

后续会将C#的流量转发到Java接口，然后将C#接口下线。
