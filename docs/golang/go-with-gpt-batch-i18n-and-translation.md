# 使用Go + GPT实现批处理国际化与翻译

## 背景

入职新公司锐捷网络，先是加入了一个国际化项目，目的是把国内的产品推向海外。我的任务是对数据库的初始化脚本进行国际化，具体的实现过程可以看这篇文章[数据库内容提示国际化](../eaasy/eaasy-2.md)。

## 实现

接到任务以后，首先评估一下工作量，使用IDEA的正则搜索有23000+个中文词条，如果手动替换，要花费很长时间。作为程序员的第一反应就是用过批处理来解决问题，因为在前公司生意专家工作期间，指导过实习生通过GPT把整个项目添加了注释，并且保证了代码逻辑没有被破坏，整体的质量也是合格的。

首先分解任务，如果要实现Java的代码国际化，首先把所有词条内容标记出来，并生成替换为国际化Key的版本，这样就可以把国际化Key存入Resources文件夹，通过MessageResource，再把国际化Key的版本的Java文件前后追加MessageResource调用代码，基本上就实现了Java代码的国际化。

再说我的数据库脚本实现，首先，第一个脚本，使用GPT把思路描述和要的最终结果，可以提取所有中文词条的位置。提取到一个excel中，每行内容都是一个中文词条，其中保存了文件路径、行号、当前行完整内容、中文内容、国际化Key。第二个脚本，使用Gemini的json模式，把中文内容读取出来，循环调用api方法，并返回规定的格式，再匹配excel中的中文内容，进行翻译的填充。第三个脚本，读取exce中的内容，生成新的文件，存入项目中，其中第一个方案是在原文件目录添加_en-US后缀文件，第二个方案是在en-US文件夹中生成文件，修改GPT prompt即可实现变动。

这样通过三个脚本，实现了中文内容的提取、翻译、替换。

最终人工过一遍，看自己的en-US目录中，除了注释是否还有中文。

最后就是执行脚本，通过执行脚本日志，数据库与其他数据库对比表数量和数据条数，以及通过项目页面，查看翻译内容。其中遇到了脚本执行报错，遗漏中文未翻译的情况。其中对比数据库的实现，也是通过GPT写go程序来实现，把两个数据源声明，将两个数据源中所有表取并集，查询所有表和数据条数，输出到excel中。

## 总结

通过GPT+go脚本的方式，轻量话的实现了国际化的任务，虽然其中有一些细节是要人工细致的去把控结果，还是大大节省了时间。中间还是有一些工作内容可以提前优化，比如一开始脚本执行没有日志，难以看到执行中的细节，后来添加了统一的日志方法，把执行的文件，操作的数据库、数据表都打印出来，同时把mongo语句和pgsql语句的输出也打印出来，更快的发现问题。国际化的方案经过一次重写，第一版等于浪费了3到5天的时间，多花时间思考一下，看一下已有的项目内容，能更好的找到一个更合适的方案来实现，低成本又利于维护。