package net.ximatai.aurora.user;

import java.util.Set;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import net.ximatai.aurora.common.RoleCode;

record UserCreateRequest(
	@NotBlank(message = "用户名不能为空")
	String username,
	@NotBlank(message = "密码不能为空")
	String password,
	@NotBlank(message = "展示名称不能为空")
	String displayName,
	boolean enabled,
	@NotEmpty(message = "至少选择一个角色")
	Set<RoleCode> roles
) {
}

record UserUpdateRequest(
	@NotBlank(message = "展示名称不能为空")
	String displayName,
	boolean enabled,
	@NotEmpty(message = "至少选择一个角色")
	Set<RoleCode> roles
) {
}

record ResetPasswordRequest(
	@NotBlank(message = "新密码不能为空")
	String newPassword
) {
}
