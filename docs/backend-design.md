# Aurora 后端 v1 技术设计文档

## 1. 文档目标

本文档定义 Aurora 后端 v1 的技术方案，用于指导后续编码实现、接口联调和基础测试。

设计原则：
- 以最小可用闭环为目标。
- 保持单体架构，优先简单清晰。
- 先服务当前内部场景，不提前为复杂扩展过度设计。
- 兼容未来前端独立部署和最终前后端合包部署两种形态。

## 2. 当前项目基线

当前仓库已具备以下基线：
- Spring Boot 4.0.5
- Java 21
- Spring Web MVC
- Spring JDBC
- Gradle 构建

当前仓库尚未引入：
- SQLite 驱动
- 认证与授权实现
- 业务模块代码

因此，v1 的后续编码建议按“先补 SQLite 和登录鉴权基础能力，再搭业务骨架”的顺序推进。

## 3. 系统架构

### 3.1 架构风格

采用单体后端架构，前后端分离接口模式。

推荐分层：
- Controller：处理 HTTP 请求和响应。
- Service：承载业务规则。
- Repository：基于 JDBC 执行数据库访问。
- Model/DTO：承载领域对象、请求对象、响应对象。
- Auth：处理登录、权限和当前用户上下文。

### 3.2 模块范围

后端 v1 包含以下功能模块：
- 认证模块
- 用户与角色管理模块
- 项目模块
- 开票模块
- 回款模块
- 通用异常与统一响应模块

### 3.3 技术取舍

v1 以简单可用为目标，明确以下取舍：
- 数据库使用 SQLite。
- 数据访问按 JDBC 实现。
- 不引入重型 ORM。
- 不预设复杂中间件、分布式能力或额外基础设施。

## 4. 认证与授权设计

### 4.1 认证方式

系统采用账号密码登录。

文档只固定业务行为，不提前写死认证载体。实现阶段可根据开发便利性选择：
- session/cookie
- 其他轻量登录态方案

无论采用哪种方式，都需要满足：
- 登录后可以识别当前用户。
- 受保护接口需要登录后访问。
- 登出后当前登录态失效。

### 4.2 登录规则

- 用户名存在且账号启用时才允许继续校验密码。
- 密码校验通过后，建立登录态。
- 返回当前用户基础信息及角色集合。
- 登录失败返回统一错误信息，不暴露过多内部细节。

### 4.3 登出规则

- 客户端调用登出接口后，当前登录态失效。
- 后续再次访问受保护接口时应返回未登录。

### 4.4 授权规则

角色固定为：
- `ADMIN`
- `PROJECT_MANAGER`
- `FINANCE`

授权原则：
- 用户可绑定多个角色。
- 多角色权限按并集生效。
- 不做数据范围隔离。

推荐的接口访问控制如下：

| 功能 | ADMIN | PROJECT_MANAGER | FINANCE |
| --- | --- | --- | --- |
| 登录/查看当前用户 | 是 | 是 | 是 |
| 用户管理 | 是 | 否 | 否 |
| 项目列表/详情 | 是 | 是 | 是 |
| 新增/编辑项目 | 是 | 是 | 否 |
| 删除项目 | 是 | 是 | 否 |
| 查看开票 | 是 | 是 | 是 |
| 新增/编辑/删除开票 | 是 | 是 | 是 |
| 查看回款 | 是 | 是 | 是 |
| 新增/编辑/删除回款 | 是 | 是 | 是 |

## 5. 数据模型设计

### 5.1 实体清单

核心实体：
- 用户 `users`
- 角色 `roles`
- 用户角色关联 `user_roles`
- 项目 `projects`
- 开票记录 `invoices`
- 回款记录 `payments`

### 5.2 表结构建议

#### `users`

| 字段 | 类型建议 | 说明 |
| --- | --- | --- |
| id | integer | 主键 |
| username | text | 登录名，唯一 |
| password_hash | text | 密码哈希 |
| display_name | text | 展示名称 |
| enabled | integer | 是否启用 |
| created_at | text/datetime | 创建时间 |
| updated_at | text/datetime | 更新时间 |

说明：
- 密码仅存哈希值，不存明文。
- `username` 建议建立唯一索引。

#### `roles`

| 字段 | 类型建议 | 说明 |
| --- | --- | --- |
| id | integer | 主键 |
| code | text | 角色编码，唯一 |
| name | text | 角色名称 |

