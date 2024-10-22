# 在 CentOS 7.9 源码安装 Redis

因为国内的服务器无法访问 Docker 镜像，所以需要源码编译安装 Redis。

本文记录了在 CentOS 7.9 系统上从源码安装 Redis 的完整过程。 虽然尝试了使用 systemd 管理 Redis 服务，但最终选择了使用 `redis-server /path/to/conf` 命令运行。

## 1. 安装必要的构建工具

```bash
sudo yum install gcc make libc6-dev
```

## 2. 下载 Redis 源码

```bash
wget http://download.redis.io/redis-stable.tar.gz
```

你也可以下载特定版本，将 `redis-stable.tar.gz` 替换为你需要的版本文件名。你可以在 [https://download.redis.io/releases/](https://download.redis.io/releases/) 找到所有可用的版本。

## 3. 解压并进入 Redis 目录

```bash
tar xzf redis-stable.tar.gz
cd redis-stable
```

## 4. 编译 Redis

```bash
make
```

## 5. (可选) 运行测试套件

```bash
sudo yum install tcl
make test
```

如果只是想安装 Redis，可以跳过此步骤。

## 6. 安装 Redis

```bash
sudo make install
```

## 7. 配置 Redis

1. **复制配置文件:**

```bash
sudo cp redis.conf /etc/redis/redis.conf
```

2. **修改配置文件:** 使用你喜欢的文本编辑器 (例如 vim, nano, vi) 打开 `/etc/redis/redis.conf`，并根据需要进行修改。一些常见的修改包括：

```
# 以守护进程方式运行
daemonize yes

# PID 文件位置
pidfile /var/run/redis_6379.pid

# 端口号
port 6379

# 绑定 IP 地址 (如果需要远程访问，设置为 0.0.0.0)
# bind 127.0.0.1

# 日志文件位置
logfile /var/log/redis.log

# 数据存储位置
dir /var/lib/redis/

# 保护模式 (生产环境建议开启, 并配置密码)
protected-mode yes

# 设置访问密码 (强烈建议设置)
requirepass your_strong_password
```

3. **创建 Redis 数据目录并设置权限:**

```bash
sudo mkdir -p /var/lib/redis
sudo chown redis:redis /var/lib/redis  # 如果创建了redis用户，否则使用拥有/var/lib/redis目录权限的用户和组
```

## 8. 尝试使用 Systemd 管理 Redis (但最终未成功)

虽然尝试使用 systemd 管理 Redis 服务，但由于某些原因未能成功启动。以下是尝试使用的 systemd 配置文件内容，仅供参考：

```ini
[Unit]
Description=Redis In-Memory Data Store
After=network.target

[Service]
User=redis  # 或你实际运行redis的用户，例如 root
Group=redis # 或你实际运行redis的用户组，例如 root
ExecStart=/usr/local/bin/redis-server /etc/redis/redis.conf  # 或你 Redis 二进制文件的实际路径
ExecStop=/usr/local/bin/redis-cli shutdown  # 或你 redis-cli 的实际路径
Restart=always
RestartSec=10
PIDFile=/var/run/redis_6379.pid

[Install]
WantedBy=multi-user.target
```

如果使用 systemd，需要将以上内容保存到 `/etc/systemd/system/redis.service`，然后执行以下命令：

```bash
sudo systemctl daemon-reload
sudo systemctl enable redis
sudo systemctl start redis
```

## 9. 使用 redis-server 命令运行 Redis

由于 systemd 启动失败，最终使用以下命令启动 Redis：

```bash
redis-server /etc/redis/redis.conf
```

## 10. 验证 Redis 是否运行

```bash
redis-cli ping
```

## 11.  防火墙设置

如果需要远程访问 Redis，请确保防火墙允许访问 Redis 端口 (默认 6379)。  例如，使用 firewalld：

```bash
sudo firewall-cmd --permanent --add-port=6379/tcp
sudo firewall-cmd --reload
```

或者在云服务器中配置安全组规则允许 6379 端口的访问。

## 总结

本文介绍了在 CentOS 7.9 中从源码安装和运行 Redis 的步骤，并记录了尝试使用 systemd 但最终选择使用 `redis-server` 命令运行的情况。  请记住根据你的具体需求调整配置文件，并特别注意安全设置，例如设置强密码、绑定 IP 地址和配置防火墙。
