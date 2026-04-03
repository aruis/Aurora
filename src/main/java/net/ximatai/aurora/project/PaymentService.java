package net.ximatai.aurora.project;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityNotFoundException;

@Service
@Transactional
public class PaymentService {

	private final PaymentRepository paymentRepository;
	private final ProjectRepository projectRepository;

	public PaymentService(PaymentRepository paymentRepository, ProjectRepository projectRepository) {
		this.paymentRepository = paymentRepository;
		this.projectRepository = projectRepository;
	}

	@Transactional(readOnly = true)
	public List<PaymentResponse> list(Long projectId) {
		ensureProjectExists(projectId);
		return paymentRepository.findByProjectIdOrderByPaymentDateDescIdDesc(projectId).stream().map(PaymentResponse::from).toList();
	}

	public PaymentResponse create(Long projectId, PaymentRequest request) {
		Project project = ensureProjectExists(projectId);
		Payment payment = new Payment();
		payment.setProject(project);
		payment.setAmount(request.amount());
		payment.setPaymentDate(request.paymentDate());
		return PaymentResponse.from(paymentRepository.save(payment));
	}

	public PaymentResponse update(Long projectId, Long paymentId, PaymentRequest request) {
		ensureProjectExists(projectId);
		Payment payment = paymentRepository.findById(paymentId).orElseThrow(() -> new EntityNotFoundException("回款记录不存在"));
		if (!payment.getProject().getId().equals(projectId)) {
			throw new EntityNotFoundException("回款记录不存在");
		}
		payment.setAmount(request.amount());
		payment.setPaymentDate(request.paymentDate());
		return PaymentResponse.from(payment);
	}

	public void delete(Long projectId, Long paymentId) {
		ensureProjectExists(projectId);
		Payment payment = paymentRepository.findById(paymentId).orElseThrow(() -> new EntityNotFoundException("回款记录不存在"));
		if (!payment.getProject().getId().equals(projectId)) {
			throw new EntityNotFoundException("回款记录不存在");
		}
		paymentRepository.delete(payment);
	}

	private Project ensureProjectExists(Long projectId) {
		return projectRepository.findById(projectId).orElseThrow(() -> new EntityNotFoundException("项目不存在"));
	}
}
