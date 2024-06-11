# CentOS 7.9 安装 Redis 7.2.5

在项目初期如果想低预算搭建整套后端运行环境，可以寻找免费试用，或者All in one，在一台服务器中搭建数据库，缓存，后端服务，Nginx。本篇只记录搭建Redis的各种命令。不是阿里云Redis数据库买不起，而是自建Redis更有性价比。如果你拥有一台轻量服务器或者ECS服务器，且没有免费可空，可以在服务器中安装需要的软件。

## 1.下载Redis 源文件

使用yum，获取的版本太低。使用源码获取。

找个自己想要安装的路径 在 **～** 也可以

1. 下载压缩文件

    ```bash
    sudo wget http://download.redis.io/releases/redis-7.2.5.tar.gz
    ```

    在[各版本Redis下载地址](http://download.redis.io/releases)可以看到所有可用版本，看需下载。

## 2.编译安装Redis

1. 使用 `tar` 命令解压缩下载的源代码包。

    ```bash
    tar xzf redis-7.2.5.tar.gz
    ```

2. 进入文件夹

    ```bash
    cd redis-7.2.5
    ```

3. 编译

    ```bash
    make
    ```

4. 运行测试，查看make是否完善（可选）

    ```bash
    make test
    ```

    执行命令后可能会提示错误，`You need tcl 8.5 or newer in order to run the Redis test
    make[1]: *** [Makefile:391: test] Error 1
    make[1]: Leaving directory '/root/redis-6.2.6/src'
    make: *** [Makefile:6: test] Error 2`是因为系统没有安装 Tcl 8.5 或更新的版本，执行以下命令安装

    下载 Tcl 源代码

    ```bash
    wget https://prdownloads.sourceforge.net/tcl/tcl8.6.11-src.tar.gz
    tar xzf tcl8.6.11-src.tar.gz
    cd tcl8.6.11
    ```

    编译和安装 Tcl

    ```bash
    cd unix
    ./configure
    make
    sudo make install
    ```

    验证安装

    ```bash
    tclsh8.6
    ```

    重新运行测试

    ```bash
    cd /root/redis-6.2.6
    cd src
    make test
    ```

5. 安装 Redis

    ```bash
    sudo make install
    ```

## 3.配置Redis

1. 复制默认配置文件到 /etc 目录

    ```bash
    sudo mkdir /etc/redis
    sudo cp redis.conf /etc/redis
    ```

2. 编辑内容

     ```bash
    sudo vim /etc/redis/redis.conf
    ```

    其中要改的几个关键的，可以通过 `/` 后面跟关键词搜索，回车后会匹配第一个内容。

    `n` 或 `N` 切换下一个或上一个匹配的内容。

    1. requirepass 。设置密码，requirepass xxx 。xxx就是你的密码
    2. daemonize 。默认no 改为 yes 。 开启后台运行
    3. bind 。 默认 127 ，只有本级能访问。注释掉，或者 改为 bind 0.0.0.0 。允许所有ip访问。

   保存退出。

## 4.启动Redis

给Redis权限

```bash
sudo chown redis:redis /etc/redis/redis.conf
sudo chown -R redis:redis /var/lib/redis
```

编译Redis后，进入 `/usr/local/bin`, 可以看到redis-server,redis-cli,redis-benchmark

执行`redis-server /etc/redis/redis.conf`指定配置文件。

不在下载地方的redis-server中运行，因为踩了个坑`Permission denied (publickey,gssapi-keyex,gssapi-with-mic).`。可以先在下载好的地方尝试运行，如果正常启动就不用切换目录.

## 5.测试Redis

服务器内打开终端

```bash
redis-cli
AUTH xxx xxx是你的密码
```

req

```bash
ping
```

resp

```bash
Pong
```

则本地正常，测试远程的时候，要有公网ip，并开启redis端口访问，默认6379。

用redis manager连接测试，显示版本信息和数据即代表正常。

## 踩坑总结

1. 使用yum无法获取最新版Redis，yum源更新不成功。故使用wget获取，源码安装。

2. 在下载的地址执行运行redis-server报错，去/usr/local/bin运行redis-server，权限问题。
