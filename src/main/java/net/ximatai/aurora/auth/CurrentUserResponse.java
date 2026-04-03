package net.ximatai.aurora.auth;

import java.util.Set;

public record CurrentUserResponse(
	Long id,
	String username,
	String displayName,
	boolean enabled,
	Set<String> roles
) {

	public static CurrentUserResponse fromPrincipal(AppUserPrincipal principal) {
		return new CurrentUserResponse(
			principal.getId(),
			principal.getUsername(),
			principal.getDisplayName(),
			principal.isEnabled(),
			principal.getRoles().stream().map(Enum::name).collect(java.util.stream.Collectors.toCollection(java.util.LinkedHashSet::new))
		);
	}
}
