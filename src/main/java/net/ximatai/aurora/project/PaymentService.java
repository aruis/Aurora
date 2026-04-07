package net.ximatai.aurora.project;

import java.math.BigDecimal;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityNotFoundException;
import net.ximatai.aurora.common.BusinessException;
import net.ximatai.aurora.operationlog.OperationLogService;

@Service
@Transactional
public class PaymentService {

	private final PaymentRepository paymentRepository;
	private final ProjectRepository projectRepository;
	private final InvoiceRepository invoiceRepository;
	private final OperationLogService operationLogService;

	public PaymentService(PaymentRepository paymentRepository, ProjectRepository projectRepository, InvoiceRepository invoiceRepository,
		OperationLogService operationLogService) {
		this.paymentRepository = paymentRepository;
		this.projectRepository = projectRepository;
		this.invoiceRepository = invoiceRepository;
		this.operationLogService = operationLogService;
	}

	@Transactional(readOnly = true)
	public List<PaymentResponse> list(Long projectId) {
		ensureProjectExists(projectId);
		return paymentRepository.findByProjectIdOrderByPaymentDateDescIdDesc(projectId).stream().map(PaymentResponse::from).toList();
	}

	@Transactional(readOnly = true)
	public List<PaymentInvoiceOption> listInvoiceOptions(Long projectId, Long paymentId) {
		ensureProjectExists(projectId);
		Payment currentPayment = paymentId == null ? null : findPayment(projectId, paymentId);
		Long currentInvoiceId = currentPayment == null || currentPayment.getInvoice() == null ? null : currentPayment.getInvoice().getId();
		return invoiceRepository.summarizePaymentOptionsByProject(projectId).stream()
			.map(row -> toOption(row, currentInvoiceId))
			.filter(option -> option.unsettledAmount().compareTo(BigDecimal.ZERO) > 0 || option.invoiceId().equals(currentInvoiceId))
			.toList();
	}

	public PaymentResponse create(Long projectId, PaymentRequest request) {
		Project project = ensureProjectExists(projectId);
		Invoice invoice = resolveInvoice(projectId, request.invoiceId());
		validateInvoiceAmount(invoice, request.amount(), null);
		Payment payment = new Payment();
		payment.setProject(project);
		payment.setInvoice(invoice);
		payment.setAmount(request.amount());
		payment.setPaymentDate(request.paymentDate());
		Payment savedPayment = paymentRepository.save(payment);
		operationLogService.log("回款管理", "新增回款", "回款", String.valueOf(savedPayment.getId()),
			String.valueOf(savedPayment.getId()), buildPaymentDetail(project, invoice, request.amount()));
		return PaymentResponse.from(savedPayment);
	}

	public PaymentResponse update(Long projectId, Long paymentId, PaymentRequest request) {
		ensureProjectExists(projectId);
		Payment payment = findPayment(projectId, paymentId);
		Invoice invoice = resolveInvoice(projectId, request.invoiceId());
		validateInvoiceAmount(invoice, request.amount(), paymentId);
		payment.setInvoice(invoice);
		payment.setAmount(request.amount());
		payment.setPaymentDate(request.paymentDate());
		operationLogService.log("回款管理", "编辑回款", "回款", String.valueOf(payment.getId()),
			String.valueOf(payment.getId()), buildPaymentDetail(payment.getProject(), invoice, request.amount()));
		return PaymentResponse.from(payment);
	}

	public void delete(Long projectId, Long paymentId) {
		ensureProjectExists(projectId);
		Payment payment = findPayment(projectId, paymentId);
		paymentRepository.delete(payment);
		operationLogService.log("回款管理", "删除回款", "回款", String.valueOf(payment.getId()),
			String.valueOf(payment.getId()), buildPaymentDetail(payment.getProject(), payment.getInvoice(), payment.getAmount()));
	}

	private Project ensureProjectExists(Long projectId) {
		return projectRepository.findById(projectId).orElseThrow(() -> new EntityNotFoundException("项目不存在"));
	}

	private Payment findPayment(Long projectId, Long paymentId) {
		Payment payment = paymentRepository.findById(paymentId).orElseThrow(() -> new EntityNotFoundException("回款记录不存在"));
		if (!payment.getProject().getId().equals(projectId)) {
			throw new EntityNotFoundException("回款记录不存在");
		}
		return payment;
	}

	private Invoice ensureInvoiceBelongsToProject(Long projectId, Long invoiceId) {
		Invoice invoice = invoiceRepository.findById(invoiceId).orElseThrow(() -> new EntityNotFoundException("发票不存在"));
		if (!invoice.getProject().getId().equals(projectId)) {
			throw new EntityNotFoundException("发票不存在");
		}
		return invoice;
	}

	private Invoice resolveInvoice(Long projectId, Long invoiceId) {
		return invoiceId == null ? null : ensureInvoiceBelongsToProject(projectId, invoiceId);
	}

	private void validateInvoiceAmount(Invoice invoice, BigDecimal amount, Long excludePaymentId) {
		if (invoice == null) {
			return;
		}
		BigDecimal paidAmount = paymentRepository.sumAmountByInvoiceIdExcludingPayment(invoice.getId(), excludePaymentId);
		if (paidAmount.add(amount).compareTo(invoice.getAmount()) > 0) {
			throw new BusinessException(HttpStatus.BAD_REQUEST, "回款金额不能大于发票未结清金额");
		}
	}

	private PaymentInvoiceOption toOption(PaymentInvoiceOptionRow row, Long currentInvoiceId) {
		BigDecimal unsettledAmount = row.invoiceAmount().subtract(row.paidAmount());
		if (currentInvoiceId != null && currentInvoiceId.equals(row.invoiceId()) && unsettledAmount.compareTo(BigDecimal.ZERO) <= 0) {
			unsettledAmount = BigDecimal.ZERO;
		}
		return new PaymentInvoiceOption(row.invoiceId(), row.invoiceNo(), row.invoiceDate(), row.invoiceAmount(), row.paidAmount(), unsettledAmount);
	}

	private String buildPaymentDetail(Project project, Invoice invoice, BigDecimal amount) {
		return "项目=" + project.getName()
			+ "，金额=" + amount
			+ (invoice == null ? "，未关联发票" : "，发票=" + invoice.getInvoiceNo());
	}
}
