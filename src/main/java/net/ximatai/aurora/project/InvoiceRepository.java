package net.ximatai.aurora.project;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface InvoiceRepository extends JpaRepository<Invoice, Long> {

	List<Invoice> findByProjectIdOrderByInvoiceDateDescIdDesc(Long projectId);

	boolean existsByProjectId(Long projectId);
}
