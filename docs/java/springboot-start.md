# Spring Boot启动流程

```java
public ConfigurableApplicationContext run(String... args) {
		long startTime = System.nanoTime();
		DefaultBootstrapContext bootstrapContext = createBootstrapContext();
		ConfigurableApplicationContext context = null;
		configureHeadlessProperty();
		SpringApplicationRunListeners listeners = getRunListeners(args);
		listeners.starting(bootstrapContext, this.mainApplicationClass);
		try {
			ApplicationArguments applicationArguments = new DefaultApplicationArguments(args);
			ConfigurableEnvironment environment = prepareEnvironment(listeners, bootstrapContext, applicationArguments);
			configureIgnoreBeanInfo(environment);
			Banner printedBanner = printBanner(environment);
			context = createApplicationContext();
			context.setApplicationStartup(this.applicationStartup);
			prepareContext(bootstrapContext, context, environment, listeners, applicationArguments, printedBanner);
			refreshContext(context);
			afterRefresh(context, applicationArguments);
			Duration timeTakenToStartup = Duration.ofNanos(System.nanoTime() - startTime);
			if (this.logStartupInfo) {
				new StartupInfoLogger(this.mainApplicationClass).logStarted(getApplicationLog(), timeTakenToStartup);
			}
			listeners.started(context, timeTakenToStartup);
			callRunners(context, applicationArguments);
		}
		catch (Throwable ex) {
			handleRunFailure(context, ex, listeners);
			throw new IllegalStateException(ex);
		}
		try {
			Duration timeTakenToReady = Duration.ofNanos(System.nanoTime() - startTime);
			listeners.ready(context, timeTakenToReady);
		}
		catch (Throwable ex) {
			handleRunFailure(context, ex, null);
			throw new IllegalStateException(ex);
		}
		return context;
	}
```
这就是Spring Boot的启动流程，主要分为以下几个步骤：
1. 创建BootstrapContext：这是Spring Boot启动的第一步，BootstrapContext是一个轻量级的上下文，用于在应用程序启动过程中存储一些临时的数据。
2. 配置Headless属性：这是为了确保在没有图形环境的情况下，
3. 获取RunListeners：RunListeners是Spring Boot提供的一种机制，允许开发者在应用程序启动过程中监听各种事件，例如应用程序启动、环境准备、上下文刷新等。
4. 准备环境：在这个步骤中，Spring Boot会准备应用程序的
5. 配置IgnoreBeanInfo：这是为了优化Spring Boot的性能，避免在启动过程中加载一些不必要的Bean信息。
6. 打印Banner：Spring Boot会在启动时打印一个Banner，显示应用程序的名称和版本等信息。
7. 创建ApplicationContext：这是Spring Boot启动的核心步骤，ApplicationContext是Spring框
8. 准备上下文：在这个步骤中，Spring Boot会将BootstrapContext中的数据复制到ApplicationContext中，并且进行一些其他的准备工作，例如注册一些Bean等。
9. 刷新上下文：这是Spring Boot启动的最后一步，刷新上下文
10. 调用Runners：在应用程序启动完成后，Spring Boot会调用一些Runner接口的实现类，例如CommandLineRunner和ApplicationRunner，这些接口允许开发者在应用程序启动完成后执行一些自定义的逻辑。
11. 处理启动失败：如果在启动过程中发生了异常，Spring Boot会调用handleRunFailure方法来处理这些异常，并且记录相关的日志信息。
12. 监听应用程序就绪事件：在应用程序启动完成后，Spring Boot会监听应用程序就绪事件，并且记录相关的日志信息。
通过以上步骤，Spring Boot完成了应用程序的启动过程，并且提供了一些机制来让开发者在启动过程中进行自定义的操作，例如监听各种事件、执行一些自定义的逻辑。

