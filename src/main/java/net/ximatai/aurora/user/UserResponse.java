package net.ximatai.aurora.user;

import java.util.Set;
import java.util.stream.Collectors;

public record UserResponse(
	Long id,
	String username,
	String displayName,
	boolean enabled,
	Set<String> roles
) {

	public static UserResponse from(AppUser user) {
		return new UserResponse(
			user.getId(),
			user.getUsername(),
			user.getDisplayName(),
			user.isEnabled(),
			user.getRoles().stream().map(role -> role.getCode().name()).collect(Collectors.toCollection(java.util.LinkedHashSet::new))
		);
	}
}
