# CentOS 7.9 源码安装 PostgreSQL 17

因为国内的服务器无法访问 Docker 镜像，所以需要源码编译安装 PostgreSQL。

本文详细记录了在 CentOS 7.9 上使用中国镜像源码编译安装 PostgreSQL 17 的完整过程，并包含了过程中遇到的问题及解决方法，希望能帮助你顺利完成安装。

## 一、准备工作

1. **安装必要的依赖:**

```bash
sudo yum install -y gcc make readline-devel zlib-devel openssl-devel libxml2-devel pam-devel libicu-devel bison
```

注意：这里一次性安装了所有后续步骤可能需要的依赖，包括`libicu-devel`和`bison`，避免后续出现 configure 错误。

2. **创建用户和组:**

```bash
sudo groupadd postgres
sudo useradd -g postgres postgres
```

3. **下载源码:**

PostgreSQL 官方提供镜像无法访问，推荐使用 Tuna mirrors, 阿里云, 或清华大学开源软件镜像站。以下示例使用 Tuna mirrors：

```bash
wget https://mirrors.tuna.tsinghua.edu.cn/postgresql/source/v17.0/postgresql-17.0.tar.gz -O postgresql-17.0.tar.gz  # 请替换为最新的版本号和镜像地址
tar -xzvf postgresql-17.1.tar.gz
cd postgresql-17.0  # 请替换为实际的版本号
```

## 二、编译和安装

1. **配置:**

```bash
./configure --prefix=/usr/local/pgsql17 --with-pam --enable-nls --with-pgport=5432 --with-openssl --with-libxml
```

根据需要，你可以添加其他 configure 选项。

2. **编译:**

```bash
make
```

3. **安装:**

```bash
sudo make install
```

## 三、数据库初始化和启动

1. **创建数据目录:**

```bash
sudo mkdir /usr/local/pgsql17/data
sudo chown postgres:postgres /usr/local/pgsql17/data
```

2. **初始化数据库集群:**

```bash
sudo -u postgres /usr/local/pgsql17/bin/initdb -D /usr/local/pgsql17/data --locale=en_US.UTF-8 # 设置合适的 locale，例如 zh_CN.UTF-8
```

3. **创建 systemd 服务文件:**

创建`/etc/systemd/system/postgresql-17.service`文件，并添加以下内容（注意替换路径）：

```ini
[Unit]
Description=PostgreSQL 17 database server
After=network.target

[Service]
Type=forking
User=postgres
Group=postgres
ExecStart=/usr/local/pgsql17/bin/pg_ctl start -D /usr/local/pgsql17/data
ExecStop=/usr/local/pgsql17/bin/pg_ctl stop -D /usr/local/pgsql17/data -m fast
ExecReload=/usr/local/pgsql17/bin/pg_ctl reload -D /usr/local/pgsql17/data
KillMode=mixed
KillSignal=SIGINT
TimeoutSec=300

[Install]
WantedBy=multi-user.target
```

4. **重新加载 systemd 配置:**

```bash
sudo systemctl daemon-reload
```

5. **启动 PostgreSQL 服务:**

```bash
sudo systemctl start postgresql-17
```

6. **设置开机启动:**

```bash
sudo systemctl enable postgresql-17
```

## 四、配置远程访问

1. **修改 postgresql.conf:**

```bash
sudo vi /usr/local/pgsql17/data/postgresql.conf
```

找到`listen_addresses`，修改为：

```
listen_addresses = '*'  # 监听所有接口
```

2. **修改 pg_hba.conf:**

```bash
sudo vi /usr/local/pgsql17/data/pg_hba.conf
```

在文件末尾添加以下行,允许某些ip访问，这里直接设置所有ip允许（**生产环境请根据实际情况配置**）：

```
host    all             all             0.0.0.0/0               scram-sha-256  # 建议使用 scram-sha-256 认证方式
```

1. **重启 PostgreSQL 服务:**

```bash
sudo systemctl restart postgresql-17
```

五、防火墙设置

确保你的防火墙允许 5432 端口的访问.

```bash
sudo firewall-cmd --permanent --add-port=5432/tcp
sudo firewall-cmd --reload
```

或者使用 iptables:

```bash
sudo iptables -A INPUT -p tcp --dport 5432 -j ACCEPT
sudo iptables-save > /etc/sysconfig/iptables
```

或者在云服务器中配置安全组规则允许 5432 端口的访问。

## 六、验证安装

使用 psql 连接并查询版本信息：

```bash
sudo -u postgres /usr/local/pgsql17/bin/psql -c "SELECT version();"
```

## 七、创建用户和数据库

```sql
sudo -u postgres /usr/local/pgsql17/bin/psql
CREATE USER your_username WITH PASSWORD 'your_strong_password';  -- 创建用户并设置密码
CREATE DATABASE your_database;  -- 创建数据库
GRANT ALL PRIVILEGES ON DATABASE your_database TO your_username;  -- 授予权限
```

## 八、DBeaver 连接问题排查

如果使用 DBeaver 连接时遇到 "Connection refused" 错误，请仔细检查以下几点：

* PostgreSQL 是否监听了正确的 IP 地址和端口。
* 防火墙是否允许 5432 端口的连接。
* DBeaver 的连接配置是否正确 (主机名、端口、用户名、数据库名)。
* SELinux 是否阻止了连接 (可以使用 `setenforce 0` 临时关闭 SELinux 进行测试)。

## 九、安全建议

* **不要使用 trust 认证方式**，除非在绝对安全的本地测试环境。
* 使用强密码，并定期更改。
* 在 pg_hba.conf 中配置更严格的访问规则，限制 IP 地址和用户访问权限.
* 定期更新 PostgreSQL 版本以获取最新的安全补丁。

通过以上步骤，你应该能够在 CentOS 7.9 上成功源码编译安装 PostgreSQL 17，并进行基本的配置。请记住，数据库安全至关重要，请务必仔细配置访问权限和认证方式，以保护你的数据安全。
