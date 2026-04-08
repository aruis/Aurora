package net.ximatai.aurora.project;

import java.time.LocalDate;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface InvoiceRepository extends JpaRepository<Invoice, Long> {

	List<Invoice> findByProjectIdOrderByInvoiceDateDescIdDesc(Long projectId);

	void deleteByProjectId(Long projectId);

	boolean existsByProjectId(Long projectId);

	@Query("""
		select new net.ximatai.aurora.project.PaymentInvoiceOptionRow(
			i.id,
			i.invoiceNo,
			i.invoiceDate,
			i.amount,
			coalesce(sum(pay.amount), 0)
		)
		from Invoice i
		left join Payment pay on pay.invoice = i
		where i.project.id = :projectId
		group by i.id, i.invoiceNo, i.invoiceDate, i.amount
		order by i.invoiceDate desc, i.id desc
		""")
	List<PaymentInvoiceOptionRow> summarizePaymentOptionsByProject(Long projectId);

	@Query("""
		select new net.ximatai.aurora.project.FinanceStatsProjectAmountRow(
			p.id,
			p.name,
			p.customer,
			p.contractNo,
			sum(i.amount)
		)
		from Invoice i
		join i.project p
		where i.invoiceDate between :startDate and :endDate
		group by p.id, p.name, p.customer, p.contractNo
		""")
	List<FinanceStatsProjectAmountRow> summarizeByProjectBetween(LocalDate startDate, LocalDate endDate);
}
