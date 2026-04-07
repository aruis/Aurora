package net.ximatai.aurora.project;

import java.math.BigDecimal;
import java.time.LocalDate;

public record PaymentInvoiceOption(
	Long invoiceId,
	String invoiceNo,
	LocalDate invoiceDate,
	BigDecimal invoiceAmount,
	BigDecimal paidAmount,
	BigDecimal unsettledAmount
) {
}
