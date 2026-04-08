package net.ximatai.aurora.project;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityNotFoundException;
import net.ximatai.aurora.auth.AppUserPrincipal;
import net.ximatai.aurora.auth.AuthService;
import net.ximatai.aurora.common.BusinessException;
import net.ximatai.aurora.operationlog.OperationLogService;

@Service
@Transactional
public class ProjectDeletionService {

	private final ProjectRepository projectRepository;
	private final InvoiceRepository invoiceRepository;
	private final PaymentRepository paymentRepository;
	private final ProjectChangeRepository projectChangeRepository;
	private final AuthService authService;
	private final OperationLogService operationLogService;
	private final ProjectDeletionArchiveService projectDeletionArchiveService;

	public ProjectDeletionService(ProjectRepository projectRepository, InvoiceRepository invoiceRepository, PaymentRepository paymentRepository,
		ProjectChangeRepository projectChangeRepository, AuthService authService, OperationLogService operationLogService,
		ProjectDeletionArchiveService projectDeletionArchiveService) {
		this.projectRepository = projectRepository;
		this.invoiceRepository = invoiceRepository;
		this.paymentRepository = paymentRepository;
		this.projectChangeRepository = projectChangeRepository;
		this.authService = authService;
		this.operationLogService = operationLogService;
		this.projectDeletionArchiveService = projectDeletionArchiveService;
	}

	@Transactional(readOnly = true)
	public ProjectDeleteCheckResponse getDeleteCheck(Long id) {
		Project project = getProject(id);
		boolean hasProjectChanges = projectChangeRepository.existsByProjectId(id);
		boolean hasInvoices = invoiceRepository.existsByProjectId(id);
		boolean hasPayments = paymentRepository.existsByProjectId(id);
		return new ProjectDeleteCheckResponse(
			hasProjectChanges || hasInvoices || hasPayments,
			hasProjectChanges,
			hasInvoices,
			hasPayments,
			project.getContractNo()
		);
	}

	public void delete(Long id, ProjectDeleteRequest request) {
		Project project = getProject(id);
		AppUserPrincipal principal = requireCurrentPrincipal();
		List<ProjectChange> changes = projectChangeRepository.findByProjectIdOrderByCreatedAtDescIdDesc(id);
		List<Invoice> invoices = invoiceRepository.findByProjectIdOrderByInvoiceDateDescIdDesc(id);
		List<Payment> payments = paymentRepository.findByProjectIdOrderByPaymentDateDescIdDesc(id);
		boolean requiresStrongConfirmation = !changes.isEmpty() || !invoices.isEmpty() || !payments.isEmpty();

		if (requiresStrongConfirmation) {
			validateStrongConfirmation(project, request, principal);
		}

		String archiveId = projectDeletionArchiveService.archive(project, changes, invoices, payments, principal.getUsername(),
			principal.getDisplayName(), requiresStrongConfirmation);

		paymentRepository.deleteByProjectId(id);
		invoiceRepository.deleteByProjectId(id);
		projectChangeRepository.deleteByProjectId(id);
		projectRepository.delete(project);

		operationLogService.log("项目管理", requiresStrongConfirmation ? "高风险删除项目" : "删除项目", "项目", String.valueOf(project.getId()),
			project.getName(), requiresStrongConfirmation
				? "项目及其关联数据已级联硬删除，archiveId=" + archiveId + "，changes=" + changes.size() + "，invoices=" + invoices.size() + "，payments=" + payments.size()
				: "项目已删除，archiveId=" + archiveId);
	}

	private Project getProject(Long id) {
		return projectRepository.findById(id).orElseThrow(() -> new EntityNotFoundException("项目不存在"));
	}

	private void validateStrongConfirmation(Project project, ProjectDeleteRequest request, AppUserPrincipal principal) {
		if (request == null || request.contractNo() == null || request.contractNo().isBlank()) {
			throw new BusinessException(HttpStatus.BAD_REQUEST, "请输入项目合同号以确认删除");
		}
		if (!project.getContractNo().equals(request.contractNo().trim())) {
			throw new BusinessException(HttpStatus.BAD_REQUEST, "项目合同号不匹配");
		}
		authService.verifyPassword(principal.getId(), request.password(), "当前登录密码不正确");
	}

	private static AppUserPrincipal requireCurrentPrincipal() {
		Object principal = SecurityContextHolder.getContext().getAuthentication() == null
			? null
			: SecurityContextHolder.getContext().getAuthentication().getPrincipal();
		if (principal instanceof AppUserPrincipal appUserPrincipal) {
			return appUserPrincipal;
		}
		throw new BusinessException(HttpStatus.UNAUTHORIZED, "未登录或登录已失效");
	}
}
