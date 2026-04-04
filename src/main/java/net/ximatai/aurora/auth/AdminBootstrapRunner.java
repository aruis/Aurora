package net.ximatai.aurora.auth;

import java.util.LinkedHashSet;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import net.ximatai.aurora.common.RoleCode;
import net.ximatai.aurora.user.AppUser;
import net.ximatai.aurora.user.AppUserRepository;
import net.ximatai.aurora.user.Role;
import net.ximatai.aurora.user.RoleRepository;

@Component
public class AdminBootstrapRunner implements ApplicationRunner {

	private final AdminBootstrapProperties properties;
	private final AppUserRepository userRepository;
	private final RoleRepository roleRepository;
	private final PasswordEncoder passwordEncoder;

	public AdminBootstrapRunner(AdminBootstrapProperties properties, AppUserRepository userRepository,
		RoleRepository roleRepository, PasswordEncoder passwordEncoder) {
		this.properties = properties;
		this.userRepository = userRepository;
		this.roleRepository = roleRepository;
		this.passwordEncoder = passwordEncoder;
	}

	@Override
	@Transactional
	public void run(ApplicationArguments args) {
		if (!properties.isResetOnStartup()) {
			return;
		}

		String password = properties.getBootstrapPassword();
		if (password == null || password.isBlank()) {
			throw new IllegalStateException("app.admin.bootstrap-password 不能为空");
		}

		AppUser admin = userRepository.findByUsername("admin").orElseGet(this::createAdminUser);
		admin.setPasswordHash(passwordEncoder.encode(password));
		admin.setEnabled(true);
		userRepository.save(admin);
	}

	private AppUser createAdminUser() {
		Role adminRole = roleRepository.findByCode(RoleCode.ADMIN)
			.orElseThrow(() -> new IllegalStateException("缺少 ADMIN 角色，无法初始化管理员账号"));

		AppUser admin = new AppUser();
		admin.setUsername("admin");
		admin.setDisplayName("管理员");
		admin.setEnabled(true);
		admin.setRoles(new LinkedHashSet<>());
		admin.getRoles().add(adminRole);
		return admin;
	}
}
