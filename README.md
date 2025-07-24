# MyFiles - 个人云存储项目

一个基于 Django 和 Docker 构建的现代化、轻量级的个人文件存储和管理平台。

## 核心功能

- **文件和文件夹管理**: 支持创建文件夹、将文件移动到不同文件夹。
- **文件上传**: 支持拖拽和多文件上传。
- **文件和文件夹删除**: 支持批量删除。
- **存储空间概览**: 在主界面实时显示已用空间、总空间和文件数量。
- **响应式界面**: 界面适配桌面和移动端设备。
- **健康检查**: 提供 `/health_check` 接口用于监控。

## 技术栈

- **后端**: Python / Django
- **前端**: HTML / CSS / JavaScript
- **数据库**: SQLite (默认)
- **Web 服务器**: Gunicorn
- **容器化**: Docker / Docker Compose

## 环境启动与部署

本项目提供了两种在本地启动开发环境的方式。

### 方式一：使用 Docker 启动 (推荐)

这是最简单、最推荐的启动方式，可以确保环境的一致性。

1.  **前置条件**:
    *   确保您的系统已经安装了 [Docker](https://www.docker.com/) 和 [Docker Compose](https://docs.docker.com/compose/install/)。

2.  **启动服务**:
    在项目根目录下，执行以下命令来构建并启动容器：
    ```bash
    docker-compose up --build
    ```

3.  **访问应用**:
    启动成功后，在浏览器中访问 `http://localhost:8000` 即可。

4.  **停止服务**:
    在项目根目录的终端中，按下 `CTRL+C` 即可停止服务。

### 方式二：使用本地脚本启动 (无 Docker)

如果您不想使用 Docker，也可以使用提供的脚本来配置本地环境。

1.  **前置条件**:
    *   Python 3.x
    *   Git

2.  **克隆仓库**:
    ```bash
    git clone <your-repository-url>
    cd MyFiles
    ```

3.  **运行启动脚本**:
    该脚本会自动创建 Python 虚拟环境、安装依赖、执行数据库迁移并启动开发服务器。
    ```bash
    chmod +x ./start_dev.sh
    ./start_dev.sh
    ```

4.  **访问应用**:
    启动成功后，在浏览器中访问 `http://127.0.0.1:8000`。

## 运行测试

项目提供了一个测试脚本，可以模拟开发或类生产环境来运行应用。

1.  **给予执行权限**:
    ```bash
    chmod +x ./test_local.sh
    ```

2.  **运行测试脚本**:
    ```bash
    ./test_local.sh
    ```
    脚本会提示您选择 **开发模式** 或 **类生产模式** 来进行测试。

## 项目结构

```
.
├───docker-compose.yml      # Docker Compose 开发环境配置
├───docker-compose.prod.yml # Docker Compose 生产环境配置
├───Dockerfile              # Docker 镜像配置文件
├───manage.py               # Django 管理脚本
├───requirements.txt        # Python 依赖列表
├───start_dev.sh            # 本地开发环境启动脚本
├───start_production.sh     # 生产环境启动脚本
├───test_local.sh           # 本地测试脚本
├───personal_cloud_project/ # Django 项目配置
│   ├───settings.py
│   └───urls.py
└───storage/                # 核心存储功能的 Django 应用
    ├───models.py           # 数据模型
    ├───views.py            # 视图和核心逻辑
    ├───urls.py             # 应用路由
    └───templates/          # HTML 模板
```
