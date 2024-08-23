# 构建Apple iOS应用以及Watch 应用流程与踩坑

## 背景

为了构建一个通过手表收集传感器数据，比如：陀螺仪、加速度等，同步到手机上，可以提供导出功能，以用来作为机器学习分别不同动作的数据集。 再次过程中分别经历了真机调试踩坑、上传 TestFlight采坑。

## 真机调试apple watch

要点：

- 手机开启开发者模式
- 所有设备在同一网络内
- 手表开启开发者模式，如果没有该选项，重启后再查看。可能需要重复很多次，连接手表这步花了一天多。

## Apple Store Connect

链接：[Apple Store Connect](https://appstoreconnect.apple.com/)

此网站的作用是添加app，并且进行TestFlight的分组创建，对测试、正式应用的进行分发。

必要条件：

- 拥有苹果开发者账号
- 购买开发者订阅费（688¥/元）
- 尽量使用管理员登录

### 添加配置 Bundle Identier Id 和 SKU

#### iOS

创建一个app后，要填写app信息，其中有套装id也叫Bundle Identier Id，这个创建的规则就是包名的创建规则，例如：com.apple.appname

sku呢，可以保持和Bundle Identier Id一致

主要是设置适龄年龄，软件介绍一类的内容。

#### Apple Watch

此处不需要单独配置watch的信息，如果watch的应用和iphone是绑定使用，如果iphone应用的id为com.apple.foo，那么watch的id要创建为 com.apple.foo.watchkitapp，但是还是要创建provsion file 和 专有的id

## Certificates, Identifiers & Profiles

链接： [Certificates, Identifiers & Profiles](https://developer.apple.com/account/resources/certificates/list)

此网站的作用是

1. Certificates：配置开发设备的证书
2. Identifiers：软件的id，和Apple Store Connect种设置的id要对应。iphone和watch应用都要有一份
3. Devices：注册本地调试的设备
4. Profiles： 应用的配置信息， 需要设置在项目中

## 下载 provsion File

### iOS

添加用于配置iphone应用的文件，下载到本地或通过加载网络资源来应用到项目中

### Apple Watch

添加用于配置watch应用的文件，下载到本地或通过加载网络资源来应用到项目中

## Archive

此功能用来构建用于发布的版本

在 xcode 中，选择`Product`->`Archive`

在配置开发者账号，Profile文件，id后，才能构建成功此时可以看到构建好的app，点击`Distribute App`,在Apple Store Connect中就可以看到软件，可以进行后续的分发

## 添加测试用户

在Apple Store Connect中，在TestFlight菜单下，可以添加内部测试和外部测试。内部测试通过速度较快，可以添加多位开发者，并可以选择每次构建出新版本都邮箱提醒来更新最新版本。外部测试审核比较慢，直接添加测试用户的apple id即可添加到名单中。
