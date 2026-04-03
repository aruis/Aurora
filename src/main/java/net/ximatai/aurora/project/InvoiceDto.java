package net.ximatai.aurora.project;

import java.math.BigDecimal;
import java.time.LocalDate;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

record InvoiceRequest(
	@NotNull(message = "开票金额不能为空")
	@DecimalMin(value = "0.01", message = "开票金额必须大于0")
	BigDecimal amount,
	@NotNull(message = "开票时间不能为空")
	LocalDate invoiceDate
) {
}

record InvoiceResponse(
	Long id,
	Long projectId,
	BigDecimal amount,
	LocalDate invoiceDate
) {

	public static InvoiceResponse from(Invoice invoice) {
		return new InvoiceResponse(invoice.getId(), invoice.getProject().getId(), invoice.getAmount(), invoice.getInvoiceDate());
	}
}
