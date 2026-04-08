package net.ximatai.aurora.project;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;

import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityNotFoundException;
import net.ximatai.aurora.auth.AppUserPrincipal;
import net.ximatai.aurora.common.BusinessException;
import net.ximatai.aurora.dictionary.DictionaryService;
import net.ximatai.aurora.dictionary.DictionaryType;
import net.ximatai.aurora.operationlog.OperationLogService;

@Service
@Transactional
public class ProjectService {

	private final ProjectRepository projectRepository;
	private final InvoiceRepository invoiceRepository;
	private final PaymentRepository paymentRepository;
	private final ProjectChangeRepository projectChangeRepository;
	private final OperationLogService operationLogService;
	private final DictionaryService dictionaryService;

	public ProjectService(ProjectRepository projectRepository, InvoiceRepository invoiceRepository, PaymentRepository paymentRepository,
		ProjectChangeRepository projectChangeRepository, OperationLogService operationLogService, DictionaryService dictionaryService) {
		this.projectRepository = projectRepository;
		this.invoiceRepository = invoiceRepository;
		this.paymentRepository = paymentRepository;
		this.projectChangeRepository = projectChangeRepository;
		this.operationLogService = operationLogService;
		this.dictionaryService = dictionaryService;
	}

	@Transactional(readOnly = true)
	public List<ProjectSummary> list(String name, String customer, String responsibleDepartment, String undertakingUnit, String category,
		String contractNo, String paymentMethod, String remark, LocalDate signingDateStart, LocalDate signingDateEnd) {
		List<ProjectSummaryRow> rows = projectRepository.search(
			blankToNull(name),
			blankToNull(customer),
			blankToNull(responsibleDepartment),
			blankToNull(undertakingUnit),
			blankToNull(category),
			blankToNull(contractNo),
			blankToNull(paymentMethod),
			blankToNull(remark),
			signingDateStart,
			signingDateEnd);
		return toSummaries(rows);
	}

	@Transactional(readOnly = true)
	public ProjectDetailResponse get(Long id) {
		ProjectSummaryRow summary = getSummaryRow(id);
		List<ProjectChangeResponse> changes = projectChangeRepository.findByProjectIdOrderByCreatedAtDescIdDesc(id).stream()
			.map(ProjectChangeResponse::from)
			.toList();
		return new ProjectDetailResponse(toSummaries(List.of(summary)).getFirst(), changes);
	}

	public ProjectSummary create(ProjectRequest request) {
		Project project = new Project();
		apply(project, request);
		projectRepository.save(project);
		operationLogService.log("项目管理", "创建项目", "项目", String.valueOf(project.getId()), project.getName(),
			"客户=" + request.customer() + "，合同号=" + request.contractNo());
		return getSummary(project.getId());
	}

	public ProjectSummary update(Long id, ProjectRequest request) {
		Project project = projectRepository.findById(id).orElseThrow(() -> new EntityNotFoundException("项目不存在"));
		List<String> changes = buildChangeDetails(project, request);
		apply(project, request);
		if (!changes.isEmpty()) {
			recordProjectChange(project, changes);
			operationLogService.log("项目管理", "编辑项目", "项目", String.valueOf(project.getId()), project.getName(),
				"更新了 " + changes.size() + " 项内容");
		}
		return getSummary(project.getId());
	}

	public void delete(Long id) {
		Project project = projectRepository.findById(id).orElseThrow(() -> new EntityNotFoundException("项目不存在"));
		if (projectChangeRepository.existsByProjectId(id)) {
			throw new BusinessException(HttpStatus.CONFLICT, "项目已产生变更流水，不能删除");
		}
		if (invoiceRepository.existsByProjectId(id) || paymentRepository.existsByProjectId(id)) {
			throw new BusinessException(HttpStatus.CONFLICT, "项目下存在开票或回款记录，不能删除");
		}
		projectRepository.delete(project);
		operationLogService.log("项目管理", "删除项目", "项目", String.valueOf(project.getId()), project.getName(), "项目已删除");
	}

	private void apply(Project project, ProjectRequest request) {
		validateSelection(request.undertakingUnit(), DictionaryType.UNDERTAKING_UNIT, "承接单位不合法");
		validateSelection(request.category(), DictionaryType.PROJECT_CATEGORY, "类别不合法");
		project.setName(request.name());
		project.setCustomer(request.customer());
		project.setContractNo(request.contractNo());
		project.setSigningDate(request.signingDate());
		project.setContractAmount(request.contractAmount());
		project.setResponsibleDepartment(blankToNull(request.responsibleDepartment()));
		project.setUndertakingUnit(request.undertakingUnit());
		project.setCategory(request.category());
		project.setContractPeriod(blankToNull(request.contractPeriod()));
		project.setPaymentMethod(blankToNull(request.paymentMethod()));
		project.setRemark(blankToNull(request.remark()));
	}

	private static String blankToNull(String value) {
		return value == null || value.isBlank() ? null : value;
	}

	private void validateSelection(String value, DictionaryType type, String message) {
		if (!dictionaryService.isEnabledCodeSupported(type, value)) {
			throw new BusinessException(HttpStatus.BAD_REQUEST, message);
		}
	}

