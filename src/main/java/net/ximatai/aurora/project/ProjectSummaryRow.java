package net.ximatai.aurora.project;

import java.math.BigDecimal;
import java.time.LocalDate;

public record ProjectSummaryRow(
	Long id,
	String name,
	String customer,
	String contractNo,
	LocalDate signingDate,
	BigDecimal contractAmount,
	String responsibleDepartment,
	String undertakingUnit,
	String category,
	String contractPeriod,
	String paymentMethod,
	String remark,
	BigDecimal invoicedAmount,
	BigDecimal receivedAmount
) {
}
