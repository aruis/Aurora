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

import java.nio.charset.StandardCharsets;
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
					  "contractAmount":1000
					}
					"""))
			.andExpect(status().isForbidden());
	}

	@Test
	void projectAggregatesAndDeleteRulesWork() throws Exception {
		MockHttpSession adminSession = login("admin", "admin123");
		Long projectId = createProject(adminSession);

		Long invoiceId = createInvoice(adminSession, projectId, """
			{"amount":1000,"invoiceDate":"2026-04-04"}
			""");
		Long paymentId = createPayment(adminSession, projectId, """
			{"amount":300,"paymentDate":"2026-04-05"}
			""");

		mockMvc.perform(put("/api/projects/{projectId}/invoices/{invoiceId}", projectId, invoiceId)
				.session(adminSession)
				.contentType(APPLICATION_JSON)
				.content("""
					{"amount":1200,"invoiceDate":"2026-04-06"}
					"""))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.amount").value(1200));

		mockMvc.perform(put("/api/projects/{projectId}/payments/{paymentId}", projectId, paymentId)
				.session(adminSession)
				.contentType(APPLICATION_JSON)
				.content("""
					{"amount":500,"paymentDate":"2026-04-07"}
					"""))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.amount").value(500));

		mockMvc.perform(get("/api/projects/{id}", projectId).session(adminSession))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.invoicedAmount").value(1200))
			.andExpect(jsonPath("$.receivedAmount").value(500));

		mockMvc.perform(delete("/api/projects/{id}", projectId).session(adminSession))
			.andExpect(status().isConflict())
			.andExpect(jsonPath("$.message").value("项目下存在开票或回款记录，不能删除"));

		mockMvc.perform(delete("/api/projects/{projectId}/payments/{paymentId}", projectId, paymentId)
				.session(adminSession))
			.andExpect(status().isOk());

		mockMvc.perform(get("/api/projects/{id}", projectId).session(adminSession))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.receivedAmount").value(0));

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
			  "contractAmount":6666.00
			}
			""");
		Long projectC = createProject(adminSession, """
			{
			  "name":"晨曦项目",
			  "customer":"示例客户C",
			  "contractNo":"HT-2026-003",
			  "signingDate":"2026-04-10",
			  "contractAmount":9999.00
			}
			""");

		createInvoice(adminSession, projectA, """
			{"amount":1000,"invoiceDate":"2026-04-05"}
			""");
		createPayment(adminSession, projectA, """
			{"amount":600,"paymentDate":"2026-04-06"}
			""");
		createPayment(adminSession, projectB, """
			{"amount":300,"paymentDate":"2026-04-07"}
			""");
		createInvoice(adminSession, projectC, """
			{"amount":800,"invoiceDate":"2026-03-30"}
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
					  "contractAmount":0
					}
					"""))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.message").value("请求参数校验失败"))
			.andExpect(jsonPath("$.errors.name").value("项目名称不能为空"))
			.andExpect(jsonPath("$.errors.customer").value("客户不能为空"))
			.andExpect(jsonPath("$.errors.contractNo").value("合同号不能为空"))
			.andExpect(jsonPath("$.errors.signingDate").value("签约时间不能为空"))
			.andExpect(jsonPath("$.errors.contractAmount").value("合同金额必须大于0"));

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
					{"amount":0,"invoiceDate":null}
					"""))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.message").value("请求参数校验失败"))
			.andExpect(jsonPath("$.errors.amount").value("开票金额必须大于0"))
			.andExpect(jsonPath("$.errors.invoiceDate").value("开票时间不能为空"));
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
			  "contractAmount":2000
			}
			""");
		Long invoiceId = createInvoice(adminSession, projectA, """
			{"amount":500,"invoiceDate":"2026-04-05"}
			""");
		Long paymentId = createPayment(adminSession, projectA, """
			{"amount":300,"paymentDate":"2026-04-06"}
			""");

		mockMvc.perform(put("/api/projects/{projectId}/invoices/{invoiceId}", projectB, invoiceId)
				.session(adminSession)
				.contentType(APPLICATION_JSON)
				.content("""
					{"amount":800,"invoiceDate":"2026-04-10"}
					"""))
			.andExpect(status().isNotFound())
			.andExpect(jsonPath("$.message").value("开票记录不存在"));

		mockMvc.perform(delete("/api/projects/{projectId}/payments/{paymentId}", projectB, paymentId)
				.session(adminSession))
			.andExpect(status().isNotFound())
			.andExpect(jsonPath("$.message").value("回款记录不存在"));

		mockMvc.perform(get("/api/projects/{projectId}/payments", 999999L).session(adminSession))
			.andExpect(status().isNotFound())
			.andExpect(jsonPath("$.message").value("项目不存在"));
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
			  "contractAmount":5200
			}
			""");
		createPayment(adminSession, projectId, """
			{"amount":1200,"paymentDate":"2026-04-12"}
			""");

		mockMvc.perform(get("/api/projects")
				.session(adminSession)
				.param("name", "")
				.param("customer", "星河")
				.param("contractNo", "")
				.param("signingDateStart", "2026-04-01")
				.param("signingDateEnd", "2026-04-30"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.length()").value(1))
			.andExpect(jsonPath("$[0].id").value(projectId));

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
			  "contractAmount":8888.88
			}
			""");
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