预置数据：
- `ADMIN`
- `PROJECT_MANAGER`
- `FINANCE`

#### `user_roles`

| 字段 | 类型建议 | 说明 |
| --- | --- | --- |
| user_id | integer | 用户 ID |
| role_id | integer | 角色 ID |

说明：
- 使用联合唯一约束避免重复绑定。

#### `projects`

| 字段 | 类型建议 | 说明 |
| --- | --- | --- |
| id | integer | 主键 |
| name | text | 项目名称 |
| customer | text | 客户名称 |
| contract_no | text | 合同号 |
| signing_date | date | 签约时间 |
| contract_amount | decimal(18,2) | 合同金额 |
| created_at | text/datetime | 创建时间 |
| updated_at | text/datetime | 更新时间 |

说明：
- 不存储“已开票金额”和“已回款金额”。

#### `invoices`

| 字段 | 类型建议 | 说明 |
| --- | --- | --- |
| id | integer | 主键 |
| project_id | integer | 所属项目 |
| amount | decimal(18,2) | 开票金额 |
| invoice_date | date | 开票时间 |
| created_at | text/datetime | 创建时间 |
| updated_at | text/datetime | 更新时间 |

#### `payments`

| 字段 | 类型建议 | 说明 |
| --- | --- | --- |
| id | integer | 主键 |
| project_id | integer | 所属项目 |
| amount | decimal(18,2) | 回款金额 |
| payment_date | date | 回款时间 |
| created_at | text/datetime | 创建时间 |
| updated_at | text/datetime | 更新时间 |

### 5.3 关系约束

- 一个项目对应多条开票记录。
- 一个项目对应多条回款记录。
- 一个用户对应多个角色。
- 删除项目前必须检查是否存在关联开票或回款记录。
- 删除用户时如需保守处理，v1 可优先采用停用而非物理删除。

### 5.4 汇总字段设计

项目返回对象中增加两个虚拟字段：
- `invoicedAmount`
- `receivedAmount`

统计方式：
- `invoicedAmount = sum(invoices.amount where project_id = ?)`
- `receivedAmount = sum(payments.amount where project_id = ?)`

实现建议：
- 列表和详情查询时实时聚合计算。
- 空值按 `0.00` 返回。

## 6. API 设计

### 6.1 通用约定

基础约定：
- 所有接口路径前缀建议为 `/api`。
- 日期字段统一使用 `yyyy-MM-dd`。
- 金额字段使用十进制，JSON 中返回数值类型。
- 接口返回结构保持统一，但具体字段命名可在实现阶段一起收敛。

### 6.2 认证接口

#### `POST /api/auth/login`

请求体：

```json
{
  "username": "admin",
  "password": "******"
}
```

响应体：

```json
{
  "user": {
    "id": 1,
    "username": "admin",
    "displayName": "管理员",
    "enabled": true,
    "roles": ["ADMIN"]
  }
}
```

说明：
- 如果认证实现需要返回额外登录态信息，可在实现阶段补充。

#### `POST /api/auth/logout`

说明：
- 需要登录后调用。
- 使当前登录态失效。

#### `GET /api/auth/me`

说明：
- 返回当前登录用户信息及角色集合。

### 6.3 用户管理接口

#### `GET /api/users`

说明：
- 查询用户列表。
- 仅管理员可访问。

#### `POST /api/users`

请求体建议：

```json
{
  "username": "finance01",
  "password": "Init@123",
  "displayName": "财务",
  "enabled": true,
  "roles": ["FINANCE"]
}
```

#### `PUT /api/users/{id}`

说明：
- 修改展示名称、启用状态、角色集合。
- 不直接通过此接口修改密码。

#### `POST /api/users/{id}/reset-password`

请求体建议：

```json
{
  "newPassword": "New@123"
}
```

#### `POST /api/users/{id}/enable`

说明：
- 启用账号。

#### `POST /api/users/{id}/disable`

说明：
- 停用账号。

### 6.4 项目接口

#### `GET /api/projects`

说明：
- 查询项目列表。
- 支持按名称、客户、合同号查询。
- 返回项目基础信息和汇总金额。

返回对象建议：

```json
{
  "id": 1,
  "name": "示例项目",
  "customer": "某客户",
  "contractNo": "HT-2026-001",
  "signingDate": "2026-04-01",
  "contractAmount": 100000.00,
  "invoicedAmount": 20000.00,
  "receivedAmount": 10000.00
}
```

