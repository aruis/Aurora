package net.ximatai.aurora.project;

import java.math.BigDecimal;
import java.time.LocalDate;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record ProjectRequest(
	@NotBlank(message = "项目名称不能为空")
	String name,
	@NotBlank(message = "客户不能为空")
	String customer,
	@NotBlank(message = "合同号不能为空")
	String contractNo,
	@NotNull(message = "签约时间不能为空")
	LocalDate signingDate,
	@NotNull(message = "合同金额不能为空")
	@DecimalMin(value = "0.01", message = "合同金额必须大于0")
	BigDecimal contractAmount,
	String responsibleDepartment,
	@NotBlank(message = "承接单位不能为空")
	String undertakingUnit,
	@NotBlank(message = "类别不能为空")
	String category,
	String contractPeriod,
	String paymentMethod,
	String remark
) {
}
