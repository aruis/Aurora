package net.ximatai.aurora.project;

import java.util.List;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/projects/{projectId}/invoices")
@PreAuthorize("hasAnyRole('ADMIN', 'PROJECT_MANAGER', 'FINANCE')")
public class InvoiceController {

	private final InvoiceService invoiceService;

	public InvoiceController(InvoiceService invoiceService) {
		this.invoiceService = invoiceService;
	}

	@GetMapping
	public List<InvoiceResponse> list(@PathVariable Long projectId) {
		return invoiceService.list(projectId);
	}

	@PostMapping
	public InvoiceResponse create(@PathVariable Long projectId, @Valid @RequestBody InvoiceRequest request) {
		return invoiceService.create(projectId, request);
	}

	@PutMapping("/{invoiceId}")
	public InvoiceResponse update(@PathVariable Long projectId, @PathVariable Long invoiceId, @Valid @RequestBody InvoiceRequest request) {
		return invoiceService.update(projectId, invoiceId, request);
	}

	@DeleteMapping("/{invoiceId}")
	public void delete(@PathVariable Long projectId, @PathVariable Long invoiceId) {
		invoiceService.delete(projectId, invoiceId);
	}
}
