# K8s 常用命令

## 关闭重启

删除pod

```bash
kubectl delete -f <yaml文件>
```

启动pod

```bash
kubectl apply -f <yaml文件>
```

## 信息查询

### 查看pod状态

查看所有pods状态

```bash
kubectl get pods -A
```

查看某个命名空间的pods状态

```bash
kubectl get pods -n <namespace>
```

这两个命令可以看目前拥有的pod的状态

### 查看pod详细信息

查看某个pod的详细信息

```bash
kubectl describe pod <pod-name> -n <namespace>
```

这里会展示pod的详细信息，包括状态、容器信息、使用的镜像id等。

### 查看pod日志

查看某个pod的日志

```bash
kubectl logs -f --tail=500 -n <namespace> <pod-name>
```

这里会展示pod的日志信息，`-f`表示跟踪日志输出，`--tail=500`表示只显示最后500行日志
