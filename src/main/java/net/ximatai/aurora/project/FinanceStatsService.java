package net.ximatai.aurora.project;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import net.ximatai.aurora.common.BusinessException;

@Service
@Transactional(readOnly = true)
public class FinanceStatsService {

	private final InvoiceRepository invoiceRepository;
	private final PaymentRepository paymentRepository;

	public FinanceStatsService(InvoiceRepository invoiceRepository, PaymentRepository paymentRepository) {
		this.invoiceRepository = invoiceRepository;
		this.paymentRepository = paymentRepository;
	}

	public FinanceStatsResponse get(LocalDate startDate, LocalDate endDate) {
		if (startDate.isAfter(endDate)) {
			throw new BusinessException(HttpStatus.BAD_REQUEST, "开始日期不能晚于结束日期");
		}

		List<FinanceStatsProjectAmountRow> invoiceRows = invoiceRepository.summarizeByProjectBetween(startDate, endDate);
		List<FinanceStatsProjectAmountRow> paymentRows = paymentRepository.summarizeByProjectBetween(startDate, endDate);

		LinkedHashMap<Long, MutableFinanceStatsRow> rows = new LinkedHashMap<>();
		BigDecimal invoiceTotal = BigDecimal.ZERO;
		BigDecimal paymentTotal = BigDecimal.ZERO;

		for (FinanceStatsProjectAmountRow row : invoiceRows) {
			MutableFinanceStatsRow target = rows.computeIfAbsent(row.projectId(), ignored -> MutableFinanceStatsRow.from(row));
			target.invoiceAmount = row.amount();
			invoiceTotal = invoiceTotal.add(row.amount());
		}

		for (FinanceStatsProjectAmountRow row : paymentRows) {
			MutableFinanceStatsRow target = rows.computeIfAbsent(row.projectId(), ignored -> MutableFinanceStatsRow.from(row));
			target.paymentAmount = row.amount();
			paymentTotal = paymentTotal.add(row.amount());
		}

		List<FinanceStatsProjectRow> projects = new ArrayList<>(rows.values().stream()
			.map(MutableFinanceStatsRow::toRow)
			.sorted(Comparator
				.comparing(FinanceStatsProjectRow::paymentAmount, Comparator.reverseOrder())
				.thenComparing(FinanceStatsProjectRow::invoiceAmount, Comparator.reverseOrder())
				.thenComparing(FinanceStatsProjectRow::projectId, Comparator.reverseOrder()))
			.toList());

		return new FinanceStatsResponse(
			new FinanceStatsSummary(invoiceTotal, paymentTotal, rows.size()),
			projects
		);
	}

	private static final class MutableFinanceStatsRow {

		private final Long projectId;
		private final String projectName;
		private final String customer;
		private final String contractNo;
		private BigDecimal invoiceAmount = BigDecimal.ZERO;
		private BigDecimal paymentAmount = BigDecimal.ZERO;

		private MutableFinanceStatsRow(Long projectId, String projectName, String customer, String contractNo) {
			this.projectId = projectId;
			this.projectName = projectName;
			this.customer = customer;
			this.contractNo = contractNo;
		}

		private static MutableFinanceStatsRow from(FinanceStatsProjectAmountRow row) {
			return new MutableFinanceStatsRow(row.projectId(), row.projectName(), row.customer(), row.contractNo());
		}

		private FinanceStatsProjectRow toRow() {
			return new FinanceStatsProjectRow(projectId, projectName, customer, contractNo, invoiceAmount, paymentAmount);
		}
	}
}