	private List<ProjectSummary> toSummaries(List<ProjectSummaryRow> rows) {
		Map<String, String> undertakingUnitLabels = dictionaryService.resolveLabels(
			DictionaryType.UNDERTAKING_UNIT,
			rows.stream().map(ProjectSummaryRow::undertakingUnit).filter(Objects::nonNull).distinct().toList()
		);
		Map<String, String> categoryLabels = dictionaryService.resolveLabels(
			DictionaryType.PROJECT_CATEGORY,
			rows.stream().map(ProjectSummaryRow::category).filter(Objects::nonNull).distinct().toList()
		);
		return rows.stream()
			.map(row -> toSummary(row, undertakingUnitLabels, categoryLabels))
			.toList();
	}

	private static ProjectSummary toSummary(ProjectSummaryRow row, Map<String, String> undertakingUnitLabels, Map<String, String> categoryLabels) {
		BigDecimal invoicedAmount = row.invoicedAmount();
		BigDecimal receivedAmount = row.receivedAmount();
		BigDecimal accrualAmount = invoicedAmount.subtract(receivedAmount);
		BigDecimal arrearsAmount = row.contractAmount().subtract(receivedAmount);
		BigDecimal paymentProgress = row.contractAmount().compareTo(BigDecimal.ZERO) > 0
			? receivedAmount.divide(row.contractAmount(), 4, RoundingMode.HALF_UP)
			: BigDecimal.ZERO;

		return new ProjectSummary(
			row.id(),
			row.name(),
			row.customer(),
			row.contractNo(),
			row.signingDate(),
			row.contractAmount(),
			row.responsibleDepartment(),
			row.undertakingUnit(),
			undertakingUnitLabels.getOrDefault(row.undertakingUnit(), row.undertakingUnit()),
			row.category(),
			categoryLabels.getOrDefault(row.category(), row.category()),
			row.contractPeriod(),
			row.paymentMethod(),
			row.remark(),
			invoicedAmount,
			receivedAmount,
			accrualAmount,
			arrearsAmount,
			paymentProgress
		);
	}

	private ProjectSummary getSummary(Long id) {
		return toSummaries(List.of(getSummaryRow(id))).getFirst();
	}

	private ProjectSummaryRow getSummaryRow(Long id) {
		ProjectSummaryRow summary = projectRepository.findSummaryById(id);
		if (summary == null) {
			throw new EntityNotFoundException("项目不存在");
		}
		return summary;
	}

	private void recordProjectChange(Project project, List<String> changes) {
		AppUserPrincipal principal = currentPrincipal();
		if (principal == null) {
			return;
		}

		ProjectChange change = new ProjectChange();
		change.setProject(project);
		change.setSummary("更新了 " + changes.size() + " 项内容");
		change.setDetail(String.join("\n", changes));
		change.setOperatorId(principal.getId());
		change.setOperatorUsername(principal.getUsername());
		change.setOperatorDisplayName(principal.getDisplayName());
		projectChangeRepository.save(change);
	}

	private List<String> buildChangeDetails(Project project, ProjectRequest request) {
		List<String> changes = new ArrayList<>();
		appendChange(changes, "项目名称", project.getName(), request.name());
		appendChange(changes, "委托单位", project.getCustomer(), request.customer());
		appendChange(changes, "合同号", project.getContractNo(), request.contractNo());
		appendChange(changes, "签订日期", project.getSigningDate(), request.signingDate());
		appendChange(changes, "合同金额", project.getContractAmount(), request.contractAmount());
		appendChange(changes, "责任部门", project.getResponsibleDepartment(), blankToNull(request.responsibleDepartment()));
		appendChange(changes, "承接单位",
			dictionaryService.resolveLabel(DictionaryType.UNDERTAKING_UNIT, project.getUndertakingUnit()),
			dictionaryService.resolveLabel(DictionaryType.UNDERTAKING_UNIT, request.undertakingUnit()));
		appendChange(changes, "类别",
			dictionaryService.resolveLabel(DictionaryType.PROJECT_CATEGORY, project.getCategory()),
			dictionaryService.resolveLabel(DictionaryType.PROJECT_CATEGORY, request.category()));
		appendChange(changes, "合同工期", project.getContractPeriod(), blankToNull(request.contractPeriod()));
		appendChange(changes, "付款方式", project.getPaymentMethod(), blankToNull(request.paymentMethod()));
		appendChange(changes, "备注", project.getRemark(), blankToNull(request.remark()));
		return changes;
	}

	private void appendChange(List<String> changes, String fieldLabel, Object before, Object after) {
		if (Objects.equals(before, after)) {
			return;
		}
		changes.add(fieldLabel + "：" + displayValue(before) + " -> " + displayValue(after));
	}

	private static String displayValue(Object value) {
		if (value == null) {
			return "空";
		}
		String text = String.valueOf(value);
		return text.isBlank() ? "空" : text;
	}

	private static AppUserPrincipal currentPrincipal() {
		Object principal = SecurityContextHolder.getContext().getAuthentication() == null
			? null
			: SecurityContextHolder.getContext().getAuthentication().getPrincipal();
		return principal instanceof AppUserPrincipal appUserPrincipal ? appUserPrincipal : null;
	}
}
