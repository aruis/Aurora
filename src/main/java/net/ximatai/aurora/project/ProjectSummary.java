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
	String responsibleDepartment,
	String undertakingUnit,
	String undertakingUnitLabel,
	String category,
	String categoryLabel,
	String contractPeriod,
	String paymentMethod,
	String remark,
	BigDecimal invoicedAmount,
	BigDecimal receivedAmount,
	BigDecimal accrualAmount,
	BigDecimal arrearsAmount,
	BigDecimal paymentProgress
) {
}
