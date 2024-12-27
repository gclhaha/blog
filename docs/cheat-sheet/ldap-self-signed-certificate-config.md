# OpenLDAP 安装以及自签名证书配置

LDAP 是一种基于 TCP/IP 协议的轻量级目录访问协议，用于在网络中提供一个通用的目录服务。LDAP 服务器使用 X.509 证书进行身份验证和加密通信。我们可以在服务器上部署OpenLDAP，OpenLDAP 是一个开源的 LDAP 服务器，部署后可以使用 LDAP 协议进行用户认证和授权。这次的工作任务是支持 LDAP SSL 功能。

使用服务器 Ubuntu 22.04.3 LTS

## 前置 部署 OpenLDAP

删除已有服务

```shell
sudo apt-get remove --purge slapd ldap-utils -y
```

安装服务

```shell
sudo apt-get install slapd ldap-utils
```

```shell
#由于默认安装是没有指定domain的，所以执行以下命令，相当于对ldap重新配置，也需要重新设置admin账号密码
dpkg-reconfigure slapd
```

此时会弹出配置选项,提供一些参考

```txt
Omit OpenLDAP server configuration? No
DNS domain name: example.com
Organization name: example
Administrator password: <密码>
Confirm password: <密码>
Do you want the database to be removed when slapd is purged? No
Move old database? Yes
```

```shell
#查询配置信息
slapcat | grep -n -e ""

#关闭slapd服务
sudo service slapd stop

# 启动slapd服务
sudo service slapd start
```

添加和修改数据或者配置，都要使用ldap的命令，执行ldid文件来实现

```shell
# 创建用户组数据配置文件
vim defaultOU.ldif

# 默认的用户组
dn: ou=Users,dc=example,dc=com
objectClass:organizationalUnit
ou: Users

dn: ou=Groups,dc=example,dc=com
objectClass: organizationalUnit
ou: Groups

# 执行添加
ldapadd -x -D 'cn=admin,dc=example,dc=com' -w <密码> -f defaultOU.ldif
```

```shell
# 创建用户数据配置文件
vim xx0.ldif

## 用户数据
dn: uid=xx0,ou=Users,dc=example,dc=com
objectClass: person
objectClass: organizationalPerson
objectClass: inetOrgPerson
objectClass: posixAccount
uid: xx0
cn: xx0
sn: yy0
displayName: xx0 yy0
givenName: xx0
mail: xx0@example.com
uidNumber: 10000
gidNumber: 5000
userPassword: 111
gecos:
loginShell: /bin/bash
homeDirectory: /home/xx0

# 执行添加
ldapadd -x -D 'cn=admin,dc=example,dc=com' -w <密码> -f xx0.ldif
```

测试xx0用户查询

```shell
ldapsearch -x -b 'dc=example,dc=com' -D 'cn=admin,dc=example,dc=com' -w <密码> -H ldap://localhost:389
```

## CA 生成私钥

```shell
openssl genrsa -out CA.key 2048
```

## CA 生成证书

```shell
openssl req -x509 -new -nodes -key CA.key -sha256 -days 1024 -out CA.pem
```

## 服务器生成私钥

```shell
openssl genrsa -out ldap.key 2048
```

## 服务器生成请求证书

```shell
openssl req -new -key ldap.key -out ldap.csr
```

## CA给服务器颁发证书

此时可以制定一下证书的SAN配置，这样才可以支持IP和域名访问。否则会产生SSlShakeHand错误和PKIX验证错误。

```shell
# 创建配置文件
vim openssl.cnf
```

```shell
[ req ]
default_bits        = 2048
default_md          = sha256
distinguished_name  = req_distinguished_name
x509_extensions     = v3_req
prompt              = no

[req_distinguished_name]
C = CN  # 国家代码
ST = ShangHai  # 省份
L = ShangHai   # 城市
O = RuiShan  # 组织
OU = Example CA  # 组织单位
CN = My Root CA # 通用名称（CA名称）

[req_ext]
subjectAltName = @alt_names

[ v3_req ]
basicConstraints = CA:FALSE
keyUsage = digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = #服务器域名 有则设置，没有则删除此行
IP.1 = #服务器IP
```

