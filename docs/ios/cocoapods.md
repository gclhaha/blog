# cocoapods 安装与使用

## 文章背景

要开发一个ios端应用，因为前端只有vue的开发经验，但是没有App开发经验，考虑过使用uniapp，但是还要和另一位没有经验的小朋友（真正意义的小朋友，刚初中毕业，但是会使用chatGPT等生成式AI）共同开发，要考虑学习成本和构建成本。经过考虑使用原生swift语言，那么就需要使用cocoapods来管理第三方库，这里记录一下cocoapods的安装与使用。

## Ruby设置

因为cocopods使用ruby编写，所以需要安装ruby，这里使用的是macOS系统，所以使用的是macOS系统自带的ruby，如果是其他系统，需要自行安装ruby。

**查看ruby版本**

```bash
ruby -v
```

如果不是2.6.0以上版本，需要升级ruby版本，不然会提示安装失败

### 升级Ruby版本

```bash
sudo gem update --system
```

执行后耐心等待，时间可能会比较长，大概几分钟时间。

刷新配置
    
```bash
source ~/.bash_profile
```

## 安装cocoapods

```bash
sudo gem install cocoapods
```
执行此步骤之前，需要跟换gem源，不然会提示安装失败，可以使用下面的命令进行更换

```bash
gem sources --add https://gems.ruby-china.com/ --remove https://rubygems.org/
```

查看gem源是否更换成功

```bash
gem sources -l
```

如果显示如下内容，说明更换成功

```bash
*** CURRENT SOURCES ***
https://gems.ruby-china.com/
```

## 使用cocoapods

在项目目录下执行

```bash
pod init
```

执行后会在项目目录下生成一个Podfile文件，这个文件就是用来管理第三方库的，可以使用vim或者其他编辑器打开，内容如下

```bash
# Uncomment the next line to define a global platform for your project
# platform :ios, '9.0'

target 'your-project' do
  # Comment the next line if you don't want to use dynamic frameworks
  use_frameworks!
  
  # Pods for your-project

end
```

在`# Pods for your-project`下面添加需要的第三方库，例如添加`Sqlite.swift`，在`# Pods for your-project`下面添加

```bash 
pod 'SQLite.swift', '~> 0.12.2'
```

然后执行

```bash
pod install
```

执行后会在项目目录下生成一个`your-project.xcworkspace`文件，以后打开项目都是打开这个文件，不要打开`your-project.xcodeproj`文件，不然会报错。

## 参考

在探索过程中还进行了更改host文件，为了优化网络？

```bash
sudo vim /etc/hosts
```

在文件中添加

```bash
185.199.108.133 raw.githubusercontent.com
```


[cocoapods官网](https://cocoapods.org/)




