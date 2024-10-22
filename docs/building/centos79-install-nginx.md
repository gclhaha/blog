# CentOS 7.9 源码安装 Nginx

本博客记录了在 CentOS 7.9 上从源码编译安装 Nginx 的完整过程。

## 1. 安装必要的依赖

Nginx 依赖于一些库，我们需要先安装它们：

```bash
sudo yum update -y
sudo yum install gcc pcre-devel zlib-devel openssl-devel make wget -y
```

这些依赖分别用于：

* **gcc:** C 编译器，用于编译 Nginx 源码。
* **pcre-devel:** PCRE 库，用于正则表达式匹配。
* **zlib-devel:** zlib 库，用于压缩和解压缩。
* **openssl-devel:** OpenSSL 库，用于 SSL/TLS 支持。
* **make:** 用于构建软件。
* **wget:** 用于下载 Nginx 源码包。

## 2. 下载 Nginx 源码包

从 Nginx 官方网站下载你需要的版本。本教程以 1.24.0 为例：

```bash
wget http://nginx.org/download/nginx-1.24.0.tar.gz
```

你可以替换链接下载其他版本。

## 3. 解压源码包

```bash
tar -zxvf nginx-1.24.0.tar.gz
```

## 4. 配置编译选项

进入解压后的目录：

```bash
cd nginx-1.24.0
```

执行 `configure` 脚本，并指定安装路径和需要的模块。以下是一个示例：

```bash
./configure --prefix=/usr/local/nginx --with-http_ssl_module --with-http_v2_module --with-http_gzip_static_module
```

常用配置选项：

* `--prefix=/usr/local/nginx`: 指定 Nginx 的安装路径。
* `--with-http_ssl_module`: 启用 SSL/TLS 支持。
* `--with-http_v2_module`: 启用 HTTP/2 支持。
* `--with-http_gzip_static_module`: 启用预压缩 gzip 模块。  更多模块请参考 Nginx 文档。

## 5. 编译和安装

```bash
make
sudo make install
```

## 6. 创建 Nginx 用户和组 (可选但推荐)

为了安全起见，建议创建一个专门的用户和组来运行 Nginx：

```bash
sudo useradd -r nginx
```

## 7. 配置 systemd 服务

创建一个 systemd service 文件：

```bash
sudo vi /etc/systemd/system/nginx.service
```

将以下内容复制到文件中，并根据你的安装路径修改 `ExecStart` 和 `ExecReload` 的路径:

```ini
[Unit]
Description=The NGINX HTTP and reverse proxy server
After=network.target remote-fs.target nss-lookup.target

[Service]
Type=forking
PIDFile=/usr/local/nginx/logs/nginx.pid
User=nginx  # 使用之前创建的 nginx 用户
Group=nginx # 使用之前创建的 nginx 组
ExecStart=/usr/local/nginx/sbin/nginx
ExecReload=/usr/local/nginx/sbin/nginx -s reload
ExecStop=/usr/local/nginx/sbin/nginx -s stop
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

## 8. 启动 Nginx

```bash
sudo systemctl daemon-reload
sudo systemctl enable nginx
sudo systemctl start nginx
```

## 9. 验证安装

在浏览器中访问服务器的 IP 地址或域名，如果看到 Nginx 的欢迎页面，则表示安装成功。

## 10. 配置 Nginx

Nginx 的配置文件位于 `/usr/local/nginx/conf/nginx.conf`。 你可以根据需要修改此文件来配置你的 Web 服务器，例如设置网站根目录、添加虚拟主机等。这部分内容可以根据实际需求进行扩展。

## 11. 常用 Nginx 命令

* `nginx -t`: 测试配置文件语法。
* `nginx -s reload`: 重新加载配置文件，无需重启服务。
* `nginx -s stop`: 停止 Nginx 服务。
* `nginx -s quit`: 优雅地停止 Nginx 服务。

## 故障排除

在安装过程中可能会遇到一些问题，例如权限问题、依赖库缺失等。请仔细检查错误信息并根据提示进行调整。
