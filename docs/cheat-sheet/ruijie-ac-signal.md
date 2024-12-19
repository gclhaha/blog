# 锐捷AC 交换机信号切换

## 删除配置

```shell
no 属性名
```

## 查看当前列表

```shell
sh this
```

## 返回上一层

```shell
exit
```

显示结果

```shell
run(config)#sh this

Building configuration...
!
version AC_RGOS 11.9(6)W4B1, Release(11180717)
hostname run
virtual-ap /opt/kad/down/smpplus-kad-3.5/kad.yml
virtual-ap t2.s
virtual-ap t2.sh
wlan-config 1 zz zz
wlan-config 2 Ruijie-web2
wlan-config 3 tt tt
wlan-config 5 localtest
```

## 查看当前某个信号所有运行状态

```shell
show run | in signal名称 以zz信号为例
```

结果为

```shell
run(config)#show run | in zz
wlan-config 1 zz zz
web-auth template zz v2
aaa accounting network zz start-stop group zz
aaa authentication dot1x zz group zz
aaa authentication web-auth zz group zz
aaa group server radius zz
 dot1x authentication zz
 dot1x accounting zz
 web-auth accounting v2 zz
```

## 配置1X信号

进入该信号

```shell
wlansec 1
```

配置信号,如果有其他配置，使用`no`删除

```shell
security wpa enable
security wpa ciphers aes enable
security wpa akm 802.1x enable
dot1x accounting zz
dot1x authentication zz

aaa accounting network zz start-stop group zz
aaa authentication dot1x zz group zz

# 查看当前配置
sh this

# 如果host不存在，则配置radius key的值"key"
radius-server host 服务器IP key key
```

## 配置无感知信号

在1x或者portal信号下配置，新增如下配置

```shell
dot1x-mab
dot1x authentication zz
dot1x accounting zz
```

## 配置Portal信号

进入该信号

```shell
wlansec 1
```

配置信号,如果有其他配置，使用`no`删除

```shell
 web-auth portal zz
 web-auth accounting v2 zz
 web-auth authentication v2 zz
 webauth
```

## 配置模版

```shell
# 进入模版
web-auth template zz v2
```

配置模版

```shell
ip 服务器IP
url 服务器IP/portal/entry
```

如果是域名访问portal认证页面，只需要配置url

## 配置分组

```shell
# 进入分组
aaa group server radius 信号名称

# 配置radius服务器
server 服务器IP
```
