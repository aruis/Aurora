package net.ximatai.aurora.project;

import java.math.BigDecimal;
import java.time.LocalDate;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

record PaymentRequest(
	@NotNull(message = "回款金额不能为空")
	@DecimalMin(value = "0.01", message = "回款金额必须大于0")
	BigDecimal amount,
	@NotNull(message = "回款时间不能为空")
	LocalDate paymentDate
) {
}

record PaymentResponse(
	Long id,
	Long projectId,
	BigDecimal amount,
	LocalDate paymentDate
) {

	public static PaymentResponse from(Payment payment) {
		return new PaymentResponse(payment.getId(), payment.getProject().getId(), payment.getAmount(), payment.getPaymentDate());
	}
}
