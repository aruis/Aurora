package net.ximatai.aurora.project;

import java.time.LocalDate;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface PaymentRepository extends JpaRepository<Payment, Long> {

	List<Payment> findByProjectIdOrderByPaymentDateDescIdDesc(Long projectId);

	boolean existsByProjectId(Long projectId);

	@Query("""
		select new net.ximatai.aurora.project.FinanceStatsProjectAmountRow(
			p.id,
			p.name,
			p.customer,
			p.contractNo,
			sum(pay.amount)
		)
		from Payment pay
		join pay.project p
		where pay.paymentDate between :startDate and :endDate
		group by p.id, p.name, p.customer, p.contractNo
		""")
	List<FinanceStatsProjectAmountRow> summarizeByProjectBetween(LocalDate startDate, LocalDate endDate);
}
