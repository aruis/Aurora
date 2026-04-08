package net.ximatai.aurora;

import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Set;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import net.ximatai.aurora.common.RoleCode;
import net.ximatai.aurora.user.AppUser;
import net.ximatai.aurora.user.AppUserRepository;
import net.ximatai.aurora.user.RoleRepository;

@SpringBootTest
@AutoConfigureMockMvc
class AuroraApplicationTests {

	private static final Path PROJECT_DELETE_ARCHIVE_PATH = Path.of("build/project-delete-archive-test.log");
	private static final String UNIT_FIFTH_TEAM = "FIFTH_TEAM";
	private static final String UNIT_SECOND_SURVEY_INSTITUTE = "SECOND_SURVEY_INSTITUTE";
	private static final String CATEGORY_MARKET_PROJECT = "MARKET_PROJECT";
	private static final String CATEGORY_PLATFORM_COMPANY = "PLATFORM_COMPANY";
	private static final String CATEGORY_GOVERNMENT_FINANCE = "GOVERNMENT_FINANCE";

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private ObjectMapper objectMapper;

	@Autowired
	private JdbcTemplate jdbcTemplate;

	@Autowired
	private AppUserRepository userRepository;

	@Autowired
	private RoleRepository roleRepository;

	@Autowired
	private PasswordEncoder passwordEncoder;

	@BeforeEach
	void cleanData() {
		jdbcTemplate.update("DELETE FROM operation_logs");
		jdbcTemplate.update("DELETE FROM project_changes");
		jdbcTemplate.update("DELETE FROM invoices");
		jdbcTemplate.update("DELETE FROM payments");
		jdbcTemplate.update("DELETE FROM projects");
		jdbcTemplate.update("DELETE FROM user_roles WHERE user_id IN (SELECT id FROM users WHERE username <> 'admin')");
		jdbcTemplate.update("DELETE FROM users WHERE username <> 'admin'");
		AppUser admin = userRepository.findByUsername("admin").orElseThrow();
		admin.setPasswordHash(passwordEncoder.encode("admin123"));
		admin.setDisplayName("管理员");
		admin.setEnabled(true);
		admin.setRoles(new java.util.LinkedHashSet<>(roleRepository.findByCodeIn(Set.of(RoleCode.ADMIN))));
		userRepository.save(admin);
		try {
			Files.deleteIfExists(PROJECT_DELETE_ARCHIVE_PATH);
		}
		catch (IOException ex) {
			throw new IllegalStateException("清理项目删除归档日志失败", ex);
		}
	}

	@Test
	void loginMeAndLogoutFlowWorks() throws Exception {
		MockHttpSession session = login("admin", "admin123");

		mockMvc.perform(get("/api/auth/me").session(session))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.username").value("admin"))
			.andExpect(jsonPath("$.roles[0]").value("ADMIN"));

		mockMvc.perform(post("/api/auth/logout").session(session))
			.andExpect(status().isNoContent());

		mockMvc.perform(get("/api/auth/me").session(session))
			.andExpect(status().isUnauthorized());
	}

	@Test
	void currentUserCanChangeOwnPassword() throws Exception {
		MockHttpSession session = login("admin", "admin123");

		mockMvc.perform(post("/api/auth/change-password").session(session)
				.contentType(APPLICATION_JSON)
				.content("""
					{"oldPassword":"wrong-old-password","newPassword":"newpass123"}
					"""))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.message").value("原密码不正确"));

		mockMvc.perform(post("/api/auth/change-password").session(session)
				.contentType(APPLICATION_JSON)
				.content("""
					{"oldPassword":"admin123","newPassword":"newpass123"}
					"""))
			.andExpect(status().isNoContent());

		mockMvc.perform(post("/api/auth/login")
				.contentType(APPLICATION_JSON)
				.content("""
					{"username":"admin","password":"admin123"}
					"""))
			.andExpect(status().isUnauthorized());

		mockMvc.perform(post("/api/auth/login")
				.contentType(APPLICATION_JSON)
				.content("""
					{"username":"admin","password":"newpass123"}
					"""))
			.andExpect(status().isOk());
	}

	@Test
	void disabledUserCannotLogin() throws Exception {
		createUser("disabled-user", "123456", "停用用户", false, Set.of(RoleCode.FINANCE));

		mockMvc.perform(post("/api/auth/login")
				.contentType(APPLICATION_JSON)
				.content("""
					{"username":"disabled-user","password":"123456"}
					"""))
			.andExpect(status().isUnauthorized())
			.andExpect(jsonPath("$.message").value("用户名或密码错误"));
	}

	@Test
	void adminCanManageUsersWhileFinanceCannot() throws Exception {
		createUser("finance-user", "123456", "财务用户", true, Set.of(RoleCode.FINANCE));
		MockHttpSession financeSession = login("finance-user", "123456");

		mockMvc.perform(get("/api/users").session(financeSession))
			.andExpect(status().isForbidden());

		MockHttpSession adminSession = login("admin", "admin123");

		mockMvc.perform(post("/api/users").session(adminSession)
				.contentType(APPLICATION_JSON)
				.content("""
					{
					  "username":"manager-user",
					  "password":"123456",
					  "displayName":"项目管理员",
					  "enabled":true,
					  "roles":["PROJECT_MANAGER"]
					}
					"""))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.username").value("manager-user"))
				.andExpect(jsonPath("$.roles[0]").value("PROJECT_MANAGER"));

		mockMvc.perform(get("/api/users").session(adminSession))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$[?(@.username == 'manager-user')]").exists());
	}

