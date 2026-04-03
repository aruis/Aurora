package net.ximatai.aurora.project;

import java.math.BigDecimal;
import java.time.LocalDate;

public record ProjectSummary(
	Long id,
	String name,
	String customer,
	String contractNo,
	LocalDate signingDate,
	BigDecimal contractAmount,
	BigDecimal invoicedAmount,
	BigDecimal receivedAmount
) {
}
