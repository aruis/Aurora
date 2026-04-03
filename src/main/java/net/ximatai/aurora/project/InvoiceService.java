package net.ximatai.aurora.project;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityNotFoundException;

@Service
@Transactional
public class InvoiceService {

	private final InvoiceRepository invoiceRepository;
	private final ProjectRepository projectRepository;

	public InvoiceService(InvoiceRepository invoiceRepository, ProjectRepository projectRepository) {
		this.invoiceRepository = invoiceRepository;
		this.projectRepository = projectRepository;
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
		return InvoiceResponse.from(invoiceRepository.save(invoice));
	}

	public InvoiceResponse update(Long projectId, Long invoiceId, InvoiceRequest request) {
		ensureProjectExists(projectId);
		Invoice invoice = invoiceRepository.findById(invoiceId).orElseThrow(() -> new EntityNotFoundException("开票记录不存在"));
		if (!invoice.getProject().getId().equals(projectId)) {
			throw new EntityNotFoundException("开票记录不存在");
		}
		invoice.setAmount(request.amount());
		invoice.setInvoiceDate(request.invoiceDate());
		return InvoiceResponse.from(invoice);
	}

	public void delete(Long projectId, Long invoiceId) {
		ensureProjectExists(projectId);
		Invoice invoice = invoiceRepository.findById(invoiceId).orElseThrow(() -> new EntityNotFoundException("开票记录不存在"));
		if (!invoice.getProject().getId().equals(projectId)) {
			throw new EntityNotFoundException("开票记录不存在");
		}
		invoiceRepository.delete(invoice);
	}

	private Project ensureProjectExists(Long projectId) {
		return projectRepository.findById(projectId).orElseThrow(() -> new EntityNotFoundException("项目不存在"));
	}
}
