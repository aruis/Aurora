package net.ximatai.aurora.auth;

import jakarta.validation.constraints.NotBlank;

public record ChangePasswordRequest(
	@NotBlank(message = "原密码不能为空")
	String oldPassword,
	@NotBlank(message = "新密码不能为空")
	String newPassword
) {
}
