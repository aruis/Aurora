# 项目管理模块前端对接文档

本文基于 `net.ximatai.aurora.project` 包代码整理，面向前端联调使用。内容只覆盖对接重点，不展开后端实现细节。

## 1. 模块范围

该模块主要包含 3 组数据：

- 项目 `Project`
- 开票记录 `Invoice`
- 回款记录 `Payment`

前端通常可以按“项目列表/详情 + 项目下开票列表 + 项目下回款列表”的方式组织页面。

## 2. 鉴权与权限

系统使用基于 Session 的登录态，不是 Bearer Token 模式。

- 登录接口：`POST /api/auth/login`
- 登录成功后，后端通过 Session 维持状态
- 前端调用业务接口时，需要带上 Cookie
- 如果前后端分离部署，`fetch`/`axios` 需要开启 `withCredentials`

常见鉴权返回：

- `401`：未登录或登录已失效
- `403`：已登录，但无权限访问

项目模块权限范围：

- 查询项目、查询开票、查询回款：`ADMIN` / `PROJECT_MANAGER` / `FINANCE`
- 新增、修改、删除项目：`ADMIN` / `PROJECT_MANAGER`
- 新增、修改、删除开票/回款：`ADMIN` / `PROJECT_MANAGER` / `FINANCE`

## 3. 接口概览

### 3.1 项目接口

| 功能 | 方法 | 路径 |
|---|---|---|
| 项目列表 | `GET` | `/api/projects` |
| 项目详情 | `GET` | `/api/projects/{id}` |
| 新增项目 | `POST` | `/api/projects` |
| 编辑项目 | `PUT` | `/api/projects/{id}` |
| 删除项目 | `DELETE` | `/api/projects/{id}` |

### 3.2 开票接口

| 功能 | 方法 | 路径 |
|---|---|---|
| 开票列表 | `GET` | `/api/projects/{projectId}/invoices` |
| 新增开票 | `POST` | `/api/projects/{projectId}/invoices` |
| 编辑开票 | `PUT` | `/api/projects/{projectId}/invoices/{invoiceId}` |
| 删除开票 | `DELETE` | `/api/projects/{projectId}/invoices/{invoiceId}` |

### 3.3 回款接口

| 功能 | 方法 | 路径 |
|---|---|---|
| 回款列表 | `GET` | `/api/projects/{projectId}/payments` |
| 新增回款 | `POST` | `/api/projects/{projectId}/payments` |
| 编辑回款 | `PUT` | `/api/projects/{projectId}/payments/{paymentId}` |
| 删除回款 | `DELETE` | `/api/projects/{projectId}/payments/{paymentId}` |

## 4. 数据结构

### 4.1 项目对象

项目列表和项目详情返回结构一致，都是 `ProjectSummary`：

```json
{
  "id": 1,
  "name": "智慧园区建设项目",
  "customer": "某科技公司",
  "contractNo": "HT-2026-001",
  "signingDate": "2026-03-01",
  "contractAmount": 1000000.00,
  "invoicedAmount": 300000.00,
  "receivedAmount": 200000.00
}
```

字段说明：

- `id`：项目 ID
- `name`：项目名称
- `customer`：客户名称
- `contractNo`：合同号
- `signingDate`：签约日期，格式 `yyyy-MM-dd`
- `contractAmount`：合同金额
- `invoicedAmount`：累计开票金额
- `receivedAmount`：累计回款金额

说明：

- `invoicedAmount` 和 `receivedAmount` 是后端实时汇总出来的，不需要前端自行累加
- 项目详情接口目前返回的也是这个汇总对象，不是更复杂的详情结构

### 4.2 项目新增/编辑请求体

```json
{
  "name": "智慧园区建设项目",
  "customer": "某科技公司",
  "contractNo": "HT-2026-001",
  "signingDate": "2026-03-01",
  "contractAmount": 1000000.00
}
```

校验重点：

- `name`、`customer`、`contractNo` 不能为空
- `signingDate` 不能为空
- `contractAmount` 必须大于 `0`

### 4.3 开票对象

