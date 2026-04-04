# Aurora
Aurora 是一个面向内部业务协作的单体管理系统，核心场景围绕“项目台账 + 开票 + 回款 + 用户与权限管理”展开。

## 核心业务场景
- 项目管理：维护项目名称、客户、合同号、签约时间、合同金额。
- 开票管理：按项目记录开票明细，自动汇总累计开票金额。
- 回款管理：按项目记录回款明细，自动汇总累计回款金额。
- 用户管理：维护系统用户、角色、启停状态和密码重置。
- 权限控制：基于 `ADMIN`、`PROJECT_MANAGER`、`FINANCE` 三类角色控制接口和页面能力。

## 关键技术点
- 后端：Spring Boot 4、Java 21、Spring Web MVC、Spring Security、Spring Data JPA、Liquibase、SQLite。
- 前端：React 19、TypeScript、Vite、Ant Design、React Router、TanStack Query、Axios、Zustand。
- 登录态：基于 Session/Cookie。
- 部署方式：前端开发期独立运行，生产构建后打包进 Java 静态资源目录，随后端统一发布。

## 后端关键路径
- 启动入口：`src/main/java/net/ximatai/aurora/AuroraApplication.java`
- 认证鉴权：`src/main/java/net/ximatai/aurora/auth/`
- 项目与资金：`src/main/java/net/ximatai/aurora/project/`
- 用户管理：`src/main/java/net/ximatai/aurora/user/`
- 通用异常：`src/main/java/net/ximatai/aurora/common/`
- 前端路由兜底：`src/main/java/net/ximatai/aurora/config/SpaForwardingController.java`

## 前端关键路径
- 前端工程根目录：`web/`
- 应用入口：`web/src/main.tsx`
- 路由与守卫：`web/src/app/`、`web/src/components/`
- 页面层：`web/src/pages/`
- 业务 API：`web/src/modules/`
- 通用能力：`web/src/lib/`、`web/src/layout/`、`web/src/styles/`

## 配置文件路径
- 后端构建：`build.gradle`
- 后端运行配置：`src/main/resources/application.yaml`
- 测试配置：`src/test/resources/application.yaml`
- 前端依赖与脚本：`web/package.json`
- 前端构建配置：`web/vite.config.ts`
- 前端 TypeScript 配置：`web/tsconfig.app.json`

## 文档索引
- 需求说明：`docs/requirements.md`
- 后端设计：`docs/backend-design.md`
- 项目前端对接文档：`docs/project-frontend-integration.md`
- Windows 绿色包交付：`docs/windows-portable.md`
- 跨平台绿色包发布：`docs/portable-release.md`

## 常用命令
- 一键启动前后端：`./scripts/dev.sh`
- 一键关闭前后端：`./scripts/dev.sh off`
- 查看本地运行状态：`./scripts/dev.sh status`
- 前端开发：`cd web && pnpm install && pnpm dev`
- 前端检查：`cd web && pnpm lint && pnpm test && pnpm build`
- 后端测试：`./gradlew test`
- 前后端整合打包：`./gradlew packageApp`
- Windows 绿色包目录组装：`./gradlew prepareWindowsPortable`
- Windows 绿色包 ZIP：`./gradlew packageWindowsPortableZip`
- Linux 绿色包目录组装：`./gradlew prepareLinuxPortable`
- Linux 绿色包 TAR.GZ：`./gradlew packageLinuxPortableTar`
- macOS 绿色包目录组装：`./gradlew prepareMacPortable`
- macOS 绿色包 TAR.GZ：`./gradlew packageMacPortableTar`

## 跨平台绿色包
- 发布目录模板位于：`distribution/windows/`、`distribution/linux/`、`distribution/macos/`
- 当前默认版本号：`1.26.1`
- 本地构建会产出不带运行时的绿色包目录与压缩包
- GitHub Release workflow 会自动构建 Windows、Linux、macOS 三个平台产物，并将对应平台的 Java 21 运行时打进 `app/runtime/`

## 默认账号
- 管理员账号：`admin`
- 管理员密码：`admin123`

## 管理员应急重置
- 默认情况下，数据库中的密码为准，启动不会覆盖 `admin` 密码。
- 如需应急重置，可在 `src/main/resources/application.yaml` 中临时设置：
- `app.admin.bootstrap-password`：要重置成的新密码
- `app.admin.reset-on-startup: true`：启动时重置 `admin` 密码
- 重启应用完成重置后，请立即把 `app.admin.reset-on-startup` 改回 `false`，避免后续每次启动都覆盖密码。

## 演示数据库
- 仓库内附带演示库：`aurora-demo.db`
- 默认配置使用 `aurora.db`
- 如需切换到演示数据，可将 `src/main/resources/application.yaml` 中的数据源改为：`jdbc:sqlite:./aurora-demo.db`
