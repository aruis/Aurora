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
@RequestMapping("/api/projects/{projectId}/payments")
@PreAuthorize("hasAnyRole('ADMIN', 'PROJECT_MANAGER', 'FINANCE')")
public class PaymentController {

	private final PaymentService paymentService;

	public PaymentController(PaymentService paymentService) {
		this.paymentService = paymentService;
	}

	@GetMapping
	public List<PaymentResponse> list(@PathVariable Long projectId) {
		return paymentService.list(projectId);
	}

	@GetMapping("/invoice-options")
	public List<PaymentInvoiceOption> listInvoiceOptions(@PathVariable Long projectId, @org.springframework.web.bind.annotation.RequestParam(required = false) Long paymentId) {
		return paymentService.listInvoiceOptions(projectId, paymentId);
	}

	@PostMapping
	public PaymentResponse create(@PathVariable Long projectId, @Valid @RequestBody PaymentRequest request) {
		return paymentService.create(projectId, request);
	}

	@PutMapping("/{paymentId}")
	public PaymentResponse update(@PathVariable Long projectId, @PathVariable Long paymentId, @Valid @RequestBody PaymentRequest request) {
		return paymentService.update(projectId, paymentId, request);
	}

	@DeleteMapping("/{paymentId}")
	public void delete(@PathVariable Long projectId, @PathVariable Long paymentId) {
		paymentService.delete(projectId, paymentId);
	}
}
