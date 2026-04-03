package net.ximatai.aurora.auth;

import java.util.Collection;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import net.ximatai.aurora.common.RoleCode;
import net.ximatai.aurora.user.AppUser;

public class AppUserPrincipal implements UserDetails {

	private final Long id;
	private final String username;
	private final String password;
	private final String displayName;
	private final boolean enabled;
	private final Set<RoleCode> roles;

	private AppUserPrincipal(Long id, String username, String password, String displayName, boolean enabled, Set<RoleCode> roles) {
		this.id = id;
		this.username = username;
		this.password = password;
		this.displayName = displayName;
		this.enabled = enabled;
		this.roles = roles;
	}

	public static AppUserPrincipal from(AppUser user) {
		Set<RoleCode> roles = user.getRoles().stream()
			.map(role -> role.getCode())
			.collect(Collectors.toUnmodifiableSet());
		return new AppUserPrincipal(user.getId(), user.getUsername(), user.getPasswordHash(), user.getDisplayName(), user.isEnabled(), roles);
	}

	public Long getId() {
		return id;
	}

	public String getDisplayName() {
		return displayName;
	}

	public Set<RoleCode> getRoles() {
		return roles;
	}

	@Override
	public Collection<? extends GrantedAuthority> getAuthorities() {
		return roles.stream()
			.map(role -> new SimpleGrantedAuthority("ROLE_" + role.name()))
			.toList();
	}

	@Override
	public String getPassword() {
		return password;
	}

	@Override
	public String getUsername() {
		return username;
	}

	@Override
	public boolean isEnabled() {
		return enabled;
	}
}
