# 第二期：数据库与后端代码国际化方案

## 背景描述

新工作入职前两周，目前被分配到国际化项目。将已有的后端系统代码提示，数据库基础数据进行国际化。我主要负责数据库国际化。

数据库有两个项目脚本，分别的mongo数据库和pgsql数据库的初始化脚本与数据。

项目部署的整体流程是，复制和解压压缩包（包含了Ansible环境、K8S环境，项目镜像，项目依赖中间件环境），安装基础环境。通过Ansible脚本，将基础应用和项目应用部署到K8S环境中。

其中的项目代码是未国际化的版本。

## 后端代码国际化

### 代码提示国际化

完成目标：

1. 实现代码提示国际化

个人探索方案是这样的，最终团队或者说基本上所有java后端springboot项目的国际化的通用方案。使用MessageSource和LocaleContextHolder，将国际化语言的文件放在resources下的i18n文件夹中，通过配置文件指定语言，通过LocaleContextHolder获取语言，通过MessageSource获取国际化的提示信息。

并且通过定义设置和获取Locale的方法，使用`LocaleContextHolder.setLocale(locale)`和`LocaleContextHolder.getLocale()`动态设置和获取语言。

### 数据库内容提示国际化（废弃）

此方案废弃，因为获取内容要进过一层转化服务，AOP的方式同时增大了系统的性能开销。所以数据库通过在脚本仓库中添加国际化文件，在Ansible脚本中添加国际化参数的方式，控制数据的初始化加载。

1. mongodb 查询返回结果国际化后的查询结果。实现jdbc template和mybatis的查询结果国陋化。
2. pgsql 查询结果国际化。实现jdbc template结果国际化。

定义AOP切面，增强对应的JDBC Template查询

```java
@Aspect
@Component
public class JdbcTemplateI18nAspect {

    @Resource
    private I18nResultHandler i18nResultHandler;

    @Around("execution(* org.springframework.jdbc.core.JdbcTemplate.query*(..))")
    public Object translateQueryResult(ProceedingJoinPoint joinPoint) throws Throwable {
        Object result = joinPoint.proceed();
        return i18nResultHandler.handleResult(result);
    }
}

@Component
public class I18nResultHandler {

    @Resource
    private I18nService i18nService;

    public Object handleResult(Object result) {
        if (result == null) {
            return null;
        } else if (result instanceof List) {
            return handleListResult((List<?>) result);
        } else if (result instanceof Map) {
            return handleMapResult((Map<?, ?>) result);
        } else {
            translateObject(result);
            return result;
        }
    }

    private List<?> handleListResult(List<?> results) {
        if (results != null && !results.isEmpty()) {
            for (Object result : results) {
                handleResult(result);
            }
        }
        return results;
    }

    private <K, V> Map<K, V> handleMapResult(Map<K, V> resultMap) {
        if (resultMap != null && !resultMap.isEmpty()) {
            for (Map.Entry<K, V> entry : resultMap.entrySet()) {
                Object value = entry.getValue();
                // 递归处理 Map 值
                Object translatedValue = handleResult(value);
                entry.setValue((V)translatedValue);
            }
        }
        return resultMap;
    }

    private void translateObject(Object object) {
        Class<?> clazz = object.getClass();
        Field[] fields = clazz.getDeclaredFields();
        for (Field field : fields) {
            if (field.getType() == String.class) {
                try {
                    field.setAccessible(true);
                    String value = (String) field.get(object);
                    if (value != null) {
                        String translatedValue = i18nService.translateText(value);
                        field.set(object, translatedValue);
                    }
                } catch (IllegalAccessException e) {
                    // 处理异常
                    e.printStackTrace();
                }
            }
        }
    }

}
```

