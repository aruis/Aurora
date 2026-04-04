package net.ximatai.aurora.project;

import java.math.BigDecimal;

public record FinanceStatsProjectAmountRow(
	Long projectId,
	String projectName,
	String customer,
	String contractNo,
	BigDecimal amount
) {
}