```shell
openssl x509 -req -in ldap.csr -CA CA.pem -CAkey CA.key -CAcreateserial -out ldap.crt -days 1460 -sha256 -extfile openssl.cnf -extensions v3_req
```

### 验证证书中的 SAN 信息

```shell
openssl x509 -in ldap.crt -text -noout
```

在输出中查找以下部分，确认 SAN 已正确配置：

```shell
X509v3 Subject Alternative Name:
    DNS:<域名>, IP Address:<服务器ip>
```

## 配置LDAP开启TLS

```shell
# 拷贝证书到指定目录
cp ldap.key ldap.crt CA.pem /etc/ldap/certs/

chown -R openldap:openldap /etc/ldap/certs/
```

LDAP开启TLS

```shell
#新建一个certs.ldif
vim certs.ldif

# 配置内容
dn: cn=config
changetype: modify
replace: olcTLSCACertificateFile
olcTLSCACertificateFile: /etc/ldap/certs/CA.pem
-
replace: olcTLSCertificateKeyFile
olcTLSCertificateKeyFile: /etc/ldap/certs/ldap.key
-
replace: olcTLSCertificateFile
olcTLSCertificateFile: /etc/ldap/certs/ldap.crt

#执行命令
sudo ldapmodify -Y EXTERNAL -H ldapi:/// -f certs.ldif

#开启ldaps监听
vim /etc/default/slapd
#将SLAPD_SERVICES修改为
SLAPD_SERVICES="ldap:/// ldapi:/// ldaps:///"

#重启ldap服务
systemctl restart slapd

#验证
systemctl status slapd
```

## 自签名CA证书导入 Java版

首先我们来梳理一下整个流程：首先给LDAP配置了自签名CA.pem、ldap.key、ldap.cr，如果使用工具客户端连接（比如Java程序），jdk中的信任库是不认识这个自签名CA.pem的，所以需要将CA.pem导入到jdk的信任库中。可以使用`keytool`导入到`cacerts`中。但是更好的方式是使用代码动态导入，这样不需要手动导入。

以springboot为例，使用ApplicationStartedEvent注入自签名证书

