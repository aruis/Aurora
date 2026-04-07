package net.ximatai.aurora.project;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityNotFoundException;
import net.ximatai.aurora.common.BusinessException;
import net.ximatai.aurora.operationlog.OperationLogService;

@Service
@Transactional
public class InvoiceService {

	private final InvoiceRepository invoiceRepository;
	private final ProjectRepository projectRepository;
	private final PaymentRepository paymentRepository;
	private final OperationLogService operationLogService;

	public InvoiceService(InvoiceRepository invoiceRepository, ProjectRepository projectRepository, PaymentRepository paymentRepository,
		OperationLogService operationLogService) {
		this.invoiceRepository = invoiceRepository;
		this.projectRepository = projectRepository;
		this.paymentRepository = paymentRepository;
		this.operationLogService = operationLogService;
	}

	@Transactional(readOnly = true)
	public List<InvoiceResponse> list(Long projectId) {
		ensureProjectExists(projectId);
		return invoiceRepository.findByProjectIdOrderByInvoiceDateDescIdDesc(projectId).stream().map(InvoiceResponse::from).toList();
	}

	public InvoiceResponse create(Long projectId, InvoiceRequest request) {
		Project project = ensureProjectExists(projectId);
		Invoice invoice = new Invoice();
		invoice.setProject(project);
		invoice.setAmount(request.amount());
		invoice.setInvoiceDate(request.invoiceDate());
		invoice.setInvoiceNo(request.invoiceNo());
		Invoice savedInvoice = invoiceRepository.save(invoice);
		operationLogService.log("开票管理", "新增开票", "开票", String.valueOf(savedInvoice.getId()), savedInvoice.getInvoiceNo(),
			"项目=" + project.getName() + "，金额=" + request.amount());
		return InvoiceResponse.from(savedInvoice);
	}

	public InvoiceResponse update(Long projectId, Long invoiceId, InvoiceRequest request) {
		ensureProjectExists(projectId);
		Invoice invoice = invoiceRepository.findById(invoiceId).orElseThrow(() -> new EntityNotFoundException("开票记录不存在"));
		if (!invoice.getProject().getId().equals(projectId)) {
			throw new EntityNotFoundException("开票记录不存在");
		}
		invoice.setAmount(request.amount());
		invoice.setInvoiceDate(request.invoiceDate());
		invoice.setInvoiceNo(request.invoiceNo());
		operationLogService.log("开票管理", "编辑开票", "开票", String.valueOf(invoice.getId()), invoice.getInvoiceNo(),
			"项目ID=" + projectId + "，金额=" + request.amount());
		return InvoiceResponse.from(invoice);
	}

	public void delete(Long projectId, Long invoiceId) {
		ensureProjectExists(projectId);
		Invoice invoice = invoiceRepository.findById(invoiceId).orElseThrow(() -> new EntityNotFoundException("开票记录不存在"));
		if (!invoice.getProject().getId().equals(projectId)) {
			throw new EntityNotFoundException("开票记录不存在");
		}
		if (paymentRepository.existsByInvoiceId(invoiceId)) {
			throw new BusinessException(HttpStatus.CONFLICT, "开票记录已有关联回款，不能删除");
		}
		invoiceRepository.delete(invoice);
		operationLogService.log("开票管理", "删除开票", "开票", String.valueOf(invoice.getId()), invoice.getInvoiceNo(), "开票记录已删除");
	}

	private Project ensureProjectExists(Long projectId) {
		return projectRepository.findById(projectId).orElseThrow(() -> new EntityNotFoundException("项目不存在"));
	}
}
