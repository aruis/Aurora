# Aurora 跨平台绿色包发布说明

本文档描述如何通过 GitHub Actions 自动生成 Windows、Linux、macOS 三个平台的绿色包 Release。

## 发布目标

- Windows：ZIP 绿色包，内含 Windows Java 21 运行时
- Linux：TAR.GZ 绿色包，内含 Linux Java 21 运行时
- macOS：TAR.GZ 绿色包，内含 macOS Java 21 运行时

所有平台统一目录结构：

```text
Aurora/
  app/
    aurora.jar
    runtime/
  config/
  data/
  logs/
  run/
```

## 版本号

项目默认发布版本已经设置为：

```text
1.26.1
```

`build.gradle` 支持通过 `-PreleaseVersion=...` 覆盖版本号，因此后续新版本不需要手动改任务名。

## GitHub Release Workflow

Workflow 文件：

```text
.github/workflows/release.yml
```

支持两种触发方式：

### 1. 手动触发

在 GitHub Actions 页面手动运行 `Release Portable Packages`，输入版本号，例如：

```text
1.26.1
```

Workflow 会：
- 构建三平台绿色包目录
- 将 runner 上的 Java 21 运行时复制到 `app/runtime/`
- 生成压缩包
- 自动创建 `v1.26.1` GitHub Release
- 上传三平台产物

### 2. 推送 Tag 触发

当推送如下 tag 时：

```text
v1.26.1
```

Workflow 会自动按 tag 版本生成对应 Release。

## Release 产物命名

生成的附件名如下：

- `aurora-windows-1.26.1.zip`
- `aurora-linux-1.26.1.tar.gz`
- `aurora-macos-1.26.1.tar.gz`

## 本地打包与 GitHub Release 的区别

### 本地 Gradle 打包

本地执行：

```bash
./gradlew packageWindowsPortableZip
./gradlew packageLinuxPortableTar
./gradlew packageMacPortableTar
```

只会生成绿色包目录和压缩包骨架，不会自动内置平台运行时。

### GitHub Release 打包

GitHub Actions 在对应平台 runner 上执行，因此能自动把平台匹配的 Java 21 运行时复制进去。

这也是最适合当前开发环境的方式，因为你在 macOS 上不方便手工准备和验证 Windows 运行时。

## 首次发布建议

推荐首个 Release 使用：

```text
1.26.1
```

建议流程：

1. 先将当前改动提交到主分支
2. 在 GitHub Actions 中手动触发 `Release Portable Packages`
3. 输入版本号 `1.26.1`
4. 等待 workflow 完成
5. 在 GitHub Release 页面检查三平台附件是否齐全

## 可选后续增强

如果后续想继续提升稳定性，可以再增加：

- 三平台启动脚本冒烟测试
- Release 说明模板
- 自动生成 SHA256 校验文件
- 将完整 JDK 改为 `jlink` 精简运行时，缩小绿色包体积