```java
@Aspect
@Component
public class MongoTemplateI18nAspect {

    @Resource
    private MongoI18nResultHandler mongoI18nResultHandler;

    @Around("execution(* org.springframework.data.mongodb.core.MongoTemplate.*(..))" +
            " || execution(* org.springframework.data.mongodb.repository.MongoRepository+.*(..))")
    public Object translateQueryResult(ProceedingJoinPoint joinPoint) throws Throwable {
        Object result = joinPoint.proceed();
        return mongoI18nResultHandler.handleResult(result);
    }
}

@Component
public class MongoI18nResultHandler {

    @Resource
    private I18nService i18nService;

    public Object handleResult(Object result) {
        if (result instanceof List) {
            return handleListResult((List<?>) result);
        } else if (result instanceof Document) {
            return handleDocumentResult((Document) result);
        } else {
            // 处理其他类型，如果需要
            return result;
        }
    }

    private List<?> handleListResult(List<?> results) {
        for (Object result : results) {
            handleResult(result);
        }
        return results;
    }

    private Document handleDocumentResult(Document document) {
        for (String key : document.keySet()) {
            Object value = document.get(key);
            if (value instanceof String) {
                String translatedValue = i18nService.translateText((String) value);
                document.put(key, translatedValue);
            } else if (value instanceof List) {
                document.put(key, handleListResult((List<?>) value));
            } else if (value instanceof Document) {
                document.put(key, handleDocumentResult((Document) value));
            }
        }
        return document;
    }
}
```

## 数据库内容提示国际化

切面的方案废弃，使用脚本加载不同的国际化内容文件，实现数据的初始化。不影响程序运行时的性能。

### 前置内容：词条整理

面对两个项目的脚本文件，pgsql的脚本内容少，并且格式比较规整，都是sql后缀文件。而mongo的脚本包含了js和json文件，词条统计后有23000+个。面对巨量的工作内容，肯定要发挥工程师的特长，把重复的工作交给代码。先来整理获取的思路。

1. 给定一个项目目录，遍历其中的所有路径，把中文通过正则表达式获取到，并且跳过js、json文件的注释内容，跳过中国行政区划。
2. 把中文词条出现的文件路径、行号、中文行完整内容、中文词条，生成的国际化key（项目名_索引【中文出现的次序，不去重，即多个同名中文有不同的key，便于根据业务定制翻译】）存入excel，供翻译部使用。

至此已经能够完成我的个人任务，但是把自己放在技术提供者的角度，我可以提供更多的帮助，在识别js和json文件的同时，支持了能够扫描java文件，并且跳过Java注释以及swagger注释的功能，让其他负责更换项目提示的同学更轻松的完成任务。额外添加了三个功能。

1. 复制把中文替换为国际化key的文件，并生成新的项目文件，保持原始项目目录结构。这个对于使用IDEA插件单个替换词条的方式，效率提升很大。
2. 将go程序打包成可执行文件，直接在windows或者mac环境直接执行，只需要添加项目目录参数即可。
3. 另外写一个程序，在excel中追加通过pgt翻译的内容，存入excel，供翻译人员查看。这样就把任务变为，翻译部门寻找开发获取中文语意，从头翻译。改为，根据excel行中的完整内容，gpt翻译参考，审核翻译结果，必要情况再改正手动翻译。大大提高了翻译部门的工作效率。并且提供了中文词条当前行的完整内容，方便翻译人员理解上下文，节省了翻译部和开发人员的沟通成本。

其中go程序都是通过Gemini和ChatGPT来帮助我实现的，作为GPT时代的工程师，要更好的利用AI来提高工作效率。

### 前置内容：Ansible 脚本修改

在脚本中添加全局LANUGAGE变量，在mongo和pgsql的数据初始化shell的调用处，添加LANUAGE参数。在项目中的被调用shell接入LANGUAGE参数，根据LANGUAGE来处理国际化的逻辑。

### 方案1: 使用_en-US 后缀存放文件，脚本中根据LANUGAGE参数加载不同的文件（废弃）

第一个方案就是，文件夹目录不做改动和添加。使用go程序，将翻译部翻译后的文件，根据项目路径，行数，中文内容，匹配到项目中的原始内容，生成添加_en-US等语言的文件，并做内容替换。这样就有了a.js和a_en-US.js两个文件，其中a.js是原始文件，a_en-US.js是国际化文件。

