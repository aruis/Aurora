package net.ximatai.aurora.project;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityNotFoundException;
import net.ximatai.aurora.common.BusinessException;

@Service
@Transactional
public class ProjectService {

	private final ProjectRepository projectRepository;
	private final InvoiceRepository invoiceRepository;
	private final PaymentRepository paymentRepository;

	public ProjectService(ProjectRepository projectRepository, InvoiceRepository invoiceRepository, PaymentRepository paymentRepository) {
		this.projectRepository = projectRepository;
		this.invoiceRepository = invoiceRepository;
		this.paymentRepository = paymentRepository;
	}

	@Transactional(readOnly = true)
	public List<ProjectSummary> list(String name, String customer, String contractNo, LocalDate signingDateStart, LocalDate signingDateEnd) {
		return projectRepository.search(
			blankToNull(name),
			blankToNull(customer),
			blankToNull(contractNo),
			signingDateStart,
			signingDateEnd).stream()
			.map(ProjectService::toSummary)
			.toList();
	}

	@Transactional(readOnly = true)
	public ProjectSummary get(Long id) {
		ProjectSummaryRow summary = projectRepository.findSummaryById(id);
		if (summary == null) {
			throw new EntityNotFoundException("项目不存在");
		}
		return toSummary(summary);
	}

	public ProjectSummary create(ProjectRequest request) {
		Project project = new Project();
		apply(project, request);
		projectRepository.save(project);
		return get(project.getId());
	}

	public ProjectSummary update(Long id, ProjectRequest request) {
		Project project = projectRepository.findById(id).orElseThrow(() -> new EntityNotFoundException("项目不存在"));
		apply(project, request);
		return get(project.getId());
	}

	public void delete(Long id) {
		if (!projectRepository.existsById(id)) {
			throw new EntityNotFoundException("项目不存在");
		}
		if (invoiceRepository.existsByProjectId(id) || paymentRepository.existsByProjectId(id)) {
			throw new BusinessException(HttpStatus.CONFLICT, "项目下存在开票或回款记录，不能删除");
		}
		projectRepository.deleteById(id);
	}

	private void apply(Project project, ProjectRequest request) {
		validateSelection(request.undertakingUnit(), UndertakingUnit::isSupported, "承接单位不合法");
		validateSelection(request.category(), ProjectCategory::isSupported, "类别不合法");
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

	private static void validateSelection(String value, java.util.function.Predicate<String> checker, String message) {
		if (!checker.test(value)) {
			throw new BusinessException(HttpStatus.BAD_REQUEST, message);
		}
	}

	private static ProjectSummary toSummary(ProjectSummaryRow row) {
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
			row.category(),
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
}