#### `GET /api/projects/{id}`

说明：
- 返回项目详情及汇总字段。

#### `POST /api/projects`

请求体建议：

```json
{
  "name": "示例项目",
  "customer": "某客户",
  "contractNo": "HT-2026-001",
  "signingDate": "2026-04-01",
  "contractAmount": 100000.00
}
```

#### `PUT /api/projects/{id}`

说明：
- 修改项目基础字段。

#### `DELETE /api/projects/{id}`

说明：
- 若存在关联开票或回款记录，返回业务错误，不允许删除。

### 6.5 开票接口

#### `GET /api/projects/{projectId}/invoices`

说明：
- 查询某项目下的开票列表。

#### `POST /api/projects/{projectId}/invoices`

请求体建议：

```json
{
  "amount": 12000.00,
  "invoiceDate": "2026-04-02"
}
```

#### `PUT /api/projects/{projectId}/invoices/{invoiceId}`

说明：
- 修改金额或开票时间。

#### `DELETE /api/projects/{projectId}/invoices/{invoiceId}`

说明：
- 删除后项目汇总金额应实时变化。

### 6.6 回款接口

#### `GET /api/projects/{projectId}/payments`

说明：
- 查询某项目下的回款列表。

#### `POST /api/projects/{projectId}/payments`

请求体建议：

```json
{
  "amount": 8000.00,
  "paymentDate": "2026-04-03"
}
```

#### `PUT /api/projects/{projectId}/payments/{paymentId}`

说明：
- 修改金额或回款时间。

#### `DELETE /api/projects/{projectId}/payments/{paymentId}`

说明：
- 删除后项目汇总金额应实时变化。

## 7. 校验与异常处理

### 7.1 参数校验

建议使用 Bean Validation 或等效校验机制，至少覆盖：
- 用户名不能为空。
- 密码不能为空。
- 项目名称不能为空。
- 客户不能为空。
- 合同号不能为空。
- 签约时间不能为空。
- 开票时间不能为空。
- 回款时间不能为空。
- 所有金额必须大于 0。

## 8. 初始化与开发约定

### 8.1 数据库初始化

SQLite 环境建议初始化以下内容：
- 基础表结构。
- 默认角色数据。
- 初始可登录账号。

### 8.2 安全建议

- 密码哈希建议使用强哈希算法。
- 不在日志中打印密码和登录凭证等敏感信息。
- 错误响应不泄露底层 SQL 或堆栈信息。

## 9. 测试方案

后续开发至少覆盖以下测试：

### 9.1 认证测试

- 正确账号密码可登录成功。
- 错误密码登录失败。
- 停用账号不可登录。
- 登出后原令牌失效。
- 获取当前用户接口可返回角色集合。

### 9.2 授权测试

- 管理员可访问用户管理接口。
- 非管理员访问用户管理接口返回无权限。
- 项目管理可创建和编辑项目。
- 财务不可创建或编辑项目。
- 财务可维护开票和回款记录。

### 9.3 项目测试

- 可创建、编辑、删除无关联记录的项目。
- 不可删除存在开票或回款记录的项目。
- 项目列表和详情可返回正确汇总金额。
- 项目筛选条件可正常生效。

### 9.4 开票与回款测试

- 可为已存在项目新增开票记录。
- 可为已存在项目新增回款记录。
- 修改开票或回款后，项目汇总金额同步变化。
- 删除开票或回款后，项目汇总金额同步变化。

### 9.5 参数校验测试

- 金额小于等于 0 时请求失败。
- 必填日期为空时请求失败。
- 必填文本为空时请求失败。

### 9.6 集成演示场景

基于 SQLite 完成最小闭环：
1. 使用管理员登录。
2. 创建项目。
3. 新增开票记录。
4. 新增回款记录。
5. 查询项目详情并验证汇总金额。

## 10. 后续实现顺序建议

建议按以下顺序落地：
1. 补充 SQLite 和登录鉴权所需依赖与配置。
2. 建立数据库表和初始化数据。
3. 实现认证与当前用户能力。
4. 实现用户管理。
5. 实现项目管理。
6. 实现开票管理。
7. 实现回款管理。
8. 补齐集成测试和演示数据。

该顺序可以保证系统尽快形成可登录、可录数、可验证权限和汇总逻辑的最小闭环。
