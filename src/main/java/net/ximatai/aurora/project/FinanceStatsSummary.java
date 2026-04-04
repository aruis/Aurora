package net.ximatai.aurora.project;

import java.math.BigDecimal;

public record FinanceStatsSummary(
	BigDecimal invoiceTotal,
	BigDecimal paymentTotal,
	int projectCount
) {
}
