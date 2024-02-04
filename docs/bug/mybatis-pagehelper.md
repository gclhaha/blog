# Mybatis PageHelper 异常 attempted to return null from a method with a primitive return type (long) 问题分析

## 问题背景

某天工程师群里发了个分页的问题，当时我手头没有急的工作，就帮忙看了下。一开始看到分页的字段使用的比较特殊，经过调整统一后，发现接口在第二页直接返回了错误：attempted to return null from a method with a primitive return type (long)。

## 问题分析

业务代码中主要逻辑就两个，一个是查询符合条件的记录数量 `countByExample` ，另一个是查询符合条件的记录 `selectByExample` 。这两个方法都是使用mybatis generator生成的代码，所以我就直接看了下生成的代码。
`countByExample`的返回值是long基本数据类型。但是错误提示返回了null。

经过排查后，发现Mybatis源码中PageHelper作为一个插件存在，是一个拦截器。会在每次query类型的方法执行时进行拦截，最后执行clear方法，清空分页。以下是部分关键源码：

```java
/**
 * Mybatis - 通用分页拦截器
 * <p>
 * GitHub: https://github.com/pagehelper/Mybatis-PageHelper
 * <p>
 * Gitee : https://gitee.com/free/Mybatis_PageHelper
 *
 * @author liuzh/abel533/isea533
 * @version 5.0.0
 */
@SuppressWarnings({"rawtypes", "unchecked"})
@Intercepts(
        {
                @Signature(type = Executor.class, method = "query", args = {MappedStatement.class, Object.class, RowBounds.class, ResultHandler.class}),
                @Signature(type = Executor.class, method = "query", args = {MappedStatement.class, Object.class, RowBounds.class, ResultHandler.class, CacheKey.class, BoundSql.class}),
        }
)
public class PageInterceptor implements Interceptor {
    private volatile Dialect dialect;
    private String countSuffix = "_COUNT";
    protected Cache<String, MappedStatement> msCountMap = null;
    private String default_dialect_class = "com.github.pagehelper.PageHelper";

    @Override
    public Object intercept(Invocation invocation) throws Throwable {
        try {
            Object[] args = invocation.getArgs();
            MappedStatement ms = (MappedStatement) args[0];
            Object parameter = args[1];
            RowBounds rowBounds = (RowBounds) args[2];
            ResultHandler resultHandler = (ResultHandler) args[3];
            Executor executor = (Executor) invocation.getTarget();
            CacheKey cacheKey;
            BoundSql boundSql;
            //由于逻辑关系，只会进入一次
            if (args.length == 4) {
                //4 个参数时
                boundSql = ms.getBoundSql(parameter);
                cacheKey = executor.createCacheKey(ms, parameter, rowBounds, boundSql);
            } else {
                //6 个参数时
                cacheKey = (CacheKey) args[4];
                boundSql = (BoundSql) args[5];
            }
            checkDialectExists();
            //对 boundSql 的拦截处理
            if (dialect instanceof BoundSqlInterceptor.Chain) {
                boundSql = ((BoundSqlInterceptor.Chain) dialect).doBoundSql(BoundSqlInterceptor.Type.ORIGINAL, boundSql, cacheKey);
            }
            List resultList;
            //调用方法判断是否需要进行分页，如果不需要，直接返回结果
            if (!dialect.skip(ms, parameter, rowBounds)) {
                //判断是否需要进行 count 查询
                if (dialect.beforeCount(ms, parameter, rowBounds)) {
                    //查询总数
                    Long count = count(executor, ms, parameter, rowBounds, null, boundSql);
                    //处理查询总数，返回 true 时继续分页查询，false 时直接返回
                    if (!dialect.afterCount(count, parameter, rowBounds)) {
                        //当查询总数为 0 时，直接返回空的结果
                        return dialect.afterPage(new ArrayList(), parameter, rowBounds);
                    }
                }
                resultList = ExecutorUtil.pageQuery(dialect, executor,
                        ms, parameter, rowBounds, resultHandler, boundSql, cacheKey);
            } else {
                //rowBounds用参数值，不使用分页插件处理时，仍然支持默认的内存分页
                resultList = executor.query(ms, parameter, rowBounds, resultHandler, cacheKey, boundSql);
            }
            return dialect.afterPage(resultList, parameter, rowBounds);
        } finally {
            if(dialect != null){
                dialect.afterAll();
            }
        }
    }
}
```

dialect.afterAll(); 会清空分页信息。


而在业务代码中，因为PageHelper下方调用的是`countByExample`，PageHelper已经clear了，所以在`selectByExample`执行时，PageHelper已经失效。但是这样的情况也只是会导致分页查询不生效，不会导致返回null的问题。

null的原因是`countByExample`被PageHelper拦截，但是无法被正常的分页，返回了null

## 解决方案

将Pagehelper紧跟在要分页的查询前，并且每次进行分页查询时都要重新设置PageHelper。避免出现PageHelper下方跟的是count方法。

正确示例

```java
long count = yourEntityMapper.countByExample(example);

PageHelper.startPage(pageNum, pageSize);
List<YourEntity> list = yourEntityMapper.selectByExample(example);
```

错误示例

```java
PageHelper.startPage(pageNum, pageSize);

long count = yourEntityMapper.countByExample(example);
List<YourEntity> list = yourEntityMapper.selectByExample(example);
```
