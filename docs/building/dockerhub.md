# Github Action + Docker Hub: 容器化自动构建你的应用

在前面的章节中，我们探讨了如何利用 GitHub Actions 自动化构建和部署 Go 应用到你的服务器。但现在，我们将走得更远一些，利用 Docker Hub 和 GitHub Actions，不仅实现自动化构建，还能够实现应用的容器化。不需要服务器搭建环境，只需要安装docker就能运行应用。这样，我们就能确保无论在哪个环境下，应用都能以相同的方式运行，极大地简化了应用的部署和维护过程。

## 前提条件

- 确保你已经阅读了[前面的章节](./githubaction.md)，理解了如何使用 GitHub Actions。
- 拥有一个 Docker Hub 账号。如果没有，可以在 [Docker Hub](https://hub.docker.com/) 注册。

## Docker 的优势

Docker 的主要优势之一是它能够打包应用及其所有依赖项到一个“容器”中。这确保了应用在任何环境中都能以相同的方式运行。这非常有用，特别是在微服务架构和云环境中。

借助 Docker，我们可以创建一个包含 Go 应用和所有运行时依赖项的镜像，然后将这个镜像推送到 Docker Hub。最后，我们可以在任何拥有 Docker 的服务器上拉取并运行这个镜像，无需担心环境配置问题。

## 创建 Dockerfile

首先，在项目根目录下创建一个名为 `Dockerfile` 的文件，内容如下：

```dockerfile
# 使用官方的 Golang 镜像创建构建产物。
FROM golang:1.21.3 AS builder

# 将本地代码复制到容器镜像中。
WORKDIR /app
COPY . .

# 在容器内构建命令。
RUN go mod download && \
    CGO_ENABLED=0 GOOS=linux go build -o my-app main.go

# 使用一个新的阶段创建一个最小的镜像。
FROM alpine:3.14
COPY --from=builder /app/my-app /usr/local/bin/my-app
# 更新文件权限以确保它是可执行的。
RUN chmod +x /usr/local/bin/my-app
# 设置容器的默认端口
EXPOSE 8081

# 设置容器的默认命令。
CMD ["/usr/local/bin/my-app"]
```

这个 `Dockerfile` 做了以下几件事情：

1. 定义了一个构建阶段，使用官方的 Golang 镜像作为基础，并编译了 Go 应用。
2. 定义了一个新的、轻量级的阶段，使用 Alpine Linux 镜像作为基础，将编译好的二进制文件复制到这个新的镜像中，并赋予它可执行权限。
3. 指定了容器应该监听的端口，以及应该如何启动应用。

## 自动化构建和推送 Docker 镜像

接下来，我们将创建一个新的 GitHub Actions 工作流，以自动化构建 Docker 镜像并将其推送到 Docker Hub。

在项目的 `.github/workflows` 目录下，修改`ci.yml`文件，内容如下：

```yaml
name: CI

on:
  push:
    branches:
      - master # 触发工作流的分支

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Build Docker image
        run: |
          docker build -t username/my-app:${{ github.sha }} .
          docker tag username/my-app:${{ github.sha }} username/my-app:latest

      - name: Login to Docker Hub
        uses: docker/login-action@v1 
        with:
          username: ${{ secrets.DOCKER_HUB_USERNAME }}
          password: ${{ secrets.DOCKER_HUB_ACCESS_TOKEN }}

      - name: Push Docker image to Docker Hub
        run: |
          docker push username/my-app:latest
          docker push username/my-app:${{ github.sha }}

      - name: Deploy to server
        uses: appleboy/ssh-action@v0.1.3
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USERNAME }}
          key: ${{ secrets.SERVER_KEY }}
          script: |
            docker pull username/my-app:${{ github.sha }}
            docker stop my-app || true  
            docker rm my-app || true   
            docker run -d --name my-app -p 8081:8081 username/my-app:${{ github.sha }}


```

在这个工作流中，我们做了以下几件事情：

1. 检出代码：从 GitHub 仓库检出代码到运行工作流的虚拟机中。
2. 构建 Docker 镜像：使用 Docker 构建工具构建 Docker 镜像。镜像标签为 GitHub 提交的 SHA 值，同时我们还创建了一个标签为 latest 的镜像，它始终指向最新的构建。
3. 登录到 Docker Hub：使用 docker/login-action GitHub Action，我们可以轻松登录到 Docker Hub，凭据从 GitHub Secrets 中获取。
4. 将 Docker 镜像推送到 Docker Hub：将构建的 Docker 镜像推送到 Docker Hub，包括 latest 标签和具有 GitHub 提交 SHA 值的标签。
5. 部署到服务器：通过 SSH 连接到服务器，从 Docker Hub 拉取新构建的 Docker 镜像，停止并删除旧的 Docker 容器（如果存在），然后运行新的 Docker 容器。我们将应用的端口映射到服务器的 8081 端口，并使用 docker run 命令在后台运行新容器。

## 配置 Docker Hub 凭据

为了让 GitHub Actions 能够推送镜像到 Docker Hub，你需要在 GitHub 仓库的设置中配置 Docker Hub 的用户名和访问令牌。

1. 登录到 Docker Hub，然后创建一个新的访问令牌。
   为了能够在 GitHub Actions 中自动构建并推送 Docker 镜像到 Docker Hub，我们需要获取 Docker Hub 的凭据。下面是获取凭据的步骤：

   创建 Docker Hub 账户
   如果你还没有 Docker Hub 账户，首先需要在 Docker Hub 上注册一个新账户。

   登录到 Docker Hub
   使用你的账户信息登录到 Docker Hub。

   创建访问令牌
   在 Docker Hub 的主界面，点击右上角的用户名，然后选择 Account Settings。
   在左侧导航菜单中，点击 Security。
   在 Access Tokens 区域，点击 New Access Token。
   输入一个描述性的名字，例如 "GitHub Actions Token"，然后点击 Create。系统会生成一个新的访问令牌。
   复制并保存访问令牌

   在创建完访问令牌后，你会看到令牌的值。确保复制并保存这个令牌，因为你以后不会再看到它。这个令牌将用于在 GitHub Actions 中登录到 Docker Hub。
   配置 GitHub 仓库

   转到你的 GitHub 仓库，然后点击 Settings。
   在左侧导航菜单中，点击 Secrets。
   点击 New repository secret，创建两个新的秘密：
   DOCKER_HUB_USERNAME：输入你的 Docker Hub 用户名。
   DOCKER_HUB_ACCESS_TOKEN：粘贴你刚刚从 Docker Hub 复制的访问令牌。
   现在，你的 GitHub 仓库已经配置了必要的 Docker Hub 凭据，可以在 GitHub Actions 工作流中使用这些凭据来登录到 Docker Hub，并推送新的 Docker 镜像。

2. 在 GitHub 仓库的 **Settings** -> **Secrets** 中，添加两个新的秘密：
   - `DOCKER_HUB_USERNAME`：你的 Docker Hub 用户名。
   - `DOCKER_HUB_ACCESS_TOKEN`：你刚刚创建的 Docker Hub 访问令牌。

## RUN

现在，每次你向 `master` 分支推送代码时，GitHub Actions 都会自动构建一个新的 Docker 镜像，并将其推送到 Docker Hub。然后，你可以在任何拥有 Docker 的服务器上拉取并运行这个镜像，享受一键部署的便利！

通过结合 GitHub Actions 和 Docker Hub，我们不仅简化了应用的构建和部署过程，还确保了应用能够在不同的环境中以相同的方式运行，极大地提高了开发和运维的效率。

## 验证部署是否成功

完成自动化构建与部署后，为确保一切运行如预期，你应该验证 GitHub Actions 和服务器上的 Docker 镜像运行状况。

1. **查看 GitHub Actions 运行情况**  
   登录到你的 GitHub 账户，进入项目仓库，点击 "Actions" 标签查看最近的工作流运行情况。如果有任何错误，它们会在这里显示。

2. **检查服务器上的 Docker 镜像运行状态**  
   通过 SSH 连接到你的服务器，运行以下命令查看当前运行的 Docker 容器：
  
   ```bash
   docker ps
   ```

如果容器正在运行，并且没有错误，那么恭喜你，部署成功！如果容器没有运行，可以使用下面的命令查看容器的日志来调试问题：

```bash
docker logs <container-name-or-id>
```

## 可能遇到的问题

在自动化部署过程中，可能会遇到一些问题。以下是一些常见问题和解决方案：

1. **没有暴露端口**
   确保在你的 `Dockerfile` 中使用 `EXPOSE` 指令来暴露应用需要的端口。例如，如果你的应用运行在 8081 端口，你应该添加以下行到你的 `Dockerfile`：
  
   ```dockerfile
   EXPOSE 8081
   ```

## 推荐阅读

- [Docker 文档](https://docs.docker.com/language/)：这是 Docker 的官方文档，提供了关于 Docker 和容器化的详细信息，包括如何创建和优化你的 Dockerfile 以及如何运行和管理你的 Docker 容器。

通过深入阅读和理解 Docker 文档，你将更好地理解 Docker 如何工作，以及如何解决在部署过程中可能遇到的问题。同时，它也可以帮助我们更有效地利用 Docker 和 GitHub Actions 来自动化部署流程。
