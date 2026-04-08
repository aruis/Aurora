package net.ximatai.aurora.dictionary;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record DictionaryEntryRequest(
	@NotBlank(message = "字典类型不能为空")
	String type,
	@NotBlank(message = "编码不能为空")
	String code,
	@NotBlank(message = "名称不能为空")
	String label,
	@NotNull(message = "排序不能为空")
	@Min(value = 0, message = "排序不能小于0")
	Integer sortOrder,
	@NotNull(message = "启用状态不能为空")
	Boolean enabled
) {
}