```json
{
  "id": 11,
  "projectId": 1,
  "amount": 300000.00,
  "invoiceDate": "2026-03-15"
}
```

字段说明：

- `id`：开票记录 ID
- `projectId`：所属项目 ID
- `amount`：开票金额
- `invoiceDate`：开票日期，格式 `yyyy-MM-dd`

开票新增/编辑请求体：

```json
{
  "amount": 300000.00,
  "invoiceDate": "2026-03-15"
}
```

校验重点：

- `amount` 必须大于 `0`
- `invoiceDate` 不能为空

### 4.4 回款对象

```json
{
  "id": 21,
  "projectId": 1,
  "amount": 200000.00,
  "paymentDate": "2026-03-20"
}
```

字段说明：

- `id`：回款记录 ID
- `projectId`：所属项目 ID
- `amount`：回款金额
- `paymentDate`：回款日期，格式 `yyyy-MM-dd`

回款新增/编辑请求体：

```json
{
  "amount": 200000.00,
  "paymentDate": "2026-03-20"
}
```

校验重点：

- `amount` 必须大于 `0`
- `paymentDate` 不能为空

## 5. 关键接口说明

### 5.1 项目列表

`GET /api/projects`

支持 3 个可选查询参数：

- `name`：按项目名称模糊搜索
- `customer`：按客户名称模糊搜索
- `contractNo`：按合同号模糊搜索

示例：

```http
GET /api/projects?name=园区&customer=科技
```

返回为数组，按项目 `id` 倒序。

### 5.2 项目详情

`GET /api/projects/{id}`

返回单个项目汇总信息。适合用于编辑页回显，或者项目详情页头部信息展示。

### 5.3 开票/回款列表

开票和回款列表都属于项目的子资源。

- 开票按 `invoiceDate` 倒序，其次按 `id` 倒序
- 回款按 `paymentDate` 倒序，其次按 `id` 倒序

这意味着前端一般不需要额外排序，直接展示即可。

## 6. 错误返回

后端统一错误结构如下：

```json
{
  "message": "请求参数校验失败",
  "errors": {
    "name": "项目名称不能为空"
  }
}
```

### 6.1 常见场景

1. 参数校验失败：`400`

```json
{
  "message": "请求参数校验失败",
  "errors": {
    "contractAmount": "合同金额必须大于0"
  }
}
```

2. 数据不存在：`404`

```json
{
  "message": "项目不存在",
  "errors": {}
}
```

也可能是：

- `开票记录不存在`
- `回款记录不存在`

3. 业务冲突：`409`

删除项目时，如果项目下已经存在开票或回款记录，会返回：

```json
{
  "message": "项目下存在开票或回款记录，不能删除",
  "errors": {}
}
```

4. 权限相关：

- `401`：`未登录或登录已失效`
- `403`：`无权限访问`

## 7. 前端联调建议

### 7.1 页面建议

建议最少拆成以下页面或模块：

- 项目列表页：搜索 + 表格
- 项目新增/编辑弹窗或页面
- 项目详情页：展示项目基本信息、累计开票、累计回款
- 开票记录列表
- 回款记录列表

### 7.2 数据处理建议

- 金额字段统一按数字处理，展示时前端再格式化为金额
- 日期字段统一使用 `yyyy-MM-dd`
- 项目详情中的 `invoicedAmount`、`receivedAmount` 直接使用后端返回值
- 新增/编辑开票、回款成功后，建议刷新当前子列表，并同步刷新项目详情或项目列表汇总

### 7.3 删除交互建议

- 删除项目前，前端应给出二次确认
- 如果后端返回 `409`，直接提示“该项目下已有开票或回款记录，不能删除”
- 删除开票或回款成功后，建议重新拉取项目汇总，避免页面上累计金额不一致

## 8. 一句话总结

前端可以把这个模块理解为“项目主表 + 开票子表 + 回款子表”。项目接口负责基础信息和汇总金额，开票/回款接口负责明细维护，整体对接难度不高，重点是处理好 Session 登录态、表单校验提示和删除冲突提示。