	@Test
	void financeCannotCreateProject() throws Exception {
		createUser("finance-only", "123456", "财务", true, Set.of(RoleCode.FINANCE));
		MockHttpSession financeSession = login("finance-only", "123456");

		mockMvc.perform(post("/api/projects").session(financeSession)
				.contentType(APPLICATION_JSON)
				.content("""
					{
					  "name":"禁止创建项目",
					  "customer":"客户A",
					  "contractNo":"HT-001",
					  "signingDate":"2026-04-03",
					  "contractAmount":1000,
					  "undertakingUnit":"%s",
					  "category":"%s"
					}
					""".formatted(UNIT_FIFTH_TEAM, CATEGORY_MARKET_PROJECT)))
			.andExpect(status().isForbidden());
	}

	@Test
	void dictionariesAreExposedAsConfigurableOptions() throws Exception {
		MockHttpSession adminSession = login("admin", "admin123");

		mockMvc.perform(get("/api/dictionaries")
				.session(adminSession)
				.param("type", "undertaking_unit"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$[0].code").value(UNIT_FIFTH_TEAM))
			.andExpect(jsonPath("$[0].label").value("五队"));

		mockMvc.perform(get("/api/dictionaries/admin").session(adminSession))
			.andExpect(status().isOk())
			.andExpect(content().string(containsString("undertaking_unit")))
			.andExpect(content().string(containsString("project_category")));
	}

	@Test
	void dictionaryManagementWritesOperationLogs() throws Exception {
		MockHttpSession adminSession = login("admin", "admin123");

		MvcResult createResult = mockMvc.perform(post("/api/dictionaries").session(adminSession)
				.contentType(APPLICATION_JSON)
				.content("""
					{
					  "type":"undertaking_unit",
					  "code":"UNIT_DELTA",
					  "label":"承接单位 D",
					  "sortOrder":40,
					  "enabled":true
					}
					"""))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.code").value("UNIT_DELTA"))
			.andReturn();

		Long entryId = readId(createResult);

		mockMvc.perform(put("/api/dictionaries/{id}", entryId).session(adminSession)
				.contentType(APPLICATION_JSON)
				.content("""
					{
					  "type":"undertaking_unit",
					  "code":"UNIT_DELTA",
					  "label":"承接单位 D2",
					  "sortOrder":45,
					  "enabled":false
					}
					"""))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.label").value("承接单位 D2"));

		mockMvc.perform(delete("/api/dictionaries/{id}", entryId).session(adminSession))
			.andExpect(status().isOk());

		mockMvc.perform(get("/api/operation-logs")
				.session(adminSession)
				.param("moduleName", "数据字典")
				.param("actionName", "字典项"))
			.andExpect(status().isOk())
			.andExpect(content().string(containsString("新增字典项")))
			.andExpect(content().string(containsString("编辑字典项")))
			.andExpect(content().string(containsString("删除字典项")));
	}

	@Test
	void referencedDictionaryEntryCannotChangeCodeOrBeDeleted() throws Exception {
		MockHttpSession adminSession = login("admin", "admin123");
		createProject(adminSession, """
			{
			  "name":"字典引用项目",
			  "customer":"客户A",
			  "contractNo":"HT-DICT-001",
			  "signingDate":"2026-04-03",
			  "contractAmount":1000,
			  "undertakingUnit":"%s",
			  "category":"%s"
			}
			""".formatted(UNIT_FIFTH_TEAM, CATEGORY_MARKET_PROJECT));

		MvcResult entriesResult = mockMvc.perform(get("/api/dictionaries/admin")
				.session(adminSession)
				.param("type", "undertaking_unit"))
			.andExpect(status().isOk())
			.andReturn();

		JsonNode entries = objectMapper.readTree(entriesResult.getResponse().getContentAsString(StandardCharsets.UTF_8));
		Long entryId = null;
		for (JsonNode entry : entries) {
			if (UNIT_FIFTH_TEAM.equals(entry.get("code").asText())) {
				entryId = entry.get("id").asLong();
				break;
			}
		}

		if (entryId == null) {
			throw new IllegalStateException("未找到承接单位字典项: " + UNIT_FIFTH_TEAM);
		}

		mockMvc.perform(put("/api/dictionaries/{id}", entryId).session(adminSession)
				.contentType(APPLICATION_JSON)
				.content("""
					{
					  "type":"undertaking_unit",
					  "code":"FIFTH_TEAM_V2",
					  "label":"五队",
					  "sortOrder":10,
					  "enabled":true
					}
					"""))
			.andExpect(status().isConflict())
			.andExpect(jsonPath("$.message").value("该字典项已被项目使用，不能修改编码或删除"));

		mockMvc.perform(delete("/api/dictionaries/{id}", entryId).session(adminSession))
			.andExpect(status().isConflict())
			.andExpect(jsonPath("$.message").value("该字典项已被项目使用，不能修改编码或删除"));
	}

	@Test
	void projectAggregatesAndDeleteRulesWork() throws Exception {
		MockHttpSession adminSession = login("admin", "admin123");
		Long projectId = createProject(adminSession);

		Long invoiceId = createInvoice(adminSession, projectId, """
			{"amount":1000,"invoiceDate":"2026-04-04","invoiceNo":"FP-001"}
			""");
		Long paymentId = createPayment(adminSession, projectId, """
			{"amount":300,"paymentDate":"2026-04-05","invoiceId":%d}
			""".formatted(invoiceId));

		mockMvc.perform(put("/api/projects/{projectId}/invoices/{invoiceId}", projectId, invoiceId)
				.session(adminSession)
				.contentType(APPLICATION_JSON)
				.content("""
					{"amount":1200,"invoiceDate":"2026-04-06","invoiceNo":"FP-001-A"}
					"""))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.amount").value(1200))
			.andExpect(jsonPath("$.invoiceNo").value("FP-001-A"));

		mockMvc.perform(put("/api/projects/{projectId}/payments/{paymentId}", projectId, paymentId)
				.session(adminSession)
				.contentType(APPLICATION_JSON)
				.content("""
					{"amount":500,"paymentDate":"2026-04-07","invoiceId":%d}
					""".formatted(invoiceId)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.amount").value(500))
				.andExpect(jsonPath("$.invoiceNo").value("FP-001-A"));

		mockMvc.perform(get("/api/projects/{id}", projectId).session(adminSession))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.project.invoicedAmount").value(1200))
			.andExpect(jsonPath("$.project.receivedAmount").value(500))
			.andExpect(jsonPath("$.project.accrualAmount").value(700))
			.andExpect(jsonPath("$.project.arrearsAmount").value(8388.88))
			.andExpect(jsonPath("$.project.paymentProgress").value(0.0563));

		mockMvc.perform(get("/api/projects/{id}/delete-check", projectId).session(adminSession))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.requiresStrongConfirmation").value(true))
			.andExpect(jsonPath("$.hasInvoices").value(true))
			.andExpect(jsonPath("$.hasPayments").value(true));

		mockMvc.perform(delete("/api/projects/{projectId}/payments/{paymentId}", projectId, paymentId)
				.session(adminSession))
			.andExpect(status().isOk());

		mockMvc.perform(get("/api/projects/{id}", projectId).session(adminSession))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.project.receivedAmount").value(0));

		mockMvc.perform(delete("/api/projects/{projectId}/invoices/{invoiceId}", projectId, invoiceId)
				.session(adminSession))
			.andExpect(status().isOk());

		mockMvc.perform(delete("/api/projects/{id}", projectId).session(adminSession))
			.andExpect(status().isOk());

		mockMvc.perform(get("/api/projects/{id}", projectId).session(adminSession))
			.andExpect(status().isNotFound());
	}

	@Test
	void financeStatsAggregatesAcrossProjects() throws Exception {
		MockHttpSession adminSession = login("admin", "admin123");
		Long projectA = createProject(adminSession);
		Long projectB = createProject(adminSession, """
			{
			  "name":"北极星项目",
			  "customer":"示例客户B",
			  "contractNo":"HT-2026-002",
			  "signingDate":"2026-04-08",
			  "contractAmount":6666.00,
			  "undertakingUnit":"%s",
			  "category":"%s"
			}
			""".formatted(UNIT_FIFTH_TEAM, CATEGORY_MARKET_PROJECT));
		Long projectC = createProject(adminSession, """
			{
			  "name":"晨曦项目",
			  "customer":"示例客户C",
			  "contractNo":"HT-2026-003",
			  "signingDate":"2026-04-10",
			  "contractAmount":9999.00,
			  "undertakingUnit":"%s",
			  "category":"%s"
			}
			""".formatted(UNIT_FIFTH_TEAM, CATEGORY_MARKET_PROJECT));

		Long invoiceA = createInvoice(adminSession, projectA, """
			{"amount":1000,"invoiceDate":"2026-04-05","invoiceNo":"FP-A-001"}
			""");
		Long invoiceB = createInvoice(adminSession, projectB, """
			{"amount":400,"invoiceDate":"2026-03-31","invoiceNo":"FP-B-001"}
			""");
		createPayment(adminSession, projectA, """
			{"amount":600,"paymentDate":"2026-04-06","invoiceId":%d}
			""".formatted(invoiceA));
		createPayment(adminSession, projectB, """
			{"amount":300,"paymentDate":"2026-04-07","invoiceId":%d}
			""".formatted(invoiceB));
		createInvoice(adminSession, projectC, """
			{"amount":800,"invoiceDate":"2026-03-30","invoiceNo":"FP-C-001"}
			""");

		mockMvc.perform(get("/api/finance-stats")
				.session(adminSession)
				.param("startDate", "2026-04-01")
				.param("endDate", "2026-04-30"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.summary.invoiceTotal").value(1000))
			.andExpect(jsonPath("$.summary.paymentTotal").value(900))
			.andExpect(jsonPath("$.summary.projectCount").value(2))
			.andExpect(jsonPath("$.projects.length()").value(2))
			.andExpect(jsonPath("$.projects[0].projectId").value(projectA))
			.andExpect(jsonPath("$.projects[0].invoiceAmount").value(1000))
			.andExpect(jsonPath("$.projects[0].paymentAmount").value(600))
			.andExpect(jsonPath("$.projects[1].projectId").value(projectB))
			.andExpect(jsonPath("$.projects[1].invoiceAmount").value(0))
			.andExpect(jsonPath("$.projects[1].paymentAmount").value(300));
	}

	@Test
	void financeStatsRejectsInvalidDateRange() throws Exception {
		MockHttpSession adminSession = login("admin", "admin123");

		mockMvc.perform(get("/api/finance-stats")
				.session(adminSession)
				.param("startDate", "2026-04-30")
				.param("endDate", "2026-04-01"))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.message").value("开始日期不能晚于结束日期"));
	}

	@Test
	void unauthenticatedRequestsReceiveUnauthorizedResponses() throws Exception {
		mockMvc.perform(get("/api/projects"))
			.andExpect(status().isUnauthorized())
			.andExpect(jsonPath("$.message").value("未登录或登录已失效"));

		mockMvc.perform(post("/api/auth/change-password")
				.contentType(APPLICATION_JSON)
				.content("""
					{"oldPassword":"admin123","newPassword":"newpass123"}
					"""))
			.andExpect(status().isUnauthorized())
			.andExpect(jsonPath("$.message").value("未登录或登录已失效"));

		mockMvc.perform(post("/api/auth/logout"))
			.andExpect(status().isUnauthorized())
			.andExpect(jsonPath("$.message").value("未登录或登录已失效"));
	}

	@Test
	void invalidPayloadsReturnValidationErrors() throws Exception {
		MockHttpSession adminSession = login("admin", "admin123");

		mockMvc.perform(post("/api/projects").session(adminSession)
				.contentType(APPLICATION_JSON)
				.content("""
					{
					  "name":" ",
					  "customer":"",
					  "contractNo":" ",
					  "signingDate":null,
					  "contractAmount":0,
					  "undertakingUnit":"",
					  "category":""
					}
					"""))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.message").value("请求参数校验失败"))
			.andExpect(jsonPath("$.errors.name").value("项目名称不能为空"))
			.andExpect(jsonPath("$.errors.customer").value("客户不能为空"))
			.andExpect(jsonPath("$.errors.contractNo").value("合同号不能为空"))
			.andExpect(jsonPath("$.errors.signingDate").value("签约时间不能为空"))
			.andExpect(jsonPath("$.errors.contractAmount").value("合同金额必须大于0"))
			.andExpect(jsonPath("$.errors.undertakingUnit").value("承接单位不能为空"))
			.andExpect(jsonPath("$.errors.category").value("类别不能为空"));

		mockMvc.perform(post("/api/users").session(adminSession)
				.contentType(APPLICATION_JSON)
				.content("""
					{
					  "username":"new-user",
					  "password":"",
					  "displayName":" ",
					  "enabled":true,
					  "roles":[]
					}
					"""))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.message").value("请求参数校验失败"))
			.andExpect(jsonPath("$.errors.password").value("密码不能为空"))
			.andExpect(jsonPath("$.errors.displayName").value("展示名称不能为空"))
			.andExpect(jsonPath("$.errors.roles").value("至少选择一个角色"));

		Long projectId = createProject(adminSession);

		mockMvc.perform(post("/api/projects/{projectId}/invoices", projectId).session(adminSession)
				.contentType(APPLICATION_JSON)
				.content("""
					{"amount":0,"invoiceDate":null,"invoiceNo":""}
					"""))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.message").value("请求参数校验失败"))
			.andExpect(jsonPath("$.errors.amount").value("开票金额必须大于0"))
			.andExpect(jsonPath("$.errors.invoiceDate").value("开票时间不能为空"))
			.andExpect(jsonPath("$.errors.invoiceNo").value("发票号不能为空"));
	}

	@Test
	void userManagementGuardrailsAndSensitiveFieldsAreCovered() throws Exception {
		MockHttpSession adminSession = login("admin", "admin123");

		MvcResult createResult = mockMvc.perform(post("/api/users").session(adminSession)
				.contentType(APPLICATION_JSON)
				.content("""
					{
					  "username":"auditor",
					  "password":"123456",
					  "displayName":"审计员",
					  "enabled":true,
					  "roles":["FINANCE"]
					}
					"""))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.username").value("auditor"))
			.andExpect(content().string(not(containsString("passwordHash"))))
			.andReturn();

		mockMvc.perform(post("/api/users").session(adminSession)
				.contentType(APPLICATION_JSON)
				.content("""
					{
					  "username":"auditor",
					  "password":"654321",
					  "displayName":"重复用户",
					  "enabled":true,
					  "roles":["FINANCE"]
					}
					"""))
			.andExpect(status().isConflict())
			.andExpect(jsonPath("$.message").value("用户名已存在"));

		Long adminId = userRepository.findByUsername("admin").orElseThrow().getId();
		mockMvc.perform(post("/api/users/{id}/disable", adminId).session(adminSession))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.message").value("admin 用户不允许被禁用"));

		mockMvc.perform(get("/api/users").session(adminSession))
			.andExpect(status().isOk())
			.andExpect(content().string(not(containsString("passwordHash"))));

		mockMvc.perform(get("/api/auth/me").session(adminSession))
			.andExpect(status().isOk())
			.andExpect(content().string(not(containsString("passwordHash"))));

		Long auditorId = readNestedUserId(createResult);
		mockMvc.perform(post("/api/users/{id}/reset-password", auditorId).session(adminSession)
				.contentType(APPLICATION_JSON)
				.content("""
					{"newPassword":"reset789"}
					"""))
			.andExpect(status().isOk());

		mockMvc.perform(post("/api/auth/login")
				.contentType(APPLICATION_JSON)
				.content("""
					{"username":"auditor","password":"123456"}
					"""))
			.andExpect(status().isUnauthorized());

		mockMvc.perform(post("/api/auth/login")
				.contentType(APPLICATION_JSON)
				.content("""
					{"username":"auditor","password":"reset789"}
					"""))
			.andExpect(status().isOk())
			.andExpect(content().string(not(containsString("passwordHash"))));
	}

	@Test
	void invoiceAndPaymentRejectCrossProjectAccessAndMissingResources() throws Exception {
		MockHttpSession adminSession = login("admin", "admin123");
		Long projectA = createProject(adminSession);
		Long projectB = createProject(adminSession, """
			{
			  "name":"Beta 项目",
			  "customer":"测试客户B",
			  "contractNo":"HT-2026-009",
			  "signingDate":"2026-04-09",
			  "contractAmount":2000,
			  "undertakingUnit":"%s",
			  "category":"%s"
			}
			""".formatted(UNIT_FIFTH_TEAM, CATEGORY_MARKET_PROJECT));
		Long invoiceId = createInvoice(adminSession, projectA, """
			{"amount":500,"invoiceDate":"2026-04-05","invoiceNo":"FP-X-001"}
			""");
		Long paymentId = createPayment(adminSession, projectA, """
			{"amount":300,"paymentDate":"2026-04-06","invoiceId":%d}
			""".formatted(invoiceId));

		mockMvc.perform(put("/api/projects/{projectId}/invoices/{invoiceId}", projectB, invoiceId)
				.session(adminSession)
				.contentType(APPLICATION_JSON)
				.content("""
					{"amount":800,"invoiceDate":"2026-04-10","invoiceNo":"FP-X-002"}
					"""))
			.andExpect(status().isNotFound())
			.andExpect(jsonPath("$.message").value("开票记录不存在"));

		mockMvc.perform(post("/api/projects/{projectId}/payments", projectB)
				.session(adminSession)
				.contentType(APPLICATION_JSON)
				.content("""
					{"amount":100,"paymentDate":"2026-04-10","invoiceId":%d}
					""".formatted(invoiceId)))
			.andExpect(status().isNotFound())
			.andExpect(jsonPath("$.message").value("发票不存在"));

		mockMvc.perform(delete("/api/projects/{projectId}/payments/{paymentId}", projectB, paymentId)
				.session(adminSession))
			.andExpect(status().isNotFound())
			.andExpect(jsonPath("$.message").value("回款记录不存在"));

		mockMvc.perform(get("/api/projects/{projectId}/payments", 999999L).session(adminSession))
			.andExpect(status().isNotFound())
			.andExpect(jsonPath("$.message").value("项目不存在"));
	}

	@Test
	void projectValidationAndPaymentInvoiceOptionsReflectBusinessRules() throws Exception {
		MockHttpSession adminSession = login("admin", "admin123");

		mockMvc.perform(post("/api/projects").session(adminSession)
				.contentType(APPLICATION_JSON)
				.content("""
					{
					  "name":"非法项目",
					  "customer":"客户Z",
					  "contractNo":"HT-2026-777",
					  "signingDate":"2026-04-11",
					  "contractAmount":1000,
					  "undertakingUnit":"三队",
					  "category":"未知类别"
					}
					"""))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.message").value("承接单位不合法"));

		Long projectId = createProject(adminSession);
		Long invoiceA = createInvoice(adminSession, projectId, """
			{"amount":1000,"invoiceDate":"2026-04-08","invoiceNo":"FP-OPT-002"}
			""");
		Long invoiceB = createInvoice(adminSession, projectId, """
			{"amount":500,"invoiceDate":"2026-04-05","invoiceNo":"FP-OPT-001"}
			""");
		Long paymentId = createPayment(adminSession, projectId, """
			{"amount":1000,"paymentDate":"2026-04-09","invoiceId":%d}
			""".formatted(invoiceA));

		mockMvc.perform(get("/api/projects/{projectId}/payments/invoice-options", projectId).session(adminSession))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.length()").value(1))
			.andExpect(jsonPath("$[0].invoiceId").value(invoiceB))
			.andExpect(jsonPath("$[0].invoiceNo").value("FP-OPT-001"))
			.andExpect(jsonPath("$[0].unsettledAmount").value(500));

		mockMvc.perform(get("/api/projects/{projectId}/payments/invoice-options", projectId)
				.session(adminSession)
				.param("paymentId", String.valueOf(paymentId)))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.length()").value(2))
			.andExpect(jsonPath("$[0].invoiceId").value(invoiceA))
			.andExpect(jsonPath("$[0].invoiceNo").value("FP-OPT-002"));
	}

	@Test
	void paymentCanSkipInvoiceButCannotExceedInvoiceAmountWhenLinked() throws Exception {
		MockHttpSession adminSession = login("admin", "admin123");
		Long projectId = createProject(adminSession);
		Long invoiceId = createInvoice(adminSession, projectId, """
			{"amount":1000,"invoiceDate":"2026-04-08","invoiceNo":"FP-LIMIT-001"}
			""");

		mockMvc.perform(post("/api/projects/{projectId}/payments", projectId)
				.session(adminSession)
				.contentType(APPLICATION_JSON)
				.content("""
					{"amount":200,"paymentDate":"2026-04-08","invoiceId":null}
					"""))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.invoiceId").isEmpty())
			.andExpect(jsonPath("$.invoiceNo").isEmpty());

		mockMvc.perform(post("/api/projects/{projectId}/payments", projectId)
				.session(adminSession)
				.contentType(APPLICATION_JSON)
				.content("""
					{"amount":700,"paymentDate":"2026-04-09","invoiceId":%d}
					""".formatted(invoiceId)))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.invoiceId").value(invoiceId));

		mockMvc.perform(post("/api/projects/{projectId}/payments", projectId)
				.session(adminSession)
				.contentType(APPLICATION_JSON)
				.content("""
					{"amount":400,"paymentDate":"2026-04-10","invoiceId":%d}
					""".formatted(invoiceId)))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.message").value("回款金额不能大于发票未结清金额"));
	}

	@Test
	void financeStatsAndProjectListHandleEdgeQueries() throws Exception {
		MockHttpSession adminSession = login("admin", "admin123");
		Long projectId = createProject(adminSession, """
			{
			  "name":"  银河项目  ",
			  "customer":"星河客户",
			  "contractNo":"HT-2026-100",
			  "signingDate":"2026-04-11",
			  "contractAmount":5200,
			  "undertakingUnit":"%s",
			  "category":"%s"
			}
			""".formatted(UNIT_SECOND_SURVEY_INSTITUTE, CATEGORY_PLATFORM_COMPANY));
		Long invoiceId = createInvoice(adminSession, projectId, """
			{"amount":1200,"invoiceDate":"2026-04-11","invoiceNo":"FP-G-001"}
			""");
		createPayment(adminSession, projectId, """
			{"amount":1200,"paymentDate":"2026-04-12","invoiceId":%d}
			""".formatted(invoiceId));

		mockMvc.perform(get("/api/projects")
				.session(adminSession)
				.param("name", "")
				.param("customer", "星河")
				.param("undertakingUnit", UNIT_SECOND_SURVEY_INSTITUTE)
				.param("category", CATEGORY_PLATFORM_COMPANY)
				.param("contractNo", "")
				.param("signingDateStart", "2026-04-01")
				.param("signingDateEnd", "2026-04-30"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.length()").value(1))
			.andExpect(jsonPath("$[0].id").value(projectId))
			.andExpect(jsonPath("$[0].undertakingUnit").value(UNIT_SECOND_SURVEY_INSTITUTE))
			.andExpect(jsonPath("$[0].undertakingUnitLabel").value("二勘院"))
			.andExpect(jsonPath("$[0].category").value(CATEGORY_PLATFORM_COMPANY))
			.andExpect(jsonPath("$[0].categoryLabel").value("平台公司"));

		mockMvc.perform(get("/api/finance-stats")
				.session(adminSession)
				.param("startDate", "2026-05-01")
				.param("endDate", "2026-05-31"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.summary.invoiceTotal").value(0))
			.andExpect(jsonPath("$.summary.paymentTotal").value(0))
			.andExpect(jsonPath("$.summary.projectCount").value(0))
			.andExpect(jsonPath("$.projects.length()").value(0));
	}

	@Test
	void projectListSupportsNewLedgerFilters() throws Exception {
		MockHttpSession adminSession = login("admin", "admin123");
		createProject(adminSession, """
			{
			  "name":"城市更新项目",
			  "customer":"建发集团",
			  "contractNo":"HT-2026-201",
			  "signingDate":"2026-04-01",
			  "contractAmount":6000,
			  "responsibleDepartment":"经营一部",
			  "undertakingUnit":"%s",
			  "category":"%s",
			  "paymentMethod":"分期付款",
			  "remark":"重点盯回款"
			}
			""".formatted(UNIT_FIFTH_TEAM, CATEGORY_MARKET_PROJECT));
		createProject(adminSession, """
			{
			  "name":"财政专项项目",
			  "customer":"财政局",
			  "contractNo":"HT-2026-202",
			  "signingDate":"2026-04-02",
			  "contractAmount":8000,
			  "responsibleDepartment":"经营二部",
			  "undertakingUnit":"%s",
			  "category":"%s",
			  "paymentMethod":"验收后一次性支付",
			  "remark":"流程稳定"
			}
			""".formatted(UNIT_SECOND_SURVEY_INSTITUTE, CATEGORY_GOVERNMENT_FINANCE));

		mockMvc.perform(get("/api/projects")
				.session(adminSession)
				.param("responsibleDepartment", "经营一")
				.param("undertakingUnit", UNIT_FIFTH_TEAM)
				.param("category", CATEGORY_MARKET_PROJECT)
				.param("paymentMethod", "分期")
				.param("remark", "回款"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.length()").value(1))
			.andExpect(jsonPath("$[0].name").value("城市更新项目"));
	}

	@Test
	void operationLogsAreVisibleToAdminOnlyAndLimitedToRetentionWindow() throws Exception {
		createUser("finance-auditor", "123456", "财务审阅", true, Set.of(RoleCode.FINANCE));
		MockHttpSession adminSession = login("admin", "admin123");
		MockHttpSession financeSession = login("finance-auditor", "123456");

		createProject(adminSession);

		jdbcTemplate.update("""
			INSERT INTO operation_logs (
			  module_name, action_name, target_type, target_id, target_name, detail,
			  operator_id, operator_username, operator_display_name, operator_roles,
			  ip_address, request_method, request_path, success, operated_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			""",
			"测试模块", "过期操作", "项目", "999", "过期项目", "这是一条过期日志",
			1L, "admin", "管理员", "ADMIN", "127.0.0.1", "POST", "/api/test", true,
			LocalDateTime.now().minusDays(60).atZone(ZoneId.systemDefault()).toInstant().toEpochMilli());

		mockMvc.perform(get("/api/operation-logs").session(financeSession))
			.andExpect(status().isForbidden());

		mockMvc.perform(get("/api/operation-logs").session(adminSession))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.retentionDays").value(30))
			.andExpect(content().string(not(containsString("过期操作"))));
	}

	@Test
	void projectDetailReturnsImmutableChangeHistoryAfterUpdate() throws Exception {
		MockHttpSession adminSession = login("admin", "admin123");
		Long projectId = createProject(adminSession);

		mockMvc.perform(put("/api/projects/{id}", projectId).session(adminSession)
				.contentType(APPLICATION_JSON)
				.content("""
					{
					  "name":"Aurora 新项目",
					  "customer":"更新后的客户",
					  "contractNo":"HT-2026-001-A",
					  "signingDate":"2026-04-09",
					  "contractAmount":9999.99,
					  "responsibleDepartment":"经营部",
					  "undertakingUnit":"%s",
					  "category":"%s",
					  "contractPeriod":"180天",
					  "paymentMethod":"分期付款",
					  "remark":"补充说明"
					}
					""".formatted(UNIT_SECOND_SURVEY_INSTITUTE, CATEGORY_PLATFORM_COMPANY)))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.name").value("Aurora 新项目"));

		mockMvc.perform(get("/api/projects/{id}", projectId).session(adminSession))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.project.name").value("Aurora 新项目"))
			.andExpect(jsonPath("$.changes.length()").value(1))
			.andExpect(jsonPath("$.changes[0].operatorUsername").value("admin"))
			.andExpect(jsonPath("$.changes[0].summary").value("更新了 11 项内容"))
			.andExpect(jsonPath("$.changes[0].detail").value(containsString("项目名称：Aurora 项目 -> Aurora 新项目")))
			.andExpect(jsonPath("$.changes[0].detail").value(containsString("承接单位：五队 -> 二勘院")))
			.andExpect(jsonPath("$.changes[0].detail").value(containsString("备注：空 -> 补充说明")));

		mockMvc.perform(get("/api/operation-logs")
				.session(adminSession)
				.param("moduleName", "项目管理")
				.param("actionName", "编辑"))
			.andExpect(status().isOk())
			.andExpect(content().string(containsString("编辑项目")));

		mockMvc.perform(get("/api/projects/{id}/delete-check", projectId).session(adminSession))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.requiresStrongConfirmation").value(true))
			.andExpect(jsonPath("$.hasProjectChanges").value(true));
	}

	@Test
	void projectDeleteUsesSimpleOrStrongConfirmationDependingOnAssociations() throws Exception {
		MockHttpSession adminSession = login("admin", "admin123");
		Long plainProjectId = createProject(adminSession, """
			{
			  "name":"纯项目",
			  "customer":"客户A",
			  "contractNo":"HT-DEL-001",
			  "signingDate":"2026-04-03",
			  "contractAmount":3000,
			  "undertakingUnit":"%s",
			  "category":"%s"
			}
			""".formatted(UNIT_FIFTH_TEAM, CATEGORY_MARKET_PROJECT));

		mockMvc.perform(get("/api/projects/{id}/delete-check", plainProjectId).session(adminSession))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.requiresStrongConfirmation").value(false));

		mockMvc.perform(delete("/api/projects/{id}", plainProjectId).session(adminSession))
			.andExpect(status().isOk());

		Long riskyProjectId = createProject(adminSession, """
			{
			  "name":"高风险项目",
			  "customer":"客户B",
			  "contractNo":"HT-DEL-002",
			  "signingDate":"2026-04-04",
			  "contractAmount":4000,
			  "undertakingUnit":"%s",
			  "category":"%s"
			}
			""".formatted(UNIT_FIFTH_TEAM, CATEGORY_MARKET_PROJECT));
		Long invoiceId = createInvoice(adminSession, riskyProjectId, """
			{"amount":1200,"invoiceDate":"2026-04-05","invoiceNo":"FP-DEL-001"}
			""");
		createPayment(adminSession, riskyProjectId, """
			{"amount":600,"paymentDate":"2026-04-06","invoiceId":%d}
			""".formatted(invoiceId));
		mockMvc.perform(put("/api/projects/{id}", riskyProjectId)
				.session(adminSession)
				.contentType(APPLICATION_JSON)
				.content("""
					{
					  "name":"高风险项目-更新",
					  "customer":"客户B",
					  "contractNo":"HT-DEL-002",
					  "signingDate":"2026-04-04",
					  "contractAmount":4000,
					  "undertakingUnit":"%s",
					  "category":"%s"
					}
					""".formatted(UNIT_FIFTH_TEAM, CATEGORY_MARKET_PROJECT)))
			.andExpect(status().isOk());

		mockMvc.perform(get("/api/projects/{id}/delete-check", riskyProjectId).session(adminSession))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.requiresStrongConfirmation").value(true))
			.andExpect(jsonPath("$.hasProjectChanges").value(true))
			.andExpect(jsonPath("$.hasInvoices").value(true))
			.andExpect(jsonPath("$.hasPayments").value(true))
			.andExpect(jsonPath("$.contractNo").value("HT-DEL-002"));

		mockMvc.perform(delete("/api/projects/{id}", riskyProjectId).session(adminSession))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.message").value("请输入项目合同号以确认删除"));

		mockMvc.perform(delete("/api/projects/{id}", riskyProjectId).session(adminSession)
				.contentType(APPLICATION_JSON)
				.content("""
					{"contractNo":"HT-DEL-002-X","password":"admin123"}
					"""))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.message").value("项目合同号不匹配"));

		mockMvc.perform(delete("/api/projects/{id}", riskyProjectId).session(adminSession)
				.contentType(APPLICATION_JSON)
				.content("""
					{"contractNo":"HT-DEL-002","password":"bad-password"}
					"""))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.message").value("当前登录密码不正确"));

		mockMvc.perform(delete("/api/projects/{id}", riskyProjectId).session(adminSession)
				.contentType(APPLICATION_JSON)
				.content("""
					{"contractNo":"HT-DEL-002","password":"admin123"}
					"""))
			.andExpect(status().isOk());

		mockMvc.perform(get("/api/projects/{id}", riskyProjectId).session(adminSession))
			.andExpect(status().isNotFound());

		org.junit.jupiter.api.Assertions.assertEquals(0,
			jdbcTemplate.queryForObject("SELECT COUNT(*) FROM invoices WHERE project_id = ?", Integer.class, riskyProjectId));
		org.junit.jupiter.api.Assertions.assertEquals(0,
			jdbcTemplate.queryForObject("SELECT COUNT(*) FROM payments WHERE project_id = ?", Integer.class, riskyProjectId));
		org.junit.jupiter.api.Assertions.assertEquals(0,
			jdbcTemplate.queryForObject("SELECT COUNT(*) FROM project_changes WHERE project_id = ?", Integer.class, riskyProjectId));

		String archiveLog = Files.readString(PROJECT_DELETE_ARCHIVE_PATH, StandardCharsets.UTF_8);
		org.junit.jupiter.api.Assertions.assertTrue(archiveLog.contains("\"archiveId\":\""));
		org.junit.jupiter.api.Assertions.assertTrue(archiveLog.contains("\"contractNo\":\"HT-DEL-002\""));
		org.junit.jupiter.api.Assertions.assertTrue(archiveLog.contains("\"strongConfirmationUsed\":true"));
		org.junit.jupiter.api.Assertions.assertTrue(archiveLog.contains("\"associatedDataSnapshotCounts\":{\"changeCount\":1,\"invoiceCount\":1,\"paymentCount\":1}"));
		org.junit.jupiter.api.Assertions.assertTrue(archiveLog.contains("\"invoiceNo\":\"FP-DEL-001\""));
	}

	private MockHttpSession login(String username, String password) throws Exception {
		MvcResult result = mockMvc.perform(post("/api/auth/login")
				.contentType(APPLICATION_JSON)
				.content("""
					{"username":"%s","password":"%s"}
						""".formatted(username, password)))
			.andExpect(status().isOk())
			.andReturn();
		return (MockHttpSession) result.getRequest().getSession(false);
	}

	private void createUser(String username, String password, String displayName, boolean enabled, Set<RoleCode> roles) {
		AppUser user = new AppUser();
		user.setUsername(username);
		user.setPasswordHash(passwordEncoder.encode(password));
		user.setDisplayName(displayName);
		user.setEnabled(enabled);
		user.setRoles(new java.util.LinkedHashSet<>(roleRepository.findByCodeIn(roles)));
		userRepository.save(user);
	}

	private Long createProject(MockHttpSession session) throws Exception {
		return createProject(session, """
			{
			  "name":"Aurora 项目",
			  "customer":"测试客户",
			  "contractNo":"HT-2026-001",
			  "signingDate":"2026-04-03",
			  "contractAmount":8888.88,
			  "undertakingUnit":"%s",
			  "category":"%s"
			}
			""".formatted(UNIT_FIFTH_TEAM, CATEGORY_MARKET_PROJECT));
	}

	private Long createProject(MockHttpSession session, String json) throws Exception {
		MvcResult result = mockMvc.perform(post("/api/projects").session(session)
				.contentType(APPLICATION_JSON)
				.content(json))
			.andExpect(status().isOk())
			.andReturn();
		return readId(result);
	}

	private Long createInvoice(MockHttpSession session, Long projectId, String json) throws Exception {
		MvcResult result = mockMvc.perform(post("/api/projects/{projectId}/invoices", projectId).session(session)
				.contentType(APPLICATION_JSON)
				.content(json))
			.andExpect(status().isOk())
			.andReturn();
		return readId(result);
	}

	private Long createPayment(MockHttpSession session, Long projectId, String json) throws Exception {
		MvcResult result = mockMvc.perform(post("/api/projects/{projectId}/payments", projectId).session(session)
				.contentType(APPLICATION_JSON)
				.content(json))
			.andExpect(status().isOk())
			.andReturn();
		return readId(result);
	}

	private Long readId(MvcResult result) throws Exception {
		JsonNode jsonNode = objectMapper.readTree(result.getResponse().getContentAsString(StandardCharsets.UTF_8));
		return jsonNode.get("id").asLong();
	}

	private Long readNestedUserId(MvcResult result) throws Exception {
		JsonNode jsonNode = objectMapper.readTree(result.getResponse().getContentAsString(StandardCharsets.UTF_8));
		return jsonNode.get("id").asLong();
	}
}