```java
import org.springframework.boot.context.event.ApplicationStartedEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import javax.net.ssl.SSLContext;
import javax.net.ssl.TrustManager;
import javax.net.ssl.TrustManagerFactory;
import javax.net.ssl.X509TrustManager;
import java.io.FileInputStream;
import java.security.KeyStore;
import java.security.cert.Certificate;
import java.security.cert.CertificateFactory;

@Component
public class CustomTrustStoreLoader {
    // 使用 JKS 格式的信任库
    private static final String TRUST_STORE_TYPE = "JKS";
    // 默认密码，可自定义
    private static final String TRUST_STORE_PASSWORD = "changeit";
    // 自签名 CA 证书路径
    private static final String CA_CERT_PATH = "/path/to/CA.pem";

    @EventListener(ApplicationStartedEvent.class)
    public void getSingleSocketFactory() {
        System.out.println("ApplicationStartedEvent!!!!!");
        try {
            // 1. 加载默认的信任库
            TrustManagerFactory trustManagerFactory = TrustManagerFactory.getInstance(TrustManagerFactory.getDefaultAlgorithm());
            trustManagerFactory.init((KeyStore) null);

            // 2. 加载自定义 CA 证书
            CertificateFactory certificateFactory = CertificateFactory.getInstance("X.509");
            try (FileInputStream fis = new FileInputStream(CA_CERT_PATH)) {
                Certificate caCertificate = certificateFactory.generateCertificate(fis);

                // 创建新的信任库并将自定义证书加入
                KeyStore customTrustStore = KeyStore.getInstance(TRUST_STORE_TYPE);
                customTrustStore.load(null, TRUST_STORE_PASSWORD.toCharArray());
                customTrustStore.setCertificateEntry("custom-ca", caCertificate);

                // 3. 合并默认信任库和自定义信任库
                TrustManager[] defaultTrustManagers = trustManagerFactory.getTrustManagers();
                TrustManager[] customTrustManagers = createCombinedTrustManagers(defaultTrustManagers, customTrustStore);

                // 4. 设置自定义 SSL 上下文
                SSLContext sslContext = SSLContext.getInstance("TLS");
                sslContext.init(null, customTrustManagers, new java.security.SecureRandom());
                SSLContext.setDefault(sslContext);

                System.out.println("Custom CA certificate has been added to the trust store.");
            }
            System.out.println("ApplicationStartedEvent ready!!!!!");
        } catch (Exception e) {
            throw new RuntimeException("Failed to load custom CA certificate", e);
        }
    }

    private TrustManager[] createCombinedTrustManagers(TrustManager[] defaultTrustManagers, KeyStore customTrustStore) throws Exception {
        TrustManagerFactory customTrustManagerFactory = TrustManagerFactory.getInstance(TrustManagerFactory.getDefaultAlgorithm());
        customTrustManagerFactory.init(customTrustStore);

        TrustManager[] customTrustManagers = customTrustManagerFactory.getTrustManagers();
        if (defaultTrustManagers.length == 1 && defaultTrustManagers[0] instanceof X509TrustManager &&
                customTrustManagers.length == 1 && customTrustManagers[0] instanceof X509TrustManager) {
            // 合并默认和自定义信任管理器
            X509TrustManager combinedTrustManager = new CombinedX509TrustManager(
                    (X509TrustManager) defaultTrustManagers[0],
                    (X509TrustManager) customTrustManagers[0]
            );
            return new TrustManager[]{combinedTrustManager};
        }
        return customTrustManagers;
    }

    private static class CombinedX509TrustManager implements X509TrustManager {
        private final X509TrustManager defaultManager;
        private final X509TrustManager customManager;

        public CombinedX509TrustManager(X509TrustManager defaultManager, X509TrustManager customManager) {
            this.defaultManager = defaultManager;
            this.customManager = customManager;
        }

        @Override
        public void checkClientTrusted(java.security.cert.X509Certificate[] chain, String authType) throws java.security.cert.CertificateException {
            try {
                defaultManager.checkClientTrusted(chain, authType);
            } catch (java.security.cert.CertificateException e) {
                customManager.checkClientTrusted(chain, authType);
            }
        }

        @Override
        public void checkServerTrusted(java.security.cert.X509Certificate[] chain, String authType) throws java.security.cert.CertificateException {
            try {
                defaultManager.checkServerTrusted(chain, authType);
            } catch (java.security.cert.CertificateException e) {
                customManager.checkServerTrusted(chain, authType);
            }
        }

        @Override
        public java.security.cert.X509Certificate[] getAcceptedIssuers() {
            java.security.cert.X509Certificate[] defaultIssuers = defaultManager.getAcceptedIssuers();
            java.security.cert.X509Certificate[] customIssuers = customManager.getAcceptedIssuers();
            java.security.cert.X509Certificate[] combined = new java.security.cert.X509Certificate[defaultIssuers.length + customIssuers.length];
            System.arraycopy(defaultIssuers, 0, combined, 0, defaultIssuers.length);
            System.arraycopy(customIssuers, 0, combined, defaultIssuers.length, customIssuers.length);
            return combined;
        }
    }


}
```

spring ldap 依赖

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-ldap</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.ldap</groupId>
    <artifactId>spring-ldap-core</artifactId>
    <version>2.3.4.RELEASE</version>
</dependency>
```

至此就完成了单向的LDAP SSL配置，即服务端向客户端验证了身份，如果需要双向认证，需要使用生成服务端证书同样的方式，用CA签发一个客户端的证书，此时他们都是用一个CA，可以相互信任。代码的改造就是，除了导入自签名的CA，还要导入客户端的crt和key，可以合并成一个p12文件，然后导入到trustManager中。

如果需要双向认证，对OpenLdap的配置也有所改动，要添加客户端证书的配置，具体配置

```shell
vim /etc/ldap/ldap.conf

# 添加以下配置
# CA 证书，用于验证服务器证书
TLS_CACERT /path/to/ca.pem

# 客户端证书和密钥，用于双向认证
TLS_CERT /path/to/client.crt
TLS_KEY /path/to/client.key

# 设置 LDAP URI（如果未指定可选项）
URI ldaps://ldap-server

# 设置默认的搜索基础 DN（可选）
BASE dc=example,dc=com
```

目前还没有真正去实现双向认证，后续有需求再去验证

## 一些参考资料

- [https://www.tencentcloud.com/zh/document/product/214/6155]
- [https://www.tencentcloud.com/zh/document/product/214/39990]
