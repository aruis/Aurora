package net.ximatai.aurora.project;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface PaymentRepository extends JpaRepository<Payment, Long> {

	List<Payment> findByProjectIdOrderByPaymentDateDescIdDesc(Long projectId);

	boolean existsByProjectId(Long projectId);
}
