# Aurora Windows 绿色包交付说明

本文档面向需要将 Aurora 交付到 Windows 机器上的研发或实施同事，目标是把部署简化为“解压、双击启动、固定位置备份”。

## 交付目标
- 不要求现场人员安装 Java、Node、pnpm
- 不要求现场人员使用命令行
- 不依赖 IIS、Nginx、Docker Desktop
- 数据库、日志、配置都放在固定目录

## 推荐目录结构

```text
Aurora/
  app/
    aurora.jar
    runtime/
      bin/
        java.exe
  config/
    application.yaml
  data/
    aurora.db
    backup/
  logs/
  run/
  启动 Aurora.bat
  停止 Aurora.bat
  查看状态.bat
  备份数据.bat
  首次使用说明.txt
```

## 打包步骤

### 1. 构建应用

在项目根目录执行：

```bash
./gradlew packageWindowsPortableZip
```

执行完成后会生成：
- 绿色包目录：`build/windows-dist/Aurora/`
- ZIP 压缩包：`build/distributions/aurora-windows-0.0.1-SNAPSHOT.zip`

### 2. 放入 Windows Java 运行时

为了让现场运维无需安装 Java，建议把 Windows 版 Java 21 运行时解压到：

```text
build/windows-dist/Aurora/app/runtime/
```

要求最终存在：

```text
app/runtime/bin/java.exe
```

建议使用 64 位 Java 21 运行时。

### 3. 交付给现场

推荐直接将完整的 `Aurora/` 目录打包成 ZIP 发给现场人员，现场只需要：
- 解压到本地磁盘，例如 `D:\Aurora`
- 双击 `启动 Aurora.bat`
- 浏览器打开 `http://localhost:51880`

## 脚本说明

### `启动 Aurora.bat`
- 优先使用 `app/runtime/bin/java.exe`
- 如果未内置 Java，则回退到系统 `java`
- 自动创建 `data/`、`logs/`、`run/`、`data/backup/`
- 将标准输出写入 `logs/aurora-console.log`
- 将错误输出写入 `logs/aurora-error.log`
- 应用日志写入 `logs/aurora.log`

### `停止 Aurora.bat`
- 优先按 `run/aurora.pid` 停止
- PID 不存在时尝试按 51880 端口查找进程

### `查看状态.bat`
- 显示当前是否运行
- 显示 PID 和访问地址

### `备份数据.bat`
- 要求系统已停止，避免复制过程中数据库仍在写入
- 将 `data/aurora.db` 备份到 `data/backup/`
- 备份文件名带时间戳

## 配置说明

绿色包使用外部配置文件：

```text
config/application.yaml
```

默认关键配置：
- 端口：`51880`
- 数据库：`./data/aurora.db`
- 日志：`./logs/aurora.log`

如果现场需要修改端口或数据库位置，只改这一个文件即可。

## 首次使用建议

1. 解压绿色包到固定目录
2. 放入内置 Java 运行时
3. 双击 `启动 Aurora.bat`
4. 确认浏览器可访问 `http://localhost:51880`
5. 如果 Windows 弹出防火墙提示，选择允许访问
6. 用默认管理员账号登录并修改密码

## 升级建议

更适合现场人员的升级方式是“新包解压到新目录，再把旧数据库复制到新包里”。

1. 在旧版本目录执行 `停止 Aurora.bat`
2. 确认旧版本数据库文件存在：`data/aurora.db`
3. 将新版本解压到一个新的目录，例如 `D:\Aurora-New`
4. 将旧版本的 `data/aurora.db` 复制到新版本目录，覆盖新版本里的同名文件
5. 如果现场改过配置，再检查是否需要同步 `config/application.yaml`
6. 在新版本目录执行 `启动 Aurora.bat`
7. 浏览器访问 `http://localhost:51880`，确认登录和数据正常
8. 确认新版本运行正常后，再删除旧版本目录

## 故障排查

### 双击启动无反应
- 查看 `logs/aurora-console.log` 和 `logs/aurora-error.log`
- 确认 `app/aurora.jar` 是否存在
- 确认 `app/runtime/bin/java.exe` 是否存在，或系统是否安装 Java

### 浏览器打不开
- 执行 `查看状态.bat`
- 确认 51880 端口未被其他程序占用
- 检查 Windows 防火墙是否限制访问

### 数据库无法备份
- 先执行 `停止 Aurora.bat`
- 确认 `data/aurora.db` 已生成
- 确认磁盘空间和目录权限正常