现在有了国际化版本的文件，在脚本中添加逻辑，如果参数LANGUAGE没有值，则加载默认的文件。如果LANUGAGE有值，但是没有找到对应的文件，则同样加载没有后缀的文件。如果找到了对应的文件，则加载对应的文件。也就是说没有中文的文件，是不会有有_en-US的文件的。

因为在数据库操作的脚本执行中，存在对文件名的切割，来区分数据库和数据表，修改文件名导致了截取错误。并且在LANGUAGE有值时，要判断的条件很多，也存在不稳定的情况，脚本的可读性下降了太多，此方案废弃。

### 方案2: 使用en-US文件夹存放文件，脚本中根据LANUGAGE参数加载不同的目录（最终方案）

使用_en-US后缀的方案，在自测阶段遇到了数据重复执行，数据缺失执行的问题，虽然在脚本汇中添加了日志输出，能够看到错误，但是这种方案并不是最好的方式，并且如果随着未来有了更多语言版本的支持，一个文件夹中的文件就会增长的太快，不利于维护。

经过思考，如果像Next.js一样，使用文件夹来实现路由，那么脚本的执行，也可以通过文件夹的路径来区分不同的语言文件。对负责人说了我的想法，觉得这个方案可以尝试，就开始了第二个方案的执行。

首先改造go程序，原先是在文件夹路径下生成_en-US文件，改为在上层en-US文件夹下生成文件。这样所有包含中文的文件就通过excel创建了en-US文件夹，文件内容也进行了替换。其中的文件名不变，这样就避免了对脚本的重要逻辑进行改动。

现在包含中文的文件都在en-US文件夹中了，但是文件如果不在excel里，也就是说文件中没有中文，那么是不在en-US文件夹中的。其中一些常量的js文件或者当前版本使用的公共js文件，为了避免脚本去其他路径加载文件，以及对脚本的大改动。再写一个go脚本，遍历项目目录，如果当前文件夹中的文件不在en-US文件夹中，就复制到en-US文件夹中。这样就保证了所有的文件都在en-US文件夹中。

现在再对脚本进行改动，只需要根据LANGUAGE参数，追加扫描的文件路径，实现动态加载不同语言的文件夹。脚本判断逻辑基本没有改动。经过测试，数据完整性和代码可读性、可维护性都有了很大的提升。

通过把逻辑从脚本中的判断，放在通过项目结构的方式解决，并且即使忘记在Ansible中添加参数，也能加载原始的文件，方案更加的优雅。这个方案缺点就是不需要国际化的文件也要创建一份，增加了一点代码量，但是带来的好处是值得的。

### 增量代码国际化

如果主分支的代码进行了追加内容，通过go脚本，先读取缓存原始翻译的excel，再遍历最新的项目文件，扫描其中的中文内容是否出现，如果不存在，就追加到新的excel中，再通过原先的GPT翻译脚本，追加到翻译内容列。最后将两个excel中的内容合并，就实现了增量的国际化。

## PS： 为什么使用go来写脚本

1. go的项目启动成本很低，如果不严格按照go module的方式，只需要一个main.go文件，就可以运行。
2. go的类型限制和java一样是强类型，不像python是弱类型，主要也是没那么熟悉python，至少生成的脚本要达到自己能理解的程度。另外包引用不需要maven这种仓库工具，直接通过import就可以使用。

总体来讲，使用go开发成本很小，不用像java一样创建一个maven项目。也可以原生编译出可执行文件，方便在不同的环境中执行。文件大小也很小。总体下来，对我来说，如果是开发中提效的脚本，go是一个非常甜点的选择，爱不释手。在完整或者大型项目开发中，我也是会优先选择go来实现，引入一些Gin、Viper、Gorm等库，或者直接使用Gin-Vue-Admin项目模版（类似Java的Ruoyi），就可以快速的开发出一个完整的项目，最终包大小也很适合容器化和云原生部署。
