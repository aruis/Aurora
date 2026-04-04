package net.ximatai.aurora.project;

import java.math.BigDecimal;

public record FinanceStatsProjectRow(
	Long projectId,
	String projectName,
	String customer,
	String contractNo,
	BigDecimal invoiceAmount,
	BigDecimal paymentAmount
) {
}
