# LDAP 常用命令

LDAP 常用命令主要通过 ldapsearch、ldapmodify、ldapadd 等工具实现。以下是一些常用命令及其示例：

## 1. ldapsearch (搜索)

* **语法:**  `ldapsearch -H <ldap_uri> -x -D <bind_dn> -w <bind_password> -b <search_base> <search_filter> <attributes>`

* **参数说明:**
  * `-H <ldap_uri>`: LDAP 服务器的 URI (例如：ldap://ldap.example.com:389 或 ldaps://ldap.example.com:636)
  * `-x`:  使用简单认证 (simple bind)。
  * `-D <bind_dn>`:  绑定 DN (例如：cn=admin,dc=example,dc=com)。
  * `-w <bind_password>`: 绑定密码。
  * `-b <search_base>`:  搜索的起始点 (例如：dc=example,dc=com)。
  * `<search_filter>`:  搜索过滤器 (例如：(&(objectClass=user)(uid=john)) )。
  * `<attributes>`:  要返回的属性 (例如：uid,cn,mail)。

* **示例：**

  * 查找所有用户:  `ldapsearch -H ldap://ldap.example.com -x -D "cn=admin,dc=example,dc=com" -w password -b "dc=example,dc=com" "(objectClass=user)" cn`

  * 查找 uid 为 john 的用户: `ldapsearch -H ldap://ldap.example.com -x -D "cn=admin,dc=example,dc=com" -w password -b "dc=example,dc=com" "(uid=john)" cn,mail`

## 2. ldapmodify (修改)

* **语法:** `ldapmodify -H <ldap_uri> -x -D <bind_dn> -w <bind_password> -f <ldif_file>`

* **参数说明:**
  * 参数含义与 ldapsearch 相同。
  * `-f <ldif_file>`:  包含修改操作的 LDIF 文件。

* **LDIF 文件示例 (修改 cn 和 mail):**

```ldif
dn: uid=john,dc=example,dc=com
changetype: modify
replace: cn
cn: John Doe
replace: mail
mail: john.doe@example.com
```

* **示例:** `ldapmodify -H ldap://ldap.example.com -x -D "cn=admin,dc=example,dc=com" -w password -f modify.ldif`

## 3. ldapadd (添加)

* **语法:** `ldapadd -H <ldap_uri> -x -D <bind_dn> -w <bind_password> -f <ldif_file>`

* **参数说明:**
  * 参数含义与 ldapsearch 相同。
  * `-f <ldif_file>`: 包含添加操作的 LDIF 文件。

* **LDIF 文件示例 (添加新用户):**

```ldif
dn: uid=jane,dc=example,dc=com
objectClass: inetOrgPerson
objectClass: person
objectClass: top
uid: jane
cn: Jane Doe
sn: Doe
userPassword: password
```

* **示例:** `ldapadd -H ldap://ldap.example.com -x -D "cn=admin,dc=example,dc=com" -w password -f add.ldif`

## 4. ldapdelete (删除)

* **语法:** `ldapdelete -H <ldap_uri> -x -D <bind_dn> -w <bind_password> <dn>`

* **参数说明:**
  * 参数含义与 ldapsearch 相同。
  * `<dn>`: 要删除的条目的 DN。

* **示例：** 删除 uid 为 jane 的用户:  `ldapdelete -H ldap://ldap.example.com -x -D "cn=admin,dc=example,dc=com" -w password "uid=jane,dc=example,dc=com"`

**其他常用选项：**

* `-h <hostname>`: LDAP 服务器主机名。
* `-p <port>`: LDAP 服务器端口号。
* `-s <scope>`: 搜索范围 (base, one, sub)。
* `-l <timelimit>`:  搜索时间限制 (秒)。
* `-ZZ`:  使用 StartTLS。

**重要提示:**

* 以上命令中的 `<...>`  需要替换为实际值。
* 确保已安装必要的 LDAP 客户端工具 (例如：openldap-clients)。
* 使用 `-w` 选项在命令行中提供密码是不安全的，建议使用 `-y <password_file>`  从文件中读取密码。
